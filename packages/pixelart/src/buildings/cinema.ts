/**
 * The Bijou. Maroon brick, a vertical blade sign, a marquee canopy edged with
 * running bulbs and a little glass ticket booth stuck out in the middle of the
 * entrance, exactly where it gets in the way.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred, drawTextScaled, measureTextScaled } from '../font';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { doorGlass } from '../parts/doors';
import { bulbRun } from '../parts/details';
import { frame, str, type Params } from './common';

export function cinema(params?: Params): Sprite {
  const name = str(params, 'sign', 'BIJOU');
  const now = str(params, 'sign2', 'NOW SHOWING');
  const f = frame(92, 88, { topPad: 26, roofH: 10 });
  const t = f.sprite;

  // --- facade --------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.maroon, shade: C.ink, texture: 'brick' });

  // --- marquee canopy -------------------------------------------------------
  const marqY = f.wallY + 4;
  const marqH = 20;
  rect(t, f.x - 2, marqY, f.w + 4, marqH, C.cream);
  hline(t, f.x - 2, marqY, f.w + 4, C.white);
  hline(t, f.x - 2, marqY + marqH - 1, f.w + 4, C.creamShade);
  box(t, f.x - 2, marqY, f.w + 4, marqH, -1, C.ink);
  // the programme, in black on the white board
  drawTextCentred(t, f.x, marqY + 3, f.w, now, C.ink, { spacing: 1 });
  drawTextCentred(t, f.x, marqY + 11, f.w, 'ALL SEATS $2', C.maroon, { spacing: 0 });
  // running bulbs top and bottom
  bulbRun(t, f.x - 2, marqY - 2, f.w + 4, 4);
  bulbRun(t, f.x - 2, marqY + marqH, f.w + 4, 4);
  // the soffit underneath, in shadow
  rect(t, f.x, marqY + marqH + 2, f.w, 4, C.inkSoft);
  hline(t, f.x, marqY + marqH + 5, f.w, C.ink);

  // --- entrance -------------------------------------------------------------
  const entryY = marqY + marqH + 6;
  rect(t, f.x + 1, entryY, f.w - 2, f.groundY - entryY + 1, C.brickDark);
  hline(t, f.x + 1, entryY, f.w - 2, C.ink);

  // poster cases either side
  for (const px of [f.x + 3, f.x + f.w - 17]) {
    box(t, px, entryY + 3, 14, 18, C.cream, C.ink);
    rect(t, px + 2, entryY + 5, 10, 12, C.blue);
    rect(t, px + 3, entryY + 11, 8, 6, C.blueDark);
    put(t, px + 5, entryY + 8, C.yellow);
    put(t, px + 8, entryY + 9, C.white);
    hline(t, px + 2, entryY + 17, 10, C.red);
  }

  // doors either side of the booth
  doorGlass(t, f.x + 20, f.groundY - 20, 16, 20, { frame: C.gold });
  doorGlass(t, f.x + f.w - 36, f.groundY - 20, 16, 20, { frame: C.gold });

  // --- ticket booth, projecting into the lobby ------------------------------
  const boothW = 18;
  const boothX = f.cx - (boothW >> 1);
  const boothY = f.groundY - 22;
  box(t, boothX, boothY, boothW, f.groundY - boothY + 1, C.gold, C.ink);
  // glazing
  rect(t, boothX + 2, boothY + 3, boothW - 4, 12, C.glass);
  for (let j = 0; j < 12; j++) {
    const start = Math.max(0, Math.round(boothW - 4 - (j / 11) * (boothW - 4)));
    if (start < boothW - 4) rect(t, boothX + 2 + start, boothY + 3 + j, boothW - 4 - start, 1, C.glassDark);
  }
  box(t, boothX + 2, boothY + 3, boothW - 4, 12, -1, C.ink);
  put(t, boothX + 3, boothY + 4, C.white);
  // the cashier
  rect(t, boothX + 6, boothY + 9, 6, 6, C.ink);
  rect(t, boothX + 7, boothY + 6, 4, 3, C.skinShade);
  // counter and speaking grille
  hline(t, boothX + 1, boothY + 16, boothW - 2, C.goldDark);
  hline(t, boothX + 1, boothY + 17, boothW - 2, C.ink);
  for (let i = 4; i < boothW - 4; i += 3) vline(t, boothX + i, boothY + 19, 3, C.goldDark);
  drawTextCentred(t, boothX, boothY + 1, boothW, 'TIX', C.ink, { spacing: 0 });

  plinth(t, f.x, f.groundY - 2, f.w, 3, C.paving, C.pavingDark);

  // --- roof and the blade sign ----------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.brickDark, shade: C.ink });

  // the blade: a tall panel standing proud of the parapet with the name on it
  const bladeW = measureTextScaled(name, 2) + 8;
  const bladeX = f.cx - (bladeW >> 1);
  box(t, bladeX, 1, bladeW, f.roofY + 6, C.maroon, C.ink);
  box(t, bladeX + 1, 2, bladeW - 2, f.roofY + 4, -1, C.gold);
  drawTextScaled(t, bladeX + 5, 6, name, C.ink, 2);
  drawTextScaled(t, bladeX + 4, 5, name, C.yellow, 2);
  bulbRun(t, bladeX, 1, bladeW, 3);
  bulbRun(t, bladeX, f.roofY + 4, bladeW, 3);
  // a star finial
  for (const [dx, dy] of [
    [0, -3],
    [0, -1],
    [-1, -2],
    [1, -2],
    [-2, -2],
    [2, -2],
  ] as Array<[number, number]>) {
    put(t, f.cx + dx, 2 + dy, C.yellow);
  }

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
