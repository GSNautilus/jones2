/**
 * The Employment Office. Deliberately the dullest building in town: a beige
 * civic block with a stepped parapet, pilasters, regimented windows and a
 * notice board on the pavement that nobody has updated in weeks.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { pilasters, plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowGrid } from '../parts/windows';
import { doorDouble, steps } from '../parts/doors';
import { signBox } from '../parts/signs';
import { flag, noticeBoard } from '../parts/details';
import { frame, str, type Params } from './common';

export function employment(params?: Params): Sprite {
  const name = str(params, 'sign', 'EMPLOYMENT');
  const f = frame(90, 74, { topPad: 16, roofH: 10 });
  const t = f.sprite;

  // --- facade --------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.cream, shade: C.creamShade, texture: 'courses' });
  pilasters(t, f.x, f.wallY + 1, f.w, f.wallH - 2, 14, C.white, C.creamShade);

  // name plate across the frieze
  signBox(t, f.x + 5, f.wallY + 3, f.w - 10, 11, name, { bg: C.creamShade, fg: C.ink, border: C.white });

  // one rank of tall sash windows above the entrance storey
  windowGrid(t, f.x + 6, f.wallY + 18, f.w - 12, 13, 5, 1, {
    glass: C.glass,
    glassDark: C.glassDark,
    sill: C.white,
    frame: C.white,
  });
  // ground storey: a window either side of the entrance bay
  for (const wx of [f.x + 5, f.x + f.w - 23]) {
    windowGrid(t, wx, f.groundY - 20, 18, 13, 2, 1, {
      glass: C.glass,
      glassDark: C.glassDark,
      sill: C.white,
      frame: C.white,
    });
  }

  // --- entrance ------------------------------------------------------------
  const doorH = 18;
  const doorW = 20;
  rect(t, f.cx - doorW / 2 - 3, f.groundY - doorH - 4, doorW + 6, doorH + 4, C.creamShade);
  box(t, f.cx - doorW / 2 - 3, f.groundY - doorH - 4, doorW + 6, doorH + 4, -1, C.ink);
  hline(t, f.cx - doorW / 2 - 2, f.groundY - doorH - 3, doorW + 4, C.white);
  doorDouble(t, f.cx - (doorW >> 1), f.groundY - doorH, doorW, doorH, {
    face: C.metal,
    shade: C.metalDark,
    handle: C.ink,
  });
  steps(t, f.cx, f.groundY - 1, 26, 2, C.stone, C.stoneDark);

  // --- roof ----------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.stone, shade: C.stoneDark });
  // a raised centre bay carried straight down through the roof band, so the
  // parapet reads as one mass rather than a block floating above it
  const bayW = 30;
  rect(t, f.cx - (bayW >> 1), f.roofY - 6, bayW, f.roofH + 7, C.stone);
  hline(t, f.cx - (bayW >> 1) + 1, f.roofY - 5, bayW - 2, C.white);
  vline(t, f.cx + (bayW >> 1) - 2, f.roofY - 5, f.roofH + 5, C.stoneDark);
  box(t, f.cx - (bayW >> 1), f.roofY - 6, bayW, f.roofH + 7, -1, C.ink);
  for (let i = -10; i <= 9; i += 5) vline(t, f.cx + i, f.roofY - 3, f.roofH + 2, C.stoneDark);
  // civic crest: a plain disc on the raised bay
  for (let j = -3; j <= 3; j++) {
    const span = Math.floor(Math.sqrt(Math.max(0, 11 - j * j)));
    rect(t, f.cx - span, f.roofY - 1 + j, span * 2 + 1, 1, j < 0 ? C.blue : C.blueDark);
    put(t, f.cx - span - 1, f.roofY - 1 + j, C.ink);
    put(t, f.cx + span + 1, f.roofY - 1 + j, C.ink);
  }

  flag(t, f.x + 7, 0, f.roofY + 2, C.red, C.redDark);

  plinth(t, f.x, f.groundY - 3, f.w, 3, C.stone, C.stoneDark);

  // --- notice board on the pavement ---------------------------------------
  noticeBoard(t, f.x + 13, f.groundY, 22, 15);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
