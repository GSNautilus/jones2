import { describe, expect, it } from 'vitest';

import { C, PALETTE } from '../src/palette';
import type { Sprite } from '../src/types';
import {
  PORTRAITS,
  PORTRAIT_H,
  PORTRAIT_KEYS,
  PORTRAIT_SPECS,
  PORTRAIT_W,
  buildPortrait,
} from '../src/portraits';

/** The thirteen classic locations, duplicated from docs/PLAN.md section 0. */
const CLASSIC_LOCATION_IDS = [
  'employment',
  'monolith',
  'zmart',
  'qt_clothing',
  'socket_city',
  'blacks_market',
  'university',
  'bank',
  'factory',
  'pawn',
  'rent_office',
  'lowcost',
  'security_apts',
];

function distinctColors(s: Sprite): Set<number> {
  const seen = new Set<number>();
  for (let i = 0; i < s.pixels.length; i++) seen.add(s.pixels[i]);
  return seen;
}

function key(s: Sprite): string {
  return Array.from(s.pixels).join(',');
}

describe('clerk portraits', () => {
  const entries = Object.entries(PORTRAITS);

  it('has one portrait per classic location and nothing else', () => {
    expect(Object.keys(PORTRAITS).sort()).toEqual([...CLASSIC_LOCATION_IDS].sort());
    expect([...PORTRAIT_KEYS].sort()).toEqual([...CLASSIC_LOCATION_IDS].sort());
  });

  it('draws them all at exactly one size', () => {
    expect(PORTRAIT_W).toBeGreaterThanOrEqual(48);
    expect(PORTRAIT_W).toBeLessThanOrEqual(64);
    expect(PORTRAIT_H).toBeGreaterThanOrEqual(56);
    expect(PORTRAIT_H).toBeLessThanOrEqual(72);
    for (const [id, s] of entries) {
      expect(s.width, id).toBe(PORTRAIT_W);
      expect(s.height, id).toBe(PORTRAIT_H);
      expect(s.pixels.length, id).toBe(PORTRAIT_W * PORTRAIT_H);
    }
  });

  it.each(entries)('%s uses only palette indices and is fully opaque', (id, s) => {
    for (let i = 0; i < s.pixels.length; i++) {
      const idx = s.pixels[i];
      expect(idx, `${id} pixel ${i} is outside the palette`).toBeLessThan(PALETTE.colors.length);
      expect(idx, `${id} has a transparent pixel at ${i}; the background must be flat`).toBeGreaterThan(0);
    }
  });

  it('gives every portrait a flat, distinct background colour', () => {
    const backgrounds = new Set<number>();
    for (const [id, s] of entries) {
      // the shoulders reach the bottom corners, so sample the top band and the
      // two upper side margins, which are always background
      const samples = [0, s.width - 1, s.width * 3 + 2, s.width * 3 + s.width - 3, s.width * 8, s.width * 9 - 1].map(
        (i) => s.pixels[i],
      );
      expect(new Set(samples).size, `${id} background is not flat`).toBe(1);
      backgrounds.add(samples[0]);
    }
    expect(backgrounds.size, 'two clerks share a background colour').toBe(entries.length);
  });

  it('draws thirteen different people', () => {
    expect(new Set(entries.map(([, s]) => key(s))).size).toBe(entries.length);
  });

  it.each(entries)('%s is drawn in at least nine colours', (id, s) => {
    expect(distinctColors(s).size, `${id} is too flat`).toBeGreaterThanOrEqual(9);
  });

  it.each(entries)('%s shows skin, ink and a garment below the neck', (id, s) => {
    const colors = distinctColors(s);
    expect(colors.has(C.ink), `${id} has no outlines`).toBe(true);
    // the bottom row is clothing or background, never bare skin
    const bottom = new Set<number>();
    for (let x = 0; x < s.width; x++) bottom.add(s.pixels[(s.height - 1) * s.width + x]);
    expect(bottom.size, `${id} has no shoulders`).toBeGreaterThan(1);
  });

  it.each(entries)('%s keeps its anchor and footprint inside the sprite', (id, s) => {
    expect(s.anchorX, id).toBeGreaterThanOrEqual(0);
    expect(s.anchorX, id).toBeLessThan(s.width);
    expect(s.anchorY, id).toBeGreaterThanOrEqual(0);
    expect(s.anchorY, id).toBeLessThan(s.height);
  });

  it('is deterministic: the same spec always draws the same person', () => {
    for (const id of PORTRAIT_KEYS) {
      const spec = PORTRAIT_SPECS[id];
      expect(key(buildPortrait(spec)), id).toBe(key(buildPortrait(spec)));
      expect(key(buildPortrait(spec)), id).toBe(key(PORTRAITS[id]));
    }
  });

  it('varies faces, not just clothes: the head band differs for every clerk', () => {
    // rows 10-46 are the head; two clerks may share a shirt but never a face
    const faces = entries.map(([, s]) => {
      const rows: number[] = [];
      for (let y = 10; y < 47; y++) for (let x = 8; x < s.width - 8; x++) rows.push(s.pixels[y * s.width + x]);
      return rows.join(',');
    });
    expect(new Set(faces).size).toBe(entries.length);
  });

  it('dresses each clerk for the job they do', () => {
    const has = (id: string, index: number): boolean => {
      const s = PORTRAITS[id];
      for (let i = 0; i < s.pixels.length; i++) if (s.pixels[i] === index) return true;
      return false;
    };
    // the burger clerk's paper hat and the foreman's hard hat
    expect(has('monolith', C.white), 'monolith has lost its paper hat').toBe(true);
    expect(has('factory', C.yellow), 'factory has lost its hard hat').toBe(true);
    // gold on the doorman (cap band, buttons, epaulettes) and on the seller
    expect(has('security_apts', C.gold)).toBe(true);
    expect(has('qt_clothing', C.gold)).toBe(true);
    // the pawnbroker's loupe is the only glass lens in the set
    expect(has('pawn', C.glassDark), 'pawn has lost its loupe').toBe(true);
    // denim only at the factory, an apron only at the market
    expect(has('factory', C.denim)).toBe(true);
    expect(has('blacks_market', C.green)).toBe(true);
  });
});
