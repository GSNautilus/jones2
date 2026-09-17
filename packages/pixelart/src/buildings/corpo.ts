/**
 * Corpo Ltd. The tallest thing on the street: a glass-and-steel slab on a
 * granite podium, one raked reflection across the curtain wall, a floor or two
 * still working late, and the company name on a billboard bolted to the roof.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextScaled, measureText, measureTextScaled } from '../font';
import { groundShadow } from '../parts/common';
import { plinth } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { doorGlass } from '../parts/doors';
import { signBox } from '../parts/signs';
import { frame, str, type Params } from './common';

export function corpo(params?: Params): Sprite {
  const name = str(params, 'sign', 'CORPO');
  const plate = str(params, 'sign2', 'CORPO LTD.');
  const f = frame(68, 108, { topPad: 21, roofH: 8 });
  const t = f.sprite;

  const shaftX = 10;
  const shaftW = 48;
  const podiumY = f.groundY - 23;

  // --- curtain wall ---------------------------------------------------------
  const glassX = shaftX + 3;
  const glassW = shaftW - 6;
  rect(t, shaftX, f.wallY, shaftW, podiumY - f.wallY + 2, C.slateDark);

  for (let fy = f.wallY + 2; fy + 6 < podiumY; fy += 7) {
    // the glazed band
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < glassW; i++) {
        const u = i / glassW + (fy + j - f.wallY) / (podiumY - f.wallY);
        put(t, glassX + i, fy + j, u > 0.95 ? C.glassDark : C.glass);
      }
    }
    // a couple of floors working late
    if (fy === f.wallY + 16 || fy === f.wallY + 44) {
      rect(t, glassX + 7, fy, 6, 4, C.yellow);
      rect(t, glassX + 27, fy, 6, 4, C.yellow);
      put(t, glassX + 9, fy + 2, C.ink);
      put(t, glassX + 29, fy + 1, C.ink);
    }
    // mullions and the spandrel below
    for (let i = 6; i < glassW; i += 7) vline(t, glassX + i, fy, 4, C.metal);
    hline(t, glassX, fy, glassW, C.metal);
    rect(t, glassX, fy + 4, glassW, 3, C.slate);
    hline(t, glassX, fy + 4, glassW, C.white);
    hline(t, glassX, fy + 6, glassW, C.slateDark);
  }

  // corner piers
  rect(t, shaftX, f.wallY, 3, podiumY - f.wallY + 2, C.metal);
  vline(t, shaftX + 2, f.wallY, podiumY - f.wallY + 2, C.metalDark);
  rect(t, shaftX + shaftW - 3, f.wallY, 3, podiumY - f.wallY + 2, C.metalDark);
  vline(t, shaftX + shaftW - 3, f.wallY, podiumY - f.wallY + 2, C.metal);
  box(t, shaftX, f.wallY, shaftW, podiumY - f.wallY + 2, -1, C.ink);

  // --- podium ---------------------------------------------------------------
  rect(t, f.x, podiumY, f.w, f.groundY - podiumY + 1, C.stone);
  for (let i = 4; i < f.w; i += 9) vline(t, f.x + i, podiumY + 3, f.groundY - podiumY - 4, C.stoneDark);
  vline(t, f.x + f.w - 2, podiumY, f.groundY - podiumY + 1, C.stoneDark);
  vline(t, f.x + f.w - 1, podiumY, f.groundY - podiumY + 1, C.stoneDark);
  hline(t, f.x + 1, podiumY + 1, f.w - 2, C.white);
  box(t, f.x, podiumY, f.w, f.groundY - podiumY + 1, -1, C.ink);

  // lobby glazing either side of the entrance
  for (const gx of [f.x + 4, f.x + f.w - 18]) {
    box(t, gx, podiumY + 8, 14, 14, C.glass, C.ink);
    for (let j = 0; j < 14; j++) {
      const start = Math.max(0, Math.round(14 - (j / 13) * 14));
      if (start < 14) rect(t, gx + start, podiumY + 8 + j, 14 - start, 1, C.glassDark);
    }
    vline(t, gx + 7, podiumY + 8, 14, C.metal);
    box(t, gx, podiumY + 8, 14, 14, -1, C.ink);
    put(t, gx + 1, podiumY + 9, C.white);
  }

  // entrance canopy and revolving door
  rect(t, f.cx - 15, podiumY + 4, 30, 3, C.metal);
  hline(t, f.cx - 15, podiumY + 6, 30, C.metalDark);
  box(t, f.cx - 15, podiumY + 4, 30, 3, -1, C.ink);
  const plaqueW = measureText(plate, { spacing: 0 }) + 8;
  signBox(t, f.cx - (plaqueW >> 1), podiumY - 9, plaqueW, 9, plate, {
    bg: C.blueDark,
    fg: C.white,
    border: C.blue,
    spacing: 0,
  });
  doorGlass(t, f.cx - 9, f.groundY - 16, 18, 16, { frame: C.metal });
  vline(t, f.cx, f.groundY - 14, 12, C.metalDark);

  plinth(t, f.x, f.groundY - 2, f.w, 3, C.paving, C.pavingDark);

  // --- roof, plant and the billboard ---------------------------------------
  roofFlat(t, shaftX, f.roofY, shaftW, f.roofH, { top: C.slate, shade: C.slateDark });
  box(t, shaftX + 5, f.roofY + 1, 12, 5, C.metalDark, C.ink);
  for (let i = 1; i < 11; i += 3) vline(t, shaftX + 5 + i, f.roofY + 2, 3, C.metal);
  const mastX = shaftX + shaftW - 8;
  vline(t, mastX, f.roofY - 12, 14, C.metal);
  vline(t, mastX + 1, f.roofY - 12, 14, C.ink);
  for (let j = 0; j < 3; j++) hline(t, mastX - 2, f.roofY - 10 + j * 4, 6, C.metalDark);
  put(t, mastX, f.roofY - 13, C.red);

  const titleW = measureTextScaled(name, 2, { spacing: 1 });
  const boardW = Math.min(f.w, titleW + 6);
  const boardX = f.cx - (boardW >> 1);
  for (const lx of [f.cx - 13, f.cx + 11]) {
    rect(t, lx, 19, 2, f.roofY - 17, C.metalDark);
    vline(t, lx + 1, 19, f.roofY - 17, C.ink);
  }
  box(t, boardX, 2, boardW, 18, C.blueDark, C.ink);
  box(t, boardX + 1, 3, boardW - 2, 16, -1, C.blue);
  const titleX = boardX + Math.floor((boardW - titleW) / 2);
  drawTextScaled(t, titleX + 1, 6, name, C.ink, 2, { spacing: 1 });
  drawTextScaled(t, titleX, 5, name, C.white, 2, { spacing: 1 });
  // beacons on the board corners
  put(t, boardX + boardW - 2, 1, C.red);
  put(t, boardX + 1, 1, C.red);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
