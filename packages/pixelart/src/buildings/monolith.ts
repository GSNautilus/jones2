/**
 * Monolith Burgers. Red and yellow, a striped awning over the shopfront, a fat
 * yellow nameplate across the facade and a burger on a board above the roof.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, fillEllipse, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { windowBand } from '../parts/windows';
import { doorGlass } from '../parts/doors';
import { awning, signBox, signIcon } from '../parts/signs';
import { frame, str, type Params } from './common';

/** The burger that sits on the roof sign: bun, lettuce, patty, bun. */
function burger(t: Parameters<typeof rect>[0], x: number, y: number, w: number, h: number): void {
  const cx = x + (w >> 1);
  const cy = y + (h >> 1);
  const rx = Math.floor(w * 0.44);

  // top bun
  fillEllipse(t, cx, cy - 2, rx, Math.floor(h * 0.34), C.orange);
  fillEllipse(t, cx - 1, cy - 3, rx - 2, Math.floor(h * 0.22), C.yellow);
  for (let j = 0; j < 4; j++) put(t, cx - 4 + j * 3, cy - 5 + (j & 1), C.white);
  // outline of the bun dome
  for (let i = -rx; i <= rx; i++) {
    const u = i / rx;
    const top = cy - 2 - Math.round(Math.sqrt(Math.max(0, 1 - u * u)) * Math.floor(h * 0.34));
    put(t, cx + i, top, C.ink);
  }
  // fillings
  rect(t, cx - rx, cy, rx * 2 + 1, 2, C.green);
  rect(t, cx - rx, cy + 2, rx * 2 + 1, 3, C.brickDark);
  hline(t, cx - rx, cy + 2, rx * 2 + 1, C.brick);
  // bottom bun
  rect(t, cx - rx, cy + 5, rx * 2 + 1, 3, C.orange);
  hline(t, cx - rx, cy + 7, rx * 2 + 1, C.orangeDark);
  box(t, cx - rx - 1, cy, rx * 2 + 3, 8, -1, C.ink);
}

export function monolith(params?: Params): Sprite {
  const name = str(params, 'sign', 'MONOLITH');
  const f = frame(88, 80, { topPad: 20, roofH: 12 });
  const t = f.sprite;

  // --- facade ------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.red, shade: C.redDark, texture: 'none' });

  // nameplate across the top of the facade
  const plateY = f.wallY + 2;
  signBox(t, f.x + 3, plateY, f.w - 6, 13, name, {
    bg: C.yellow,
    fg: C.redDark,
    border: C.white,
    textShadow: C.yellowDark,
  });
  // "BURGERS" painted straight onto the red wall under the plate
  drawTextCentred(t, f.x, plateY + 15, f.w, 'BURGERS', C.yellow, { spacing: 1 });

  // --- shopfront ---------------------------------------------------------
  const frontY = f.groundY - 15;
  rect(t, f.x + 1, frontY - 1, f.w - 2, f.groundY - frontY + 1, C.creamShade);
  hline(t, f.x + 1, frontY - 1, f.w - 2, C.ink);

  windowBand(t, f.x + 4, frontY + 2, 25, 9, 2, { sill: C.creamShade });
  windowBand(t, f.x + f.w - 29, frontY + 2, 25, 9, 2, { sill: C.creamShade });
  doorGlass(t, f.cx - 8, f.groundY - 14, 16, 14, { frame: C.yellow });

  // the awning hangs in front of the glass
  awning(t, f.x + 2, frontY - 2, f.w - 4, 4, { a: C.red, b: C.cream, shade: C.redDark, stripe: 5 });

  // kerb line at the pavement
  hline(t, f.x, f.groundY, f.w, C.ink);

  // --- roof --------------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.redDark, shade: C.brickDark });
  // rooftop vent boxes
  for (const vx of [f.x + 8, f.x + f.w - 16]) {
    box(t, vx, f.roofY + 2, 7, 4, C.metal, C.ink);
    hline(t, vx + 1, f.roofY + 3, 5, C.metalDark);
  }

  // --- roof sign ---------------------------------------------------------
  signIcon(t, f.cx, f.roofY + 3, 34, 20, (target, ix, iy, iw, ih) => burger(target, ix, iy, iw, ih), {
    bg: C.cream,
  });

  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
