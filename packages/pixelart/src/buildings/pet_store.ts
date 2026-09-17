/**
 * The Pet Store. A small cheerful shop on the poor bank between the burger
 * bar and the car lot: teal frontage, a striped awning over a big window with
 * a fish tank and a bird cage in it, a fascia sign, a paw-print board over
 * the door and a water bowl on the step.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowPane } from '../parts/windows';
import { doorGlass } from '../parts/doors';
import { awning, signBand } from '../parts/signs';
import { frame, str, type Params } from './common';

/** A four-toed paw print, ink on whatever is under it, 7 wide and 7 tall. */
function paw(t: Sprite, x: number, y: number, ink: number): void {
  // toes
  for (const [dx, dy] of [
    [1, 0],
    [3, 0],
    [5, 0],
    [0, 1],
    [1, 1],
    [3, 1],
    [5, 1],
    [6, 1],
  ] as const) {
    put(t, x + dx, y + dy, ink);
  }
  // pad
  rect(t, x + 2, y + 3, 3, 1, ink);
  rect(t, x + 1, y + 4, 5, 2, ink);
  rect(t, x + 2, y + 6, 3, 1, ink);
}

export function petStore(params?: Params): Sprite {
  const name = str(params, 'sign', 'PET STORE');
  const f = frame(76, 62, { topPad: 4, roofH: 8 });
  const t = f.sprite;

  // --- shopfront ------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.teal, shade: C.blueDark, texture: 'none' });
  signBand(t, f.x + 2, f.wallY + 2, f.w - 4, 11, name, { bg: C.cream, fg: C.ink, spacing: 1 });

  // --- the big window, with a tank and a cage in it -------------------------
  const winX = f.x + 4;
  const winW = 38;
  const winH = 20;
  const winY = f.groundY - 4 - winH;
  windowPane(t, winX, winY, winW, winH, { sill: C.creamShade, frame: C.white });
  // fish tank, lit from behind
  const tankX = winX + 3;
  const tankY = winY + 9;
  box(t, tankX, tankY, 16, 9, C.glassDark, C.ink);
  hline(t, tankX + 1, tankY + 1, 14, C.glass);
  for (const wx of [tankX + 3, tankX + 12]) {
    vline(t, wx, tankY + 4, 4, C.leafDark);
    put(t, wx, tankY + 3, C.leaf);
  }
  rect(t, tankX + 6, tankY + 4, 3, 2, C.orange);
  put(t, tankX + 9, tankY + 4, C.orangeDark);
  rect(t, tankX + 8, tankY + 6, 2, 1, C.yellow);
  // bird cage hanging on the right of the window
  const cageX = winX + winW - 12;
  const cageY = winY + 3;
  vline(t, cageX + 4, winY + 1, 2, C.metalDark);
  box(t, cageX, cageY, 9, 12, -1, C.metalDark);
  for (let i = 2; i < 8; i += 2) vline(t, cageX + i, cageY + 1, 10, C.metal);
  hline(t, cageX + 1, cageY + 12, 7, C.ink);
  rect(t, cageX + 3, cageY + 6, 3, 2, C.yellow);
  put(t, cageX + 6, cageY + 6, C.orange);
  put(t, cageX + 3, cageY + 8, C.yellowDark);

  // striped awning over the window
  awning(t, winX - 2, winY - 6, winW + 4, 6, { a: C.orange, b: C.cream, shade: C.orangeDark, stripe: 4 });

  // --- door, paw board and bowl --------------------------------------------
  const doorW = 12;
  const doorH = 20;
  const doorX = f.x + f.w - 4 - doorW;
  doorGlass(t, doorX, f.groundY - doorH, doorW, doorH, { frame: C.white });
  box(t, doorX - 1, winY - 8, doorW + 2, 11, C.white, C.ink);
  paw(t, doorX + 2, winY - 6, C.ink);
  // water bowl on the step beside the door
  rect(t, doorX - 8, f.groundY - 3, 6, 2, C.red);
  hline(t, doorX - 7, f.groundY - 3, 4, C.glass);
  hline(t, doorX - 8, f.groundY - 1, 6, C.redDark);

  // --- roof ------------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.slate, shade: C.slateDark });
  plinth(t, f.x, f.groundY - 2, f.w, 2, C.stone, C.stoneDark);
  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
