/**
 * The Gilded Fork. Cream stucco and gold leaf: a scalloped awning over the
 * door, clipped topiary either side of it, tall shuttered windows with warm
 * light behind them and a gold fork on a bracket sign.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { pilasters, plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowPane } from '../parts/windows';
import { doorDouble } from '../parts/doors';
import { awning, signBox } from '../parts/signs';
import { iconFork, topiary } from '../parts/details';
import { frame, str, type Params } from './common';

export function gildedFork(params?: Params): Sprite {
  const line1 = str(params, 'sign', 'THE');
  const line2 = str(params, 'sign2', 'GILDED FORK');
  const f = frame(88, 90, { topPad: 24, roofH: 11 });
  const t = f.sprite;

  // --- facade --------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.cream, shade: C.creamShade, texture: 'courses' });
  pilasters(t, f.x, f.wallY + 1, f.w, f.wallH - 2, 18, C.white, C.creamShade);

  // the name, small line above a big one, gold on cream
  drawTextCentred(t, f.x, f.wallY + 3, f.w, line1, C.goldDark, { spacing: 3 });
  signBox(t, f.x + 5, f.wallY + 11, f.w - 10, 12, line2, {
    bg: C.gold,
    fg: C.ink,
    border: C.yellow,
    textShadow: C.goldDark,
  });

  // --- windows -------------------------------------------------------------
  const winY = f.wallY + 26;
  for (const wx of [f.x + 5, f.x + f.w - 25]) {
    windowPane(t, wx, winY, 20, 18, { lit: true, litColor: C.yellow, sill: C.gold });
    // glazing bars and a shutter each side
    vline(t, wx + 9, winY, 18, C.creamShade);
    hline(t, wx, winY + 8, 20, C.creamShade);
    // a lampshade and a diner silhouetted behind the glass
    rect(t, wx + 4, winY + 3, 5, 2, C.ink);
    vline(t, wx + 6, winY + 1, 2, C.ink);
    rect(t, wx + 13, winY + 11, 5, 7, C.ink);
    rect(t, wx + 14, winY + 8, 3, 3, C.ink);
    for (const sx of [wx - 3, wx + 20]) {
      rect(t, sx, winY, 3, 18, C.greenDark);
      vline(t, sx + 1, winY + 1, 16, C.green);
      box(t, sx, winY, 3, 18, -1, C.ink);
    }
  }

  // --- entrance ------------------------------------------------------------
  const doorH = 24;
  const doorW = 20;
  const dx = f.cx - (doorW >> 1);
  box(t, dx - 3, f.groundY - doorH - 3, doorW + 6, doorH + 3, C.creamShade, C.ink);
  doorDouble(t, dx, f.groundY - doorH, doorW, doorH, { face: C.woodDark, shade: C.ink, handle: C.gold });
  // fanlight over the doors
  rect(t, dx, f.groundY - doorH - 2, doorW, 2, C.yellow);
  box(t, dx, f.groundY - doorH - 2, doorW, 2, -1, C.ink);

  // the awning, over the doorway only
  awning(t, dx - 2, f.groundY - doorH - 8, doorW + 4, 5, {
    a: C.greenDark,
    b: C.gold,
    shade: C.ink,
    stripe: 4,
  });

  // topiary either side of the door
  topiary(t, dx - 8, f.groundY - 1, 16);
  topiary(t, dx + doorW + 8, f.groundY - 1, 16);

  plinth(t, f.x, f.groundY - 3, f.w, 4, C.stone, C.stoneDark);

  // --- roof and the fork sign ----------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.stone, shade: C.stoneDark });
  rect(t, f.x - 2, f.roofY + f.roofH - 4, f.w + 4, 2, C.gold);
  // balustrade along the parapet
  for (let i = f.x + 3; i < f.x + f.w - 3; i += 5) {
    vline(t, i, f.roofY + 1, 5, C.stone);
    put(t, i, f.roofY, C.white);
  }

  // the fork on a bracket sign at the left-hand end
  const bx = f.x + 6;
  const by = f.roofY - 22;
  hline(t, bx, by, 16, C.goldDark);
  vline(t, bx, by, f.roofY - by + 2, C.goldDark);
  vline(t, bx + 1, by, f.roofY - by + 2, C.ink);
  box(t, bx + 6, by + 2, 18, 22, C.ink, C.ink);
  iconFork(t, bx + 8, by + 4, 14, 18);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
