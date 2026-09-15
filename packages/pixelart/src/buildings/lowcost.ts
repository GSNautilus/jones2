/**
 * Low-Cost Housing. Grey three-storey slab, identical windows, a zigzag fire
 * escape bolted across the right-hand bays and a two-line painted sign. It has
 * a kitchen. Technically.
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
import { fireEscape } from '../parts/details';
import { frame, str, type Params } from './common';

export function lowcost(params?: Params): Sprite {
  const line1 = str(params, 'sign', 'LOW-COST');
  const line2 = str(params, 'sign2', 'HOUSING');
  const f = frame(84, 96, { topPad: 14, roofH: 10 });
  const t = f.sprite;

  // --- slab ----------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.paving, shade: C.pavingDark, texture: 'panels' });
  pilasters(t, f.x, f.wallY + 1, f.w, f.wallH - 2, 26, C.white, C.pavingDark);

  // --- painted sign, two lines on the top band -----------------------------
  rect(t, f.x + 2, f.wallY + 2, f.w - 4, 19, C.slateDark);
  box(t, f.x + 2, f.wallY + 2, f.w - 4, 19, -1, C.ink);
  drawTextCentred(t, f.x + 2, f.wallY + 4, f.w - 4, line1, C.white, { spacing: 1 });
  drawTextCentred(t, f.x + 2, f.wallY + 12, f.w - 4, line2, C.paving, { spacing: 1 });

  // --- three identical floors ----------------------------------------------
  const floorTop = f.wallY + 24;
  const pitch = 15;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const wx = f.x + 5 + col * 19;
      const wy = floorTop + row * pitch;
      const lit = (row * 4 + col) % 4 === 2;
      windowPane(t, wx, wy, 14, 11, {
        glass: lit ? C.yellow : C.glass,
        glassDark: lit ? C.yellowDark : C.glassDark,
        sill: C.white,
      });
    }
  }

  // --- fire escape across the right-hand bays ------------------------------
  fireEscape(t, f.x + 41, floorTop + 12, 36, 2, pitch);
  // the drop ladder hanging over the entrance storey
  const ladderY = floorTop + 12 + pitch + 2;
  vline(t, f.x + 45, ladderY, 12, C.metalDark);
  vline(t, f.x + 48, ladderY, 12, C.metalDark);
  for (let j = 0; j < 12; j += 3) hline(t, f.x + 45, ladderY + j, 4, C.metal);

  // --- entrance ------------------------------------------------------------
  const doorH = 18;
  const doorW = 22;
  const dx = f.x + 10;
  rect(t, dx - 3, f.groundY - doorH - 4, doorW + 6, doorH + 4, C.pavingDark);
  box(t, dx - 3, f.groundY - doorH - 4, doorW + 6, doorH + 4, -1, C.ink);
  rect(t, dx - 1, f.groundY - doorH - 3, doorW + 2, 3, C.yellow);
  box(t, dx - 1, f.groundY - doorH - 3, doorW + 2, 3, -1, C.ink);
  doorDouble(t, dx, f.groundY - doorH, doorW, doorH, { face: C.metal, shade: C.metalDark, handle: C.ink });

  // a bank of letterboxes beside the door
  box(t, dx + doorW + 6, f.groundY - 16, 16, 13, C.metalDark, C.ink);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      box(t, dx + doorW + 7 + c * 5, f.groundY - 15 + r * 4, 4, 3, C.metal, C.ink);
    }
  }

  plinth(t, f.x, f.groundY - 3, f.w, 4, C.stoneDark, C.ink);

  // --- roof ----------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.pavingDark, shade: C.slateDark });
  // lift overrun and a vent stack
  box(t, f.x + 10, f.roofY - 6, 18, 8, C.pavingDark, C.ink);
  hline(t, f.x + 11, f.roofY - 5, 16, C.paving);
  vline(t, f.x + f.w - 18, f.roofY - 5, 7, C.metalDark);
  vline(t, f.x + f.w - 17, f.roofY - 5, 7, C.metal);
  put(t, f.x + f.w - 18, f.roofY - 6, C.ink);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
