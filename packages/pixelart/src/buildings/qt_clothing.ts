/**
 * QT Clothing. Pink render, a teal scalloped awning, a dress form posing in the
 * window and — straight from the original board — a palm tree at each end of
 * the shopfront.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { plinth, recess, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { doorGlass } from '../parts/doors';
import { awning, signBox } from '../parts/signs';
import { mannequin, palmTree } from '../parts/details';
import { frame, str, type Params } from './common';

export function qtClothing(params?: Params): Sprite {
  const name = str(params, 'sign', 'QT CLOTHING');
  const f = frame(88, 72, { topPad: 8, roofH: 12 });
  const t = f.sprite;

  // --- facade --------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.pink, shade: C.red, texture: 'none' });

  // fascia sign
  signBox(t, f.x + 3, f.wallY + 3, f.w - 6, 12, name, {
    bg: C.teal,
    fg: C.white,
    border: C.glass,
    textShadow: C.blueDark,
  });

  // --- display window ------------------------------------------------------
  const frontY = f.groundY - 26;
  const winW = f.w - 26;
  recess(t, f.x + 2, frontY, winW, f.groundY - frontY - 2, C.glass, C.glassDark);
  // the glazing: a big pane with a diagonal reflection
  const gw = winW - 2;
  const gh = f.groundY - frontY - 4;
  rect(t, f.x + 3, frontY + 1, gw, gh, C.glass);
  for (let j = 0; j < gh; j++) {
    const start = Math.max(0, Math.round(gw * 0.52 + j * 1.1));
    if (start < gw) rect(t, f.x + 3 + start, frontY + 1 + j, gw - start, 1, C.glassDark);
  }
  for (let j = 1; j < gh - 1; j++) put(t, f.x + 7 + j, frontY + 1 + j, C.white);

  // the dress form, posing in the left of the window
  mannequin(t, f.x + 17, f.groundY - 4, C.pink, C.red);
  // a rail of hanging clothes beside it
  hline(t, f.x + 26, frontY + 6, 26, C.metalDark);
  hline(t, f.x + 26, frontY + 7, 26, C.ink);
  for (let k = 0; k < 5; k++) {
    const cxk = f.x + 29 + k * 5;
    const col = [C.yellow, C.teal, C.white, C.purple, C.orange][k];
    vline(t, cxk, frontY + 8, 2, C.ink);
    rect(t, cxk - 1, frontY + 10, 3, 10, col);
    vline(t, cxk + 1, frontY + 10, 10, C.ink);
    vline(t, cxk - 2, frontY + 10, 10, C.ink);
    hline(t, cxk - 2, frontY + 20, 4, C.ink);
  }

  doorGlass(t, f.x + f.w - 22, f.groundY - 24, 20, 24, { frame: C.teal });

  // --- awning over the window ----------------------------------------------
  awning(t, f.x + 2, frontY - 3, winW, 4, { a: C.teal, b: C.white, shade: C.blueDark, stripe: 5 });

  plinth(t, f.x, f.groundY - 2, f.w, 2, C.paving, C.pavingDark);

  // --- roof ----------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.red, shade: C.redDark });
  rect(t, f.x - 2, f.roofY + f.roofH - 4, f.w + 4, 2, C.teal);

  groundShadow(t, f.x, f.groundY + 1, f.w);

  // --- the palms, standing on the pavement in front ------------------------
  palmTree(t, f.x + 4, f.groundY + 1, 32, -1);
  palmTree(t, f.x + f.w - 5, f.groundY + 1, 28, 1);

  return t;
}
