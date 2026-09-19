import { describe, expect, it } from 'vitest';
import { CAPTION_CHARS, CAPTION_LINES, parseMarker, placeCaption, tokenBig, tokenLabel, wrapCaption } from '../../src/map/figures';

describe('wrapCaption', () => {
  it('keeps a short caption on one line', () => {
    expect(wrapCaption('Worked a shift')).toEqual(['Worked a shift']);
  });

  it('wraps at word boundaries within the width and loses nothing', () => {
    const caption = 'Applied for a job at the Factory as a Janitor';
    const lines = wrapCaption(caption);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(CAPTION_CHARS);
    expect(lines.join(' ')).toBe(caption);
  });

  it('cuts a long caption at the line limit and marks the cut', () => {
    const lines = wrapCaption('word '.repeat(40));
    expect(lines).toHaveLength(CAPTION_LINES);
    expect(lines[CAPTION_LINES - 1]!.endsWith('..')).toBe(true);
    expect(lines[CAPTION_LINES - 1]!.length).toBeLessThanOrEqual(CAPTION_CHARS);
  });

  it('splits a word longer than a line', () => {
    const lines = wrapCaption('x'.repeat(30));
    expect(lines[0]).toHaveLength(CAPTION_CHARS);
    expect(lines[1]).toHaveLength(8);
  });

  it('yields nothing for an empty caption', () => {
    expect(wrapCaption('   ')).toEqual([]);
  });
});

describe('tokens', () => {
  it('draws only the emphasised, non-ghost token large', () => {
    expect(tokenBig({ emphasis: true, ghost: false })).toBe(true);
    expect(tokenBig({ emphasis: true, ghost: true })).toBe(false);
    expect(tokenBig({ emphasis: false, ghost: false })).toBe(false);
  });

  it('round-trips a token label through the marker convention', () => {
    expect(parseMarker(tokenLabel(3, 'Bob'))).toEqual({ kind: 'token', n: 3, name: 'Bob' });
  });
});

describe('placeCaption', () => {
  it('sits just above the plate when nothing is in the way', () => {
    const r = placeCaption(100, 50, 40, 9, []);
    expect(r).toEqual({ x: 80, y: 38, w: 40, h: 9 });
  });

  it('climbs above a bubble it would cover, so two players at one door both read', () => {
    const placed = [placeCaption(100, 50, 60, 9, [])];
    const second = placeCaption(120, 50, 60, 9, placed);
    expect(second.y + second.h).toBeLessThanOrEqual(placed[0]!.y);
    const third = placeCaption(110, 50, 60, 9, [...placed, second]);
    expect(third.y + third.h).toBeLessThanOrEqual(second.y);
  });

  it('leaves a bubble that does not overlap where it is', () => {
    const placed = [placeCaption(100, 50, 40, 9, [])];
    const far = placeCaption(300, 50, 40, 9, placed);
    expect(far.y).toBe(placed[0]!.y);
  });
});
