/**
 * First Jones Bank. Grey stone, a colonnade of white columns, wide steps up
 * from the pavement, a clock in the pediment and a pair of vault wheels cast
 * into the end bays — so it reads as a bank and not just as a portico.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, line, put, rect, vline } from '../surface';
import { drawTextScaled } from '../font';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat, clockFace } from '../parts/roofs';
import { doorArched, steps } from '../parts/doors';
import { columns, pediment, signBox } from '../parts/signs';
import { flag } from '../parts/details';
import { frame, str, type Params } from './common';

/** A vault door cast into the wall: a rimmed disc, radial spokes and a handle. */
function vaultWheel(t: Sprite, cx: number, cy: number, r: number): void {
  for (let j = -r; j <= r; j++) {
    const span = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.5 - j * j)));
    rect(t, cx - span, cy + j, span * 2 + 1, 1, j < 0 ? C.metal : C.metalDark);
    put(t, cx - span - 1, cy + j, C.ink);
    put(t, cx + span + 1, cy + j, C.ink);
  }
  hline(t, cx - 1, cy - r - 1, 3, C.ink);
  hline(t, cx - 1, cy + r + 1, 3, C.ink);
  // rim
  for (let j = -r + 1; j < r; j++) {
    const span = Math.floor(Math.sqrt(Math.max(0, (r - 1) * (r - 1) + r * 0.5 - j * j)));
    put(t, cx - span, cy + j, C.white);
  }
  // four spokes and a hub
  line(t, cx, cy - r + 1, cx, cy + r - 1, C.stoneDark);
  line(t, cx - r + 1, cy, cx + r - 1, cy, C.stoneDark);
  line(t, cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2, C.stoneDark);
  line(t, cx - r + 2, cy + r - 2, cx + r - 2, cy - r + 2, C.stoneDark);
  rect(t, cx - 1, cy - 1, 3, 3, C.gold);
  put(t, cx, cy, C.ink);
}

export function bank(params?: Params): Sprite {
  const name = str(params, 'sign', 'BANK');
  const f = frame(92, 84, { topPad: 20, roofH: 10 });
  const t = f.sprite;

  // --- facade ------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.stone, shade: C.stoneDark, texture: 'courses' });

  // frieze with the bank's name
  signBox(t, f.x + 6, f.wallY + 3, f.w - 12, 11, name, { bg: C.cream, fg: C.ink, border: C.white });

  // --- end bays: a vault wheel in each -------------------------------------
  const wheelY = f.wallY + 28;
  for (const bx of [f.x + 9, f.x + f.w - 10]) {
    // a recessed panel behind the wheel
    box(t, bx - 9, wheelY - 11, 18, 22, C.stoneDark, C.ink);
    hline(t, bx - 8, wheelY - 10, 16, C.stone);
    vaultWheel(t, bx, wheelY, 7);
  }

  // --- colonnade -----------------------------------------------------------
  const portH = 32;
  const portY = f.wallY + 17;
  const portX = f.x + 20;
  const portW = f.w - 40;
  rect(t, portX, portY, portW, portH, C.stoneDark);
  hline(t, portX, portY, portW, C.ink);
  doorArched(t, f.cx - 8, portY + 8, 16, portH - 8, { face: C.woodDark, shade: C.ink });
  columns(t, portX + 2, portY, portW - 4, portH, 4, C.white, C.stoneDark);

  // --- steps -------------------------------------------------------------
  plinth(t, f.x, f.groundY - 5, f.w, 3, C.stone, C.stoneDark);
  steps(t, f.cx, f.groundY - 1, 34, 3, C.stone, C.stoneDark);

  // --- roof, pediment and clock --------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.stone, shade: C.stoneDark });
  pediment(t, f.cx, 4, 56, 15, C.stone, C.stoneDark);

  // the clock sits in the tympanum where the medallion used to be
  clockFace(t, f.cx, 13, 6, C.cream, C.ink, C.ink);
  // gilt numerals: a dot at each quarter
  for (const [dx, dy] of [
    [0, -5],
    [5, 0],
    [0, 5],
    [-5, 0],
  ] as Array<[number, number]>) {
    put(t, f.cx + dx, 13 + dy, C.gold);
  }

  // a dollar medallion at each end of the frieze
  for (const mx of [f.x + 11, f.x + f.w - 12]) {
    for (let j = -4; j <= 4; j++) {
      const span = Math.floor(Math.sqrt(Math.max(0, 19 - j * j)));
      rect(t, mx - span, f.wallY + 8 + j, span * 2 + 1, 1, j < 0 ? C.green : C.greenDark);
      put(t, mx - span - 1, f.wallY + 8 + j, C.ink);
      put(t, mx + span + 1, f.wallY + 8 + j, C.ink);
    }
    hline(t, mx - 1, f.wallY + 3, 3, C.ink);
    hline(t, mx - 1, f.wallY + 13, 3, C.ink);
    drawTextScaled(t, mx - 2, f.wallY + 5, '$', C.white, 1);
  }

  // acroteria on the pediment corners, and the flag on the left one
  for (const bx of [f.cx - 29, f.cx + 26]) box(t, bx, 17, 3, 3, C.white, C.ink);
  flag(t, f.cx - 28, 0, 18, C.red, C.redDark);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
