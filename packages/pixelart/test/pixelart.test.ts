import { describe, expect, it } from 'vitest';

import { C, PALETTE } from '../src/palette';
import { GLYPH_H, GLYPH_W, drawText, hasGlyph, measureText } from '../src/font';
import { bezierCubic, createSurface, curve, get, strokePolyline } from '../src/surface';
import type { Sprite } from '../src/types';
import { BUILDINGS } from '../src/buildings/catalogue';
import { TILES } from '../src/tiles/catalogue';
import { NATURE } from '../src/nature/catalogue';
import { CHARACTERS, tintCharacter } from '../src/characters/catalogue';
import { SHIRT_KEY } from '../src/palette';

const REQUIRED_NAMES = [
  'ink',
  'white',
  'grass',
  'grassDark',
  'road',
  'roadEdge',
  'roadLine',
  'water',
  'waterDark',
  'sand',
  'cream',
  'creamShade',
  'brick',
  'brickDark',
  'wood',
  'woodDark',
  'stone',
  'stoneDark',
  'glass',
  'glassDark',
  'red',
  'yellow',
  'orange',
  'green',
  'greenDark',
  'blue',
  'blueDark',
  'purple',
  'pink',
  'skin',
  'skinShade',
  'hair',
  'denim',
  'leaf',
  'leafDark',
  'trunk',
];

/** Share of rows whose leftmost and rightmost pixels are an outline colour. */
function silhouetteInkRatio(s: Sprite): number {
  const isInk = (i: number): boolean => i === C.ink || i === C.inkSoft || i === C.shadow;
  let edges = 0;
  let inked = 0;
  for (let y = 0; y < s.height; y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < s.width; x++) {
      if (s.pixels[y * s.width + x] !== 0) {
        if (l < 0) l = x;
        r = x;
      }
    }
    if (l < 0) continue;
    edges += 2;
    if (isInk(s.pixels[y * s.width + l])) inked++;
    if (isInk(s.pixels[y * s.width + r])) inked++;
  }
  return edges === 0 ? 0 : inked / edges;
}

function countPixels(s: Sprite): number {
  let n = 0;
  for (let i = 0; i < s.pixels.length; i++) if (s.pixels[i] !== 0) n++;
  return n;
}

function usesIndex(s: Sprite, index: number): boolean {
  for (let i = 0; i < s.pixels.length; i++) if (s.pixels[i] === index) return true;
  return false;
}

// -------------------------------------------------------------- palette

describe('palette', () => {
  it('reserves index 0 for transparency', () => {
    expect(PALETTE.colors.length).toBeGreaterThan(0);
    expect(PALETTE.names.transparent).toBe(0);
  });

  it('has roughly forty colours', () => {
    expect(PALETTE.colors.length).toBeGreaterThanOrEqual(36);
    expect(PALETTE.colors.length).toBeLessThanOrEqual(64);
  });

  it('names every required entry, and every name points at a real colour', () => {
    for (const name of REQUIRED_NAMES) {
      expect(PALETTE.names[name], `missing palette name ${name}`).toBeGreaterThan(0);
    }
    for (const [name, index] of Object.entries(PALETTE.names)) {
      expect(Number.isInteger(index), `${name} is not an integer index`).toBe(true);
      expect(index, `${name} out of range`).toBeLessThan(PALETTE.colors.length);
      const rgb = PALETTE.colors[index];
      expect(rgb).toHaveLength(3);
      for (const channel of rgb) expect(channel).toBeGreaterThanOrEqual(0);
      for (const channel of rgb) expect(channel).toBeLessThanOrEqual(255);
    }
  });

  it('uses a soft ink rather than pure black for outlines', () => {
    const ink = PALETTE.colors[PALETTE.names.ink];
    expect(ink.some((c) => c > 0)).toBe(true);
    expect(ink.every((c) => c < 90)).toBe(true);
  });

  it('has no duplicate colours', () => {
    const seen = new Set(PALETTE.colors.slice(1).map((c) => c.join(',')));
    expect(seen.size).toBe(PALETTE.colors.length - 1);
  });
});

// -------------------------------------------------------------- buildings

describe('buildings', () => {
  const entries = Object.entries(BUILDINGS);

  it('has all six hero buildings plus the house', () => {
    for (const kind of ['monolith', 'bank', 'zmart', 'university', 'factory', 'house']) {
      expect(BUILDINGS[kind], `missing generator ${kind}`).toBeTypeOf('function');
    }
  });

  it.each(entries)('%s produces a well formed sprite', (_name, gen) => {
    const s = gen();
    expect(s.pixels.length).toBe(s.width * s.height);
    expect(s.width).toBeGreaterThanOrEqual(64);
    expect(s.width).toBeLessThanOrEqual(96);
    expect(s.height).toBeGreaterThanOrEqual(48);
    expect(s.height).toBeLessThanOrEqual(80);
    expect(countPixels(s)).toBeGreaterThan(s.width * s.height * 0.3);
    expect(s.anchorX).toBeGreaterThanOrEqual(0);
    expect(s.anchorX).toBeLessThan(s.width);
    expect(s.anchorY).toBeGreaterThanOrEqual(0);
    expect(s.anchorY).toBeLessThan(s.height);
    expect(s.footprintW).toBeGreaterThan(0);
    expect(s.footprintH).toBeGreaterThan(0);
  });

  it.each(entries)('%s carries an ink outline on its silhouette', (_name, gen) => {
    expect(silhouetteInkRatio(gen())).toBeGreaterThan(0.75);
  });

  it.each(entries)('%s has a ground shadow below the facade', (_name, gen) => {
    const s = gen();
    let shadowPixels = 0;
    for (let y = s.height - 3; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) if (s.pixels[y * s.width + x] === C.shadow) shadowPixels++;
    }
    expect(shadowPixels).toBeGreaterThan(10);
  });

  it.each(entries)('%s is deterministic for identical params', (_name, gen) => {
    expect(Array.from(gen({ sign: 'TEST' }).pixels)).toEqual(Array.from(gen({ sign: 'TEST' }).pixels));
  });

  it('honours house parameters', () => {
    const one = BUILDINGS.house({ storeys: 1 });
    const two = BUILDINGS.house({ storeys: 2 });
    expect(two.height).toBeGreaterThan(one.height);
    const wide = BUILDINGS.house({ garage: true });
    expect(wide.width).toBeGreaterThan(one.width);
    const blue = BUILDINGS.house({ wall: 'blue' });
    expect(usesIndex(blue, C.blue)).toBe(true);
    expect(Array.from(BUILDINGS.house({ roofShape: 'hip' }).pixels)).not.toEqual(
      Array.from(BUILDINGS.house({ roofShape: 'gable' }).pixels),
    );
  });
});

// -------------------------------------------------------------- tiles, nature, characters

describe('tiles', () => {
  it('are all 16x16 and fully opaque', () => {
    for (const [name, s] of Object.entries(TILES)) {
      expect(s.width, name).toBe(16);
      expect(s.height, name).toBe(16);
      expect(countPixels(s), name).toBe(256);
    }
  });

  it('offers three grass variants and two water variants that differ', () => {
    expect(Array.from(TILES.grass_0.pixels)).not.toEqual(Array.from(TILES.grass_1.pixels));
    expect(Array.from(TILES.grass_1.pixels)).not.toEqual(Array.from(TILES.grass_2.pixels));
    expect(Array.from(TILES.water_0.pixels)).not.toEqual(Array.from(TILES.water_1.pixels));
  });
});

describe('nature', () => {
  it('has the three trees plus ground cover', () => {
    for (const key of ['tree_round', 'tree_pine', 'tree_oak', 'bush', 'flowers', 'rock']) {
      expect(NATURE[key], `missing ${key}`).toBeTruthy();
    }
  });

  it.each(['tree_round', 'tree_pine', 'tree_oak', 'bush', 'rock'])('%s is outlined and has a trunk or body', (key) => {
    const s = NATURE[key];
    expect(countPixels(s)).toBeGreaterThan(20);
    expect(silhouetteInkRatio(s)).toBeGreaterThan(0.7);
  });

  it('gives every tree a ground shadow', () => {
    for (const key of ['tree_round', 'tree_pine', 'tree_oak']) {
      expect(usesIndex(NATURE[key], C.shadow), key).toBe(true);
    }
  });
});

describe('characters', () => {
  const dirs = ['s', 'n', 'e', 'w'] as const;

  it('has idle and three walk frames for all four facings', () => {
    for (const d of dirs) {
      expect(CHARACTERS[`idle_${d}`], `idle_${d}`).toBeTruthy();
      for (let f = 0; f < 3; f++) expect(CHARACTERS[`walk_${d}_${f}`], `walk_${d}_${f}`).toBeTruthy();
    }
  });

  it('is 12x20 with the anchor at the feet', () => {
    for (const [name, s] of Object.entries(CHARACTERS)) {
      expect(s.width, name).toBe(12);
      expect(s.height, name).toBe(20);
      expect(s.anchorY, name).toBe(19);
    }
  });

  it('gives each facing distinct walk frames', () => {
    for (const d of dirs) {
      const frames = [0, 1, 2].map((f) => Array.from(CHARACTERS[`walk_${d}_${f}`].pixels).join(','));
      expect(new Set(frames).size, `${d} frames are not distinct`).toBe(3);
    }
  });

  it('paints the shirt in the reserved key and tints it away', () => {
    const idle = CHARACTERS.idle_s;
    expect(usesIndex(idle, SHIRT_KEY)).toBe(true);
    const tinted = tintCharacter(idle, C.blue);
    expect(usesIndex(tinted, SHIRT_KEY)).toBe(false);
    expect(usesIndex(tinted, C.blue)).toBe(true);
    // tinting must not disturb the original
    expect(usesIndex(idle, SHIRT_KEY)).toBe(true);
    expect(tinted.width).toBe(idle.width);
  });

  it('mirrors west from east', () => {
    const e = CHARACTERS.walk_e_1;
    const w = CHARACTERS.walk_w_1;
    for (let y = 0; y < e.height; y++) {
      for (let x = 0; x < e.width; x++) {
        expect(w.pixels[y * w.width + x]).toBe(e.pixels[y * e.width + (e.width - 1 - x)]);
      }
    }
  });
});

// -------------------------------------------------------------- font

describe('font', () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,\'-$:!?&';

  it('knows every required glyph', () => {
    for (const ch of `${chars} `) expect(hasGlyph(ch), `missing glyph ${ch}`).toBe(true);
  });

  it.each(chars.split(''))('renders %s inside its 5x7 cell', (ch) => {
    const pad = 3;
    const s = createSurface(GLYPH_W + pad * 2, GLYPH_H + pad * 2);
    drawText(s, pad, pad, ch, C.ink);
    let drawn = 0;
    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        const inside = x >= pad && x < pad + GLYPH_W && y >= pad && y < pad + GLYPH_H;
        if (get(s, x, y) === 0) continue;
        expect(inside, `${ch} spills outside its cell at ${x},${y}`).toBe(true);
        drawn++;
      }
    }
    expect(drawn, `${ch} drew nothing`).toBeGreaterThan(0);
  });

  it('draws space as nothing but still advances', () => {
    const s = createSurface(20, 12);
    drawText(s, 1, 1, ' ', C.ink);
    expect(countPixels(s as unknown as Sprite)).toBe(0);
    expect(measureText('AB')).toBe(GLYPH_W * 2 + 1);
    expect(measureText('AB', { spacing: 2 })).toBe(GLYPH_W * 2 + 2);
    expect(measureText('')).toBe(0);
  });

  it('advances text by the measured width', () => {
    const s = createSurface(80, 12);
    expect(drawText(s, 0, 0, 'JONES', C.ink)).toBe(measureText('JONES'));
  });
});

// -------------------------------------------------------------- curves

describe('curve primitive', () => {
  /** Every painted pixel must be reachable from the first by 8-connected steps. */
  function isConnected(surface: ReturnType<typeof createSurface>): boolean {
    const painted: number[] = [];
    for (let i = 0; i < surface.pixels.length; i++) if (surface.pixels[i] !== 0) painted.push(i);
    if (painted.length === 0) return false;
    const seen = new Set<number>();
    const stack = [painted[0]];
    while (stack.length) {
      const idx = stack.pop() as number;
      if (seen.has(idx)) continue;
      seen.add(idx);
      const x = idx % surface.width;
      const y = (idx / surface.width) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= surface.width || ny >= surface.height) continue;
          const n = ny * surface.width + nx;
          if (surface.pixels[n] !== 0 && !seen.has(n)) stack.push(n);
        }
      }
    }
    return seen.size === painted.length;
  }

  it('strokes a cubic bezier as one unbroken run', () => {
    const s = createSurface(120, 80);
    const pts = bezierCubic({ x: 4, y: 70 }, { x: 30, y: 4 }, { x: 90, y: 76 }, { x: 116, y: 10 }, 40);
    strokePolyline(s, pts, 1, C.roadLine);
    expect(isConnected(s)).toBe(true);
  });

  it('strokes a catmull-rom road as one unbroken run and reports its samples', () => {
    const s = createSurface(140, 90);
    const spine = [
      { x: 2, y: 70 },
      { x: 40, y: 20 },
      { x: 80, y: 78 },
      { x: 136, y: 16 },
    ];
    const sampled = curve(s, spine, C.road, { thickness: 5, steps: 16 });
    expect(sampled.length).toBeGreaterThan(spine.length);
    expect(isConnected(s)).toBe(true);
    // the curve passes through its control points
    for (const p of spine) expect(get(s, Math.round(p.x), Math.round(p.y))).toBe(C.road);
  });

  it('samples without drawing when no target is given', () => {
    const pts = curve(null, [{ x: 0, y: 0 }, { x: 10, y: 10 }], C.road, { steps: 8 });
    expect(pts.length).toBeGreaterThan(2);
  });
});
