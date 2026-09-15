/**
 * Riverside Park. Not a building: the park entrance. Two rusticated stone
 * gateposts carry a board reading RIVERSIDE PARK, with a fountain playing
 * behind the railings, a bench on the grass and a clipped hedge along the
 * front. The footprint is grass rather than pavement.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, createSprite, fillEllipse, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow } from '../parts/common';
import { frame, str, type Params } from './common';

/** A tiered fountain: a wide basin, a stem, an upper bowl and a plume. */
function fountain(t: Sprite, cx: number, baseY: number): void {
  // plume, drawn first so the bowls overlap it
  for (let j = 0; j < 9; j++) {
    const spread = Math.round(j * 0.7);
    put(t, cx, baseY - 26 + j, C.waterLight);
    if (j > 2) {
      put(t, cx - spread, baseY - 24 + j, C.water);
      put(t, cx + spread, baseY - 24 + j, C.water);
    }
  }
  put(t, cx, baseY - 27, C.white);

  // upper bowl
  box(t, cx - 7, baseY - 17, 15, 4, C.stone, C.ink);
  hline(t, cx - 6, baseY - 16, 13, C.white);
  hline(t, cx - 6, baseY - 14, 13, C.stoneDark);
  // water spilling off both lips
  for (const dx of [-6, 6]) {
    vline(t, cx + dx, baseY - 13, 6, C.waterLight);
    vline(t, cx + dx + (dx < 0 ? 1 : -1), baseY - 11, 4, C.water);
  }

  // stem
  rect(t, cx - 2, baseY - 13, 5, 7, C.stone);
  vline(t, cx + 2, baseY - 13, 7, C.stoneDark);
  box(t, cx - 2, baseY - 13, 5, 7, -1, C.ink);

  // lower basin: an ellipse read as a shallow bowl
  for (let j = 0; j < 7; j++) {
    const half = Math.round(13 * Math.sqrt(Math.max(0, 1 - ((j - 1) / 8) ** 2)));
    rect(t, cx - half, baseY - 6 + j, half * 2 + 1, 1, j < 2 ? C.water : C.stone);
    if (j >= 2) rect(t, cx + 1, baseY - 6 + j, half, 1, C.stoneDark);
    put(t, cx - half - 1, baseY - 6 + j, C.ink);
    put(t, cx + half + 1, baseY - 6 + j, C.ink);
  }
  hline(t, cx - 13, baseY - 7, 27, C.white);
  hline(t, cx - 13, baseY - 8, 27, C.ink);
  put(t, cx - 8, baseY - 6, C.waterLight);
  put(t, cx + 7, baseY - 5, C.waterLight);
}

/** A slatted park bench seen from the front. */
function parkBench(t: Sprite, x: number, baseY: number, w: number): void {
  for (const y of [baseY - 12, baseY - 9]) {
    rect(t, x, y, w, 2, C.wood);
    hline(t, x, y + 1, w, C.woodDark);
    box(t, x, y, w, 2, -1, C.ink);
  }
  rect(t, x - 1, baseY - 6, w + 2, 2, C.wood);
  hline(t, x - 1, baseY - 5, w + 2, C.woodDark);
  box(t, x - 1, baseY - 6, w + 2, 2, -1, C.ink);
  for (const lx of [x, x + w - 2]) {
    vline(t, lx, baseY - 13, 13, C.ink);
    vline(t, lx + 1, baseY - 4, 4, C.metalDark);
  }
}

export function park(params?: Params): Sprite {
  const line1 = str(params, 'sign', 'RIVERSIDE');
  const line2 = str(params, 'sign2', 'PARK');
  const W = 88;
  const H = 62;
  const groundY = H - 4;
  const t = createSprite(W, H, W >> 1, H - 2, W - 8, 8);

  // --- grass footprint -----------------------------------------------------
  const grassY = groundY - 15;
  rect(t, 3, grassY, W - 6, groundY - grassY + 1, C.grass);
  for (let y = grassY + 1; y <= groundY; y++) {
    for (let x = 4; x < W - 4; x++) {
      const n = (x * 374761 + y * 668265) & 63;
      if (n < 7) put(t, x, y, C.grassDark);
      else if (n > 59) put(t, x, y, C.grassLight);
    }
  }
  hline(t, 3, grassY, W - 6, C.grassLight);
  box(t, 3, grassY, W - 6, groundY - grassY + 1, -1, C.ink);

  // --- fountain, on axis behind the gate -----------------------------------
  fountain(t, 27, grassY + 11);

  // --- clipped hedge, only beside the posts so the middle stays open -------
  for (const [hx, hw] of [
    [4, 15],
    [W - 20, 16],
  ] as Array<[number, number]>) {
    rect(t, hx, groundY - 7, hw, 8, C.leafDark);
    for (let i = 0; i < hw; i += 3) {
      const bump = i % 6 === 0 ? 2 : 1;
      rect(t, hx + i, groundY - 7 - bump, 3, bump + 1, C.leaf);
      put(t, hx + i + 2, groundY - 7 - bump + 1, C.leafDark);
    }
    rect(t, hx + 1, groundY - 6, hw - 2, 3, C.leaf);
    hline(t, hx + 1, groundY - 4, hw - 2, C.leafDark);
    box(t, hx, groundY - 8, hw, 9, -1, C.ink);
  }

  // --- a bench on the open grass, right of the fountain --------------------
  parkBench(t, W - 40, groundY - 1, 18);

  // --- gateposts -----------------------------------------------------------
  const postW = 12;
  for (const px of [4, W - 16]) {
    const py = 20;
    rect(t, px, py, postW, groundY - py + 1, C.stone);
    vline(t, px + postW - 2, py, groundY - py + 1, C.stoneDark);
    vline(t, px + postW - 1, py, groundY - py + 1, C.stoneDark);
    // rustication: staggered blocks
    for (let j = py + 4; j < groundY; j += 5) {
      hline(t, px + 1, j, postW - 2, C.stoneDark);
      vline(t, px + (((j - py) / 5) & 1 ? 4 : 8), j - 4, 4, C.stoneDark);
    }
    box(t, px, py, postW, groundY - py + 1, -1, C.ink);
    // cap and ball finial
    box(t, px - 2, py - 4, postW + 4, 4, C.stone, C.ink);
    hline(t, px - 1, py - 3, postW + 2, C.white);
    fillEllipse(t, px + (postW >> 1), py - 7, 3, 3, C.stone);
    fillEllipse(t, px + (postW >> 1) + 1, py - 6, 2, 2, C.stoneDark);
    box(t, px + (postW >> 1) - 3, py - 10, 7, 7, -1, C.ink);
  }

  // --- the arch board ------------------------------------------------------
  const boardX = 14;
  const boardW = W - 28;
  const boardY = 4;
  const boardH = 20;
  box(t, boardX, boardY, boardW, boardH, C.greenDark, C.ink);
  box(t, boardX + 1, boardY + 1, boardW - 2, boardH - 2, -1, C.green);
  drawTextCentred(t, boardX, boardY + 3, boardW, line1, C.cream, { spacing: 1 });
  drawTextCentred(t, boardX, boardY + 11, boardW, line2, C.yellow, { spacing: 1 });
  // scrolled brackets tying the board to the posts
  for (const [sx, dir] of [
    [boardX, -1],
    [boardX + boardW - 1, 1],
  ] as Array<[number, number]>) {
    for (let j = 0; j < 5; j++) put(t, sx + dir * j, boardY + boardH + j, C.ink);
    for (let j = 0; j < 4; j++) put(t, sx + dir * j, boardY + boardH + 1 + j, C.metalDark);
  }

  groundShadow(t, 3, groundY + 1, W - 6);
  return t;
}
