/**
 * Black's Market. A green grocer under a green-and-cream striped awning, with
 * the produce stacked in crates out on the pavement and the name split over two
 * lines the way a hand-painted fascia would be.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowBand } from '../parts/windows';
import { doorGlass } from '../parts/doors';
import { awning } from '../parts/signs';
import { produceCrate } from '../parts/details';
import { frame, str, type Params } from './common';

export function blacksMarket(params?: Params): Sprite {
  const name = str(params, 'sign', "BLACK'S");
  const sub = str(params, 'sign2', 'MARKET');
  const f = frame(92, 74, { topPad: 10, roofH: 12 });
  const t = f.sprite;

  // --- facade --------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.green, shade: C.greenDark, texture: 'none' });

  // hand-painted fascia, two lines, cream on green
  rect(t, f.x + 2, f.wallY + 2, f.w - 4, 20, C.greenDark);
  box(t, f.x + 2, f.wallY + 2, f.w - 4, 20, -1, C.ink);
  hline(t, f.x + 3, f.wallY + 3, f.w - 6, C.green);
  drawTextCentred(t, f.x + 3, f.wallY + 4, f.w - 6, name, C.cream, { spacing: 2 });
  drawTextCentred(t, f.x + 3, f.wallY + 13, f.w - 6, sub, C.yellow, { spacing: 2 });

  // --- shopfront -----------------------------------------------------------
  const frontY = f.groundY - 22;
  rect(t, f.x + 1, frontY - 2, f.w - 2, f.groundY - frontY + 2, C.cream);
  hline(t, f.x + 1, frontY - 2, f.w - 2, C.ink);

  windowBand(t, f.x + 4, frontY + 1, 34, 14, 2, { sill: C.greenDark });
  windowBand(t, f.x + f.w - 38, frontY + 1, 34, 14, 2, { sill: C.greenDark });
  doorGlass(t, f.cx - 8, f.groundY - 20, 16, 20, { frame: C.green });

  plinth(t, f.x, f.groundY - 2, f.w, 2, C.paving, C.pavingDark);

  // --- awning over the whole front -----------------------------------------
  awning(t, f.x + 2, frontY - 4, f.w - 4, 5, { a: C.green, b: C.cream, shade: C.greenDark, stripe: 5 });

  // --- roof ----------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.greenDark, shade: C.ink });
  rect(t, f.x - 2, f.roofY + f.roofH - 4, f.w + 4, 2, C.cream);
  // a wooden crate of apples left up on the roof deck, because of course
  box(t, f.x + 8, f.roofY + 1, 12, 5, C.wood, C.ink);
  hline(t, f.x + 9, f.roofY + 2, 10, C.woodDark);

  groundShadow(t, f.x, f.groundY + 1, f.w);

  // --- produce out on the pavement -----------------------------------------
  produceCrate(t, f.x + 3, f.groundY + 1, 17, C.red, C.redDark);
  produceCrate(t, f.x + 22, f.groundY + 1, 14, C.orange, C.orangeDark);
  produceCrate(t, f.x + f.w - 20, f.groundY + 1, 17, C.leafLight, C.leafDark);

  return t;
}
