/**
 * Hi-Tech University. Red brick wings either side of a central clock tower,
 * with an arched entrance at its foot.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofHip, tower } from '../parts/roofs';
import { windowGrid, roundWindow } from '../parts/windows';
import { doorArched, steps } from '../parts/doors';
import { planter, signBox, signWidthFor } from '../parts/signs';
import { frame, str, type Params } from './common';

export function university(params?: Params): Sprite {
  const name = str(params, 'sign', 'HI-TECH U');
  const f = frame(92, 80, { topPad: 26, roofH: 11 });
  const t = f.sprite;

  const wingW = Math.floor((f.w - 24) / 2);

  // --- wings --------------------------------------------------------------
  for (const side of [0, 1]) {
    const wx = side === 0 ? f.x : f.x + f.w - wingW;
    wall(t, wx, f.wallY, wingW, f.wallH, { face: C.brick, shade: C.brickDark, texture: 'brick' });
    windowGrid(t, wx + 4, f.wallY + 6, wingW - 8, 26, 3, 2, { sill: C.cream, frame: C.cream });
    planter(t, wx + 3, f.groundY - 5, wingW - 6);
    roofHip(t, wx, f.roofY, wingW, f.roofH, { top: C.metalDark, shade: C.inkSoft, overhang: 2 });
  }

  // --- central block ------------------------------------------------------
  const cw = 28;
  const cx0 = f.cx - (cw >> 1);
  wall(t, cx0, f.wallY - 4, cw, f.wallH + 4, { face: C.brick, shade: C.brickDark, texture: 'brick' });

  // name board over the entrance, wide enough to span into both wings
  const boardW = Math.max(cw + 8, signWidthFor(name, 1) + 4);
  signBox(t, f.cx - (boardW >> 1), f.wallY + 2, boardW, 12, name, {
    bg: C.cream,
    fg: C.brickDark,
    border: C.white,
  });

  const entryY = f.wallY + 17;
  doorArched(t, f.cx - 8, entryY, 16, f.groundY - entryY - 3, { face: C.woodDark, shade: C.ink });
  steps(t, f.cx, f.groundY - 1, 22, 3, C.stone, C.stoneDark);

  // --- clock tower --------------------------------------------------------
  const towerBase = f.wallY - 2;
  tower(t, f.cx, 0, 22, towerBase, {
    top: C.greenDark,
    shade: C.ink,
    wall: C.brick,
    wallShade: C.brickDark,
    cap: 'pyramid',
    clock: true,
    clockFace: C.cream,
    clockHands: C.ink,
  });
  // belfry louvres in the cap, above the clock
  for (const bx of [f.cx - 6, f.cx + 2]) {
    box(t, bx, 11, 4, 5, C.ink, C.ink);
    for (let j = 1; j < 5; j += 2) hline(t, bx + 1, 11 + j, 2, C.stoneDark);
  }
  // finial on the spire
  vline(t, f.cx, -1, 3, C.yellow);

  plinth(t, f.x, f.groundY - 2, f.w, 2, C.stone, C.stoneDark);
  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
