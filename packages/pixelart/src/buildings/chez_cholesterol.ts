/**
 * Chez Cholesterol. A red roadside diner: chrome band along the front, a
 * chimney puffing greasy smoke out of the kitchen end and a pig-on-a-plate
 * board over the roof.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat, smokePuff, smokestack } from '../parts/roofs';
import { windowBand } from '../parts/windows';
import { doorGlass } from '../parts/doors';
import { signBox, signIcon } from '../parts/signs';
import { iconPig } from '../parts/details';
import { frame, str, type Params } from './common';

export function chezCholesterol(params?: Params): Sprite {
  const line1 = str(params, 'sign', 'CHEZ');
  const line2 = str(params, 'sign2', 'CHOLESTEROL');
  const f = frame(92, 90, { topPad: 26, roofH: 11 });
  const t = f.sprite;

  // --- smoke, behind everything --------------------------------------------
  smokePuff(t, f.x + 66, 8, C.paving, C.pavingDark, C.stoneDark);

  // --- kitchen chimney ------------------------------------------------------
  smokestack(t, f.x + 62, 6, 7, f.roofY + 8, C.brick, C.brickDark, C.ink, C.cream);

  // --- facade ---------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.red, shade: C.redDark, texture: 'none' });

  // two-line nameplate
  drawTextCentred(t, f.x, f.wallY + 3, f.w, line1, C.yellow, { spacing: 3 });
  signBox(t, f.x + 4, f.wallY + 10, f.w - 8, 11, line2, {
    bg: C.cream,
    fg: C.redDark,
    border: C.white,
    textShadow: C.creamShade,
  });

  // --- chrome band and glazing ----------------------------------------------
  const frontY = f.groundY - 24;
  rect(t, f.x + 1, frontY - 4, f.w - 2, 4, C.metal);
  hline(t, f.x + 1, frontY - 4, f.w - 2, C.white);
  hline(t, f.x + 1, frontY - 1, f.w - 2, C.metalDark);
  box(t, f.x + 1, frontY - 4, f.w - 2, 4, -1, C.ink);

  rect(t, f.x + 1, frontY, f.w - 2, f.groundY - frontY + 1, C.creamShade);
  windowBand(t, f.x + 4, frontY + 2, 32, 15, 2, { sill: C.metalDark });
  windowBand(t, f.x + f.w - 36, frontY + 2, 32, 15, 2, { sill: C.metalDark });
  // diners at the counter, in silhouette
  for (const sx of [f.x + 9, f.x + 24, f.x + f.w - 30, f.x + f.w - 15]) {
    rect(t, sx, frontY + 8, 5, 7, C.ink);
    rect(t, sx + 1, frontY + 4, 3, 4, C.ink);
  }
  doorGlass(t, f.cx - 9, f.groundY - 22, 18, 22, { frame: C.metal });

  // kerb and a stub of parking
  plinth(t, f.x, f.groundY - 3, f.w, 4, C.paving, C.pavingDark);
  for (let i = f.x + 8; i < f.x + f.w - 8; i += 12) put(t, i, f.groundY - 1, C.roadLine);

  // --- roof ------------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.redDark, shade: C.brickDark });
  rect(t, f.x - 2, f.roofY + f.roofH - 4, f.w + 4, 2, C.metal);
  // extractor hoods along the ridge
  for (const vx of [f.x + 10, f.x + 26]) {
    box(t, vx, f.roofY + 2, 9, 5, C.metal, C.ink);
    hline(t, vx + 1, f.roofY + 3, 7, C.metalDark);
  }

  // --- the pig board ---------------------------------------------------------
  signIcon(t, f.cx - 8, f.roofY + 2, 40, 24, iconPig, { bg: C.cream });

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
