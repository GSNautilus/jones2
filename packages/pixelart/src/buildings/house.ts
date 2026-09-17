/**
 * Generic residential. One generator covers the three owned houses and every
 * rental: wall and roof colour, gable or hip, one or two storeys, optional
 * garage wing.
 *
 * params: wall, roof (palette names or indices), roofShape 'gable' | 'hip',
 *         storeys 1 | 2, garage boolean, sign (door number plate),
 *         style 'classic' | 'modern' (flat roofs, glass bands, a slab between
 *         floors; `roof` becomes the trim colour and storeys is always 2).
 */
import { C, PALETTE } from '../palette';
import type { Sprite } from '../types';
import { box, hline, put, rect, vline } from '../surface';
import { groundShadow } from '../parts/common';
import { plinth, wall } from '../parts/walls';
import { roofFlat, roofGable, roofHip, smokestack } from '../parts/roofs';
import { roundWindow, windowGrid } from '../parts/windows';
import { doorGarage, doorGlass, doorSingle, steps } from '../parts/doors';
import { planter } from '../parts/signs';
import { bool, colorParam, frame, num, str, type Params } from './common';

/** Pick a plausible darker partner for a wall or roof colour. */
const SHADE_OF: Record<number, number> = {
  [C.cream]: C.creamShade,
  [C.white]: C.creamShade,
  [C.brick]: C.brickDark,
  [C.stone]: C.stoneDark,
  [C.wood]: C.woodDark,
  [C.blue]: C.blueDark,
  [C.blueDark]: C.ink,
  [C.green]: C.greenDark,
  [C.greenDark]: C.ink,
  [C.red]: C.redDark,
  [C.yellow]: C.yellowDark,
  [C.orange]: C.orangeDark,
  [C.purple]: C.purpleDark,
  [C.pink]: C.red,
  [C.teal]: C.blueDark,
  [C.glass]: C.glassDark,
  [C.metal]: C.metalDark,
  [C.stoneDark]: C.ink,
  [C.slate]: C.slateDark,
};

function shadeOf(index: number): number {
  return SHADE_OF[index] ?? C.inkSoft;
}

/**
 * The modern variant: a white two-storey box with a flat slate roof, a glass
 * band across the upper floor, a full-height picture window and glass door
 * below, and a low flat-roofed garage wing to the right.
 */
function modernHouse(params?: Params): Sprite {
  const garage = bool(params, 'garage', true);
  const wallFace = colorParam(params, 'wall', PALETTE.names, C.white);
  const trim = colorParam(params, 'roof', PALETTE.names, C.slate);
  const wallShade = shadeOf(wallFace);
  const trimShade = shadeOf(trim);

  const width = garage ? 92 : 72;
  const height = 60;
  const f = frame(width, height, { topPad: 2, roofH: 7, inset: 4 });
  const t = f.sprite;
  const mainW = garage ? f.w - 30 : f.w;
  const mainX = f.x;

  if (garage) {
    const gx = mainX + mainW - 1;
    const gw = f.w - mainW + 1;
    const gy = f.groundY - 22;
    wall(t, gx, gy, gw, f.groundY - gy + 1, { face: wallFace, shade: wallShade, texture: 'none' });
    doorGarage(t, gx + 3, f.groundY - 15, gw - 6, 15, { face: C.metal, shade: C.metalDark });
    roofFlat(t, gx, gy - 6, gw, 6, { top: trim, shade: trimShade, overhang: 1 });
  }

  wall(t, mainX, f.wallY, mainW, f.wallH, { face: wallFace, shade: wallShade, texture: 'none' });
  // upper floor: one continuous glass band
  windowGrid(t, mainX + 3, f.wallY + 4, mainW - 6, 13, 3, 1, { frame: C.metal, sill: C.metalDark });
  // the floor slab
  hline(t, mainX - 1, f.wallY + 21, mainW + 2, trimShade);
  // ground floor: glass door on the left, a picture window beside it
  const doorW = 10;
  const doorH = 16;
  const doorX = mainX + 4;
  doorGlass(t, doorX, f.groundY - doorH, doorW, doorH, { frame: C.metal });
  windowGrid(t, doorX + doorW + 4, f.groundY - 17, mainW - doorW - 12, 14, 2, 1, { frame: C.metal, sill: C.metalDark });
  steps(t, doorX + (doorW >> 1), f.groundY - 1, 14, 1, C.stone, C.stoneDark);

  roofFlat(t, mainX, f.roofY, mainW, f.roofH, { top: trim, shade: trimShade, overhang: 2 });
  plinth(t, mainX, f.groundY - 2, mainW, 2, C.stone, C.stoneDark);
  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}

export function house(params?: Params): Sprite {
  if (str(params, 'style', 'classic') === 'modern') return modernHouse(params);
  const storeys = Math.max(1, Math.min(2, num(params, 'storeys', 1)));
  const garage = bool(params, 'garage', false);
  const shape = str(params, 'roofShape', 'gable') === 'hip' ? 'hip' : 'gable';
  const wallFace = colorParam(params, 'wall', PALETTE.names, C.cream);
  const roofFace = colorParam(params, 'roof', PALETTE.names, C.brick);
  const wallShade = shadeOf(wallFace);
  const roofShade = shadeOf(roofFace);
  const plate = str(params, 'sign', '');

  const width = garage ? 78 : 64;
  const height = storeys === 2 ? 62 : 50;
  const roofH = shape === 'gable' ? 18 : 15;
  const f = frame(width, height, { topPad: 2, roofH, inset: 4 });
  const t = f.sprite;

  // The main block leaves room on the right for the garage wing.
  const mainW = garage ? f.w - 24 : f.w;
  const mainX = f.x;
  const mainCx = mainX + (mainW >> 1);

  // --- garage wing (drawn first so the house overlaps it) ------------------
  if (garage) {
    const gx = mainX + mainW - 1;
    const gw = f.w - mainW + 1;
    const gy = f.groundY - 20;
    wall(t, gx, gy, gw, f.groundY - gy + 1, { face: wallFace, shade: wallShade });
    doorGarage(t, gx + 3, f.groundY - 15, gw - 6, 15, { face: C.white, shade: C.creamShade });
    roofHip(t, gx, gy - 9, gw, 9, { top: roofFace, shade: roofShade, overhang: 2 });
  }

  // --- main block ---------------------------------------------------------
  wall(t, mainX, f.wallY, mainW, f.wallH, { face: wallFace, shade: wallShade, texture: 'none' });

  const doorW = 11;
  const doorH = 16;
  const doorX = mainCx - (doorW >> 1);
  doorSingle(t, doorX, f.groundY - doorH, doorW, doorH, { face: C.wood, shade: C.woodDark, frame: C.white });
  steps(t, mainCx, f.groundY - 1, 15, 2, C.stone, C.stoneDark);

  // ground floor windows either side of the door
  const gwY = f.groundY - 15;
  windowGrid(t, mainX + 4, gwY, doorX - mainX - 8, 10, 1, 1, { sill: C.white, frame: C.white });
  windowGrid(t, doorX + doorW + 4, gwY, mainX + mainW - (doorX + doorW) - 8, 10, 1, 1, {
    sill: C.white,
    frame: C.white,
  });

  if (storeys === 2) {
    windowGrid(t, mainX + 4, f.wallY + 5, mainW - 8, 10, 3, 1, { sill: C.white, frame: C.white });
  }

  // house number plate beside the door
  if (plate) {
    box(t, doorX - 6, f.groundY - doorH + 2, 5, 7, C.white, C.ink);
    put(t, doorX - 4, f.groundY - doorH + 5, C.ink);
  }

  planter(t, mainX + 2, f.groundY - 5, doorX - mainX - 4);
  planter(t, doorX + doorW + 2, f.groundY - 5, mainX + mainW - (doorX + doorW) - 4);

  // --- roof ---------------------------------------------------------------
  if (shape === 'gable') {
    roofGable(t, mainX, f.roofY, mainW, f.roofH, { top: roofFace, shade: roofShade, overhang: 3 });
    roundWindow(t, mainCx, f.roofY + Math.floor(f.roofH * 0.62), 2, { glass: C.glass, glassDark: C.glassDark });
  } else {
    roofHip(t, mainX, f.roofY, mainW, f.roofH, { top: roofFace, shade: roofShade, overhang: 3 });
  }
  // chimney
  smokestack(t, mainX + 7, f.roofY - 1, 6, f.roofY + f.roofH - 4, C.brick, C.brickDark, C.ink);

  plinth(t, mainX, f.groundY - 2, mainW, 2, C.stone, C.stoneDark);
  groundShadow(t, f.x, f.groundY + 1, f.w);
  return t;
}
