/**
 * First Jones Bank. Grey stone, a colonnade of white columns, wide steps up
 * from the pavement and a green dollar medallion in the pediment.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextScaled } from '../font';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowPane } from '../parts/windows';
import { doorArched, steps } from '../parts/doors';
import { columns, pediment, signBox } from '../parts/signs';
import { frame, str, type Params } from './common';

export function bank(params?: Params): Sprite {
  const name = str(params, 'sign', 'BANK');
  const f = frame(90, 78, { topPad: 17, roofH: 10 });
  const t = f.sprite;

  // --- facade ------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.stone, shade: C.stoneDark, texture: 'courses' });

  // frieze with the bank's name
  signBox(t, f.x + 6, f.wallY + 3, f.w - 12, 11, name, { bg: C.cream, fg: C.ink, border: C.white });

  // --- colonnade ---------------------------------------------------------
  const portH = 26;
  const portY = f.wallY + 17;
  // shaded recess behind the columns
  rect(t, f.x + 6, portY, f.w - 12, portH, C.stoneDark);
  hline(t, f.x + 6, portY, f.w - 12, C.ink);
  doorArched(t, f.cx - 8, portY + 6, 16, portH - 6, { face: C.woodDark, shade: C.ink });
  columns(t, f.x + 8, portY, f.w - 16, portH, 5, C.white, C.stoneDark);

  // small barred windows either side, above the portico line
  windowPane(t, f.x + 3, f.wallY + 17, 6, 7, { glass: C.glassDark, glassDark: C.blueDark, sill: C.stoneDark });
  windowPane(t, f.x + f.w - 9, f.wallY + 17, 6, 7, { glass: C.glassDark, glassDark: C.blueDark, sill: C.stoneDark });

  // --- steps -------------------------------------------------------------
  plinth(t, f.x, f.groundY - 5, f.w, 3, C.stone, C.stoneDark);
  steps(t, f.cx, f.groundY - 1, 34, 3, C.stone, C.stoneDark);

  // --- roof and pediment --------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.stone, shade: C.stoneDark });
  pediment(t, f.cx, 1, 54, 14, C.stone, C.stoneDark);

  // green dollar medallion in the tympanum
  const my = 11;
  for (let j = -5; j <= 5; j++) {
    const span = Math.floor(Math.sqrt(Math.max(0, 30 - j * j)));
    rect(t, f.cx - span, my + j, span * 2 + 1, 1, j < 0 ? C.green : C.greenDark);
    put(t, f.cx - span - 1, my + j, C.ink);
    put(t, f.cx + span + 1, my + j, C.ink);
  }
  hline(t, f.cx - 1, my - 6, 3, C.ink);
  hline(t, f.cx - 1, my + 6, 3, C.ink);
  drawTextScaled(t, f.cx - 2, my - 3, '$', C.white, 1);

  // acroteria: little blocks on the pediment corners
  for (const bx of [f.cx - 28, f.cx + 25]) box(t, bx, 13, 3, 3, C.white, C.ink);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
