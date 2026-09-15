/**
 * A 5x7 uppercase pixel font. Glyphs are authored as 7 rows of 5 characters so
 * they can be read and edited as shapes; they are compiled once into bitmasks.
 */
import type { Target } from './surface';
import { put } from './surface';

export const GLYPH_W = 5;
export const GLYPH_H = 7;

/* prettier-ignore */
const SHAPES: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],

  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],

  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
};

/** Compiled glyphs: one byte per row, bit 4 = leftmost column. */
const GLYPHS: Record<string, Uint8Array> = {};
for (const [ch, rows] of Object.entries(SHAPES)) {
  const bits = new Uint8Array(GLYPH_H);
  for (let y = 0; y < GLYPH_H; y++) {
    const row = rows[y] ?? '.....';
    let b = 0;
    for (let x = 0; x < GLYPH_W; x++) if (row[x] === '#') b |= 1 << (GLYPH_W - 1 - x);
    bits[y] = b;
  }
  GLYPHS[ch] = bits;
}

export function hasGlyph(ch: string): boolean {
  return GLYPHS[ch.toUpperCase()] !== undefined;
}

/** The raw 7-row bitmask for a character, or the mask for space if unknown. */
export function glyph(ch: string): Uint8Array {
  return GLYPHS[ch.toUpperCase()] ?? GLYPHS[' '];
}

export interface TextOptions {
  /** Gap in pixels between glyph cells (default 1). */
  spacing?: number;
}

/** Width in pixels of `text` rendered at 1x. */
export function measureText(text: string, opts: TextOptions = {}): number {
  const spacing = opts.spacing ?? 1;
  if (text.length === 0) return 0;
  return text.length * GLYPH_W + (text.length - 1) * spacing;
}

/** Draw uppercase text with the top-left of the first glyph cell at (x, y). Returns the advance. */
export function drawText(t: Target, x: number, y: number, text: string, colorIndex: number, opts: TextOptions = {}): number {
  const spacing = opts.spacing ?? 1;
  let cx = x;
  for (let i = 0; i < text.length; i++) {
    const bits = glyph(text[i] as string);
    for (let gy = 0; gy < GLYPH_H; gy++) {
      const row = bits[gy];
      if (row === 0) continue;
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (row & (1 << (GLYPH_W - 1 - gx))) put(t, cx + gx, y + gy, colorIndex);
      }
    }
    cx += GLYPH_W + spacing;
  }
  return cx - spacing - x;
}

/** Width of `text` drawn at an integer scale. */
export function measureTextScaled(text: string, scale: number, opts: TextOptions = {}): number {
  const spacing = opts.spacing ?? 1;
  if (text.length === 0) return 0;
  return text.length * GLYPH_W * scale + (text.length - 1) * spacing * scale;
}

/** Draw text with each pixel expanded to a `scale`x`scale` block — for big shop signs. */
export function drawTextScaled(
  t: Target,
  x: number,
  y: number,
  text: string,
  colorIndex: number,
  scale: number,
  opts: TextOptions = {},
): number {
  const spacing = (opts.spacing ?? 1) * scale;
  let cx = x;
  for (let i = 0; i < text.length; i++) {
    const bits = glyph(text[i] as string);
    for (let gy = 0; gy < GLYPH_H; gy++) {
      const row = bits[gy];
      if (row === 0) continue;
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (!(row & (1 << (GLYPH_W - 1 - gx)))) continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) put(t, cx + gx * scale + sx, y + gy * scale + sy, colorIndex);
        }
      }
    }
    cx += GLYPH_W * scale + spacing;
  }
  return cx - spacing - x;
}

/** Draw text centred horizontally inside [x, x+w). Returns the x it started at. */
export function drawTextCentred(
  t: Target,
  x: number,
  y: number,
  w: number,
  text: string,
  colorIndex: number,
  opts: TextOptions = {},
): number {
  const tw = measureText(text, opts);
  const sx = x + Math.floor((w - tw) / 2);
  drawText(t, sx, y, text, colorIndex, opts);
  return sx;
}

/** Text with a 1px drop shadow one pixel down-right — used on big signs. */
export function drawTextShadowed(
  t: Target,
  x: number,
  y: number,
  text: string,
  colorIndex: number,
  shadowIndex: number,
  opts: TextOptions = {},
): number {
  drawText(t, x + 1, y + 1, text, shadowIndex, opts);
  return drawText(t, x, y, text, colorIndex, opts);
}
