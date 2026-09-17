/**
 * The Research Lab. A white panelled box with an observatory dome at one end
 * and a dish at the other, a big round window with something green glowing
 * behind it, and a hazard-striped loading door nobody is allowed through.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat, tower } from '../parts/roofs';
import { roundWindow, windowGrid } from '../parts/windows';
import { doorSingle } from '../parts/doors';
import { signBox } from '../parts/signs';
import { satelliteDish, securityCamera } from '../parts/details';
import { frame, str, type Params } from './common';

/** A diagonally striped hazard band. */
function hazardBand(t: Sprite, x: number, y: number, w: number, h: number): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      put(t, x + i, y + j, ((i + j) % 6 < 3 ? C.yellow : C.ink));
    }
  }
  box(t, x, y, w, h, -1, C.ink);
}

export function researchLab(params?: Params): Sprite {
  const name = str(params, 'sign', 'RESEARCH LAB');
  const f = frame(88, 76, { topPad: 20, roofH: 9 });
  const t = f.sprite;

  // --- facade ---------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.white, shade: C.stoneDark, texture: 'panels' });
  // panel joint lines, so the box reads as clad rather than painted
  for (let j = f.wallY + 8; j < f.groundY - 4; j += 10) hline(t, f.x + 1, j, f.w - 2, C.stone);

  signBox(t, f.x + 2, f.wallY + 3, f.w - 4, 12, name, {
    bg: C.slateDark,
    fg: C.teal,
    border: C.slate,
    textShadow: C.ink,
    spacing: 1,
  });

  // --- the big round window, with the experiment behind it ------------------
  const winX = f.x + 18;
  const winY = f.wallY + 28;
  box(t, winX - 12, winY - 12, 24, 24, C.stoneDark, C.ink);
  roundWindow(t, winX, winY, 9, { glass: C.teal, glassDark: C.greenDark });
  vline(t, winX, winY - 8, 17, C.metal);
  hline(t, winX - 8, winY, 17, C.metal);
  put(t, winX, winY, C.ink);
  // a flask on a bench, silhouetted
  rect(t, winX - 4, winY + 4, 3, 3, C.ink);
  put(t, winX - 3, winY + 2, C.ink);
  rect(t, winX + 2, winY + 3, 4, 4, C.ink);
  hline(t, winX - 7, winY + 7, 15, C.ink);

  // --- lab windows and the hazard door --------------------------------------
  windowGrid(t, f.x + 38, f.wallY + 20, 24, 12, 2, 1, { glass: C.glass, glassDark: C.glassDark, sill: C.stoneDark, lit: true, litColor: C.teal });

  const doorX = f.x + 44;
  const doorW = 20;
  hazardBand(t, doorX - 2, f.groundY - 26, doorW + 4, 5);
  rect(t, doorX - 2, f.groundY - 21, doorW + 4, 21, C.stoneDark);
  doorSingle(t, doorX, f.groundY - 19, doorW, 19, { face: C.metal, shade: C.metalDark, handle: C.ink });
  vline(t, doorX + (doorW >> 1), f.groundY - 19, 19, C.ink);
  box(t, doorX + 2, f.groundY - 17, 6, 5, C.glass, C.ink);
  box(t, doorX + doorW - 8, f.groundY - 17, 6, 5, C.glass, C.ink);
  box(t, doorX - 2, f.groundY - 21, doorW + 4, 21, -1, C.ink);
  hazardBand(t, doorX - 2, f.groundY - 3, doorW + 4, 3);
  securityCamera(t, doorX + doorW + 3, f.groundY - 24);

  // gas cylinders chained to the wall
  for (let k = 0; k < 3; k++) {
    const gx = f.x + 68 + k * 5;
    box(t, gx, f.groundY - 13, 4, 13, k === 1 ? C.green : C.teal, C.ink);
    hline(t, gx + 1, f.groundY - 12, 2, C.white);
    put(t, gx + 1, f.groundY - 14, C.metalDark);
    put(t, gx + 2, f.groundY - 14, C.ink);
  }
  hline(t, f.x + 66, f.groundY - 8, 20, C.metalDark);

  plinth(t, f.x, f.groundY - 2, f.w, 3, C.paving, C.pavingDark);

  // --- roof: dome, dish, vents ---------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.metal, shade: C.metalDark });

  tower(t, f.x + 18, 0, 24, f.roofY + 7, {
    top: C.white,
    shade: C.stoneDark,
    wall: C.stone,
    wallShade: C.stoneDark,
    cap: 'dome',
  });
  // the shutter slit in the dome
  rect(t, f.x + 17, 2, 3, 9, C.slateDark);
  box(t, f.x + 16, 1, 5, 11, -1, C.ink);
  put(t, f.x + 18, 3, C.glass);

  satelliteDish(t, f.x + f.w - 19, f.roofY + 5, 6);

  // vent stacks between them
  for (const vx of [f.x + 36, f.x + 42]) {
    rect(t, vx, f.roofY - 7, 4, 9, C.metalDark);
    vline(t, vx, f.roofY - 7, 9, C.metal);
    box(t, vx - 1, f.roofY - 9, 6, 3, C.metal, C.ink);
    box(t, vx, f.roofY - 7, 4, 9, -1, C.ink);
  }

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
