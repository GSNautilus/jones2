/**
 * The corner newsstand. The smallest thing on the board: a 40px kiosk under a
 * striped awning, its counter buried in stacked papers and a rack of magazines
 * bolted to the side.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawText } from '../font';
import { groundShadow } from '../parts/common';
import { wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { awning, signBand } from '../parts/signs';
import { frame, str, type Params } from './common';

/** A stack of folded newspapers: grey sheets with a black masthead line. */
function paperStack(t: Sprite, x: number, baseY: number, w: number, sheets: number): void {
  for (let k = 0; k < sheets; k++) {
    const y = baseY - 3 - k * 3;
    const jog = k & 1;
    rect(t, x + jog, y, w, 3, C.white);
    hline(t, x + jog, y + 2, w, C.paving);
    hline(t, x + jog + 2, y + 1, Math.max(1, w - 5), C.inkSoft);
    hline(t, x + jog, y + 3, w, C.ink);
    vline(t, x + jog, y, 3, C.ink);
    vline(t, x + jog + w - 1, y, 3, C.ink);
  }
  hline(t, x, baseY - 3 - (sheets - 1) * 3 - 1, w + 1, C.ink);
}

export function newsstand(params?: Params): Sprite {
  const name = str(params, 'sign', 'NEWS');
  const f = frame(40, 54, { topPad: 4, roofH: 8, inset: 2 });
  const t = f.sprite;

  // --- kiosk box -----------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.green, shade: C.greenDark, texture: 'panels' });

  // sign band across the top, then the awning below it
  signBand(t, f.x, f.wallY + 2, f.w, 10, name, { bg: C.greenDark, fg: C.yellow, textShadow: C.ink });

  // --- serving hatch --------------------------------------------------------
  const hatchY = f.wallY + 16;
  const hatchH = f.groundY - hatchY - 14;
  rect(t, f.x + 3, hatchY, f.w - 6, hatchH, C.ink);
  box(t, f.x + 2, hatchY - 1, f.w - 4, hatchH + 2, -1, C.ink);
  // magazines pegged across the back of the hatch
  for (let k = 0; k < 4; k++) {
    const mx = f.x + 5 + k * 7;
    const col = [C.red, C.blue, C.yellow, C.pink][k];
    box(t, mx, hatchY + 2, 5, 8, col, C.ink);
    hline(t, mx + 1, hatchY + 3, 3, C.white);
    hline(t, mx + 1, hatchY + 7, 3, C.white);
  }

  // counter shelf
  const counterY = f.groundY - 14;
  rect(t, f.x + 1, counterY, f.w - 2, 3, C.wood);
  hline(t, f.x + 1, counterY + 2, f.w - 2, C.woodDark);
  box(t, f.x + 1, counterY, f.w - 2, 3, -1, C.ink);

  // kiosk skirt down to the pavement
  rect(t, f.x + 1, counterY + 3, f.w - 2, f.groundY - counterY - 3, C.greenDark);
  for (let i = f.x + 3; i < f.x + f.w - 2; i += 3) vline(t, i, counterY + 4, f.groundY - counterY - 5, C.green);
  box(t, f.x, counterY + 3, f.w, f.groundY - counterY - 2, -1, C.ink);

  // papers heaped on the pavement in front of the kiosk
  paperStack(t, f.x + 2, f.groundY, 13, 3);
  paperStack(t, f.x + 17, f.groundY, 13, 2);
  // a lottery card propped on the counter
  box(t, f.x + f.w - 10, counterY - 8, 8, 8, C.yellow, C.ink);
  drawText(t, f.x + f.w - 8, counterY - 7, '$', C.redDark, { spacing: 0 });

  // --- awning and roof ------------------------------------------------------
  awning(t, f.x + 1, f.wallY + 13, f.w - 2, 4, { a: C.red, b: C.white, shade: C.redDark, stripe: 4 });
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.greenDark, shade: C.ink, overhang: 1 });
  // a lantern clipped to the roof edge, so the stand reads as open late
  box(t, f.x + 2, f.roofY - 5, 5, 5, C.yellow, C.ink);
  hline(t, f.x + 3, f.roofY - 4, 3, C.white);
  vline(t, f.x + 4, f.roofY, 2, C.metalDark);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
