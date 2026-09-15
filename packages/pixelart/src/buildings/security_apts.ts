/**
 * Security Apartments. The tallest of the three rentals: a slate tower with a
 * brightly lit lobby behind glass, a spear-topped railing and gate across the
 * frontage, and a camera watching the gate.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { pilasters, plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowPane } from '../parts/windows';
import { doorGlass } from '../parts/doors';
import { signBox } from '../parts/signs';
import { securityCamera } from '../parts/details';
import { frame, str, type Params } from './common';

export function securityApts(params?: Params): Sprite {
  const name = str(params, 'sign', 'SECURITY APTS');
  const f = frame(84, 104, { topPad: 16, roofH: 10 });
  const t = f.sprite;

  // --- tower ---------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.slate, shade: C.slateDark, texture: 'courses' });
  pilasters(t, f.x, f.wallY + 1, f.w, f.wallH - 2, 25, C.metal, C.slateDark);

  signBox(t, f.x + 3, f.wallY + 3, f.w - 6, 11, name, {
    bg: C.metalDark,
    fg: C.white,
    border: C.metal,
    textShadow: C.ink,
  });

  // --- four floors of paired windows ---------------------------------------
  const floorTop = f.wallY + 16;
  const pitch = 13;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const wx = f.x + 5 + col * 19;
      const wy = floorTop + row * pitch;
      const lit = (row * 5 + col * 3) % 4 === 1;
      windowPane(t, wx, wy, 14, 10, {
        glass: lit ? C.yellow : C.glassDark,
        glassDark: lit ? C.yellowDark : C.blueDark,
        sill: C.metal,
      });
      // a slim balcony rail under each opening
      hline(t, wx - 1, wy + 11, 16, C.metalDark);
    }
  }

  // --- lit lobby behind full-height glass ----------------------------------
  const lobbyY = f.groundY - 22;
  rect(t, f.x + 3, lobbyY, f.w - 6, f.groundY - lobbyY - 1, C.yellow);
  box(t, f.x + 3, lobbyY, f.w - 6, f.groundY - lobbyY - 1, -1, C.ink);
  // mullions
  for (let i = 12; i < f.w - 8; i += 12) {
    vline(t, f.x + 3 + i, lobbyY, f.groundY - lobbyY - 1, C.metal);
    vline(t, f.x + 4 + i, lobbyY, f.groundY - lobbyY - 1, C.ink);
  }
  // a concierge desk and a potted plant in the lobby
  rect(t, f.x + 9, f.groundY - 13, 16, 7, C.woodDark);
  hline(t, f.x + 9, f.groundY - 13, 16, C.wood);
  box(t, f.x + 9, f.groundY - 13, 16, 7, -1, C.ink);
  rect(t, f.x + 15, f.groundY - 19, 5, 6, C.ink);
  rect(t, f.x + 16, f.groundY - 22, 3, 3, C.ink);
  for (let j = 0; j < 6; j++) {
    const half = 3 - (j >> 1);
    rect(t, f.x + f.w - 16 - half, f.groundY - 20 + j, half * 2 + 1, 1, C.leafDark);
  }
  box(t, f.x + f.w - 19, f.groundY - 14, 7, 5, C.brickDark, C.ink);

  doorGlass(t, f.cx - 10, f.groundY - 19, 20, 18, { frame: C.metal });

  plinth(t, f.x, f.groundY - 3, f.w, 4, C.stoneDark, C.ink);

  // --- railings and gate across the frontage -------------------------------
  const railY = f.groundY - 13;
  for (let i = f.x + 2; i < f.x + f.w - 2; i += 4) {
    if (i > f.cx - 13 && i < f.cx + 12) continue;
    vline(t, i, railY, 14, C.ink);
    put(t, i, railY - 2, C.ink);
    put(t, i, railY - 1, C.metalDark);
  }
  hline(t, f.x + 2, railY + 2, f.w - 4, C.ink);
  hline(t, f.x + 2, railY + 10, f.w - 4, C.ink);
  // the gate itself, taller, with a spear finial each side
  for (const gx of [f.cx - 13, f.cx + 12]) {
    rect(t, gx, railY - 8, 3, 22, C.metalDark);
    box(t, gx, railY - 8, 3, 22, -1, C.ink);
    put(t, gx + 1, railY - 10, C.ink);
    put(t, gx + 1, railY - 9, C.metal);
  }
  for (let i = f.cx - 10; i < f.cx + 11; i += 4) {
    vline(t, i, railY - 6, 20, C.metalDark);
    put(t, i, railY - 7, C.ink);
  }
  hline(t, f.cx - 13, railY - 4, 28, C.ink);
  hline(t, f.cx - 13, railY + 8, 28, C.ink);
  // intercom post beside the gate
  box(t, f.cx + 16, railY - 4, 5, 9, C.metal, C.ink);
  put(t, f.cx + 18, railY - 2, C.red);
  hline(t, f.cx + 17, railY, 3, C.ink);

  // --- roof ----------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.slateDark, shade: C.ink });
  rect(t, f.x - 2, f.roofY + f.roofH - 4, f.w + 4, 2, C.metal);
  box(t, f.x + 12, f.roofY - 7, 20, 9, C.slateDark, C.ink);
  hline(t, f.x + 13, f.roofY - 6, 18, C.slate);
  // floodlight on the parapet
  vline(t, f.x + f.w - 14, f.roofY - 6, 7, C.metalDark);
  box(t, f.x + f.w - 17, f.roofY - 10, 7, 5, C.metal, C.ink);
  hline(t, f.x + f.w - 16, f.roofY - 9, 5, C.yellow);

  // --- the camera, watching the gate ---------------------------------------
  securityCamera(t, f.x + 3, f.wallY + 15);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
