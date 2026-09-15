/**
 * Flex Factory. A purple shed with a glazed front you can see the treadmills
 * through, a dumbbell on a board over the parapet and a stripe of yellow at
 * the eave so it does not disappear against the evening sky.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowBand } from '../parts/windows';
import { doorGlass } from '../parts/doors';
import { signBox, signIcon } from '../parts/signs';
import { iconDumbbell } from '../parts/details';
import { frame, str, type Params } from './common';

export function gym(params?: Params): Sprite {
  const name = str(params, 'sign', 'FLEX FACTORY');
  const f = frame(88, 76, { topPad: 22, roofH: 11 });
  const t = f.sprite;

  // --- facade --------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.purple, shade: C.purpleDark, texture: 'none' });

  signBox(t, f.x + 3, f.wallY + 3, f.w - 6, 12, name, {
    bg: C.purpleDark,
    fg: C.yellow,
    border: C.purple,
    textShadow: C.ink,
  });

  // --- glazed front ---------------------------------------------------------
  const frontY = f.wallY + 19;
  const frontH = f.groundY - frontY - 3;
  rect(t, f.x + 1, frontY - 2, f.w - 2, frontH + 4, C.purpleDark);
  hline(t, f.x + 1, frontY - 2, f.w - 2, C.ink);

  windowBand(t, f.x + 4, frontY, 36, frontH, 2, { sill: C.purpleDark });
  windowBand(t, f.x + f.w - 26, frontY, 22, frontH, 1, { sill: C.purpleDark });

  // treadmills and a figure lifting, silhouetted behind the left glazing
  for (let k = 0; k < 3; k++) {
    const mx = f.x + 8 + k * 11;
    rect(t, mx, frontY + frontH - 7, 8, 3, C.ink);
    vline(t, mx + 6, frontY + frontH - 13, 7, C.ink);
    rect(t, mx + 4, frontY + frontH - 16, 3, 4, C.ink);
  }
  // a rack of weights behind the right glazing
  for (let k = 0; k < 3; k++) {
    hline(t, f.x + f.w - 23, frontY + 4 + k * 5, 16, C.ink);
    put(t, f.x + f.w - 23, frontY + 3 + k * 5, C.ink);
    put(t, f.x + f.w - 8, frontY + 3 + k * 5, C.ink);
  }

  doorGlass(t, f.x + 44, f.groundY - frontH - 1, 18, frontH + 1, { frame: C.yellow });

  plinth(t, f.x, f.groundY - 3, f.w, 4, C.paving, C.pavingDark);

  // --- roof ----------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.purpleDark, shade: C.ink });
  rect(t, f.x - 2, f.roofY + f.roofH - 4, f.w + 4, 2, C.yellow);
  // roof-mounted air handling unit
  box(t, f.x + 8, f.roofY + 1, 14, 6, C.metal, C.ink);
  for (let i = 1; i < 13; i += 3) vline(t, f.x + 8 + i, f.roofY + 2, 4, C.metalDark);

  // --- the dumbbell board --------------------------------------------------
  signIcon(t, f.cx + 10, f.roofY + 3, 40, 18, iconDumbbell, { bg: C.ink });

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
