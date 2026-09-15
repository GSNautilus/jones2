/**
 * Shady Acres. The cheap rental: olive render going grey, one window boarded
 * over, a crack running down the corner, a bent TV aerial and a bin by the
 * door. Three low storeys under a flat roof.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowPane } from '../parts/windows';
import { doorSingle } from '../parts/doors';
import { signBand } from '../parts/signs';
import { tvAerial } from '../parts/details';
import { frame, str, type Params } from './common';

export function shadyAcres(params?: Params): Sprite {
  const name = str(params, 'sign', 'SHADY ACRES');
  const f = frame(84, 90, { topPad: 16, roofH: 10 });
  const t = f.sprite;

  // --- block ---------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.olive, shade: C.oliveDark, texture: 'courses' });

  // name band, paint peeling off it
  signBand(t, f.x, f.wallY + 2, f.w, 11, name, { bg: C.oliveDark, fg: C.cream, textShadow: C.ink });
  for (const px of [f.x + 9, f.x + 30, f.x + 58]) put(t, px, f.wallY + 6, C.olive);

  // --- windows: three floors of four, one of them boarded ------------------
  const floorTop = f.wallY + 16;
  const pitch = 16;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const wx = f.x + 5 + col * 19;
      const wy = floorTop + row * pitch;
      if (row === 1 && col === 1) {
        // boarded: four planks nailed across the reveal
        box(t, wx, wy, 14, 11, C.ink, C.ink);
        for (let k = 0; k < 3; k++) {
          rect(t, wx - 1, wy + 1 + k * 4, 16, 3, C.wood);
          hline(t, wx - 1, wy + 3 + k * 4, 16, C.woodDark);
          box(t, wx - 1, wy + 1 + k * 4, 16, 3, -1, C.ink);
        }
        continue;
      }
      const lit = (row + col) % 3 === 0;
      windowPane(t, wx, wy, 14, 11, {
        glass: lit ? C.yellow : C.glassDark,
        glassDark: lit ? C.yellowDark : C.slateDark,
        sill: C.oliveDark,
      });
      // a curtain half drawn in a couple of them
      if ((row * 4 + col) % 5 === 1) rect(t, wx + 1, wy + 1, 5, 9, C.creamShade);
    }
  }

  // --- crack down the right-hand corner ------------------------------------
  let cx = f.x + f.w - 8;
  for (let y = f.wallY + 14; y < f.groundY - 4; y += 2) {
    put(t, cx, y, C.oliveDark);
    put(t, cx, y + 1, C.ink);
    cx += ((y >> 1) & 1) === 0 ? 1 : -1;
  }

  // --- entrance ------------------------------------------------------------
  const doorH = 16;
  const dx = f.x + 10;
  rect(t, dx - 3, f.groundY - doorH - 3, 20, doorH + 3, C.oliveDark);
  box(t, dx - 3, f.groundY - doorH - 3, 20, doorH + 3, -1, C.ink);
  doorSingle(t, dx, f.groundY - doorH, 14, doorH, { face: C.woodDark, shade: C.ink, handle: C.metalDark });
  // a naked bulb over it
  put(t, dx + 7, f.groundY - doorH - 2, C.yellow);

  // a wheelie bin with the lid up
  box(t, f.x + f.w - 22, f.groundY - 12, 13, 12, C.greenDark, C.ink);
  hline(t, f.x + f.w - 21, f.groundY - 11, 11, C.green);
  rect(t, f.x + f.w - 24, f.groundY - 17, 17, 3, C.greenDark);
  box(t, f.x + f.w - 24, f.groundY - 17, 17, 3, -1, C.ink);
  put(t, f.x + f.w - 16, f.groundY - 19, C.paving);
  put(t, f.x + f.w - 15, f.groundY - 20, C.paving);

  plinth(t, f.x, f.groundY - 3, f.w, 4, C.stoneDark, C.ink);

  // --- roof ----------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.oliveDark, shade: C.ink });
  tvAerial(t, f.x + 16, f.roofY + 2, 14);
  // a satellite of water tanks
  box(t, f.x + f.w - 26, f.roofY + 1, 12, 5, C.metalDark, C.ink);
  hline(t, f.x + f.w - 25, f.roofY + 2, 10, C.metal);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
