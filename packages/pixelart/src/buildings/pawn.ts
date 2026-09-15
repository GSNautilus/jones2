/**
 * The Pawn Shop. Narrow, dark and shut-looking: brown boards, one barred
 * window, a grille over the door and the three golden balls hanging off the
 * corner of the facade.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowPane } from '../parts/windows';
import { doorSingle } from '../parts/doors';
import { signBand } from '../parts/signs';
import { pawnBalls } from '../parts/details';
import { frame, str, type Params } from './common';

/** Vertical bars over an opening, with a bolted frame. */
function bars(t: Sprite, x: number, y: number, w: number, h: number, pitch = 4): void {
  for (let i = pitch; i < w; i += pitch) {
    vline(t, x + i, y, h, C.metal);
    vline(t, x + i + 1, y, h, C.ink);
  }
  hline(t, x, y, w, C.metalDark);
  hline(t, x, y + h - 1, w, C.metalDark);
  box(t, x - 1, y - 1, w + 2, h + 2, -1, C.ink);
}

export function pawn(params?: Params): Sprite {
  const name = str(params, 'sign', 'PAWN');
  const f = frame(58, 70, { topPad: 14, roofH: 11, inset: 3 });
  const t = f.sprite;

  // --- facade --------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.woodDark, shade: C.ink, texture: 'panels' });

  // sign band, gold on near-black
  signBand(t, f.x, f.wallY + 3, f.w, 11, name, { bg: C.ink, fg: C.gold, textShadow: C.goldDark });
  drawTextCentred(t, f.x, f.wallY + 16, f.w, 'LOANS', C.goldDark, { spacing: 1 });

  // --- barred window -------------------------------------------------------
  const winY = f.groundY - 26;
  windowPane(t, f.x + 4, winY, 22, 15, { glass: C.glassDark, glassDark: C.slateDark, sill: C.woodDark });
  bars(t, f.x + 4, winY, 22, 15, 5);
  // a watch and a guitar neck just visible behind the bars
  put(t, f.x + 9, winY + 5, C.gold);
  put(t, f.x + 10, winY + 5, C.gold);
  put(t, f.x + 9, winY + 6, C.goldDark);
  vline(t, f.x + 18, winY + 3, 9, C.wood);

  // --- door ----------------------------------------------------------------
  const doorH = 24;
  const doorX = f.x + f.w - 20;
  doorSingle(t, doorX, f.groundY - doorH, 16, doorH, { face: C.wood, shade: C.woodDark, handle: C.gold });
  bars(t, doorX + 2, f.groundY - doorH + 3, 12, 9, 4);
  // CLOSED card in the door glass
  box(t, doorX + 3, f.groundY - doorH + 14, 10, 5, C.cream, C.ink);
  hline(t, doorX + 4, f.groundY - doorH + 16, 8, C.redDark);

  plinth(t, f.x, f.groundY - 3, f.w, 3, C.stoneDark, C.ink);

  // --- roof and the three balls --------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.brickDark, shade: C.ink });
  // a mean little cornice
  rect(t, f.x - 1, f.wallY - 1, f.w + 2, 2, C.gold);
  hline(t, f.x - 1, f.wallY, f.w + 2, C.goldDark);

  // the balls hang off a bracket bolted to the parapet
  const bx = f.x + 16;
  const by = f.roofY - 11;
  vline(t, f.x + 5, by, f.roofY - by + 4, C.metalDark);
  vline(t, f.x + 6, by, f.roofY - by + 4, C.ink);
  hline(t, f.x + 5, by, 14, C.metalDark);
  hline(t, f.x + 5, by + 1, 14, C.ink);
  pawnBalls(t, bx, by + 1);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
