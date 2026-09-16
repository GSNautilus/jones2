import { describe, expect, it } from 'vitest';

import { C, PALETTE } from '../src/palette';
import { GLYPH_H, GLYPH_W, drawText, hasGlyph, measureText } from '../src/font';
import { bezierCubic, createSurface, curve, get, strokePolyline } from '../src/surface';
import type { Sprite } from '../src/types';
import { BUILDINGS, buildFromRef } from '../src/buildings/catalogue';
import { LOCATION_RECIPES } from '../src/buildings/recipes';
import { PROPS } from '../src/props/catalogue';
import { BUTTON_INSETS, ICON_KEYS, PANEL_INSETS, UI } from '../src/ui/catalogue';
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

/**
 * Every sim location in `packages/sim/src/content/locations.ts`. Duplicated
 * rather than imported so the art package keeps no dependency on the sim; if
 * the sim grows a location, this list and LOCATION_RECIPES both need it.
 */
const SIM_LOCATION_IDS = [
  'bus_depot',
  'employment',
  'rent_office',
  'bank',
  'newsstand',
  'university',
  'clinic',
  'monolith',
  'cafe',
  'qt_clothing',
  'socket_city',
  'blacks_market',
  'zmart',
  'pawn',
  'auto',
  'park',
  'gym',
  'cinema',
  'gilded_fork',
  'chez_cholesterol',
  'factory',
  'shady_acres',
  'lowcost',
  'security_apts',
  'house_elm',
  'house_hill',
  'house_lake',
  'lookout',
];

/** Smallest and largest side any building sprite may have. */
const MIN_SPAN = 40;
const MAX_SPAN = 110;

describe('buildings', () => {
  const entries = Object.entries(BUILDINGS);

  it('has all six hero buildings plus the house', () => {
    for (const kind of ['monolith', 'bank', 'zmart', 'university', 'factory', 'house']) {
      expect(BUILDINGS[kind], `missing generator ${kind}`).toBeTypeOf('function');
    }
  });

  it('has a generator for every kind the recipes name', () => {
    for (const [id, ref] of Object.entries(LOCATION_RECIPES)) {
      expect(BUILDINGS[ref.kind], `${id} wants missing kind ${ref.kind}`).toBeTypeOf('function');
    }
  });

  it.each(entries)('%s produces a well formed sprite', (_name, gen) => {
    const s = gen();
    expect(s.pixels.length).toBe(s.width * s.height);
    expect(s.width).toBeGreaterThanOrEqual(MIN_SPAN);
    expect(s.width).toBeLessThanOrEqual(MAX_SPAN);
    expect(s.height).toBeGreaterThanOrEqual(MIN_SPAN);
    expect(s.height).toBeLessThanOrEqual(MAX_SPAN);
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

  it('keeps every building to a plausible shape', () => {
    for (const [name, gen] of entries) {
      const s = gen();
      expect(s.width / s.height, `${name} is an implausible shape`).toBeGreaterThan(0.35);
      expect(s.width / s.height, `${name} is an implausible shape`).toBeLessThan(2.6);
    }
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


// -------------------------------------------------------------- recipes

describe('location recipes', () => {
  const entries = Object.entries(LOCATION_RECIPES);

  it('covers every sim location exactly once', () => {
    for (const id of SIM_LOCATION_IDS) {
      expect(LOCATION_RECIPES[id], `no recipe for sim location ${id}`).toBeTruthy();
    }
    expect(Object.keys(LOCATION_RECIPES).sort()).toEqual([...SIM_LOCATION_IDS].sort());
  });

  it.each(entries)('%s resolves to a registered kind', (_id, ref) => {
    expect(BUILDINGS[ref.kind]).toBeTypeOf('function');
  });

  it.each(entries)('%s builds a sprite inside the size envelope', (_id, ref) => {
    const s = buildFromRef(ref.kind, ref.params);
    expect(s.pixels.length).toBe(s.width * s.height);
    expect(s.width).toBeGreaterThanOrEqual(MIN_SPAN);
    expect(s.width).toBeLessThanOrEqual(MAX_SPAN);
    expect(s.height).toBeGreaterThanOrEqual(MIN_SPAN);
    expect(s.height).toBeLessThanOrEqual(MAX_SPAN);
    expect(countPixels(s)).toBeGreaterThan(s.width * s.height * 0.3);
  });

  it.each(entries)('%s is outlined and casts a shadow', (_id, ref) => {
    const s = buildFromRef(ref.kind, ref.params);
    expect(silhouetteInkRatio(s)).toBeGreaterThan(0.75);
    let shadowPixels = 0;
    for (let y = s.height - 3; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) if (s.pixels[y * s.width + x] === C.shadow) shadowPixels++;
    }
    expect(shadowPixels).toBeGreaterThan(10);
  });

  it.each(entries)('%s is deterministic', (_id, ref) => {
    expect(Array.from(buildFromRef(ref.kind, ref.params).pixels)).toEqual(
      Array.from(buildFromRef(ref.kind, ref.params).pixels),
    );
  });

  it('dresses the three owned houses differently', () => {
    const pixels = ['house_elm', 'house_hill', 'house_lake'].map((id) => {
      const ref = LOCATION_RECIPES[id];
      return Array.from(buildFromRef(ref.kind, ref.params).pixels).join(',');
    });
    expect(new Set(pixels).size).toBe(3);
  });
});

// -------------------------------------------------------------- props and ui

describe('props', () => {
  const required = [
    'lamp',
    'bench',
    'car_red',
    'car_blue',
    'car_green',
    'bus',
    'signpost',
    'hydrant',
    'mailbox',
    'fence_h',
    'fence_v',
    'picnic_table',
    'dock',
    'bridge',
  ];

  it('has every prop the layout needs', () => {
    for (const key of required) expect(PROPS[key], `missing prop ${key}`).toBeTruthy();
  });

  it.each(required)('%s is a non-empty sprite anchored inside itself', (key) => {
    const s = PROPS[key];
    expect(s.pixels.length).toBe(s.width * s.height);
    expect(countPixels(s), `${key} is blank`).toBeGreaterThan(s.width * s.height * 0.15);
    expect(s.anchorX).toBeGreaterThanOrEqual(0);
    expect(s.anchorX).toBeLessThan(s.width);
    expect(s.anchorY).toBeGreaterThanOrEqual(0);
    expect(s.anchorY).toBeLessThan(s.height);
  });

  it('gives the three cars one shape in three colours', () => {
    const [r, b, g] = ['car_red', 'car_blue', 'car_green'].map((k) => PROPS[k]);
    expect(r.width).toBe(b.width);
    expect(b.width).toBe(g.width);
    expect(usesIndex(r, C.red)).toBe(true);
    expect(usesIndex(b, C.blue)).toBe(true);
    expect(usesIndex(g, C.green)).toBe(true);
    expect(Array.from(r.pixels)).not.toEqual(Array.from(b.pixels));
  });

  it('keeps the bus, bridge and fence to their stated sizes', () => {
    expect(PROPS.bus.width).toBeGreaterThanOrEqual(30);
    expect(PROPS.bus.height).toBeLessThanOrEqual(20);
    expect(PROPS.bridge.width).toBe(32);
    expect(PROPS.bridge.height).toBe(20);
    expect(PROPS.fence_h.width).toBe(16);
  });
});

describe('ui', () => {
  it('has the panel, the three button states, the clock and twelve icons', () => {
    for (const key of ['panel', 'button_normal', 'button_hover', 'button_pressed', 'clock_face']) {
      expect(UI[key], `missing ui sprite ${key}`).toBeTruthy();
    }
    expect(ICON_KEYS).toHaveLength(12);
    for (const key of ICON_KEYS) expect(UI[key], `missing icon ${key}`).toBeTruthy();
  });

  it.each(Object.entries(UI))('%s is non-empty', (name, sprite) => {
    expect(sprite.pixels.length, name).toBe(sprite.width * sprite.height);
    expect(countPixels(sprite), `${name} is blank`).toBeGreaterThan(8);
  });

  it('keeps every icon 12x12', () => {
    for (const key of ICON_KEYS) {
      expect(UI[key].width, key).toBe(12);
      expect(UI[key].height, key).toBe(12);
    }
  });

  it('nine-slices fit inside their sprites and leave a centre', () => {
    expect(UI.panel.width).toBeGreaterThan(PANEL_INSETS.left + PANEL_INSETS.right);
    expect(UI.panel.height).toBeGreaterThan(PANEL_INSETS.top + PANEL_INSETS.bottom);
    for (const key of ['button_normal', 'button_hover', 'button_pressed']) {
      expect(UI[key].width).toBeGreaterThan(BUTTON_INSETS.left + BUTTON_INSETS.right);
      expect(UI[key].height).toBeGreaterThan(BUTTON_INSETS.top + BUTTON_INSETS.bottom);
    }
  });

  it('makes every frame edge strip uniform along its length', () => {
    // A 9-slice is only safe to stretch if each edge strip repeats. The frames
    // are built from concentric rings, so every column of the top strip matches.
    for (const [key, inset] of [
      ['panel', PANEL_INSETS],
      ['button_normal', BUTTON_INSETS],
    ] as Array<[string, typeof PANEL_INSETS]>) {
      const s = UI[key];
      const midX = s.width >> 1;
      for (let y = 0; y < inset.top; y++) {
        expect(s.pixels[y * s.width + inset.left], `${key} top strip varies at row ${y}`).toBe(
          s.pixels[y * s.width + midX],
        );
      }
    }
  });

  it('draws the clock face at 96x96 and keeps the hands separate', () => {
    expect(UI.clock_face.width).toBe(96);
    expect(UI.clock_face.height).toBe(96);
    expect(UI.clock_hand_hour.height).toBe(40);
    expect(UI.clock_hand_minute.height).toBe(44);
    for (const key of ['clock_hand_hour', 'clock_hand_minute']) {
      const s = UI[key];
      expect(s.anchorY, `${key} must pivot at its base`).toBe(s.height - 1);
      expect(s.anchorX).toBe(s.width >> 1);
      // the tip is painted, so rotating about the anchor sweeps the whole hand
      expect(s.pixels[s.anchorX], `${key} has no tip`).not.toBe(0);
    }
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

  it('moves the front and back walk frames, not just the feet', () => {
    for (const d of ['s', 'n'] as const) {
      const idle = CHARACTERS[`idle_${d}`];
      for (const f of [1, 2]) {
        const frame = CHARACTERS[`walk_${d}_${f}`];
        let changed = 0;
        for (let i = 0; i < idle.pixels.length; i++) if (idle.pixels[i] !== frame.pixels[i]) changed++;
        expect(changed, `walk_${d}_${f} barely differs from idle_${d}`).toBeGreaterThan(6);
      }
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
