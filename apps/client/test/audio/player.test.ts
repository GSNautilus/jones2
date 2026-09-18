import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPlayer, DUCK, FADE_SECONDS, REST_SECONDS, type AudioLike } from '../../src/audio/player';

/** A fake audio element that records what was asked of it. */
class FakeAudio implements AudioLike {
  volume = 1;
  muted = false;
  duration = 30;
  currentTime = 0;
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

const NAMES = { '5': 'random music', '7': 'random music', '6': 'Main Theme', overrides: { music: [5, 7], theme: 6 } };

function make() {
  const made: FakeAudio[] = [];
  const player = new AudioPlayer(() => 0.1, (src) => {
    const a = new FakeAudio(src);
    made.push(a);
    return a;
  });
  // feed the map without fetch
  (globalThis as { fetch?: unknown }).fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(NAMES) });
  return { player, made, playing: () => made.filter((a) => a.playing && a.src !== '') };
}

describe('AudioPlayer music', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => null, setItem: () => undefined };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays one piece at a time: rest, piece, fade, rest, next piece', async () => {
    const { player, made, playing } = make();
    await player.load();
    player.start();
    expect(playing()).toHaveLength(0);
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    expect(playing()).toHaveLength(1);
    const first = made[0]!;
    first.fire('ended');
    expect(playing()).toHaveLength(0);
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    expect(playing()).toHaveLength(1);
    expect(made[1]!.src).not.toBe(first.src);
  });

  it('never lets the rotation start on top of a stinger, whichever comes first', async () => {
    const { player, made, playing } = make();
    await player.load();
    // stinger first, rotation asked to start during it
    player.play('theme');
    expect(playing()).toHaveLength(1);
    player.start();
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    expect(playing()).toHaveLength(1); // still just the theme
    expect(playing()[0]!.src).toContain('sound_006');
    // theme ends: a rest, then the rotation
    made[0]!.fire('ended');
    expect(playing()).toHaveLength(0);
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    expect(playing()).toHaveLength(1);
    expect(playing()[0]!.src).not.toContain('sound_006');
  });

  it('cuts the playing piece when a stinger arrives and resumes after it', async () => {
    const { player, made, playing } = make();
    await player.load();
    player.start();
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    const piece = playing()[0]!;
    player.play('theme');
    expect(piece.playing).toBe(false);
    expect(playing()).toHaveLength(1);
    expect(playing()[0]!.src).toContain('sound_006');
    made[made.length - 1]!.fire('ended');
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    expect(playing()).toHaveLength(1);
    expect(playing()[0]!.src).not.toContain('sound_006');
  });

  it('fades a piece in over the fade time', async () => {
    const { player, playing } = make();
    await player.load();
    player.start();
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    const a = playing()[0]!;
    expect(a.volume).toBeLessThan(0.1);
    vi.advanceTimersByTime(FADE_SECONDS * 1000 + 100);
    expect(a.volume).toBeCloseTo(0.5, 1);
  });

  it('stop() silences everything', async () => {
    const { player, playing } = make();
    await player.load();
    player.start();
    vi.advanceTimersByTime(REST_SECONDS * 1000 + 10);
    player.stop();
    expect(playing()).toHaveLength(0);
    vi.advanceTimersByTime(60_000);
    expect(playing()).toHaveLength(0);
  });
});

describe('AudioPlayer speech', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => null, setItem: () => undefined };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('speaks one line at a time and ducks the music while it plays', async () => {
    const { player, made, playing } = make();
    await player.load();
    player.start();
    vi.advanceTimersByTime(REST_SECONDS * 1000 + FADE_SECONDS * 1000 + 100);
    const piece = playing()[0]!;
    expect(piece.volume).toBeCloseTo(0.5, 1);
    player.speak(301);
    const line = made[made.length - 1]!;
    expect(line.src).toContain('audio/voice/line_301.ogg');
    expect(line.playing).toBe(true);
    expect(line.volume).toBeCloseTo(0.9, 2);
    expect(piece.volume).toBeCloseTo(0.5 * DUCK, 2);
    // a second line cuts the first
    player.speak(302);
    expect(line.playing).toBe(false);
    expect(playing().map((a) => a.src)).toEqual([piece.src, 'audio/voice/line_302.ogg']);
    made[made.length - 1]!.fire('ended');
    expect(piece.volume).toBeCloseTo(0.5, 2);
    expect(player.state.voice).toBeNull();
  });

  it('speaks a sequence one line after another', async () => {
    const { player, made, playing } = make();
    await player.load();
    player.speak([433, 434]);
    expect(playing().map((a) => a.src)).toEqual(['audio/voice/line_433.ogg']);
    made[0]!.fire('ended');
    expect(playing().map((a) => a.src)).toEqual(['audio/voice/line_434.ogg']);
    made[1]!.fire('ended');
    expect(playing()).toHaveLength(0);
  });

  it('does not speak while muted', async () => {
    const { player, made } = make();
    await player.load();
    player.update({ muted: true });
    player.speak(301);
    expect(made).toHaveLength(0);
  });

  it('holds a stinger until the clerk has finished speaking', async () => {
    const { player, made, playing } = make();
    await player.load();
    player.speak(301);
    const line = made[0]!;
    player.play('theme');
    expect(line.playing).toBe(true);
    expect(playing()).toHaveLength(1);
    line.fire('ended');
    expect(playing()).toHaveLength(1);
    expect(playing()[0]!.src).toContain('sound_006');
  });

  it('hush() stops the line and restores the music', async () => {
    const { player, playing } = make();
    await player.load();
    player.start();
    vi.advanceTimersByTime(REST_SECONDS * 1000 + FADE_SECONDS * 1000 + 100);
    const piece = playing()[0]!;
    player.speak(301);
    expect(piece.volume).toBeCloseTo(0.5 * DUCK, 2);
    player.hush();
    expect(playing()).toHaveLength(1);
    expect(piece.volume).toBeCloseTo(0.5, 2);
  });
});
