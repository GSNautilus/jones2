import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetLoader, localAssets, type AssetSource } from '../../src/audio/assets';
import { AudioPlayer, DUCK, REST_SECONDS, type AudioLike } from '../../src/audio/player';

/**
 * The player against the private bucket: nothing is playable until its file
 * has downloaded. Each download here waits until the test releases it, so
 * the moments in between can be checked.
 */

class FakeAudio implements AudioLike {
  volume = 1;
  muted = false;
  duration = 30;
  currentTime = 0;
  loop = false;
  playing = false;
  private listeners = new Map<string, Array<() => void>>();
  constructor(public src: string) {}
  play(): Promise<void> {
    this.playing = true;
    return Promise.resolve();
  }
  pause(): void {
    this.playing = false;
  }
  addEventListener(type: string, fn: () => void): void {
    (this.listeners.get(type) ?? this.listeners.set(type, []).get(type)!).push(fn);
  }
  fire(type: string): void {
    if (type === 'ended' || type === 'error') this.playing = false;
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
}

const NAMES = {
  '5': 'random music',
  '6': 'Main Theme',
  '9': 'door',
  '41': 'university',
  overrides: { music: [5], theme: 6, university: 41, door: 9 },
};
const VOICES = {
  greetings: { bank: [300, 301] },
  quotes: { bank: { 'Pay Rent': [310] } },
  cards: { weekend: [{ line: 500, text: 'x' }] },
  unresolved: [999],
};

type Tagged = Blob & { path?: string };

function make() {
  const waiting = new Map<string, { ok: () => void; fail: () => void }>();
  const asked: string[] = [];
  const source: AssetSource = {
    blob: (path) =>
      new Promise<Blob>((resolve, reject) => {
        asked.push(path);
        const b: Tagged = new Blob([path]);
        b.path = path;
        waiting.set(path, { ok: () => resolve(b), fail: () => reject(new Error('403')) });
      }),
    json: async <T,>(path: string) => (path.endsWith('voices.json') ? VOICES : NAMES) as T,
  };
  const loader = new AssetLoader(source, { stream: false, objectUrl: (b: Tagged) => 'blob:' + b.path });
  const made: FakeAudio[] = [];
  const player = new AudioPlayer(
    () => 0.1,
    (src) => {
      const a = new FakeAudio(src);
      made.push(a);
      return a;
    },
    loader,
  );
  const flush = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  };
  const release = async (path: string, ok = true) => {
    await flush();
    const w = waiting.get(path);
    if (!w) throw new Error(`nothing waiting for ${path}`);
    waiting.delete(path);
    (ok ? w.ok : w.fail)();
    await flush();
  };
  const pending = () => [...waiting.keys()];
  const playing = () => made.filter((a) => a.playing && a.src !== '' && !a.src.startsWith('data:'));
  return { player, made, playing, release, flush, pending, asked, loader };
}

const PIECE = 'audio/ogg/sound_005.ogg';
const THEME = 'audio/ogg/sound_006.ogg';
const UNI = 'audio/ogg/sound_041.ogg';
const LINE = (n: number) => `audio/voice/line_${String(n).padStart(3, '0')}.ogg`;

describe('AudioPlayer with whole-file assets', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => null, setItem: () => undefined };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Rotation running with its one piece downloaded, faded in and playing. */
  async function withMusic() {
    const t = make();
    await t.player.load();
    await t.player.loadVoices();
    t.player.start();
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    await t.release(PIECE);
    vi.advanceTimersByTime(3000);
    return { ...t, piece: t.playing()[0]! };
  }

  it('plays a rotation piece once its download lands, from the object URL', async () => {
    const t = make();
    await t.player.load();
    t.player.start();
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    expect(t.playing()).toHaveLength(0);
    await t.release(PIECE);
    expect(t.playing().map((a) => a.src)).toEqual(['blob:' + PIECE]);
  });

  it('ducks the music as soon as a line is asked for, before it has downloaded', async () => {
    const { player, piece, release, playing } = await withMusic();
    expect(piece.volume).toBeCloseTo(0.5, 2);
    player.speak(301);
    expect(piece.volume).toBeCloseTo(0.5 * DUCK, 3);
    await release(LINE(301));
    expect(playing().map((a) => a.src)).toContain('blob:' + LINE(301));
  });

  it('a line cut off while downloading never plays, and the duck lifts', async () => {
    const { player, piece, release, playing } = await withMusic();
    player.speak(301);
    player.hush();
    expect(piece.volume).toBeCloseTo(0.5, 2);
    await release(LINE(301));
    expect(playing()).toEqual([piece]);
  });

  it('a new line replaces one still downloading', async () => {
    const { player, release, playing, piece } = await withMusic();
    player.speak(301);
    player.speak(302);
    await release(LINE(302));
    await release(LINE(301));
    expect(playing().map((a) => a.src)).toEqual([piece.src, 'blob:' + LINE(302)]);
  });

  it('a failed line download lifts the duck and plays the stinger it was holding', async () => {
    const { player, piece, release, playing } = await withMusic();
    player.speak(301);
    player.play('theme');
    expect(piece.volume).toBeCloseTo(0.5 * DUCK, 3);
    await release(LINE(301), false);
    await release(THEME);
    expect(playing().map((a) => a.src)).toEqual(['blob:' + THEME]);
  });

  it('leaving the university before its music has downloaded keeps it from ever starting', async () => {
    const { player, release, playing, piece } = await withMusic();
    player.play('university');
    expect(piece.playing).toBe(false);
    player.leave();
    await release(UNI);
    expect(playing()).toHaveLength(0);
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    await Promise.resolve();
    // the rotation is back, straight from memory: no second download
    expect(playing().map((a) => a.src)).toEqual(['blob:' + PIECE]);
  });

  it('stop() while a piece downloads keeps it silent', async () => {
    const t = make();
    await t.player.load();
    t.player.start();
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    t.player.stop();
    await t.release(PIECE);
    expect(t.playing()).toHaveLength(0);
  });

  it('prefetch pulls the music, the stingers and every labelled line, not the unlabelled ones', async () => {
    const t = make();
    await t.player.load();
    await t.player.loadVoices();
    const done = t.player.prefetch();
    for (let i = 0; i < 50; i++) {
      await t.flush();
      if (t.pending().length === 0) break;
      for (const p of t.pending()) await t.release(p);
    }
    expect(await done).toBe(7);
    for (const p of [PIECE, THEME, UNI, LINE(300), LINE(301), LINE(310), LINE(500)]) expect(t.loader.has(p)).toBe(true);
    expect(t.asked).not.toContain(LINE(999));
    expect(t.asked).not.toContain('audio/ogg/sound_009.ogg'); // effects are preload()'s job
  });

  it("prefetchPlace pulls one place's lines ahead of the rest", async () => {
    const t = make();
    await t.player.load();
    await t.player.loadVoices();
    t.player.prefetchPlace('bank');
    await t.flush();
    expect(t.pending().sort()).toEqual([LINE(300), LINE(301), LINE(310)]);
  });

  it('prefetch does nothing when the files stream from beside the page', async () => {
    (globalThis as { fetch?: unknown }).fetch = () => Promise.reject(new Error('should not fetch'));
    const player = new AudioPlayer(() => 0.1, (src) => new FakeAudio(src), localAssets());
    expect(await player.prefetch()).toBe(0);
    player.prefetchPlace('bank');
  });
});
