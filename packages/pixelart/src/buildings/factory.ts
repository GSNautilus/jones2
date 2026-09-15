/**
 * Consolidated Widgets. Red brick shed under a sawtooth roof, with two banded
 * smokestacks puffing away over the left-hand end.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { hline, rect, vline } from '../surface';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofSawtooth, smokePuff, smokestack } from '../parts/roofs';
import { windowGrid } from '../parts/windows';
import { doorDouble, doorGarage } from '../parts/doors';
import { signBox } from '../parts/signs';
import { frame, str, type Params } from './common';

export function factory(params?: Params): Sprite {
  const name = str(params, 'sign', 'WIDGETS');
  const f = frame(92, 78, { topPad: 26, roofH: 14 });
  const t = f.sprite;

  // --- smoke, behind the stacks ------------------------------------------
  smokePuff(t, f.x + 12, 10, C.paving, C.pavingDark, C.stoneDark);
  smokePuff(t, f.x + 26, 16, C.paving, C.pavingDark, C.stoneDark);

  // --- stacks -------------------------------------------------------------
  smokestack(t, f.x + 10, 8, 7, f.roofY + 10, C.brick, C.brickDark, C.ink, C.cream);
  smokestack(t, f.x + 24, 14, 6, f.roofY + 10, C.brick, C.brickDark, C.ink, C.cream);

  // --- roof ---------------------------------------------------------------
  roofSawtooth(t, f.x, f.roofY, f.w, f.roofH, 4, {
    top: C.metalDark,
    shade: C.inkSoft,
    glass: C.glass,
    glassDark: C.glassDark,
    overhang: 1,
  });

  // --- shed ---------------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.brick, shade: C.brickDark, texture: 'brick', eave: true });

  // nameplate, bolted to the brick
  signBox(t, f.x + 12, f.wallY + 3, f.w - 24, 12, name, {
    bg: C.cream,
    fg: C.brickDark,
    border: C.white,
    textShadow: C.creamShade,
  });
  // bolts at the plate corners
  for (const bx of [f.x + 14, f.x + f.w - 16]) {
    for (const by of [f.wallY + 5, f.wallY + 12]) vline(t, bx, by, 1, C.metalDark);
  }

  // clerestory windows along the shed
  windowGrid(t, f.x + 5, f.wallY + 19, f.w - 36, 11, 4, 1, {
    glass: C.glass,
    glassDark: C.glassDark,
    sill: C.brickDark,
  });

  // loading dock on the right
  const dockW = 24;
  const dockX = f.x + f.w - dockW - 4;
  rect(t, dockX - 2, f.groundY - 19, dockW + 4, 19, C.brickDark);
  doorGarage(t, dockX, f.groundY - 17, dockW, 15, { face: C.metal, shade: C.metalDark });
  rect(t, dockX - 3, f.groundY - 2, dockW + 6, 2, C.paving);
  hline(t, dockX - 3, f.groundY - 1, dockW + 6, C.pavingDark);

  // personnel door on the left
  doorDouble(t, f.x + 6, f.groundY - 16, 14, 16, { face: C.metal, shade: C.metalDark, handle: C.ink });

  // pipes running up the wall between door and windows
  vline(t, f.x + 24, f.wallY + 18, f.wallH - 20, C.metal);
  vline(t, f.x + 25, f.wallY + 18, f.wallH - 20, C.metalDark);
  for (let j = f.wallY + 22; j < f.groundY - 2; j += 9) hline(t, f.x + 23, j, 4, C.ink);

  plinth(t, f.x, f.groundY - 2, f.w, 2, C.stoneDark, C.ink);
  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
