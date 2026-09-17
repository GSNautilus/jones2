/**
 * Honest Al's Autos. A one-room sales office on the right and a fenced lot on
 * the left with two cars on it, a string of bunting overhead and a price board
 * nobody believes.
 *
 * The lot is deliberately pale so the cars read against it, and the fence is
 * kept to the bottom few rows so it never crosses a car.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred, measureText } from '../font';
import { groundShadow, haloBlit } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowBand } from '../parts/windows';
import { doorGlass } from '../parts/doors';
import { signBox } from '../parts/signs';
import { bunting, chainFence } from '../parts/details';
import { PROPS } from '../props/catalogue';
import { frame, str, type Params } from './common';

export function auto(params?: Params): Sprite {
  const name = str(params, 'sign', "HONEST AL'S");
  const f = frame(108, 72, { topPad: 22, roofH: 10 });
  const t = f.sprite;

  const officeW = 40;
  const officeX = f.x + f.w - officeW;
  const lotW = officeX - f.x - 2;

  // --- the lot -------------------------------------------------------------
  const lotY = f.groundY - 30;
  rect(t, f.x, lotY, lotW, f.groundY - lotY + 1, C.roadEdge);
  hline(t, f.x, lotY, lotW, C.paving);
  rect(t, f.x, f.groundY - 3, lotW, 4, C.road);
  box(t, f.x, lotY, lotW, f.groundY - lotY + 1, -1, C.ink);
  // white bay lines, splaying towards the viewer
  for (let k = 0; k < 4; k++) {
    const bx = f.x + 6 + k * 16;
    for (let j = 0; j < 9; j++) put(t, bx + Math.round(j * 0.4), lotY + 2 + j, C.paving);
  }

  // two cars on the lot, the far one higher and slightly overlapped
  haloBlit(t, PROPS.car_blue, f.x + 5, lotY + 2);
  haloBlit(t, PROPS.car_red, f.x + 30, lotY + 9);

  // chain-link fence across the front, below both cars
  chainFence(t, f.x + 1, f.groundY - 8, lotW - 2, 9);

  // --- sales office --------------------------------------------------------
  const roofY = f.wallY - f.roofH;
  wall(t, officeX, f.wallY, officeW, f.wallH, { face: C.cream, shade: C.creamShade, texture: 'none' });
  signBox(t, officeX + 2, f.wallY + 3, officeW - 4, 10, 'AUTOS', {
    bg: C.red,
    fg: C.white,
    border: C.redDark,
    textShadow: C.redDark,
  });
  windowBand(t, officeX + 3, f.groundY - 22, 18, 14, 1, { sill: C.creamShade });
  doorGlass(t, officeX + 24, f.groundY - 20, 14, 20, { frame: C.metal });
  plinth(t, officeX, f.groundY - 3, officeW, 4, C.paving, C.pavingDark);
  roofFlat(t, officeX, roofY, officeW, f.roofH, { top: C.red, shade: C.redDark });

  // --- the big sign on its pole over the lot -------------------------------
  const poleX = f.x + 20;
  const boardH = 22;
  // wide enough for the name and its slogan, whatever the lot is
  const boardW = Math.min(f.w, Math.max(lotW - 4, measureText(name, { spacing: 1 }) + 10, measureText('NO LEMONS', { spacing: 1 }) + 10));
  rect(t, poleX, boardH, 3, lotY - boardH + 2, C.metalDark);
  vline(t, poleX, boardH, lotY - boardH + 2, C.metal);
  vline(t, poleX + 2, boardH, lotY - boardH + 2, C.ink);
  vline(t, poleX - 1, boardH, lotY - boardH + 2, C.ink);
  box(t, f.x + 2, 0, boardW, boardH, C.yellow, C.ink);
  box(t, f.x + 3, 1, boardW - 2, boardH - 2, -1, C.white);
  drawTextCentred(t, f.x + 2, 3, boardW, name, C.ink, { spacing: 1 });
  drawTextCentred(t, f.x + 2, 12, boardW, 'NO LEMONS', C.redDark, { spacing: 1 });

  // --- bunting from the sign pole to the office roof -----------------------
  bunting(t, poleX + 1, boardH + 6, officeX + 8, roofY + 2, [C.red, C.white, C.blue, C.yellow], 7);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
