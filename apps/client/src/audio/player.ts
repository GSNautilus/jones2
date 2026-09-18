/**
 * The audio player: sound effects on demand, and background music that
 * rotates through the named pieces with a fade at each end and a rest between
 * them. Volume and mute are remembered per browser.
 *
 * Browsers only start audio after the player has clicked something; the
 * START GAME button is that click, so the game screen can start the music
 * as soon as it mounts.
 */
import { STINGERS, fileFor, resolveMap, type NamesFile, type SfxKey, type SoundMap } from './map';
import { EMPTY_VOICES, voiceFile, type VoicesFile } from './voices';

export const FADE_SECONDS = 2;
export const REST_SECONDS = 5;
/** Music volume while a clerk speaks, as a fraction of the music setting. */
export const DUCK = 0.4;
const STORAGE = 'jones2-audio';

export interface AudioSettings {
  muted: boolean;
  /** 0..1 */
  music: number;
  /** 0..1 */
  sfx: number;
  /** 0..1, the clerks' spoken lines */
  voice: number;
}

const DEFAULTS: AudioSettings = { muted: false, music: 0.5, sfx: 0.8, voice: 0.9 };

export function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AudioSettings>) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: AudioSettings): void {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/**
 * The next piece to play: any of the rotation except the one just heard, so
 * two pieces never run back to back. With a single piece it repeats.
 */
export function pickNext(rotation: readonly number[], last: number | null, random: () => number): number | null {
  if (rotation.length === 0) return null;
  const choices = rotation.length > 1 ? rotation.filter((n) => n !== last) : rotation;
  return choices[Math.floor(random() * choices.length) % choices.length]!;
}

/** Gain for a fade: 0..1 over `seconds`, linear, clamped. */
export function fadeGain(elapsed: number, seconds: number, out: boolean): number {
  const t = Math.max(0, Math.min(1, elapsed / seconds));
  return out ? 1 - t : t;
}

type Phase = 'idle' | 'resting' | 'playing' | 'fading' | 'stinger';

/** The slice of HTMLAudioElement the player uses, so tests can fake it. */
export interface AudioLike {
  src: string;
  volume: number;
  muted: boolean;
  duration: number;
  currentTime: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, fn: () => void): void;
}

export class AudioPlayer {
  private map: SoundMap = { sfx: {}, music: [], unmatched: [] };
  private voiceMap: VoicesFile = EMPTY_VOICES;
  private settings = loadSettings();
  /** The one music element: a rotation piece or a stinger. Never two. */
  private music: AudioLike | null = null;
  private phase: Phase = 'idle';
  private lastTrack: number | null = null;
  private restTimer: ReturnType<typeof setTimeout> | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private fadeStart = 0;
  private stopped = true;
  /** The one voice element; a new line cuts the old. */
  private voice: AudioLike | null = null;
  /** A stinger that arrived while a clerk was speaking; plays when the line ends. */
  private pendingStinger: number | null = null;
  private readonly random: () => number;
  private readonly createAudio: (src: string) => AudioLike;

  constructor(random: () => number = Math.random, createAudio: (src: string) => AudioLike = (src) => new Audio(src)) {
    this.random = random;
    this.createAudio = createAudio;
  }

  /** What is playing now, for tests and the report. */
  get state(): { phase: Phase; src: string | null; voice: string | null } {
    return { phase: this.phase, src: this.music?.src ?? null, voice: this.voice?.src ?? null };
  }

  /** Stop and drop the current music element, whatever it is. */
  private dropMusic(): void {
    if (!this.music) return;
    const a = this.music;
    this.music = null;
    a.pause();
    a.src = '';
  }

  /** Load `names.json` and build the map. Safe to call again; silent on failure. */
  async load(url = 'audio/names.json'): Promise<SoundMap> {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      this.map = resolveMap((await res.json()) as NamesFile);
    } catch {
      this.map = { sfx: {}, music: [], unmatched: [] };
    }
    return this.map;
  }

  get soundMap(): SoundMap {
    return this.map;
  }

  /** Load `voices.json` (the labelled spoken lines). Silent on failure. */
  async loadVoices(url = 'audio/voices.json'): Promise<VoicesFile> {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      this.voiceMap = { ...EMPTY_VOICES, ...((await res.json()) as Partial<VoicesFile>) };
    } catch {
      this.voiceMap = EMPTY_VOICES;
    }
    return this.voiceMap;
  }

  get voices(): VoicesFile {
    return this.voiceMap;
  }

  get current(): AudioSettings {
    return { ...this.settings };
  }

  update(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
    if (this.music && this.phase === 'playing') this.music.volume = this.musicVolume();
    if (this.music) this.music.muted = this.settings.muted;
  }

  private musicVolume(): number {
    if (this.settings.muted) return 0;
    return this.settings.music * (this.voice ? DUCK : 1);
  }

  // ---- speech --------------------------------------------------------------

  /**
   * A clerk's spoken line: one at a time (a new line cuts the old), the music
   * ducked to DUCK while it plays and restored when it ends. Silent while
   * muted. A stinger asked for during the line waits for it.
   */
  speak(line: number | number[]): void {
    if (this.settings.muted) return;
    const [first, ...rest] = Array.isArray(line) ? line : [line];
    if (first === undefined) return;
    this.dropVoice();
    const a = this.createAudio(voiceFile(first));
    a.volume = this.settings.voice;
    this.voice = a;
    this.applyMusicVolume();
    const done = () => {
      if (this.voice !== a) return;
      this.voice = null;
      if (rest.length) {
        this.speak(rest); // the next sentence of the same answer
        return;
      }
      this.applyMusicVolume();
      const n = this.pendingStinger;
      this.pendingStinger = null;
      if (n !== null) this.stinger(n);
    };
    a.addEventListener('ended', done);
    a.addEventListener('error', done);
    void a.play().catch(done);
  }

  /** Stop the clerk mid-sentence (the window closed). */
  hush(): void {
    this.dropVoice();
    this.applyMusicVolume();
  }

  private dropVoice(): void {
    if (!this.voice) return;
    const a = this.voice;
    this.voice = null;
    a.pause();
    a.src = '';
  }

  /** Re-apply the music level after a duck or un-duck, without touching a fade. */
  private applyMusicVolume(): void {
    if (this.music && this.phase === 'playing' && !this.fadeTimer) this.music.volume = this.musicVolume();
  }

  // ---- sound effects -------------------------------------------------------

  play(key: SfxKey): void {
    if (this.settings.muted) return;
    const choices = this.map.sfx[key];
    if (!choices || choices.length === 0) return;
    const n = choices[Math.floor(this.random() * choices.length) % choices.length]!;
    if (STINGERS.has(key)) {
      this.stinger(n);
      return;
    }
    const a = this.createAudio(fileFor(n));
    a.volume = this.settings.sfx;
    void a.play().catch(() => undefined);
  }

  /**
   * A piece of music for a moment: whatever music is playing stops, the
   * stinger plays alone, and the rotation (if it is running) picks up again
   * after the usual rest. While a stinger plays nothing else may start.
   */
  private stinger(n: number): void {
    if (this.voice) {
      this.pendingStinger = n;
      return;
    }
    this.clearTimers();
    this.dropMusic();
    this.phase = 'stinger';
    const a = this.createAudio(fileFor(n));
    a.volume = this.settings.music;
    let done = false;
    const resume = () => {
      if (done || this.music !== a) return;
      done = true;
      this.music = null;
      this.phase = 'idle';
      if (!this.stopped) this.rest();
    };
    this.music = a;
    a.addEventListener('ended', resume);
    a.addEventListener('error', resume);
    void a.play().catch(resume);
  }

  // ---- music ---------------------------------------------------------------

  /**
   * Begin the rotation: a rest first, then the first piece fades in. If a
   * stinger is playing, the rotation waits for it to finish.
   */
  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    if (this.phase === 'stinger') return;
    this.rest();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.dropMusic();
    this.dropVoice();
    this.pendingStinger = null;
    this.phase = 'idle';
  }

  private clearTimers(): void {
    if (this.restTimer) clearTimeout(this.restTimer);
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    this.restTimer = null;
    this.fadeTimer = null;
  }

  private rest(): void {
    if (this.phase === 'stinger') return; // the stinger's end restarts the rotation
    this.phase = 'resting';
    this.clearTimers();
    this.restTimer = setTimeout(() => this.next(), REST_SECONDS * 1000);
  }

  private next(): void {
    if (this.stopped || this.phase === 'stinger') return;
    const n = pickNext(this.map.music, this.lastTrack, this.random);
    if (n === null) {
      this.rest(); // nothing named yet; try again after a rest
      return;
    }
    this.lastTrack = n;
    this.dropMusic();
    const a = this.createAudio(fileFor(n));
    a.muted = this.settings.muted;
    a.volume = 0;
    this.music = a;
    this.phase = 'playing';
    a.addEventListener('timeupdate', () => {
      // start the fade-out so it ends with the piece
      if (this.phase === 'playing' && a.duration && a.currentTime >= a.duration - FADE_SECONDS) this.fadeOut(a);
    });
    a.addEventListener('ended', () => {
      if (this.music === a) this.rest();
    });
    a.addEventListener('error', () => {
      if (this.music === a) this.rest();
    });
    void a.play().catch(() => this.rest());
    this.fade(a, false);
  }

  private fadeOut(a: AudioLike): void {
    this.phase = 'fading';
    this.fade(a, true);
  }

  private fade(a: AudioLike, out: boolean): void {
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    this.fadeStart = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - this.fadeStart) / 1000;
      const g = fadeGain(elapsed, FADE_SECONDS, out);
      a.volume = g * this.musicVolume();
      if (elapsed >= FADE_SECONDS && this.fadeTimer) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;
      }
    };
    tick();
    this.fadeTimer = setInterval(tick, 50);
  }
}
