import { describe, expect, it } from 'vitest';

import { C } from '../src/palette';
import type { Sprite } from '../src/types';
import { UI, type SliceInsets } from '../src/ui/catalogue';
import { BUBBLE_INSETS, FRAME_INSETS, PLATE_INSETS, TOKENS, TOKEN_COLORS, TOKEN_SIZE } from '../src/ui/classic';

const SLICES: Array<[string, SliceInsets]> = [
  ['window_frame', FRAME_INSETS],
  ['bubble', BUBBLE_INSETS],
  ['title_plate', PLATE_INSETS],
];

function usesIndex(s: Sprite, index: number): boolean {
  for (let i = 0; i < s.pixels.length; i++) if (s.pixels[i] === index) return true;
  return false;
}

function countPixels(s: Sprite): number {
  let n = 0;
  for (let i = 0; i < s.pixels.length; i++) if (s.pixels[i] !== 0) n++;
  return n;
}

describe('classic window furniture', () => {
  it('registers every classic sprite in UI', () => {
    for (const key of ['window_frame', 'bubble', 'bubble_tail_r', 'bubble_tail_l', 'title_plate', 'sign_closed']) {
      expect(UI[key], `missing ui sprite ${key}`).toBeTruthy();
    }
  });

  it.each(SLICES)('%s has insets that leave a centre to stretch', (key, ins) => {
    const s = UI[key];
    for (const side of [ins.top, ins.right, ins.bottom, ins.left]) expect(side).toBeGreaterThan(0);
    expect(s.width, key).toBeGreaterThan(ins.left + ins.right);
    expect(s.height, key).toBeGreaterThan(ins.top + ins.bottom);
  });

  it.each(SLICES)('%s has edge strips that are uniform along their length', (key, ins) => {
    const s = UI[key];
    // top and bottom strips repeat across x, left and right strips repeat down y
    for (let y = 0; y < ins.top; y++) {
      const ref = s.pixels[y * s.width + ins.left];
      for (let x = ins.left; x < s.width - ins.right; x++) {
        expect(s.pixels[y * s.width + x], `${key} top strip varies at ${x},${y}`).toBe(ref);
      }
    }
    for (let y = s.height - ins.bottom; y < s.height; y++) {
      const ref = s.pixels[y * s.width + ins.left];
      for (let x = ins.left; x < s.width - ins.right; x++) {
        expect(s.pixels[y * s.width + x], `${key} bottom strip varies at ${x},${y}`).toBe(ref);
      }
    }
    for (let x = 0; x < ins.left; x++) {
      const ref = s.pixels[ins.top * s.width + x];
      for (let y = ins.top; y < s.height - ins.bottom; y++) {
        expect(s.pixels[y * s.width + x], `${key} left strip varies at ${x},${y}`).toBe(ref);
      }
    }
    for (let x = s.width - ins.right; x < s.width; x++) {
      const ref = s.pixels[ins.top * s.width + x];
      for (let y = ins.top; y < s.height - ins.bottom; y++) {
        expect(s.pixels[y * s.width + x], `${key} right strip varies at ${x},${y}`).toBe(ref);
      }
    }
  });

  it('frames the window more heavily than the plain panel', () => {
    expect(FRAME_INSETS.left).toBeGreaterThan(8);
    expect(UI.window_frame.width).toBeGreaterThan(UI.panel.width);
    // brass beads on a wood ground, with a stud in each corner
    for (const index of [C.gold, C.goldDark, C.wood, C.woodDark, C.ink]) {
      expect(usesIndex(UI.window_frame, index)).toBe(true);
    }
  });

  it('keeps the bubble light and the plate dark, so text reads on both', () => {
    const centre = (s: Sprite): number => s.pixels[(s.height >> 1) * s.width + (s.width >> 1)];
    expect(centre(UI.bubble)).toBe(C.cream);
    expect(centre(UI.title_plate)).toBe(C.maroon);
    // rounded corners: the bubble's very corner is transparent, the frame's is not
    expect(UI.bubble.pixels[0]).toBe(0);
    expect(UI.window_frame.pixels[0]).not.toBe(0);
  });

  it('mirrors the bubble tail and points it out of the bubble', () => {
    const r = UI.bubble_tail_r;
    const l = UI.bubble_tail_l;
    expect(l.width).toBe(r.width);
    expect(l.height).toBe(r.height);
    for (let y = 0; y < r.height; y++) {
      for (let x = 0; x < r.width; x++) {
        expect(l.pixels[y * l.width + x]).toBe(r.pixels[y * r.width + (r.width - 1 - x)]);
      }
    }
    // wide where it joins the bubble, a point at the far end
    const column = (s: Sprite, x: number): number => {
      let n = 0;
      for (let y = 0; y < s.height; y++) if (s.pixels[y * s.width + x] !== 0) n++;
      return n;
    };
    expect(column(r, 0)).toBeGreaterThan(column(r, r.width - 1));
    expect(column(r, r.width - 1)).toBeGreaterThan(0);
  });
});

describe('player tokens', () => {
  const entries = Object.entries(TOKENS);

  it('has one token per seat, numbered 1 to 4', () => {
    expect(entries).toHaveLength(4);
    expect(Object.keys(TOKENS)).toEqual(['token_1', 'token_2', 'token_3', 'token_4']);
  });

  it('draws them all at one small size', () => {
    expect(TOKEN_SIZE).toBeGreaterThanOrEqual(12);
    expect(TOKEN_SIZE).toBeLessThanOrEqual(14);
    for (const [name, s] of entries) {
      expect(s.width, name).toBe(TOKEN_SIZE);
      expect(s.height, name).toBe(TOKEN_SIZE);
      expect(countPixels(s), name).toBeGreaterThan(TOKEN_SIZE * TOKEN_SIZE * 0.5);
    }
  });

  it('rings each token in a different colour', () => {
    expect(new Set(TOKEN_COLORS).size).toBe(4);
    entries.forEach(([name, s], i) => {
      expect(usesIndex(s, TOKEN_COLORS[i]), `${name} is missing its ring colour`).toBe(true);
      for (let j = 0; j < 4; j++) {
        if (j === i) continue;
        expect(usesIndex(s, TOKEN_COLORS[j]), `${name} also carries seat ${j + 1}'s colour`).toBe(false);
      }
    });
  });

  it('puts a dark numeral on a light disc inside an ink rim', () => {
    for (const [name, s] of entries) {
      expect(usesIndex(s, C.ink), name).toBe(true);
      expect(usesIndex(s, C.white), name).toBe(true);
      // the rim is ink all the way round, so the token reads on the green map
      const mid = s.height >> 1;
      expect(s.pixels[mid * s.width], name).toBe(C.ink);
      expect(s.pixels[mid * s.width + s.width - 1], name).toBe(C.ink);
    }
    // each numeral is drawn differently
    expect(new Set(entries.map(([, s]) => Array.from(s.pixels).join(','))).size).toBe(4);
  });
});

describe('closed board', () => {
  const s = UI.sign_closed;

  it('is a small hanging board', () => {
    expect(s.width).toBeLessThanOrEqual(30);
    expect(s.height).toBeLessThanOrEqual(16);
    expect(countPixels(s)).toBeGreaterThan(100);
    expect(s.anchorY).toBe(s.height - 1);
  });

  it('carries the sign colours: an ink edge, a brass border and cream lettering on a dark field', () => {
    for (const index of [C.ink, C.gold, C.goldDark, C.maroon, C.cream, C.metalDark]) {
      expect(usesIndex(s, index), `sign_closed is missing palette index ${index}`).toBe(true);
    }
  });

  it('hangs from two chains above the board', () => {
    let chains = 0;
    for (let x = 0; x < s.width; x++) if (s.pixels[x] !== 0) chains++;
    expect(chains).toBeGreaterThanOrEqual(4);
    // the board itself starts below the chains and spans the full width
    for (let x = 0; x < s.width; x++) expect(s.pixels[3 * s.width + x], `board gap at ${x}`).not.toBe(0);
  });
});
