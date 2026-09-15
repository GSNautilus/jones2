/**
 * Z-Mart. A wide orange-and-white box store: parapet stripe, a huge red Z on
 * the fascia and a long band of glazing along the whole front.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextScaled, measureTextScaled } from '../font';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowBand } from '../parts/windows';
import { doorGlass } from '../parts/doors';
import { frame, str, type Params } from './common';

export function zmart(params?: Params): Sprite {
  const name = str(params, 'sign', 'MART');
  const f = frame(96, 68, { topPad: 2, roofH: 11 });
  const t = f.sprite;

  // --- facade ------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.white, shade: C.creamShade, texture: 'none' });

  // --- fascia sign --------------------------------------------------------
  const signY = f.wallY + 3;
  const signH = 24;
  rect(t, f.x + 2, signY, f.w - 4, signH, C.cream);
  box(t, f.x + 2, signY, f.w - 4, signH, -1, C.ink);
  hline(t, f.x + 3, signY + 1, f.w - 6, C.white);

  // the Z is three times the size of the wordmark beside it
  const zW = measureTextScaled('Z', 3);
  const wordW = measureTextScaled(name, 2);
  const total = zW + 5 + wordW;
  const zx = f.x + 2 + Math.floor((f.w - 4 - total) / 2);
  drawTextScaled(t, zx + 1, signY + 3, 'Z', C.ink, 3);
  drawTextScaled(t, zx, signY + 2, 'Z', C.red, 3);
  // a slash through the Z, the way the original logo has
  for (let k = 0; k < zW + 3; k++) put(t, zx - 1 + k, signY + 20 - Math.floor(k * 0.55), C.redDark);
  drawTextScaled(t, zx + zW + 6, signY + 9, name, C.ink, 2);
  drawTextScaled(t, zx + zW + 5, signY + 8, name, C.blueDark, 2);

  // --- shopfront ----------------------------------------------------------
  const bandY = f.groundY - 20;
  rect(t, f.x + 1, bandY - 3, f.w - 2, 3, C.orange);
  hline(t, f.x + 1, bandY - 3, f.w - 2, C.ink);

  windowBand(t, f.x + 3, bandY, 30, 13, 3, { sill: C.stoneDark });
  windowBand(t, f.x + f.w - 33, bandY, 30, 13, 3, { sill: C.stoneDark });
  doorGlass(t, f.cx - 12, f.groundY - 18, 24, 18, { frame: C.metal });

  // trolley bay marks on the pavement
  plinth(t, f.x, f.groundY - 3, f.w, 3, C.paving, C.pavingDark);
  for (let i = f.x + 4; i < f.x + f.w - 4; i += 7) put(t, i, f.groundY - 2, C.pavingDark);

  // --- roof ---------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.orangeDark, shade: C.brickDark });
  // orange parapet stripe
  rect(t, f.x - 2, f.roofY + f.roofH - 4, f.w + 4, 2, C.orange);
  // rooftop plant
  for (const vx of [f.x + 10, f.x + f.w - 22]) {
    box(t, vx, f.roofY + 1, 10, 4, C.metal, C.ink);
    hline(t, vx + 1, f.roofY + 2, 8, C.metalDark);
  }

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
