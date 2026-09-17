import { describe, expect, it } from 'vitest';
import { assignTokens, seatOf, tokenColor, tokenNumber, tokenSpriteKey } from '../../src/classic/tokens';
import { CLOSED_LABEL, parseMarker, tokenLabel } from '../../src/map/figures';

describe('token assignment', () => {
  it('numbers seats 1..4 in turn order', () => {
    const order = ['p0', 'p1', 'p2', 'p3'];
    const t = assignTokens(order);
    expect(order.map((id) => t[id]!.token)).toEqual([1, 2, 3, 4]);
    expect(order.map((id) => t[id]!.seat)).toEqual([0, 1, 2, 3]);
  });

  it('gives every seat its own colour', () => {
    const colours = [0, 1, 2, 3].map(tokenColor);
    expect(new Set(colours).size).toBe(4);
    for (const c of colours) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('wraps a fifth seat rather than breaking', () => {
    expect(tokenNumber(4)).toBe(1);
    expect(tokenNumber(-1)).toBe(4);
    expect(tokenSpriteKey(2)).toBe('token_3');
  });

  it('finds a player s seat, and falls back to the first', () => {
    expect(seatOf(['a', 'b', 'c'], 'c')).toBe(2);
    expect(seatOf(['a', 'b'], 'zz')).toBe(0);
  });
});

describe('figure markers (the renderer contract stays as it is)', () => {
  it('round-trips a token label', () => {
    expect(parseMarker(tokenLabel(2, 'Bob'))).toEqual({ kind: 'token', n: 2, name: 'Bob' });
    expect(parseMarker(tokenLabel(1, ''))).toEqual({ kind: 'token', n: 1, name: '' });
  });

  it('recognises the CLOSED board', () => {
    expect(parseMarker(CLOSED_LABEL)).toEqual({ kind: 'closed', name: '' });
  });

  it('leaves an ordinary name alone', () => {
    expect(parseMarker('Ann')).toBeNull();
    expect(parseMarker('#hashtag')).toBeNull();
    expect(parseMarker('')).toBeNull();
  });
});
