/**
 * Signage. In the original, the sign is the loudest thing on every building —
 * it fills the facade band and is the first thing you read. These parts follow
 * that: big boxed panels, roof-mounted icon boards and hanging brackets.
 */
import { C } from '../palette';
import { drawTextCentred, GLYPH_H, measureText } from '../font';
import type { Target } from '../surface';
import { box, hline, put, rect, vline } from '../surface';

export interface SignOptions {
  /** Panel background. */
  bg?: number;
  /** Letter colour. */
  fg?: number;
  /** Optional inner border inside the ink outline. */
  border?: number;
  ink?: number;
  /** Letter spacing (default 1). */
  spacing?: number;
  /** Drop shadow under the letters. */
  textShadow?: number;
}

/** Minimum panel width that fits `text` with the standard 3px padding. */
export function signWidthFor(text: string, spacing = 1): number {
  return measureText(text, { spacing }) + 6;
}

/** The classic boxed sign: a filled panel, an ink outline and centred 5x7 text. */
export function signBox(t: Target, x: number, y: number, w: number, h: number, text: string, o: SignOptions = {}): void {
  const ink = o.ink ?? C.ink;
  const bg = o.bg ?? C.yellow;
  const fg = o.fg ?? C.ink;
  const spacing = o.spacing ?? 1;

  box(t, x, y, w, h, bg, ink);
  if (o.border !== undefined) box(t, x + 1, y + 1, w - 2, h - 2, -1, o.border);
  // a lighter top edge so the panel reads as lit from above
  hline(t, x + 1, y + 1, w - 2, o.border ?? bg);

  const ty = y + Math.floor((h - GLYPH_H) / 2);
  if (o.textShadow !== undefined) drawTextCentred(t, x + 1, ty + 1, w, text, o.textShadow, { spacing });
  drawTextCentred(t, x, ty, w, text, fg, { spacing });
}

/**
 * A sign board standing on the roof on two legs — the Monolith / Z-Mart look.
 * `baseY` is the roofline the legs stand on.
 */
export function signRoof(
  t: Target,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  text: string,
  o: SignOptions = {},
): void {
  const ink = o.ink ?? C.ink;
  const x = cx - (w >> 1);
  const y = baseY - h - 3;
  // legs
  for (const lx of [cx - (w >> 2), cx + (w >> 2)]) {
    rect(t, lx - 1, y + h, 2, 4, C.metalDark);
    vline(t, lx - 1, y + h, 4, C.metal);
    vline(t, lx, y + h, 4, ink);
  }
  signBox(t, x, y, w, h, text, o);
}

/** A sign hanging from a bracket arm off the left of the facade. */
export function signHanging(
  t: Target,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  o: SignOptions = {},
): void {
  const ink = o.ink ?? C.ink;
  // bracket: a post and an arm
  vline(t, x - 3, y - 2, h + 6, C.metalDark);
  vline(t, x - 4, y - 2, h + 6, C.metal);
  hline(t, x - 4, y - 2, w + 6, C.metalDark);
  put(t, x - 4, y - 2, ink);
  // chains
  vline(t, x + 2, y - 2, 2, ink);
  vline(t, x + w - 3, y - 2, 2, ink);
  signBox(t, x, y, w, h, text, o);
}

/**
 * A sign band painted straight onto the facade: no panel, just a stripe of
 * colour with the lettering knocked out of it.
 */
export function signBand(t: Target, x: number, y: number, w: number, h: number, text: string, o: SignOptions = {}): void {
  const ink = o.ink ?? C.ink;
  const bg = o.bg ?? C.red;
  const fg = o.fg ?? C.white;
  rect(t, x, y, w, h, bg);
  hline(t, x, y, w, ink);
  hline(t, x, y + h - 1, w, ink);
  const ty = y + Math.floor((h - GLYPH_H) / 2);
  if (o.textShadow !== undefined) drawTextCentred(t, x + 1, ty + 1, w, text, o.textShadow, { spacing: o.spacing ?? 1 });
  drawTextCentred(t, x, ty, w, text, fg, { spacing: o.spacing ?? 1 });
}

/**
 * A roof-mounted icon board: a panel on legs whose face is painted by a
 * callback, so each building can put its own symbol up there.
 */
export function signIcon(
  t: Target,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  draw: (target: Target, x: number, y: number, w: number, h: number) => void,
  o: SignOptions = {},
): void {
  const ink = o.ink ?? C.ink;
  const bg = o.bg ?? C.white;
  const x = cx - (w >> 1);
  const y = baseY - h - 3;
  for (const lx of [cx - (w >> 2), cx + (w >> 2)]) {
    rect(t, lx - 1, y + h, 2, 4, C.metalDark);
    vline(t, lx - 1, y + h, 4, C.metal);
  }
  box(t, x, y, w, h, bg, ink);
  draw(t, x + 1, y + 1, w - 2, h - 2);
}

export interface AwningOptions {
  /** Stripe colours, alternating. */
  a?: number;
  b?: number;
  shade?: number;
  ink?: number;
  /** Stripe width in pixels (default 4). */
  stripe?: number;
  /** Scalloped bottom edge (default true). */
  scallop?: boolean;
}

/**
 * A striped awning over a shopfront: slopes out and down from the wall, with a
 * scalloped valance. `y` is the top (at the wall), `h` its depth.
 */
export function awning(t: Target, x: number, y: number, w: number, h: number, o: AwningOptions = {}): void {
  const ink = o.ink ?? C.ink;
  const a = o.a ?? C.red;
  const b = o.b ?? C.cream;
  const stripe = o.stripe ?? 4;
  const shade = o.shade ?? C.redDark;

  for (let j = 0; j < h; j++) {
    const flare = Math.round((j / Math.max(1, h - 1)) * 2);
    const x0 = x - flare;
    const ww = w + flare * 2;
    for (let i = 0; i < ww; i++) {
      const band = (((i + flare) / stripe) | 0) & 1;
      put(t, x0 + i, y + j, band === 0 ? a : b);
    }
    put(t, x0, y + j, ink);
    put(t, x0 + ww - 1, y + j, ink);
  }
  const x0 = x - 2;
  const ww = w + 4;
  hline(t, x0, y, ww, ink);
  // underside shadow along the front lip
  hline(t, x0 + 1, y + h - 1, ww - 2, shade);

  if (o.scallop !== false) {
    for (let i = 0; i < ww; i++) {
      const phase = i % (stripe * 2);
      const drop = phase < stripe ? 1 : 2;
      const band = ((i / stripe) | 0) & 1;
      for (let d = 0; d < drop; d++) put(t, x0 + i, y + h + d, band === 0 ? a : b);
      put(t, x0 + i, y + h + drop, ink);
    }
  } else {
    hline(t, x0, y + h, ww, ink);
  }
}

/** Classical columns across a portico. Returns nothing; draws `count` shafts. */
export function columns(
  t: Target,
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  light = C.white,
  shade = C.stoneDark,
  ink = C.ink,
): void {
  if (count < 1) return;
  const shaft = 5;
  const span = count === 1 ? 0 : (w - shaft) / (count - 1);
  for (let k = 0; k < count; k++) {
    const cx = Math.round(x + k * span);
    // capital
    rect(t, cx - 1, y, shaft + 2, 2, light);
    box(t, cx - 1, y, shaft + 2, 2, -1, ink);
    // shaft with fluting
    rect(t, cx, y + 2, shaft, h - 4, light);
    vline(t, cx + shaft - 1, y + 2, h - 4, shade);
    vline(t, cx + 2, y + 3, h - 6, shade);
    box(t, cx, y + 2, shaft, h - 4, -1, ink);
    // base
    rect(t, cx - 1, y + h - 2, shaft + 2, 2, light);
    hline(t, cx - 1, y + h - 1, shaft + 2, shade);
    box(t, cx - 1, y + h - 2, shaft + 2, 2, -1, ink);
  }
}

/** A pediment: the triangular gable over a colonnade. */
export function pediment(t: Target, cx: number, y: number, w: number, h: number, face = C.stone, shade = C.stoneDark, ink = C.ink): void {
  for (let j = 0; j < h; j++) {
    const u = j / Math.max(1, h - 1);
    const half = Math.round((w / 2) * u);
    rect(t, cx - half, y + j, half * 2 + 1, 1, face);
    rect(t, cx + 1, y + j, half, 1, shade);
    put(t, cx - half, y + j, ink);
    put(t, cx + half, y + j, ink);
  }
  put(t, cx, y, ink);
  rect(t, cx - (w >> 1), y + h, w, 2, face);
  hline(t, cx - (w >> 1), y + h + 1, w, shade);
  box(t, cx - (w >> 1), y + h, w, 2, -1, ink);
}

/** A planter box of shrubs at the foot of a wall. */
export function planter(t: Target, x: number, y: number, w: number, leaf = C.leaf, leafDark = C.leafDark, ink = C.ink): void {
  const h = 5;
  rect(t, x, y + 2, w, h - 2, C.brick);
  hline(t, x, y + h - 1, w, C.brickDark);
  box(t, x, y + 2, w, h - 2, -1, ink);
  for (let i = 0; i < w; i += 3) {
    const bump = i % 6 === 0 ? 2 : 1;
    rect(t, x + i, y + 2 - bump, 3, bump + 1, leaf);
    put(t, x + i + 2, y + 2 - bump + 1, leafDark);
    put(t, x + i, y + 2 - bump, ink);
  }
  hline(t, x, y + 1, w, ink);
}
