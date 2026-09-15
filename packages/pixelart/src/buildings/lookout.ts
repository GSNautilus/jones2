/**
 * Lookout Point. A dry-stone parapet at the edge of the drop, a coin-operated
 * telescope on a post, a fingerpost reading LOOKOUT, one boulder and one wind-
 * bent pine. No door, no sign band, no roof — it has to read purely by outline,
 * so the four elements are kept well apart across the width.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, createSprite, hline, line, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow, outlineSilhouette } from '../parts/common';
import { str, type Params } from './common';

export function lookout(params?: Params): Sprite {
  const name = str(params, 'sign', 'LOOKOUT');
  const W = 76;
  const H = 54;
  const groundY = H - 4;
  const t = createSprite(W, H, W >> 1, H - 2, W - 8, 6);

  // --- grassy ledge ---------------------------------------------------------
  const ledgeY = groundY - 11;
  rect(t, 3, ledgeY, W - 6, groundY - ledgeY + 1, C.grass);
  for (let y = ledgeY + 1; y <= groundY; y++) {
    for (let x = 4; x < W - 4; x++) {
      const n = (x * 374761 + y * 668265) & 63;
      if (n < 7) put(t, x, y, C.grassDark);
      else if (n > 59) put(t, x, y, C.grassLight);
    }
  }
  hline(t, 3, ledgeY, W - 6, C.grassLight);
  box(t, 3, ledgeY, W - 6, groundY - ledgeY + 1, -1, C.ink);

  // --- dry-stone parapet ----------------------------------------------------
  const wallH = 11;
  const wallY = ledgeY - wallH + 2;
  rect(t, 5, wallY, W - 10, wallH, C.stone);
  // irregular courses
  for (let j = 0; j < 3; j++) {
    const y = wallY + 2 + j * 3;
    hline(t, 6, y, W - 12, C.stoneDark);
    for (let i = (j & 1) === 0 ? 8 : 12; i < W - 8; i += 9) vline(t, i, y - 2, 3, C.stoneDark);
  }
  box(t, 5, wallY, W - 10, wallH, -1, C.ink);
  // coping stones: a row of slightly proud caps
  for (let i = 4; i < W - 6; i += 6) {
    box(t, i, wallY - 3, 6, 4, C.stone, C.ink);
    hline(t, i + 1, wallY - 2, 4, C.white);
  }

  // --- the telescope, right of centre --------------------------------------
  const tx = W - 24;
  const postTop = wallY - 13;
  rect(t, tx, postTop + 5, 4, groundY - postTop - 5, C.slateDark);
  vline(t, tx, postTop + 5, groundY - postTop - 5, C.slate);
  box(t, tx, postTop + 5, 4, groundY - postTop - 5, -1, C.ink);
  put(t, tx + 1, postTop + 13, C.yellow);
  put(t, tx + 2, postTop + 13, C.yellow);
  // yoke
  box(t, tx - 1, postTop + 2, 6, 4, C.slateDark, C.ink);
  // barrel, angled up to the left: four parallel runs make it read as a tube
  const bx0 = tx - 12;
  const by0 = postTop - 6;
  const bx1 = tx + 4;
  const by1 = postTop + 4;
  line(t, bx0, by0 - 1, bx1, by1 - 1, C.ink);
  line(t, bx0, by0, bx1, by1, C.slate);
  line(t, bx0, by0 + 1, bx1, by1 + 1, C.slateDark);
  line(t, bx0, by0 + 2, bx1, by1 + 2, C.slateDark);
  line(t, bx0, by0 + 3, bx1, by1 + 3, C.ink);
  // eyepiece at the low end, objective hood at the high end
  box(t, bx0 - 3, by0 - 1, 5, 6, C.slateDark, C.ink);
  put(t, bx0 - 2, by0, C.glass);
  put(t, bx0 - 1, by0 + 1, C.glass);
  box(t, bx1 - 1, by1, 4, 5, C.slate, C.ink);

  // --- fingerpost, left ------------------------------------------------------
  const px = 9;
  const signY = wallY - 22;
  rect(t, px, signY, 3, groundY - signY, C.wood);
  vline(t, px + 2, signY, groundY - signY, C.woodDark);
  box(t, px, signY, 3, groundY - signY, -1, C.ink);
  const boardW = 42;
  box(t, px + 2, signY, boardW, 11, C.wood, C.ink);
  hline(t, px + 3, signY + 1, boardW - 2, C.woodDark);
  drawTextCentred(t, px + 2, signY + 2, boardW - 5, name, C.cream, { spacing: 1 });
  // pointed right-hand end
  for (let j = 0; j < 5; j++) {
    for (let k = 0; k < 11 - j * 2; k++) put(t, px + boardW + 1 + j, signY + j + k, C.wood);
    put(t, px + boardW + 1 + j, signY + j, C.ink);
    put(t, px + boardW + 1 + j, signY + 10 - j, C.ink);
  }

  // --- boulder on the ledge, bottom left ------------------------------------
  const rx = 12;
  const ry = groundY;
  for (let j = 0; j < 8; j++) {
    const half = Math.round(Math.sqrt(Math.max(0, 1 - ((j - 7) / 7.5) ** 2)) * 7);
    rect(t, rx - half, ry - 7 + j, half * 2 + 1, 1, C.stoneDark);
    rect(t, rx - half, ry - 7 + j, half, 1, C.stone);
    rect(t, rx + 2, ry - 7 + j, Math.max(1, half - 2), 1, C.inkSoft);
    put(t, rx - half - 1, ry - 7 + j, C.ink);
    put(t, rx + half + 1, ry - 7 + j, C.ink);
  }
  hline(t, rx - 2, ry - 8, 5, C.ink);
  put(t, rx - 3, ry - 5, C.white);
  put(t, rx - 2, ry - 5, C.white);

  // --- wind-bent pine at the right edge -------------------------------------
  const nx = W - 10;
  rect(t, nx, wallY - 4, 3, groundY - wallY + 4, C.trunk);
  vline(t, nx + 2, wallY - 4, groundY - wallY + 4, C.trunkDark);
  for (const [ty, th] of [
    [wallY - 24, 6],
    [wallY - 17, 6],
    [wallY - 10, 6],
  ] as Array<[number, number]>) {
    for (let j = 0; j < th + 2; j++) {
      const half = Math.round((j / (th + 1)) * 8);
      rect(t, nx - half, ty + j, half + 3, 1, C.leafDark);
      rect(t, nx - half, ty + j, Math.max(1, half - 1), 1, C.leaf);
      if (j > 1) put(t, nx - half + 1, ty + j, C.leafLight);
    }
  }
  put(t, nx + 1, wallY - 26, C.leaf);

  outlineSilhouette(t);
  groundShadow(t, 3, groundY + 1, W - 6);
  return t;
}
