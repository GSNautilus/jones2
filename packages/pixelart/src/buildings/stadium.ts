/**
 * Riverton Stadium. The bowl seen head on: a curved concrete drum, the far
 * stand packed with a speckled crowd under a metal canopy, a strip of pitch
 * showing over the near rim, floodlight masts at both ends and a scoreboard
 * standing above the roofline.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, createSprite, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow, inkRowEdges } from '../parts/common';
import { plinth } from '../parts/walls';
import { doorArched } from '../parts/doors';
import { str, type Params } from './common';

const CROWD = [C.red, C.white, C.yellow, C.blue, C.cream, C.orange];

/** Deterministic scatter for the crowd: no two neighbours the same colour. */
function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h >>> 15) & 31;
}

/** A lattice floodlight mast with a rack of lamps on top. */
function floodlight(t: Sprite, x: number, topY: number, baseY: number): void {
  // mast: two ink edges around a braced core
  vline(t, x, topY + 8, baseY - topY - 8, C.ink);
  vline(t, x + 1, topY + 8, baseY - topY - 8, C.metal);
  vline(t, x + 2, topY + 8, baseY - topY - 8, C.metalDark);
  vline(t, x + 3, topY + 8, baseY - topY - 8, C.ink);
  for (let y = topY + 10; y < baseY; y += 4) {
    put(t, x + 1, y, C.ink);
    put(t, x + 2, y + 2, C.ink);
  }
  // lamp rack
  box(t, x - 5, topY, 14, 9, C.metalDark, C.ink);
  hline(t, x - 4, topY + 1, 12, C.metal);
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 4; i++) {
      put(t, x - 3 + i * 3, topY + 3 + j * 3, C.yellow);
      put(t, x - 2 + i * 3, topY + 3 + j * 3, C.white);
      put(t, x - 3 + i * 3, topY + 4 + j * 3, C.yellowDark);
    }
  }
}

export function stadium(params?: Params): Sprite {
  const line1 = str(params, 'sign', 'RIVERTON');
  const line2 = str(params, 'sign2', 'STADIUM');
  const W = 128;
  const H = 92;
  const groundY = H - 4;
  const t = createSprite(W, H, W >> 1, H - 2, W - 10, 8);

  const cx = W >> 1;
  const rx = 58;
  const ry = 15;
  const cy = 40;
  const canopyH = 5;

  // --- the bowl, column by column ------------------------------------------
  for (let x = cx - rx; x <= cx + rx; x++) {
    const u = (x - cx) / rx;
    const dy = ry * Math.sqrt(Math.max(0, 1 - u * u));
    const top = Math.round(cy - dy);
    const near = Math.round(cy + dy);

    // canopy over the far stand
    put(t, x, top, C.ink);
    vline(t, x, top + 1, 2, C.metal);
    vline(t, x, top + 3, canopyH - 3, C.metalDark);
    if (((x - cx) & 7) === 0) vline(t, x, top + 1, canopyH - 1, C.inkSoft);

    // interior: crowd above, pitch below
    const inTop = top + canopyH;
    const inH = near - inTop;
    if (inH > 2) {
      const seatH = Math.max(1, Math.round(inH * 0.58));
      rect(t, x, inTop, 1, seatH, C.slateDark);
      for (let j = 0; j < seatH; j++) {
        const n = hash(x, inTop + j);
        if (n < 9) put(t, x, inTop + j, CROWD[n % CROWD.length]);
        else if (n < 14) put(t, x, inTop + j, C.slate);
      }
      hline(t, x, inTop, 1, C.ink);
      // pitch, striped with the mower
      const pitchY = inTop + seatH;
      const pitchH = near - pitchY;
      vline(t, x, pitchY, pitchH, ((x / 6) | 0) % 2 === 0 ? C.green : C.greenDark);
      put(t, x, pitchY, C.ink);
      if (pitchH > 4) put(t, x, near - 2, C.white);
    }

    // the drum below the near rim
    vline(t, x, near, groundY - near + 1, C.stone);
    put(t, x, near, C.ink);
    put(t, x, near + 1, C.stoneDark);
  }

  // --- drum detailing ------------------------------------------------------
  // pilasters up the face
  for (let x = cx - rx + 6; x <= cx + rx - 6; x += 12) {
    const u = (x - cx) / rx;
    const near = Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - u * u)));
    vline(t, x, near + 2, groundY - near - 1, C.white);
    vline(t, x + 1, near + 2, groundY - near - 1, C.stoneDark);
  }
  // the drum turns away from the light where it curves back at the right end
  for (let x = cx + 48; x <= cx + rx; x++) {
    const u = (x - cx) / rx;
    const near = Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - u * u)));
    vline(t, x, near + 2, groundY - near - 1, C.stoneDark);
  }

  // --- name band across the front ------------------------------------------
  const bandY = 58;
  const bandH = 13;
  rect(t, cx - rx + 2, bandY, rx * 2 - 3, bandH, C.blue);
  hline(t, cx - rx + 2, bandY + 1, rx * 2 - 3, C.slate);
  hline(t, cx - rx + 2, bandY, rx * 2 - 3, C.ink);
  hline(t, cx - rx + 2, bandY + bandH - 1, rx * 2 - 3, C.ink);
  drawTextCentred(t, cx - rx + 3, bandY + 4, rx * 2 - 3, `${line1} ${line2}`, C.blueDark, { spacing: 1 });
  drawTextCentred(t, cx - rx + 2, bandY + 3, rx * 2 - 3, `${line1} ${line2}`, C.yellow, { spacing: 1 });

  // --- gates along the ground ----------------------------------------------
  for (let k = 0; k < 5; k++) {
    const gx = cx - 50 + k * 25;
    rect(t, gx - 9, groundY - 17, 18, 18, C.stoneDark);
    doorArched(t, gx - 7, groundY - 15, 14, 15, { face: C.inkSoft, shade: C.ink, handle: C.ink });
    box(t, gx - 9, groundY - 17, 18, 18, -1, C.ink);
    hline(t, gx - 10, groundY - 18, 20, C.white);
    hline(t, gx - 10, groundY - 19, 20, C.ink);
    // a turnstile in the opening
    vline(t, gx - 3, groundY - 6, 6, C.metal);
    vline(t, gx + 3, groundY - 6, 6, C.metal);
    hline(t, gx - 4, groundY - 6, 9, C.metalDark);
  }

  plinth(t, cx - rx, groundY - 2, rx * 2 + 1, 3, C.paving, C.pavingDark);

  // --- floodlights and scoreboard ------------------------------------------
  floodlight(t, cx - 52, 6, 44);
  floodlight(t, cx + 49, 6, 44);

  const boardW = 56;
  const boardX = cx - (boardW >> 1);
  const boardH = 21;
  for (const lx of [cx - 18, cx + 16]) {
    rect(t, lx, boardH, 3, cy - ry - boardH + 4, C.metalDark);
    vline(t, lx, boardH, cy - ry - boardH + 4, C.metal);
    vline(t, lx + 2, boardH, cy - ry - boardH + 4, C.ink);
  }
  box(t, boardX, 0, boardW, boardH, C.ink, C.ink);
  box(t, boardX + 1, 1, boardW - 2, boardH - 2, -1, C.metalDark);
  drawTextCentred(t, boardX, 3, boardW, line1, C.yellow, { spacing: 1 });
  drawTextCentred(t, boardX, 12, boardW, '2 - 1', C.green, { spacing: 1 });

  // pennants along the canopy
  for (const px of [cx - 34, cx - 12, cx + 12, cx + 34]) {
    const u = (px - cx) / rx;
    const top = Math.round(cy - ry * Math.sqrt(Math.max(0, 1 - u * u)));
    vline(t, px, top - 8, 8, C.metalDark);
    vline(t, px + 1, top - 8, 8, C.ink);
    for (let j = 0; j < 4; j++) rect(t, px + 2, top - 8 + j, 5 - j, 1, j < 2 ? C.red : C.redDark);
  }

  inkRowEdges(t, C.ink, 0, groundY + 1);
  groundShadow(t, cx - rx, groundY + 1, rx * 2 + 1);
  return t;
}
