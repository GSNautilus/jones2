/**
 * Trees, bushes, flowers and rocks. All anchored at the bottom centre of their
 * trunk so they can be dropped at a world position like buildings can.
 */
import { C } from '../palette';
import type { Sprite, SpriteMap } from '../types';
import { createSprite, dither, fillEllipse, hline, put, rect, spriteFromRows, vline, type Target } from '../surface';
import { outlineSilhouette } from '../parts/common';

/** Small dark ellipse on the ground under a plant. */
function shadow(t: Target, cx: number, cy: number, rx: number): void {
  dither(t, cx - rx, cy, rx * 2, 2, C.shadow, -1, 0);
}

function trunk(t: Sprite, cx: number, baseY: number, w: number, h: number): void {
  const x = cx - (w >> 1);
  rect(t, x, baseY - h, w, h, C.trunk);
  vline(t, x + w - 1, baseY - h, h, C.trunkDark);
  // roots flare at the bottom
  put(t, x - 1, baseY - 1, C.trunkDark);
  put(t, x + w, baseY - 1, C.trunkDark);
}

/** Round leafy tree — three overlapping canopy blobs. */
function treeRound(): Sprite {
  const w = 16;
  const h = 22;
  const t = createSprite(w, h, w >> 1, h - 1, 8, 4);
  const cx = w >> 1;
  shadow(t, cx, h - 3, 6);
  trunk(t, cx, h - 3, 3, 8);

  fillEllipse(t, cx, 8, 7, 7.5, C.leaf);
  fillEllipse(t, cx + 2, 10, 5, 5, C.leafDark);
  fillEllipse(t, cx - 2, 6, 4, 4, C.leafLight);
  // scalloped crown
  for (const [dx, dy, r] of [
    [-5, 4, 3],
    [0, 1, 4],
    [5, 5, 3],
  ] as Array<[number, number, number]>) {
    fillEllipse(t, cx + dx, 5 + dy, r, r - 0.5, dx < 0 ? C.leafLight : C.leaf);
  }
  outlineSilhouette(t);
  return t;
}

/** Tall conifer — stacked triangular tiers. */
function treePine(): Sprite {
  const w = 14;
  const h = 26;
  const t = createSprite(w, h, w >> 1, h - 1, 7, 4);
  const cx = w >> 1;
  shadow(t, cx, h - 3, 5);
  trunk(t, cx, h - 2, 3, 6);

  const tiers: Array<[number, number]> = [
    [2, 5],
    [8, 6],
    [14, 6],
  ];
  for (const [ty, th] of tiers) {
    for (let j = 0; j < th + 3; j++) {
      const u = j / (th + 2);
      const half = Math.round(u * 6);
      rect(t, cx - half, ty + j, half * 2 + 1, 1, C.leafDark);
      rect(t, cx - half, ty + j, half + 1, 1, C.leaf);
      if (j > 1) put(t, cx - half + 1, ty + j, C.leafLight);
    }
  }
  put(t, cx, 1, C.leaf);
  outlineSilhouette(t);
  return t;
}

/** Big spreading oak — the landmark tree. */
function treeOak(): Sprite {
  const w = 26;
  const h = 30;
  const t = createSprite(w, h, w >> 1, h - 1, 12, 5);
  const cx = w >> 1;
  shadow(t, cx, h - 3, 9);
  trunk(t, cx, h - 3, 5, 11);
  // branch stubs
  put(t, cx - 3, h - 12, C.trunkDark);
  put(t, cx + 3, h - 13, C.trunkDark);

  fillEllipse(t, cx, 11, 12, 9, C.leaf);
  fillEllipse(t, cx + 4, 14, 8, 6, C.leafDark);
  for (const [dx, dy, r] of [
    [-8, 8, 5],
    [-3, 4, 6],
    [4, 5, 6],
    [9, 9, 5],
  ] as Array<[number, number, number]>) {
    fillEllipse(t, cx + dx, dy + 2, r, r - 1, C.leaf);
  }
  fillEllipse(t, cx - 5, 7, 4, 3, C.leafLight);
  fillEllipse(t, cx + 1, 5, 3, 2.5, C.leafLight);
  outlineSilhouette(t);
  return t;
}

function bush(): Sprite {
  const w = 10;
  const h = 8;
  const t = createSprite(w, h, w >> 1, h - 1, 8, 3);
  shadow(t, w >> 1, h - 2, 4);
  fillEllipse(t, 5, 4, 4.5, 3, C.leaf);
  fillEllipse(t, 6, 5, 3, 2, C.leafDark);
  fillEllipse(t, 3, 3, 2, 1.5, C.leafLight);
  outlineSilhouette(t);
  return t;
}

/* prettier-ignore */
const FLOWER_ROWS = [
  '.R...Y..',
  'RwR.YwY.',
  '.R...Y..',
  '.g...g..',
  '.g..gg..',
  'GGGGGGGG',
];

function flowers(): Sprite {
  return spriteFromRows(
    FLOWER_ROWS,
    { R: C.red, Y: C.yellow, w: C.white, g: C.leafDark, G: C.leaf },
    { anchorX: 4, anchorY: 5, footprintW: 8, footprintH: 2 },
  );
}

function rock(): Sprite {
  const w = 10;
  const h = 8;
  const t = createSprite(w, h, w >> 1, h - 1, 9, 3);
  shadow(t, w >> 1, h - 2, 4);
  fillEllipse(t, 5, 5, 4, 3, C.stone);
  fillEllipse(t, 6, 6, 3, 2, C.stoneDark);
  put(t, 3, 3, C.white);
  put(t, 4, 3, C.white);
  outlineSilhouette(t);
  return t;
}

export const NATURE: SpriteMap = {
  tree_round: treeRound(),
  tree_pine: treePine(),
  tree_oak: treeOak(),
  bush: bush(),
  flowers: flowers(),
  rock: rock(),
};
