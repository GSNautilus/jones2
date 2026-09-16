/**
 * The Rent Office. A small municipal counter in a brick terrace block: a
 * stepped parapet, two stubby columns round the door, barred windows, a
 * payment slot beside the entrance and a notice board nobody reads. Dull on
 * purpose — it is where the money leaves.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowGrid } from '../parts/windows';
import { doorSingle, steps } from '../parts/doors';
import { columns, signBox } from '../parts/signs';
import { noticeBoard } from '../parts/details';
import { frame, str, type Params } from './common';

export function rentOffice(params?: Params): Sprite {
  const name = str(params, 'sign', 'RENT');
  const name2 = str(params, 'sign2', 'OFFICE');
  const f = frame(78, 70, { topPad: 12, roofH: 9 });
  const t = f.sprite;

  // --- facade --------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.brick, shade: C.brickDark, texture: 'brick' });

  // name plate across the frieze, two lines because "RENT OFFICE" is wide
  signBox(t, f.x + 4, f.wallY + 2, f.w - 8, 10, name, { bg: C.cream, fg: C.ink, border: C.white });
  signBox(t, f.x + 4, f.wallY + 12, f.w - 8, 10, name2, { bg: C.cream, fg: C.ink, border: C.white });

  // barred windows either side of the entrance bay
  for (const wx of [f.x + 3, f.x + f.w - 21]) {
    windowGrid(t, wx, f.groundY - 22, 18, 13, 2, 1, {
      glass: C.glass,
      glassDark: C.glassDark,
      sill: C.stone,
      frame: C.cream,
    });
    // bars
    for (let i = 3; i < 18; i += 4) vline(t, wx + i, f.groundY - 21, 11, C.metalDark);
  }

  // --- entrance ------------------------------------------------------------
  const doorH = 19;
  const doorW = 14;
  const dx = f.cx - (doorW >> 1);
  rect(t, dx - 6, f.groundY - doorH - 5, doorW + 12, doorH + 5, C.stone);
  box(t, dx - 6, f.groundY - doorH - 5, doorW + 12, doorH + 5, -1, C.ink);
  hline(t, dx - 5, f.groundY - doorH - 4, doorW + 10, C.white);
  columns(t, dx - 5, f.groundY - doorH - 2, doorW + 10, doorH + 1, 2, C.stone, C.stoneDark);
  doorSingle(t, dx, f.groundY - doorH, doorW, doorH, {
    face: C.woodDark,
    shade: C.ink,
    handle: C.yellow,
  });
  steps(t, f.cx, f.groundY - 1, 20, 2, C.stone, C.stoneDark);

  // payment slot: a brass letter plate set into the brick beside the door
  const slotX = dx + doorW + 8;
  rect(t, slotX, f.groundY - 16, 9, 5, C.yellowDark);
  hline(t, slotX + 1, f.groundY - 15, 7, C.yellow);
  hline(t, slotX + 1, f.groundY - 13, 7, C.ink);
  box(t, slotX, f.groundY - 16, 9, 5, -1, C.ink);

  // --- roof ----------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.stone, shade: C.stoneDark });
  // stepped parapet: three blocks, the middle one raised
  for (const [bx, bw, bh] of [
    [f.x + 2, 14, 4],
    [f.cx - 11, 22, 7],
    [f.x + f.w - 16, 14, 4],
  ] as Array<[number, number, number]>) {
    rect(t, bx, f.roofY - bh, bw, bh + 2, C.stone);
    hline(t, bx + 1, f.roofY - bh + 1, bw - 2, C.white);
    box(t, bx, f.roofY - bh, bw, bh + 2, -1, C.ink);
  }
  // a plain date stone on the raised block
  for (let i = 0; i < 3; i++) put(t, f.cx - 2 + i * 2, f.roofY - 4, C.stoneDark);

  plinth(t, f.x, f.groundY - 3, f.w, 3, C.stone, C.stoneDark);

  // --- notice board on the pavement ---------------------------------------
  noticeBoard(t, f.x + f.w - 12, f.groundY, 18, 13);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
