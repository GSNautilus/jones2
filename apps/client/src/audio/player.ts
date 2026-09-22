/**
 * The audio player: sound effects on demand, and background music that
 * rotates through the named pieces with a fade at each end and a rest between
 * them. Volume and mute are remembered per browser.
 *
 * Browsers only start audio after the player has clicked something; the
 * START GAME button is that click, so the game screen can start the music
 * as soon as it mounts.
 */
import { localAssets, type AssetLoader } from './assets';
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
  /** A clerk's line is under way: playing, or still downloading. Ducks the music. */
  private talking = false;
  /** Bumped whenever the voice is cut, so a line that finishes downloading late stays silent. */
  private voiceTurn = 0;
  /** Bumped whenever the music is dropped, for the same reason. */
  private musicTurn = 0;
  /** A stinger that arrived while a clerk was speaking; plays when the line ends. */
  private pendingStinger: { n: number; key: SfxKey } | null = null;
  /** Which moment the playing (or pending) stinger is for. */
  private stingerKey: SfxKey | null = null;
  /** The silent loop that keeps the output stream open while the player runs. */
  private keepAlive: AudioLike | null = null;
  private readonly random: () => number;
  private readonly createAudio: (src: string) => AudioLike;
  private assets: AssetLoader;

  constructor(
    random: () => number = Math.random,
    createAudio: (src: string) => AudioLike = (src) => new Audio(src),
    assets: AssetLoader = localAssets(),
  ) {
    this.random = random;
    this.createAudio = createAudio;
    this.assets = assets;
  }

  /** Switch where the files come from (the Supabase bucket once a seat is signed in). Call before `load`. */
  useAssets(assets: AssetLoader): void {
    this.assets = assets;
  }

  /**
   * Hand `go` a playable URL for `path`: at once when the file is in hand (or
   * streamable), otherwise after it downloads. Callers guard `go` against
   * having been cut off in the meantime.
   */
  private withSrc(path: string, go: (src: string) => void, fail: () => void): void {
    const now = this.assets.peek(path);
    if (now !== undefined) {
      go(now);
      return;
    }
    this.assets.url(path).then(go, fail);
  }

  /** What is playing now, for tests and the report. */
  get state(): { phase: Phase; src: string | null; voice: string | null } {
    return { phase: this.phase, src: this.music?.src ?? null, voice: this.voice?.src ?? null };
  }

  /** Stop and drop the current music element, whatever it is. */
  private dropMusic(): void {
    this.musicTurn++;
    if (!this.music) return;
    const a = this.music;
    this.music = null;
    a.pause();
    a.src = '';
  }

  /** Load `names.json` and build the map. Safe to call again; silent on failure. */
  async load(path = 'audio/names.json'): Promise<SoundMap> {
    try {
      this.map = resolveMap(await this.assets.json<NamesFile>(path));
    } catch {
      this.map = { sfx: {}, music: [], unmatched: [] };
    }
    return this.map;
  }

  get soundMap(): SoundMap {
    return this.map;
  }

  /** Every effect's file (not the stingers, which are music). */
  private effectFiles(): string[] {
    const numbers = new Set<number>();
    for (const [key, list] of Object.entries(this.map.sfx)) {
      if (STINGERS.has(key as SfxKey)) continue;
      for (const n of list ?? []) numbers.add(n);
    }
    return [...numbers].map(fileFor);
  }

  /**
   * Fetch every effect (not the music, not the 533 voice lines) into memory
   * once, so a play starts at once instead of after a round trip to the
   * server. Safe to call again. Returns how many are in memory.
   */
  async preload(): Promise<number> {
    return this.assets.warmAll(this.effectFiles());
  }

  /**
   * Whole-file mode only (the private bucket): pull the rest down in the
   * background, music first, then every labelled voice line. Each file lands
   * in the browser's cache, so this costs a download once per device. A no-op
   * when the files stream from beside the page.
   */
  async prefetch(): Promise<number> {
    if (this.assets.stream) return 0;
    const music = new Set<number>(this.map.music);
    for (const key of STINGERS) for (const n of this.map.sfx[key] ?? []) music.add(n);
    const lines = new Set<number>();
    const v = this.voiceMap;
    for (const list of Object.values(v.greetings)) for (const n of list) lines.add(n);
    for (const groups of Object.values(v.quotes)) for (const list of Object.values(groups)) for (const n of list) lines.add(n);
    for (const list of Object.values(v.cards)) for (const c of list) lines.add(c.line);
    return this.assets.warmAll([...[...music].map(fileFor), ...[...lines].map(voiceFile)], 3);
  }

  /** A place's spoken lines, fetched ahead of the background queue as the player walks in. */
  prefetchPlace(loc: string): void {
    if (this.assets.stream) return;
    const lines = [...(this.voiceMap.greetings[loc] ?? []), ...Object.values(this.voiceMap.quotes[loc] ?? {}).flat()];
    void this.assets.warmAll(lines.map(voiceFile));
  }

  /** Load `voices.json` (the labelled spoken lines). Silent on failure. */
  async loadVoices(path = 'audio/voices.json'): Promise<VoicesFile> {
    try {
      this.voiceMap = { ...EMPTY_VOICES, ...(await this.assets.json<Partial<VoicesFile>>(path)) };
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
    return this.settings.music * (this.talking ? DUCK : 1);
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
    const turn = this.voiceTurn;
    this.talking = true; // duck now, even while the line downloads
    this.applyMusicVolume();
    const done = () => {
      if (turn !== this.voiceTurn) return;
      this.voice = null;
      this.talking = false;
      if (rest.length) {
        this.speak(rest); // the next sentence of the same answer
        return;
      }
      this.applyMusicVolume();
      const p = this.pendingStinger;
      this.pendingStinger = null;
      if (p) this.stinger(p.n, p.key);
    };
    this.withSrc(
      voiceFile(first),
      (src) => {
        if (turn !== this.voiceTurn) return;
        const a = this.createAudio(src);
        a.volume = this.settings.voice;
        this.voice = a;
        a.addEventListener('ended', done);
        a.addEventListener('error', done);
        void a.play().catch(done);
      },
      done,
    );
  }

  /** Stop the clerk mid-sentence (the window closed). */
  hush(): void {
    this.dropVoice();
    this.applyMusicVolume();
  }

  private dropVoice(): void {
    this.voiceTurn++;
    this.talking = false;
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
    this.withSrc(
      fileFor(n),
      (src) => {
        const a = this.createAudio(src);
        a.volume = this.settings.sfx;
        void a.play().catch(() => undefined);
      },
      () => undefined,
    );
  }

  /**
   * A piece of music for a moment: whatever music is playing stops, the
   * stinger plays alone, and the rotation (if it is running) picks up again
   * after the usual rest. While a stinger plays nothing else may start.
   */
  private stinger(n: number, key: SfxKey): void {
    this.stingerKey = key;
    if (this.talking) {
      this.pendingStinger = { n, key };
      return;
    }
    this.clearTimers();
    this.dropMusic();
    this.phase = 'stinger';
    const turn = this.musicTurn;
    const gone = () => {
      if (turn !== this.musicTurn) return;
      this.phase = 'idle';
      if (!this.stopped) this.rest();
    };
    this.withSrc(
      fileFor(n),
      (src) => {
        if (turn !== this.musicTurn) return;
        const a = this.createAudio(src);
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
      },
      gone,
    );
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
    if (this.phase !== 'stinger') return;
    if (!a) {
      // still downloading: never let it start
      this.dropMusic();
      this.phase = 'idle';
      if (!this.stopped) this.rest();
      return;
    }
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
    this.phase = 'playing';
    const turn = this.musicTurn;
    this.withSrc(
      fileFor(n),
      (src) => {
        if (turn !== this.musicTurn || this.phase !== 'playing') return;
        const a = this.createAudio(src);
        a.muted = this.musicOff();
        a.volume = 0;
        this.music = a;
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
      },
      () => {
        if (turn === this.musicTurn && this.phase === 'playing') this.rest();
      },
    );
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
