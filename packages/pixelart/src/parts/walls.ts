/** Wall slabs: the facade a building's sign, windows and doors sit on. */
import { C } from '../palette';
import type { Target } from '../surface';
import { box, hline, rect, vline } from '../surface';
import { baseShadow, brickwork, courses, eaveShadow } from './common';

export interface WallOptions {
  face: number;
  shade: number;
  ink?: number;
  /** Draw the 1px ink outline around the slab (default true). */
  outline?: boolean;
  /** Masonry texture. */
  texture?: 'none' | 'courses' | 'brick' | 'panels';
  /** Shadow cast by the eave onto the top of the wall (default true). */
  eave?: boolean;
  /** Darker band along the ground (default true). */
  base?: boolean;
}

/**
 * A facade slab. Light is top-left, so the right two columns and the bottom
 * row take the shade tone, and a 1px eave shadow sits under the roofline.
 */
export function wall(t: Target, x: number, y: number, w: number, h: number, o: WallOptions): void {
  const ink = o.ink ?? C.ink;
  rect(t, x, y, w, h, o.face);

  switch (o.texture) {
    case 'courses':
      courses(t, x + 1, y + 2, w - 2, h - 3, 4, o.shade);
      break;
    case 'brick':
      brickwork(t, x + 1, y + 2, w - 2, h - 3, o.shade, 3, 6);
      break;
    case 'panels':
      for (let i = 6; i < w - 2; i += 8) vline(t, x + i, y + 2, h - 3, o.shade);
      break;
    default:
      break;
  }

  // right edge falls away from the light
  vline(t, x + w - 2, y + 1, h - 2, o.shade);
  vline(t, x + w - 1, y + 1, h - 2, o.shade);

  if (o.eave !== false) eaveShadow(t, x + 1, y + 1, w - 2, o.shade);
  if (o.base !== false) baseShadow(t, x + 1, y + h - 2, w - 2, o.shade);
  if (o.outline !== false) box(t, x, y, w, h, -1, ink);
}

/**
 * A recessed shopfront bay: the wall steps back, so the reveal on the left and
 * top is in shade and the bay itself is darker than the wall around it.
 */
export function recess(t: Target, x: number, y: number, w: number, h: number, fill: number, shade: number, ink = C.ink): void {
  rect(t, x, y, w, h, fill);
  hline(t, x, y, w, shade);
  vline(t, x, y, h, shade);
  box(t, x - 1, y - 1, w + 2, h + 2, -1, ink);
}

/** A plinth / foundation band under the facade. */
export function plinth(t: Target, x: number, y: number, w: number, h: number, face: number, shade: number, ink = C.ink): void {
  rect(t, x, y, w, h, face);
  hline(t, x, y + h - 1, w, shade);
  box(t, x, y, w, h, -1, ink);
}

/** Vertical pilaster strips that break up a long facade. */
export function pilasters(
  t: Target,
  x: number,
  y: number,
  w: number,
  h: number,
  pitch: number,
  light: number,
  shade: number,
): void {
  for (let i = pitch; i < w - 2; i += pitch) {
    vline(t, x + i, y, h, light);
    vline(t, x + i + 1, y, h, shade);
  }
}
