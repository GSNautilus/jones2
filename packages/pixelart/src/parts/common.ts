/**
 * Shared conventions for building parts.
 *
 * Every building is drawn in the same tilted top-down projection: a roof band
 * occupying roughly the top third of the sprite, a facade below it, and a two
 * pixel dithered ground shadow at the very bottom. Light always comes from the
 * top-left, so left/top edges take the lighter tone and right/bottom edges the
 * darker one.
 */
import { C } from '../palette';
import type { Target } from '../surface';
import { dither, hline, put, rect, vline } from '../surface';

/** Rows of ground shadow drawn beneath every building. */
export const SHADOW_ROWS = 2;

/** Horizontal inset from the sprite edge to the facade, leaving room for eaves. */
export const EAVE_OVERHANG = 2;

export interface Shading {
  /** Main fill. */
  face: number;
  /** One step darker: right edge, underside, recesses. */
  shade: number;
  /** Outline colour, normally the shared ink. */
  ink: number;
}

/** Fraction of sprite height given to the roof band. */
export function roofHeightFor(height: number, fraction = 0.34): number {
  return Math.max(6, Math.round(height * fraction));
}

/**
 * The flat shadow a building casts on the ground: a 2px dithered dark band
 * offset to the right (light is top-left).
 */
export function groundShadow(t: Target, x: number, y: number, w: number, ink = C.shadow): void {
  dither(t, x + 2, y, w, SHADOW_ROWS, ink, -1, 0);
  dither(t, x + 3, y + SHADOW_ROWS, w - 2, 1, -1, ink, 0);
}

/** A 1px shadow cast by the eave onto the wall directly below it. */
export function eaveShadow(t: Target, x: number, y: number, w: number, shade: number): void {
  hline(t, x, y, w, shade);
}

/** Darker band where the wall meets the ground. */
export function baseShadow(t: Target, x: number, y: number, w: number, shade: number): void {
  hline(t, x, y, w, shade);
}

/** Single pixel highlight, used for glass glints and roof corners. */
export function glint(t: Target, x: number, y: number, index = C.white): void {
  put(t, x, y, index);
}

/**
 * Vertical band of dithered shade down the right edge of a surface — softens
 * the step between `face` and `shade` on wide walls.
 */
export function edgeFalloff(t: Target, x: number, y: number, h: number, face: number, shade: number): void {
  dither(t, x, y, 1, h, face, shade, 0);
}

/** Horizontal masonry courses: a faint darker line every `pitch` rows. */
export function courses(t: Target, x: number, y: number, w: number, h: number, pitch: number, shade: number): void {
  for (let j = pitch - 1; j < h; j += pitch) hline(t, x, y + j, w, shade);
}

/** Staggered brick pattern: courses plus offset vertical joints. */
export function brickwork(
  t: Target,
  x: number,
  y: number,
  w: number,
  h: number,
  shade: number,
  pitch = 3,
  stride = 6,
): void {
  for (let j = pitch - 1; j < h; j += pitch) {
    hline(t, x, y + j, w, shade);
    const offset = (((j / pitch) | 0) & 1) === 0 ? 0 : stride >> 1;
    for (let i = offset; i < w; i += stride) {
      vline(t, x + i, y + j - pitch + 1, pitch - 1, shade);
    }
  }
}

/** Fill a trapezoid with a flat top and bottom; used for hipped roofs and awnings. */
export function trapezoid(
  t: Target,
  cx: number,
  y: number,
  topW: number,
  bottomW: number,
  h: number,
  index: number,
): void {
  for (let j = 0; j < h; j++) {
    const u = h === 1 ? 0 : j / (h - 1);
    const w = Math.round(topW + (bottomW - topW) * u);
    rect(t, cx - (w >> 1), y + j, w, 1, index);
  }
}
