/**
 * Java Hut. The cosiest thing on the board: a brown shingled gable, warm lit
 * windows, a steaming cup on a board above the ridge, a small hanging OPEN
 * sign by the door and planters either side of it.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofGable, smokestack } from '../parts/roofs';
import { windowPane } from '../parts/windows';
import { doorGlass } from '../parts/doors';
import { planter, signBox, signIcon } from '../parts/signs';
import { iconCup } from '../parts/details';
import { frame, str, type Params } from './common';

export function cafe(params?: Params): Sprite {
  const name = str(params, 'sign', 'JAVA HUT');
  const f = frame(80, 76, { topPad: 22, roofH: 16 });
  const t = f.sprite;

  // --- facade --------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.wood, shade: C.woodDark, texture: 'panels' });

  // carved nameboard across the top of the shopfront
  signBox(t, f.x + 4, f.wallY + 3, f.w - 8, 11, name, {
    bg: C.cream,
    fg: C.woodDark,
    border: C.white,
    textShadow: C.creamShade,
  });

  // --- shopfront -----------------------------------------------------------
  const frontY = f.groundY - 20;
  rect(t, f.x + 1, frontY - 2, f.w - 2, f.groundY - frontY + 2, C.woodDark);
  hline(t, f.x + 1, frontY - 2, f.w - 2, C.ink);

  // one big warm lit window with glazing bars, seats visible behind it
  const winX = f.x + 4;
  const winW = 30;
  windowPane(t, winX, frontY + 1, winW, 13, { lit: true, litColor: C.yellow, sill: C.wood });
  vline(t, winX + 15, frontY + 1, 13, C.woodDark);
  hline(t, winX, frontY + 7, winW, C.woodDark);
  // two customers silhouetted at a table
  for (const sx of [winX + 6, winX + 20]) {
    rect(t, sx, frontY + 8, 4, 6, C.ink);
    rect(t, sx + 1, frontY + 5, 3, 3, C.ink);
  }
  rect(t, winX + 12, frontY + 10, 7, 2, C.ink);

  doorGlass(t, f.x + 38, f.groundY - 19, 18, 19, { frame: C.wood, face: C.yellow, shade: C.yellowDark });

  // hanging OPEN sign on a bracket at the right-hand end of the front
  const hx = f.x + 60;
  hline(t, hx - 2, frontY + 1, 12, C.metalDark);
  put(t, hx - 2, frontY + 1, C.ink);
  vline(t, hx + 1, frontY + 2, 2, C.ink);
  vline(t, hx + 9, frontY + 2, 2, C.ink);
  box(t, hx - 1, frontY + 4, 14, 9, C.green, C.ink);
  drawTextCentred(t, hx - 1, frontY + 5, 14, 'OPEN', C.cream, { spacing: 0 });

  // planters along the foot of the front
  planter(t, f.x + 3, f.groundY - 5, 32);
  planter(t, f.x + 58, f.groundY - 5, 14);
  plinth(t, f.x, f.groundY - 2, f.w, 2, C.stone, C.stoneDark);

  // --- roof ----------------------------------------------------------------
  roofGable(t, f.x, f.roofY, f.w, f.roofH, { top: C.brick, shade: C.brickDark, overhang: 3 });
  smokestack(t, f.x + 10, f.roofY + 1, 6, f.roofY + f.roofH - 2, C.brick, C.brickDark, C.ink);

  // --- the cup, on a board above the ridge ---------------------------------
  signIcon(t, f.cx, f.roofY + 2, 30, 22, iconCup, { bg: C.brickDark });

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
