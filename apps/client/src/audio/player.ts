/**
 * The audio player: sound effects on demand, and background music that
 * rotates through the named pieces with a fade at each end and a rest between
 * them. Volume and mute are remembered per browser.
 *
 * Browsers only start audio after the player has clicked something; the
 * START GAME button is that click, so the game screen can start the music
 * as soon as it mounts.
 */
import { PLACE_STINGERS, STINGERS, fileFor, resolveMap, type NamesFile, type SfxKey, type SoundMap } from './map';
import { EMPTY_VOICES, voiceFile, type VoicesFile } from './voices';

export const FADE_SECONDS = 2;
export const REST_SECONDS = 5;
/** How fast a place's music goes when the player walks out of the door. */
export const LEAVE_SECONDS = 0.6;
/**
 * Music volume while a clerk speaks, as a fraction of the music setting.
 * Hearing is logarithmic: 0.05 is about 26 dB down, the music all but gone
 * under the voice; 0.4 was barely a dip.
 */
export const DUCK = 0.05;
const STORAGE = 'jones2-audio';

export interface AudioSettings {
  /** Everything off. */
  muted: boolean;
  /** The music channel off: the rotation and the stingers. */
  musicMuted: boolean;
  /** The sound channel off: effects and the clerks' spoken lines. */
  soundMuted: boolean;
  /** 0..1 */
  music: number;
  /** 0..1 */
  sfx: number;
  /** 0..1, the clerks' spoken lines */
  voice: number;
}

const DEFAULTS: AudioSettings = { muted: false, musicMuted: false, soundMuted: false, music: 0.5, sfx: 0.8, voice: 1 };

/**
 * The saved settings. A master `muted` left behind by the old SOUND OFF
 * toggle (which no longer has a button) becomes both channel mutes, so the
 * OPTIONS window can switch the sound back on.
 */
export function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE);
    return migrateSettings(raw ? (JSON.parse(raw) as Partial<AudioSettings>) : {});
  } catch {
    return { ...DEFAULTS };
  }
}

export function migrateSettings(saved: Partial<AudioSettings>): AudioSettings {
  const s: AudioSettings = { ...DEFAULTS, ...saved };
  if (s.muted) {
    s.muted = false;
    s.musicMuted = true;
    s.soundMuted = true;
  }
  return s;
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
  loop?: boolean;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, fn: () => void): void;
}

/**
 * One second of silence as a WAV data URI (8 kHz, 8-bit, mono). Looped at
 * full volume it is inaudible but keeps the browser's output stream open, so
 * the sound device never idles between effects: on many outputs (HDMI,
 * Bluetooth, some USB DACs) waking from idle costs a second or two, and the
 * first effect after a quiet spell came late or clipped.
 */
export const SILENCE_URI: string = (() => {
  const rate = 8000;
  const samples = rate;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const ascii = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) bytes[off + i] = s.charCodeAt(i);
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, 'data');
  view.setUint32(40, samples, true);
  bytes.fill(128, 44); // 8-bit PCM silence is the midpoint
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
  return 'data:audio/wav;base64,' + b64;
})();

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
  private pendingStinger: { n: number; key: SfxKey } | null = null;
  /** Which moment the playing (or pending) stinger is for. */
  private stingerKey: SfxKey | null = null;
  /** The silent loop that keeps the output stream open while the player runs. */
  private keepAlive: AudioLike | null = null;
  /** Effects fetched ahead of time, as object URLs, so a play never waits on the network. */
  private preloaded = new Map<number, string>();
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

  /**
   * Fetch every effect (not the music, not the 533 voice lines) into memory
   * once, so a play starts at once instead of after a round trip to the
   * server. Browser only: needs `URL.createObjectURL`. Safe to call again.
   */
  async preload(): Promise<number> {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return 0;
    const numbers = new Set<number>();
    for (const [key, list] of Object.entries(this.map.sfx)) {
      if (STINGERS.has(key as SfxKey)) continue;
      for (const n of list ?? []) numbers.add(n);
    }
    let done = 0;
    await Promise.all(
      [...numbers].map(async (n) => {
        if (this.preloaded.has(n)) return;
        try {
          const res = await fetch(fileFor(n));
          if (!res.ok) return;
          this.preloaded.set(n, URL.createObjectURL(await res.blob()));
          done++;
        } catch {
          // the effect streams from the server when it plays
        }
      }),
    );
    return done;
  }

  /** Where to play sound `n` from: memory if preloaded, else the server. */
  private srcFor(n: number): string {
    return this.preloaded.get(n) ?? fileFor(n);
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
    this.applyMusicVolume();
    if (this.music) this.music.muted = this.musicOff();
    if (this.voice) this.voice.volume = this.settings.voice;
  }

  private musicOff(): boolean {
    return this.settings.muted || this.settings.musicMuted;
  }

  private soundOff(): boolean {
    return this.settings.muted || this.settings.soundMuted;
  }

  private musicVolume(): number {
    if (this.musicOff()) return 0;
    return this.settings.music * (this.voice ? DUCK : 1);
  }

  // ---- speech --------------------------------------------------------------

  /**
   * A clerk's spoken line: one at a time (a new line cuts the old), the music
   * ducked to DUCK while it plays and restored when it ends. Silent while
   * muted. A stinger asked for during the line waits for it.
   */
  speak(line: number | number[]): void {
    if (this.soundOff()) return;
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
      const p = this.pendingStinger;
      this.pendingStinger = null;
      if (p) this.stinger(p.n, p.key);
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

  /** Re-apply the music level after a duck, un-duck or setting change, to a piece or a stinger, without touching a fade. */
  private applyMusicVolume(): void {
    if (!this.music || this.fadeTimer) return;
    if (this.phase === 'playing' || this.phase === 'stinger') this.music.volume = this.musicVolume();
  }

  // ---- sound effects -------------------------------------------------------

  play(key: SfxKey): void {
    // A stinger is music; everything else is sound. Each channel mutes alone.
    if (STINGERS.has(key) ? this.musicOff() : this.soundOff()) return;
    const choices = this.map.sfx[key];
    if (!choices || choices.length === 0) return;
    const n = choices[Math.floor(this.random() * choices.length) % choices.length]!;
    if (STINGERS.has(key)) {
      this.stinger(n, key);
      return;
    }
    const a = this.createAudio(this.srcFor(n));
    a.volume = this.settings.sfx;
    void a.play().catch(() => undefined);
  }

  /**
   * A piece of music for a moment: whatever music is playing stops, the
   * stinger plays alone, and the rotation (if it is running) picks up again
   * after the usual rest. While a stinger plays nothing else may start.
   */
  private stinger(n: number, key: SfxKey): void {
    this.stingerKey = key;
    if (this.voice) {
      this.pendingStinger = { n, key };
      return;
    }
    this.clearTimers();
    this.dropMusic();
    this.phase = 'stinger';
    const a = this.createAudio(fileFor(n));
    a.volume = this.musicVolume(); // ducked if a clerk is already talking
    a.muted = this.musicOff();
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

  /**
   * The player has left the place whose music is playing (closed the Hi-Tech
   * U window, say): that stinger fades out fast and the rotation, if it is
   * running, picks up after the usual rest. Other stingers and the rotation
   * itself are untouched.
   */
  leave(): void {
    if (!this.stingerKey || !PLACE_STINGERS.has(this.stingerKey)) return;
    this.stingerKey = null;
    if (this.pendingStinger) {
      this.pendingStinger = null;
      return;
    }
    const a = this.music;
    if (this.phase !== 'stinger' || !a) return;
    this.fade(a, true, LEAVE_SECONDS, () => {
      if (this.music !== a) return;
      this.dropMusic();
      this.phase = 'idle';
      if (!this.stopped) this.rest();
    });
  }

  // ---- music ---------------------------------------------------------------

  /**
   * Begin the rotation: a rest first, then the first piece fades in. If a
   * stinger is playing, the rotation waits for it to finish.
   */
  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.startKeepAlive();
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
    if (this.keepAlive) {
      this.keepAlive.pause();
      this.keepAlive.src = '';
      this.keepAlive = null;
    }
  }

  /** The silent loop (see SILENCE_URI): the output stream stays open between sounds. */
  private startKeepAlive(): void {
    if (this.keepAlive) return;
    const a = this.createAudio(SILENCE_URI);
    a.loop = true;
    a.volume = 1;
    this.keepAlive = a;
    void a.play().catch(() => {
      if (this.keepAlive === a) this.keepAlive = null;
    });
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
    a.muted = this.musicOff();
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

  private fade(a: AudioLike, out: boolean, seconds = FADE_SECONDS, onDone?: () => void): void {
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    this.fadeStart = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - this.fadeStart) / 1000;
      const g = fadeGain(elapsed, seconds, out);
      a.volume = g * this.musicVolume();
      if (elapsed >= seconds && this.fadeTimer) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;
        onDone?.();
      }
    };
    tick();
    this.fadeTimer = setInterval(tick, 50);
  }
}
