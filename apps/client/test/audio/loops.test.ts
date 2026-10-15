import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPlayer, FADE_SECONDS, REST_SECONDS, type AudioLike } from '../../src/audio/player';
import { MUSIC_LOOPS, loopFor, type MusicLoop } from '../../src/audio/loops';

class FakeAudio implements AudioLike {
  volume = 1;
  muted = false;
  duration = 30;
  currentTime = 0;
  loop = false;
  playing = false;
  constructor(
    public src: string,
    public seamless: MusicLoop | null = null,
  ) {}
  play(): Promise<void> {
    this.playing = true;
    return Promise.resolve();
  }
  pause(): void {
    this.playing = false;
  }
  addEventListener(): void {}
}

const NAMES = {
  '5': 'random music',
  '7': 'random music',
  '6': 'Main Theme',
  '9': 'Start of turn music',
  '10': 'New game screen',
  overrides: { music: [5, 7], theme: 6, startTurn: 9, newGame: 10 },
};

function make(webAudio = true) {
  const made: FakeAudio[] = [];
  const keep = (a: FakeAudio) => (made.push(a), a);
  const player = new AudioPlayer(
    () => 0.1,
    (src) => keep(new FakeAudio(src)),
    undefined,
    (src, loop) => (webAudio ? keep(new FakeAudio(src, loop)) : null),
  );
  (globalThis as { fetch?: unknown }).fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(NAMES) });
  const playing = () => made.filter((a) => a.playing && a.src !== '' && !a.src.startsWith('data:'));
  return { player, playing };
}

describe('music loops', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => null, setItem: () => undefined };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds the original loop points: start of turn whole, new game after its intro', () => {
    expect(loopFor(9)).toEqual({ start: 0, end: 955 / 60 });
    expect(loopFor(10)!.start).toBeCloseTo(9.58, 2);
    expect(loopFor(10)!.end).toBeCloseTo(33.6, 2);
    expect(loopFor(6)).toBeNull();
    for (const l of Object.values(MUSIC_LOOPS)) expect(l.start).toBeLessThan(l.end);
  });

  it('plays a looping piece seamlessly until its moment is over, then the rotation returns', async () => {
    const { player, playing } = make();
    await player.load();
    player.start();
    player.play('startTurn');
    const piece = playing()[0]!;
    expect(piece.seamless).toEqual(MUSIC_LOOPS[9]);
    vi.advanceTimersByTime(120_000);
    expect(playing()).toEqual([piece]);
    player.finish('startTurn');
    vi.advanceTimersByTime(FADE_SECONDS * 1000 + 100);
    expect(playing()).toHaveLength(0);
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    expect(playing()).toHaveLength(1);
    expect(playing()[0]!.seamless).toBeNull();
  });

  it('leaves the music alone when another moment finishes', async () => {
    const { player, playing } = make();
    await player.load();
    player.play('newGame');
    player.finish('startTurn');
    vi.advanceTimersByTime(FADE_SECONDS * 1000 + 100);
    expect(playing()).toHaveLength(1);
    expect(playing()[0]!.seamless).toEqual(MUSIC_LOOPS[10]);
  });

  it('plays the theme once, as before', async () => {
    const { player, playing } = make();
    await player.load();
    player.play('theme');
    expect(playing()[0]!.seamless).toBeNull();
    expect(playing()[0]!.loop).toBe(false);
  });

  it('loops the whole file where the browser has no Web Audio', async () => {
    const { player, playing } = make(false);
    await player.load();
    player.play('newGame');
    expect(playing()[0]!.loop).toBe(true);
  });
});
