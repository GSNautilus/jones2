/**
 * Socket City. Electric blue box with a white lightning bolt on the fascia, a
 * wall of switched-on televisions behind the glass and a satellite dish and
 * aerial bristling off the roof.
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
import { signBox } from '../parts/signs';
import { iconBolt, satelliteDish, tvAerial } from '../parts/details';
import { frame, str, type Params } from './common';

export function socketCity(params?: Params): Sprite {
  const name = str(params, 'sign', 'SOCKET CITY');
  const f = frame(88, 74, { topPad: 18, roofH: 12 });
  const t = f.sprite;

  // --- facade --------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.blue, shade: C.blueDark, texture: 'none' });

  // fascia sign with the bolt punched through the middle of the wordmark
  signBox(t, f.x + 3, f.wallY + 3, f.w - 6, 12, name, {
    bg: C.white,
    fg: C.blueDark,
    border: C.glass,
    textShadow: C.paving,
  });

  // --- shopfront: a wall of televisions ------------------------------------
  const frontY = f.groundY - 24;
  rect(t, f.x + 1, frontY - 2, f.w - 2, f.groundY - frontY + 2, C.blueDark);
  hline(t, f.x + 1, frontY - 2, f.w - 2, C.ink);

  windowBand(t, f.x + 4, frontY + 1, 40, 18, 0, { sill: C.metalDark });
  // four sets showing four different test cards
  const screens = [C.red, C.green, C.yellow, C.teal];
  for (let k = 0; k < 4; k++) {
    const sx = f.x + 7 + (k % 2) * 19;
    const sy = frontY + 3 + ((k / 2) | 0) * 9;
    box(t, sx, sy, 14, 7, C.ink, C.ink);
    rect(t, sx + 1, sy + 1, 12, 5, screens[k]);
    vline(t, sx + 5, sy + 1, 5, C.white);
    vline(t, sx + 9, sy + 1, 5, C.ink);
  }

  doorGlass(t, f.x + 48, f.groundY - 22, 20, 22, { frame: C.metal });

  // a stack of taped-up cartons in the last bay
  for (let k = 0; k < 3; k++) {
    const bx = f.x + 70 + (k & 1);
    const by = f.groundY - 8 - k * 7;
    box(t, bx, by, 14, 7, C.cream, C.ink);
    hline(t, bx + 1, by + 1, 12, C.white);
    hline(t, bx + 1, by + 5, 12, C.creamShade);
    vline(t, bx + 6, by + 1, 5, C.orangeDark);
    vline(t, bx + 7, by + 1, 5, C.orange);
  }

  plinth(t, f.x, f.groundY - 2, f.w, 2, C.paving, C.pavingDark);

  // --- roof ----------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.slate, shade: C.slateDark });
  rect(t, f.x - 2, f.roofY + f.roofH - 4, f.w + 4, 2, C.yellow);

  // aerial and dish on the roof deck
  tvAerial(t, f.x + 16, f.roofY + 3, 16);
  satelliteDish(t, f.x + f.w - 18, f.roofY + 6, 8);

  // the bolt, standing free above the parapet between them
  iconBolt(t, f.cx - 6, f.roofY - 20, 12, 20);

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
