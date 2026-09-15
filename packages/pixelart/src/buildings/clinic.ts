/**
 * Doc's Walk-In Clinic. White render, a teal band at the shopfront, a fat red
 * cross standing on the roof and wide ambulance doors you could wheel a trolley
 * through.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowGrid } from '../parts/windows';
import { doorDouble } from '../parts/doors';
import { signBox } from '../parts/signs';
import { iconCross } from '../parts/details';
import { frame, str, type Params } from './common';

export function clinic(params?: Params): Sprite {
  const name = str(params, 'sign', 'CLINIC');
  const f = frame(84, 72, { topPad: 20, roofH: 10 });
  const t = f.sprite;

  // --- facade --------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.white, shade: C.stoneDark, texture: 'none' });

  // teal band under the roofline with the name on it
  signBox(t, f.x + 4, f.wallY + 3, f.w - 8, 11, name, {
    bg: C.teal,
    fg: C.white,
    border: C.glass,
    textShadow: C.blueDark,
  });

  // frosted windows either side of the entrance
  for (const wx of [f.x + 3, f.x + f.w - 23]) {
    windowGrid(t, wx, f.groundY - 22, 20, 14, 2, 1, {
      glass: C.glass,
      glassDark: C.waterLight,
      sill: C.teal,
      frame: C.white,
    });
  }
  // a teal pinstripe under the name band
  hline(t, f.x + 2, f.wallY + 15, f.w - 4, C.teal);
  hline(t, f.x + 2, f.wallY + 16, f.w - 4, C.glass);
  hline(t, f.x + 2, f.wallY + 17, f.w - 4, C.teal);

  // --- ambulance doors -----------------------------------------------------
  const doorH = 20;
  const doorW = 22;
  const dx = f.cx - (doorW >> 1);
  // recessed reveal so the doors read as set back
  rect(t, dx - 3, f.groundY - doorH - 4, doorW + 6, doorH + 4, C.stoneDark);
  box(t, dx - 3, f.groundY - doorH - 4, doorW + 6, doorH + 4, -1, C.ink);
  // a lit fanlight over them
  rect(t, dx - 1, f.groundY - doorH - 3, doorW + 2, 3, C.yellow);
  box(t, dx - 1, f.groundY - doorH - 3, doorW + 2, 3, -1, C.ink);
  doorDouble(t, dx, f.groundY - doorH, doorW, doorH, { face: C.white, shade: C.stoneDark, handle: C.metalDark });
  // a red cross on each leaf
  iconCross(t, dx + 2, f.groundY - doorH + 4, 7, 7);
  iconCross(t, dx + doorW - 9, f.groundY - doorH + 4, 7, 7);
  // ramp rather than steps
  rect(t, dx - 6, f.groundY - 3, doorW + 12, 3, C.paving);
  hline(t, dx - 6, f.groundY - 1, doorW + 12, C.pavingDark);
  box(t, dx - 6, f.groundY - 3, doorW + 12, 3, -1, C.ink);

  // --- roof and the big cross ----------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.stone, shade: C.stoneDark });
  // teal parapet stripe
  rect(t, f.x - 2, f.roofY + f.roofH - 4, f.w + 4, 2, C.teal);

  // the cross sits on two legs above the parapet
  const crossW = 18;
  const crossH = 18;
  const crossY = f.roofY - crossH + 1;
  for (const lx of [f.cx - 6, f.cx + 5]) {
    rect(t, lx, crossY + crossH, 2, 4, C.metalDark);
    vline(t, lx, crossY + crossH, 4, C.metal);
  }
  iconCross(t, f.cx - (crossW >> 1), crossY, crossW, crossH);
  put(t, f.cx - (crossW >> 1) + 2, crossY + 2, C.white);

  plinth(t, f.x, f.groundY - 3, f.w, 3, C.paving, C.pavingDark);
  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
