/**
 * The Bus Depot — where every game starts. A long, low transit shed with a
 * destination board across the fascia, a glazed concourse and a fat roof sign
 * reading BUS. A bus stands at the kerb in front of the left-hand bay, so the
 * silhouette is unmistakable from across the map.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow, haloBlit } from '../parts/common';
import { plinth, recess, wall } from '../parts/walls';
import { roofFlat } from '../parts/roofs';
import { doorGlass } from '../parts/doors';
import { signRoof } from '../parts/signs';
import { PROPS } from '../props/catalogue';
import { frame, str, type Params } from './common';

export function busDepot(params?: Params): Sprite {
  const name = str(params, 'sign', 'BUS');
  const f = frame(100, 72, { topPad: 20, roofH: 10 });
  const t = f.sprite;

  // --- concourse ----------------------------------------------------------
  wall(t, f.x, f.wallY, f.w, f.wallH, { face: C.cream, shade: C.creamShade, texture: 'none' });

  // destination board painted along the top of the facade
  rect(t, f.x + 2, f.wallY + 3, f.w - 4, 9, C.slateDark);
  box(t, f.x + 2, f.wallY + 3, f.w - 4, 9, -1, C.ink);
  drawTextCentred(t, f.x + 2, f.wallY + 4, f.w - 4, 'DEPARTURES', C.yellow, { spacing: 1 });

  // --- bay 1: an open, unlit drive-through the bus stands inside -----------
  const bandY = f.wallY + 16;
  const bandH = f.groundY - bandY - 4;
  const bayW = 44;
  recess(t, f.x + 3, bandY, bayW, bandH + 2, C.slateDark, C.ink, C.ink);
  // two strip lights on the bay ceiling, so the dark reads as interior
  for (const lx of [f.x + 10, f.x + 30]) {
    hline(t, lx, bandY + 2, 9, C.yellow);
    hline(t, lx, bandY + 3, 9, C.yellowDark);
  }
  // bay number stencilled on the back wall
  drawTextCentred(t, f.x + 3, bandY + 7, bayW, 'BAY 1', C.slate, { spacing: 1 });

  // --- concourse glazing and entrance --------------------------------------
  doorGlass(t, f.x + 52, f.groundY - bandH - 3, 24, bandH + 3, { frame: C.metal });
  // timetable case on the last bay
  const caseX = f.x + 79;
  box(t, caseX, bandY, 13, bandH, C.white, C.ink);
  rect(t, caseX + 1, bandY + 1, 11, 3, C.blue);
  for (let j = bandY + 6; j < bandY + bandH - 2; j += 3) hline(t, caseX + 2, j, 9, C.inkSoft);
  hline(t, caseX - 1, bandY + bandH, 15, C.stoneDark);
  hline(t, caseX - 1, bandY + bandH + 1, 15, C.ink);

  // steel mullion posts carrying the eave, clear of the glass
  for (const px of [f.x + 48, f.x + 77]) {
    vline(t, px, f.wallY + 13, f.groundY - f.wallY - 13, C.metal);
    vline(t, px + 1, f.wallY + 13, f.groundY - f.wallY - 13, C.ink);
  }

  // --- apron ---------------------------------------------------------------
  plinth(t, f.x, f.groundY - 3, f.w, 4, C.paving, C.pavingDark);
  for (let i = f.x + 6; i < f.x + f.w - 6; i += 10) put(t, i, f.groundY - 1, C.roadLine);

  // --- roof and sign -------------------------------------------------------
  roofFlat(t, f.x, f.roofY, f.w, f.roofH, { top: C.slate, shade: C.slateDark });
  signRoof(t, f.cx + 20, f.roofY + 4, 32, 16, name, {
    bg: C.blue,
    fg: C.white,
    border: C.blueDark,
    textShadow: C.blueDark,
  });
  // a lit bay-number box on the left-hand end of the roof
  box(t, f.x + 5, f.roofY + 1, 11, 7, C.ink, C.ink);
  drawTextCentred(t, f.x + 5, f.roofY + 1, 11, '1', C.yellow, { spacing: 1 });

  groundShadow(t, f.x, f.groundY + 1, f.w);

  // --- the bus at the kerb, standing in front of everything ----------------
  const busSprite = PROPS.bus;
  haloBlit(t, busSprite, f.x + 6, f.groundY - busSprite.height + 4);

  return t;
}
