/**
 * The Government building, on the open ground across the high street from the
 * Rent Office: two storeys of stone courses, a full-height colonnade of six
 * columns over the steps, a cut nameplate in the frieze, a copper cupola on
 * a drum and the flag on the west parapet.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { hline, put, vline, rect } from '../surface';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat, tower } from '../parts/roofs';
import { windowPane } from '../parts/windows';
import { doorArched, steps } from '../parts/doors';
import { columns, signBox, signWidthFor } from '../parts/signs';
import { flag, topiary } from '../parts/details';
import { frame, str, type Params } from './common';

export function government(params?: Params): Sprite {
  const name = str(params, 'sign', 'GOVERNMENT');
  const f = frame(96, 90, { topPad: 18, roofH: 8 });
  const t = f.sprite;

  // --- facade ---------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.cream, shade: C.creamShade, texture: 'courses' });

  // the nameplate, cut into the frieze
  const plateW = Math.min(f.w - 6, Math.max(64, signWidthFor(name, 1)));
  signBox(t, f.cx - (plateW >> 1), f.wallY + 2, plateW, 10, name, {
    bg: C.stone,
    fg: C.ink,
    border: C.white,
    spacing: 1,
  });
  // dentils under the frieze
  for (let i = 2; i < f.w - 3; i += 4) {
    put(t, f.x + i, f.wallY + 13, C.white);
    put(t, f.x + i + 1, f.wallY + 13, C.stoneDark);
  }

  // --- wings: two floors of windows either side of the portico -------------
  for (const wx of [f.x + 3, f.x + 13, f.x + f.w - 11, f.x + f.w - 21]) {
    windowPane(t, wx, f.wallY + 17, 8, 11, { sill: C.creamShade, frame: C.white });
    windowPane(t, wx, f.wallY + 34, 8, 11, { sill: C.creamShade, frame: C.white });
  }
  // a string course between the floors
  hline(t, f.x, f.wallY + 31, f.w, C.stoneDark);

  // --- portico: six columns the full height of the facade -----------------
  const portW = 44;
  const portX = f.cx - (portW >> 1);
  const portY = f.wallY + 13;
  const portH = f.groundY - portY - 3;
  rect(t, portX, portY, portW, portH, C.creamShade);
  hline(t, portX, portY, portW, C.ink);
  doorArched(t, f.cx - 6, portY + portH - 24, 13, 24, { face: C.woodDark, shade: C.ink });
  // a fanlight window over the door
  windowPane(t, f.cx - 5, portY + 5, 11, 9, { sill: C.creamShade, frame: C.white });
  columns(t, portX + 2, portY, portW - 4, portH, 6, C.white, C.stoneDark);

  // --- steps and planting ---------------------------------------------------
  plinth(t, f.x, f.groundY - 4, f.w, 3, C.stone, C.stoneDark);
  steps(t, f.cx, f.groundY - 1, 30, 3, C.stone, C.stoneDark);
  topiary(t, f.x + 5, f.groundY, 11);
  topiary(t, f.x + f.w - 6, f.groundY, 11);

  // --- roof, balustrade, cupola and flag ------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.stone, shade: C.stoneDark });
  for (let i = 3; i < f.w - 2; i += 4) {
    vline(t, f.x + i, f.roofY + 2, 3, C.white);
    put(t, f.x + i + 1, f.roofY + 2, C.stoneDark);
  }
  hline(t, f.x - 2, f.roofY + 1, f.w + 4, C.white);
  hline(t, f.x - 2, f.roofY + 5, f.w + 4, C.ink);

  // the cupola stands on a drum behind the parapet
  tower(t, f.cx, 0, 26, f.roofY + 6, {
    top: C.teal,
    shade: C.greenDark,
    wall: C.cream,
    wallShade: C.creamShade,
    cap: 'dome',
  });
  put(t, f.cx, 1, C.gold);

  flag(t, f.x + 5, 2, 16, C.blue, C.blueDark);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
