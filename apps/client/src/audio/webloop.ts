/**
 * A seamless loop for the pieces in `loops.ts`. An <audio> element can only
 * loop the whole file, with a gap on most browsers, and the renders carry a
 * reverb tail past the song's end; Web Audio repeats [start, end) to the
 * sample. Shaped like the player's AudioLike, so fades, ducking and mute work
 * through `volume` and `muted` as they do for any other music.
 */
import type { MusicLoop } from './loops';
import type { AudioLike } from './player';

let shared: AudioContext | null = null;
const decoded = new Map<string, Promise<AudioBuffer>>();

function context(): AudioContext | null {
  if (shared) return shared;
  const Ctor = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  shared = ctx;
  // A context made before the first click starts suspended; the first click or key wakes it.
  const wake = () => {
    void ctx.resume().catch(() => undefined);
    window.removeEventListener('pointerdown', wake);
    window.removeEventListener('keydown', wake);
  };
  window.addEventListener('pointerdown', wake);
  window.addEventListener('keydown', wake);
  return ctx;
}

function decode(ctx: AudioContext, src: string): Promise<AudioBuffer> {
  let p = decoded.get(src);
  if (!p) {
    p = fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${src}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((bytes) => ctx.decodeAudioData(bytes));
    decoded.set(src, p);
    p.catch(() => decoded.delete(src));
  }
  return p;
}

class WebLoop implements AudioLike {
  private readonly gain: GainNode;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private level = 1;
  private silent = false;
  private dropped = false;
  private readonly listeners = new Map<string, (() => void)[]>();

  constructor(
    private readonly ctx: AudioContext,
    private url: string,
    private readonly region: MusicLoop,
  ) {
    this.gain = ctx.createGain();
    this.gain.connect(ctx.destination);
  }

  get src(): string {
    return this.url;
  }
  set src(v: string) {
    this.url = v;
    if (!v) this.pause();
  }
  get volume(): number {
    return this.level;
  }
  set volume(v: number) {
    this.level = v;
    this.applyGain();
  }
  get muted(): boolean {
    return this.silent;
  }
  set muted(v: boolean) {
    this.silent = v;
    this.applyGain();
  }
  get duration(): number {
    return this.buffer?.duration ?? NaN;
  }
  currentTime = 0;

  private applyGain(): void {
    // A short glide, so the player's 50 ms fade steps do not click.
    this.gain.gain.setTargetAtTime(this.silent ? 0 : this.level, this.ctx.currentTime, 0.015);
  }

  async play(): Promise<void> {
    try {
      // Allowed once the page has had a click; until then the wake listeners in `context` do it.
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
      const buffer = await decode(this.ctx, this.url);
      if (this.dropped) return;
      this.buffer = buffer;
      const s = this.ctx.createBufferSource();
      s.buffer = buffer;
      s.loop = true;
      s.loopStart = this.region.start;
      s.loopEnd = Math.min(this.region.end, buffer.duration);
      s.connect(this.gain);
      s.start();
      this.source = s;
    } catch (e) {
      if (!this.dropped) for (const fn of this.listeners.get('error') ?? []) fn();
      throw e;
    }
  }

  pause(): void {
    this.dropped = true;
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this.gain.disconnect();
  }

  addEventListener(type: string, fn: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
}

/** A looping piece through Web Audio, or null where the browser has none (the caller falls back). */
export function createWebLoop(src: string, loop: MusicLoop): AudioLike | null {
  const ctx = context();
  return ctx ? new WebLoop(ctx, src, loop) : null;
}
