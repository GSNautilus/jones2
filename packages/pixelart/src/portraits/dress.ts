/**
 * Hair, hats and clothing for the clerk portraits.
 *
 * Hair is a shell sitting on the cranium ellipse (see `shellR`): a style is a
 * lift, a bulge, how far down the sides it falls and where the hairline runs.
 * Hats are drawn on top of it. Torsos are a rounded shoulder trapezoid plus a
 * collar treatment.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { dither, fillCircle, hline, put, rect, vline } from '../surface';
import { faceR, shellR, span, type Geom } from './head';

export type HairStyle =
  | 'short'
  | 'bald'
  | 'receding'
  | 'crop'
  | 'bob'
  | 'long'
  | 'bun'
  | 'curly'
  | 'wild'
  | 'updo'
  | 'slick'
  | 'scruff'
  | 'comb_over';

export type HatStyle = 'none' | 'paper' | 'hard' | 'peaked' | 'flat';

export interface HairSpec {
  style: HairStyle;
  color: number;
  shade: number;
  /** Optional third tone for the lit side; defaults to `color`. */
  light?: number;
}

interface Shape {
  lift: number;
  grow: number;
  side: number;
  /** Last row the hair reaches down the sides. */
  bottom: number;
  /** How far in from the face edge the side hair bites. */
  temple: number;
  /** Hairline: rows below the crown before the forehead is bare. */
  fringe: number;
  hairline: 'straight' | 'peak' | 'recede' | 'sweep' | 'none';
}

function shapeFor(style: HairStyle, g: Geom): Shape {
  const base: Shape = {
    lift: 3,
    grow: 1,
    side: 1,
    bottom: g.eyesY + 3,
    temple: 2,
    fringe: 2,
    hairline: 'straight',
  };
  switch (style) {
    case 'bald':
      return { ...base, lift: 0, grow: 0, bottom: g.eyesY + 4, temple: 1, fringe: -99, hairline: 'none' };
    case 'receding':
      return { ...base, lift: 2, bottom: g.eyesY + 3, fringe: 0, hairline: 'recede' };
    case 'crop':
      return { ...base, lift: 1, grow: 0, side: 0, bottom: g.eyesY - 1, temple: 1, fringe: 1 };
    case 'bob':
      return { ...base, lift: 3, grow: 2, side: 4, bottom: g.chinY, temple: 3, fringe: 3 };
    case 'long':
      return { ...base, lift: 3, grow: 2, side: 5, bottom: g.shoulderY + 8, temple: 4, fringe: 3 };
    case 'bun':
      return { ...base, lift: 2, grow: 1, side: 2, bottom: g.eyesY + 2, temple: 2, fringe: 1, hairline: 'sweep' };
    case 'curly':
      return { ...base, lift: 5, grow: 3, side: 3, bottom: g.eyesY + 2, temple: 3, fringe: 3 };
    case 'wild':
      return { ...base, lift: 6, grow: 5, side: 5, bottom: g.eyesY + 5, temple: 3, fringe: 2 };
    case 'updo':
      return { ...base, lift: 11, grow: 0, side: 2, bottom: g.eyesY + 1, temple: 2, fringe: 1, hairline: 'sweep' };
    case 'slick':
      return { ...base, lift: 2, grow: 1, side: 1, bottom: g.eyesY + 2, temple: 2, fringe: 1, hairline: 'peak' };
    case 'scruff':
      return { ...base, lift: 4, grow: 3, side: 3, bottom: g.eyesY + 6, temple: 3, fringe: 2 };
    case 'comb_over':
      return { ...base, lift: 2, grow: 1, side: 1, bottom: g.eyesY + 2, temple: 2, fringe: 2, hairline: 'sweep' };
    default:
      return base;
  }
}

/** Row of the hairline at column `x`, given the shape. */
function hairlineAt(sh: Shape, g: Geom, x: number): number {
  const base = g.headTop + sh.fringe + 3;
  const d = Math.abs(x - g.cx) / Math.max(1, g.crownRX);
  switch (sh.hairline) {
    case 'none':
      return -999;
    case 'peak':
      return base + Math.round(4 * (1 - d) - 2);
    case 'recede':
      return base - Math.round(5 * (1 - Math.min(1, d * 1.4)));
    case 'sweep':
      return base + Math.round(3 * (x - g.cx) / Math.max(1, g.crownRX));
    default:
      return base;
  }
}

export function drawHair(g: Geom, t: Sprite, spec: HairSpec): void {
  const sh = shapeFor(spec.style, g);
  const light = spec.light ?? spec.color;
  const top = Math.floor(g.crownY - g.crownRY - sh.lift) - 1;
  const minX: number[] = [];
  const maxX: number[] = [];

  for (let y = top; y <= sh.bottom; y++) {
    const r = shellR(g, y, sh.grow, sh.side, sh.lift);
    if (r < 0) continue;
    const fr = y >= g.headTop && y <= g.chinY ? faceR(g, y) : -1;
    let lo = 99;
    let hi = -99;
    for (let x = g.cx - r; x <= g.cx + r; x++) {
      const d = Math.abs(x - g.cx);
      const onFace = fr >= 0 && d <= fr;
      const bare = onFace && y >= hairlineAt(sh, g, x) && d <= fr - sh.temple;
      if (bare) continue;
      const rel = (x - g.cx) / Math.max(1, r);
      let col = spec.color;
      if (rel > 0.35) col = spec.shade;
      else if (rel < -0.35 && y < g.crownY) col = light;
      if (y > g.eyesY && d > (fr < 0 ? r : fr)) col = spec.shade;
      put(t, x, y, col);
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
    if (hi >= lo) {
      minX[y] = lo;
      maxX[y] = hi;
    }
  }

  extras(g, t, spec, sh, minX, maxX);

  for (let y = top - 1; y <= sh.bottom + 1; y++) {
    const lo = minX[y];
    const hi = maxX[y];
    if (lo === undefined) continue;
    put(t, lo - 1, y, C.ink);
    put(t, hi + 1, y, C.ink);
    if (minX[y - 1] === undefined) hline(t, lo, y - 1, hi - lo + 1, C.ink);
    if (minX[y + 1] === undefined && y < sh.bottom) hline(t, lo, y + 1, hi - lo + 1, C.ink);
  }
}

/** Per-style additions: bumps, buns, tails and parting lines. */
function extras(g: Geom, t: Sprite, spec: HairSpec, sh: Shape, minX: number[], maxX: number[]): void {
  const blob = (x: number, y: number, r: number, col: number): void => {
    fillCircle(t, x, y, r, col);
    for (let j = -r - 1; j <= r + 1; j++) {
      for (let i = -r - 1; i <= r + 1; i++) {
        const yy = y + j;
        const xx = x + i;
        if (Math.hypot(i, j) > r + 1) continue;
        minX[yy] = Math.min(minX[yy] ?? 99, xx);
        maxX[yy] = Math.max(maxX[yy] ?? -99, xx);
      }
    }
  };

  if (spec.style === 'curly' || spec.style === 'wild' || spec.style === 'scruff') {
    const r = spec.style === 'wild' ? 5 : 4;
    const top = Math.floor(g.crownY - g.crownRY - sh.lift);
    const steps = spec.style === 'scruff' ? 5 : 7;
    for (let k = 0; k < steps; k++) {
      const a = Math.PI + (k / (steps - 1)) * Math.PI;
      const x = Math.round(g.cx + Math.cos(a) * (g.crownRX + sh.grow));
      const y = Math.round(g.crownY + Math.sin(a) * (g.crownRY + sh.lift));
      blob(x, Math.max(top + r - 1, y), r, x > g.cx + 2 ? spec.shade : spec.color);
    }
  }
  if (spec.style === 'bun') {
    blob(g.cx + 1, Math.floor(g.crownY - g.crownRY) - 4, 5, spec.color);
    fillCircle(t, g.cx - 1, Math.floor(g.crownY - g.crownRY) - 5, 2, spec.light ?? spec.color);
  }
  if (spec.style === 'updo') {
    // a beehive is a stack, so give it two bands and a curl at the front
    for (let k = 0; k < 3; k++) {
      const y = Math.floor(g.crownY - g.crownRY - sh.lift) + 2 + k * 4;
      for (let x = g.cx - 13; x <= g.cx + 13; x++) {
        if (minX[y] !== undefined && x >= minX[y] && x <= maxX[y] && ((x + k) & 3) === 0) put(t, x, y, spec.shade);
      }
    }
    blob(g.cx - g.crownRX - 2, g.eyesY - 4, 3, spec.color);
  }
  if (spec.style === 'comb_over' || spec.style === 'slick') {
    // combed streaks, painted only where there is already hair to comb
    for (let k = 0; k < 5; k++) {
      const y = g.headTop - 1 + k * 2;
      const r = shellR(g, y, sh.grow, sh.side, sh.lift);
      for (let x = g.cx - r; x <= g.cx + r; x += 3) {
        const cur = t.pixels[y * t.width + x + (k & 1)];
        if (cur === spec.color || cur === (spec.light ?? spec.color)) put(t, x + (k & 1), y, spec.shade);
      }
    }
  }
  if (spec.style === 'long' || spec.style === 'bob') {
    // a parting and a few strands, painted only where there is hair
    const onHair = (x: number, y: number): boolean => {
      const cur = t.pixels[y * t.width + x];
      return cur === spec.color || cur === spec.shade || cur === (spec.light ?? spec.color);
    };
    for (let y = g.headTop; y < sh.bottom; y += 3) {
      const lx = g.cx - 6 + ((y >> 1) & 1);
      if (onHair(lx, y)) put(t, lx, y, spec.shade);
      if (onHair(g.cx + 9, y)) put(t, g.cx + 9, y, spec.light ?? spec.color);
    }
  }
  if (spec.style === 'bald') {
    // scalp shine, high on the left where the light falls
    hline(t, g.cx - 6, g.headTop + 2, 4, C.white);
    hline(t, g.cx - 7, g.headTop + 3, 3, C.white);
  }
}

// ---------------------------------------------------------------- hats

export function drawHat(g: Geom, t: Sprite, style: HatStyle, main = C.white, trim = C.red): void {
  if (style === 'none') return;
  const browR = faceR(g, g.browY);
  const crownTop = Math.floor(g.crownY - g.crownRY);

  if (style === 'paper') {
    const bandTop = g.browY - 4;
    // the folded crown, flaring upwards with a scalloped top edge
    for (let j = 0; j < 8; j++) {
      const y = bandTop - 1 - j;
      const r = browR + 1 + Math.round(j * 0.3);
      span(t, g.cx, y, r, j > 7 ? C.creamShade : main);
      put(t, g.cx - r - 1, y, C.ink);
      put(t, g.cx + r + 1, y, C.ink);
      if ((j & 1) === 0) put(t, g.cx - r + 3 + j, y, C.creamShade);
    }
    const topR = browR + 1 + Math.round(7 * 0.3);
    for (let x = g.cx - topR; x <= g.cx + topR; x++) put(t, x, bandTop - 9 + (((x - g.cx) & 2) >> 1), C.ink);
    // the band across the forehead
    rect(t, g.cx - browR - 2, bandTop, (browR + 2) * 2 + 1, 5, main);
    hline(t, g.cx - browR - 2, bandTop + 2, (browR + 2) * 2 + 1, trim);
    rect(t, g.cx - browR - 3, bandTop, 1, 5, C.ink);
    rect(t, g.cx + browR + 2, bandTop, 1, 5, C.ink);
    hline(t, g.cx - browR - 2, bandTop + 5, (browR + 2) * 2 + 1, C.ink);
    hline(t, g.cx + 2, bandTop + 4, browR, C.creamShade);
    return;
  }

  if (style === 'hard') {
    const brimY = g.browY - 2;
    for (let y = crownTop - 5; y <= brimY; y++) {
      const r = shellR(g, y, 2, 2, 5);
      if (r < 0) continue;
      span(t, g.cx, y, r, main);
      rect(t, g.cx + r - 2, y, 3, 1, trim);
      put(t, g.cx - r - 1, y, C.ink);
      put(t, g.cx + r + 1, y, C.ink);
      if (y > crownTop - 4) hline(t, g.cx - 2, y, 4, trim);
    }
    span(t, g.cx, crownTop - 6, shellR(g, crownTop - 5, 2, 2, 5), C.ink);
    // the brim: a flat lip wider than the shell
    rect(t, g.cx - browR - 6, brimY + 1, (browR + 6) * 2 + 1, 3, main);
    hline(t, g.cx - browR - 6, brimY + 3, (browR + 6) * 2 + 1, trim);
    rect(t, g.cx - browR - 7, brimY + 1, 1, 3, C.ink);
    rect(t, g.cx + browR + 6, brimY + 1, 1, 3, C.ink);
    hline(t, g.cx - browR - 6, brimY + 4, (browR + 6) * 2 + 1, C.ink);
    return;
  }

  if (style === 'peaked') {
    const bandTop = g.browY - 4;
    for (let y = crownTop - 4; y < bandTop; y++) {
      const r = shellR(g, y, 2, 2, 4);
      if (r < 0) continue;
      span(t, g.cx, y, r, main);
      rect(t, g.cx + r - 3, y, 4, 1, C.ink);
      put(t, g.cx - r - 1, y, C.ink);
      put(t, g.cx + r + 1, y, C.ink);
    }
    span(t, g.cx, crownTop - 5, shellR(g, crownTop - 4, 2, 2, 4), C.ink);
    rect(t, g.cx - browR - 2, bandTop, (browR + 2) * 2 + 1, 3, trim);
    hline(t, g.cx - browR - 2, bandTop + 2, (browR + 2) * 2 + 1, C.goldDark);
    rect(t, g.cx - browR - 3, bandTop, 1, 3, C.ink);
    rect(t, g.cx + browR + 2, bandTop, 1, 3, C.ink);
    // cap badge
    rect(t, g.cx - 2, bandTop - 5, 5, 5, C.goldDark);
    rect(t, g.cx - 1, bandTop - 4, 3, 3, trim);
    // the peak, curving down over the brow
    for (let j = 0; j < 3; j++) {
      const w = browR + 6 - j;
      rect(t, g.cx - w, bandTop + 3 + j, w * 2 + 1, 1, j === 2 ? C.ink : C.inkSoft);
      put(t, g.cx - w - 1, bandTop + 3 + j, C.ink);
      put(t, g.cx + w + 1, bandTop + 3 + j, C.ink);
    }
    return;
  }

  // flat cap: a soft wedge pulled down over one eyebrow
  const bandTop = g.browY - 2;
  for (let y = crownTop - 3; y <= bandTop; y++) {
    const r = shellR(g, y, 3, 3, 3);
    if (r < 0) continue;
    const skew = Math.round((bandTop - y) * 0.2);
    span(t, g.cx - skew, y, r, main);
    rect(t, g.cx - skew + r - 3, y, 4, 1, trim);
    put(t, g.cx - skew - r - 1, y, C.ink);
    put(t, g.cx - skew + r + 1, y, C.ink);
  }
  span(t, g.cx - 1, crownTop - 4, shellR(g, crownTop - 3, 3, 3, 3), C.ink);
  rect(t, g.cx - browR - 6, bandTop + 1, browR + 11, 3, main);
  hline(t, g.cx - browR - 6, bandTop + 4, browR + 11, C.ink);
  hline(t, g.cx - browR - 7, bandTop + 1, 1, C.ink);
  hline(t, g.cx - browR - 7, bandTop + 2, 1, C.ink);
  dither(t, g.cx - browR - 6, bandTop + 3, browR + 11, 1, trim, -1, 0);
}

// ---------------------------------------------------------------- torso

export type TorsoStyle = 'suit' | 'shirt' | 'apron' | 'uniform' | 'vest' | 'stripe' | 'plaid' | 'tee';

export interface TorsoSpec {
  style: TorsoStyle;
  main: number;
  shade: number;
  /** Shirt / trim colour showing at the collar. */
  accent?: number;
  tie?: number;
  badge?: number;
}

/** Half-width of the shoulders `i` rows below `shoulderY`. */
function shoulderR(i: number): number {
  if (i >= 9) return 26;
  return Math.round(26 - 15 * Math.pow(1 - i / 9, 1.8));
}

export function drawTorso(g: Geom, t: Sprite, spec: TorsoSpec): void {
  const top = g.shoulderY;
  const rows = t.height - top;
  const accent = spec.accent ?? C.white;

  for (let i = 0; i < rows; i++) {
    const r = shoulderR(i);
    span(t, g.cx, top + i, r + 1, C.ink);
  }
  for (let i = 0; i < rows; i++) {
    const r = shoulderR(i);
    span(t, g.cx, top + i, r, spec.main);
    rect(t, g.cx + r - 3, top + i, 4, 1, spec.shade);
    if (i < 3) rect(t, g.cx - r, top + i, 3, 1, spec.shade);
  }
  span(t, g.cx, top - 1, shoulderR(0), C.ink);

  if (spec.style === 'stripe') {
    for (let i = 0; i < rows; i++) {
      const r = shoulderR(i);
      for (let x = g.cx - r; x <= g.cx + r; x++) if ((((x - g.cx) % 6) + 6) % 6 < 3) put(t, x, top + i, accent);
    }
  }
  if (spec.style === 'plaid') {
    for (let i = 0; i < rows; i++) {
      const r = shoulderR(i);
      dither(t, g.cx - r, top + i, r * 2 + 1, 1, accent, -1, 0, 3);
    }
  }

  const neckHalf = 6;
  if (spec.style === 'uniform') {
    // stand collar, gold buttons and epaulettes
    rect(t, g.cx - neckHalf - 2, top, (neckHalf + 2) * 2 + 1, 4, spec.shade);
    rect(t, g.cx - neckHalf - 1, top, (neckHalf + 1) * 2 + 1, 3, accent);
    hline(t, g.cx - neckHalf - 2, top + 4, (neckHalf + 2) * 2 + 1, C.ink);
    vline(t, g.cx - 1, top + 4, rows - 4, C.ink);
    vline(t, g.cx, top + 4, rows - 4, spec.shade);
    for (const j of [6, 10, 14]) {
      if (top + j >= t.height) continue;
      rect(t, g.cx + 1, top + j, 2, 2, C.gold);
      put(t, g.cx + 2, top + j + 1, C.goldDark);
    }
    for (const side of [-1, 1] as const) {
      const r = shoulderR(3);
      rect(t, side < 0 ? g.cx - r : g.cx + r - 7, top + 3, 8, 2, C.gold);
      rect(t, side < 0 ? g.cx - r : g.cx + r - 7, top + 5, 8, 1, C.goldDark);
    }
  } else if (spec.style === 'suit' || spec.style === 'plaid') {
    for (let i = 0; i < rows; i++) {
      const half = Math.min(11, 4 + Math.round(i * 0.85));
      rect(t, g.cx - half, top + i, half * 2 + 1, 1, accent);
      put(t, g.cx - half - 1, top + i, C.ink);
      put(t, g.cx + half + 1, top + i, C.ink);
      if (i > 2) rect(t, g.cx + half - 2, top + i, 3, 1, C.creamShade);
    }
    // collar wings folded back over the lapels
    for (let i = 0; i < 4; i++) {
      rect(t, g.cx - 7 - i, top + i, 3, 1, accent);
      rect(t, g.cx + 5 + i, top + i, 3, 1, C.creamShade);
      put(t, g.cx - 8 - i, top + i, C.ink);
      put(t, g.cx + 8 + i, top + i, C.ink);
    }
    if (spec.tie !== undefined) {
      rect(t, g.cx - 2, top + 3, 5, 3, spec.tie);
      for (let i = 0; i < rows - 6; i++) {
        const half = Math.min(4, 1 + Math.round(i * 0.4));
        rect(t, g.cx - half, top + 6 + i, half * 2 + 1, 1, spec.tie);
        put(t, g.cx + half, top + 6 + i, C.ink);
        put(t, g.cx - half - 1, top + 6 + i, C.ink);
      }
      put(t, g.cx - 1, top + 3, C.white);
    }
  } else if (spec.style === 'apron') {
    // the shirt first, then the apron bib over it on two straps
    for (let i = 0; i < rows; i++) {
      const r = shoulderR(i);
      span(t, g.cx, top + i, r, accent);
      rect(t, g.cx + r - 3, top + i, 4, 1, C.creamShade);
    }
    for (let i = 0; i < 5; i++) {
      rect(t, g.cx - 8 - i, top + i, 4, 1, accent);
      rect(t, g.cx + 5 + i, top + i, 4, 1, C.creamShade);
      put(t, g.cx - 9 - i, top + i, C.ink);
      put(t, g.cx + 9 + i, top + i, C.ink);
      put(t, g.cx - 4 + i, top + i, C.ink);
      put(t, g.cx + 4 - i, top + i, C.ink);
    }
    for (let i = 0; i < 7; i++) {
      rect(t, g.cx - 11 + i, top + i, 3, 1, spec.main);
      rect(t, g.cx + 9 - i, top + i, 3, 1, spec.shade);
      put(t, g.cx - 12 + i, top + i, C.ink);
      put(t, g.cx + 12 - i, top + i, C.ink);
    }
    for (let i = 6; i < rows; i++) {
      const half = Math.min(15, 5 + Math.round((i - 6) * 2.2));
      rect(t, g.cx - half, top + i, half * 2 + 1, 1, spec.main);
      rect(t, g.cx + half - 3, top + i, 4, 1, spec.shade);
      put(t, g.cx - half - 1, top + i, C.ink);
      put(t, g.cx + half + 1, top + i, C.ink);
    }
    hline(t, g.cx - 13, top + 12, 27, spec.shade);
    hline(t, g.cx - 13, top + 13, 27, C.ink);
  } else if (spec.style === 'vest') {
    for (let i = 0; i < rows; i++) {
      const half = Math.min(9, 4 + Math.round(i * 0.7));
      rect(t, g.cx - half, top + i, half * 2 + 1, 1, accent);
      put(t, g.cx - half - 1, top + i, C.ink);
      put(t, g.cx + half + 1, top + i, C.ink);
    }
    for (let i = 0; i < 4; i++) {
      rect(t, g.cx - 7 - i, top + i, 3, 1, accent);
      rect(t, g.cx + 5 + i, top + i, 3, 1, C.creamShade);
    }
    if (spec.tie !== undefined) {
      rect(t, g.cx - 4, top + 5, 9, 2, spec.tie);
      rect(t, g.cx - 2, top + 4, 5, 1, spec.tie);
      put(t, g.cx + 3, top + 6, C.ink);
      put(t, g.cx - 4, top + 6, C.ink);
    }
  } else if (spec.style === 'tee') {
    for (let i = 0; i < 4; i++) {
      const half = 7 - i;
      rect(t, g.cx - half, top + i, half * 2 + 1, 1, i === 3 ? spec.shade : C.ink);
      if (i < 3) rect(t, g.cx - half + 1, top + i, half * 2 - 1, 1, accent);
    }
  } else {
    // plain shirt: two collar wings and a placket with buttons
    for (let i = 0; i < 5; i++) {
      rect(t, g.cx - 8 - i, top + i, 4, 1, spec.shade);
      rect(t, g.cx + 5 + i, top + i, 4, 1, spec.shade);
      put(t, g.cx - 9 - i, top + i, C.ink);
      put(t, g.cx + 9 + i, top + i, C.ink);
      put(t, g.cx - 5 + i, top + i, C.ink);
      put(t, g.cx + 4 - i, top + i, C.ink);
    }
    rect(t, g.cx - 4, top, 9, 3, accent);
    vline(t, g.cx, top + 5, rows - 5, spec.shade);
    for (const j of [8, 13]) if (top + j < t.height) put(t, g.cx, top + j, C.white);
  }

  if (spec.style === 'stripe' && spec.tie !== undefined) {
    // an open collar with a bow tie sitting in it
    for (let i = 0; i < 4; i++) {
      rect(t, g.cx - 7 - i, top + i, 3, 1, C.white);
      rect(t, g.cx + 5 + i, top + i, 3, 1, C.creamShade);
      put(t, g.cx - 8 - i, top + i, C.ink);
      put(t, g.cx + 8 + i, top + i, C.ink);
    }
    for (let j = 0; j < 5; j++) {
      const w = j === 2 ? 3 : 7 - Math.abs(j - 2) * 2;
      rect(t, g.cx - w, top + 2 + j, w * 2 + 1, 1, j < 2 ? spec.tie : C.maroon);
      put(t, g.cx - w - 1, top + 2 + j, C.ink);
      put(t, g.cx + w + 1, top + 2 + j, C.ink);
    }
    rect(t, g.cx - 1, top + 3, 3, 3, C.maroon);
    put(t, g.cx, top + 4, spec.tie);
  }

  if (spec.badge !== undefined) {
    const by = top + 9;
    rect(t, g.cx + 12, by, 9, 5, spec.badge);
    rect(t, g.cx + 11, by - 1, 11, 7, C.ink);
    rect(t, g.cx + 12, by, 9, 5, spec.badge);
    hline(t, g.cx + 13, by + 1, 7, C.ink);
    hline(t, g.cx + 13, by + 3, 5, C.ink);
  }
}
