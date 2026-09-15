/**
 * 16x16 ground tiles. Tiles anchor at their top-left so they can be laid on a
 * plain grid. Detail is placed by a small integer hash, so every tile is
 * deterministic but none of them look regular.
 */
import { C } from '../palette';
import type { Sprite, SpriteMap } from '../types';
import { createSprite, hline, put, rect, vline } from '../surface';

export const TILE = 16;

function tile(): Sprite {
  return createSprite(TILE, TILE, 0, 0, TILE, TILE);
}

/** Deterministic 0..1 hash. */
function h(x: number, y: number, seed: number): number {
  let n = (x * 374761393 + y * 668265263 + seed * 1013904223) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function grass(seed: number, flowers = 0): Sprite {
  const t = tile();
  rect(t, 0, 0, TILE, TILE, C.grass);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const r = h(x, y, seed);
      if (r > 0.93) put(t, x, y, C.grassDark);
      else if (r < 0.05) put(t, x, y, C.grassLight);
    }
  }
  // a few blades: two-pixel vertical ticks
  for (let k = 0; k < 5; k++) {
    const x = Math.floor(h(k, seed, 11) * TILE);
    const y = Math.floor(h(seed, k, 23) * (TILE - 2));
    put(t, x, y, C.grassDark);
    put(t, x, y + 1, C.grassDark);
  }
  for (let k = 0; k < flowers; k++) {
    const x = 2 + Math.floor(h(k, seed, 31) * (TILE - 4));
    const y = 2 + Math.floor(h(seed, k, 47) * (TILE - 4));
    const petal = k % 2 === 0 ? C.white : C.yellow;
    put(t, x, y, petal);
    put(t, x + 1, y, petal);
    put(t, x, y + 1, petal);
    put(t, x + 1, y + 1, C.yellowDark);
  }
  return t;
}

function water(seed: number): Sprite {
  const t = tile();
  rect(t, 0, 0, TILE, TILE, C.water);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (h(x, y, seed) > 0.88) put(t, x, y, C.waterDark);
    }
  }
  // two wave highlights: a dash with a tick on each end
  for (let k = 0; k < 2; k++) {
    const x = 2 + Math.floor(h(k, seed, 5) * 8);
    const y = 3 + k * 7 + Math.floor(h(seed, k, 9) * 3);
    hline(t, x, y, 5, C.waterLight);
    put(t, x - 1, y + 1, C.waterLight);
    put(t, x + 5, y + 1, C.waterLight);
    hline(t, x + 1, y + 1, 3, C.waterDark);
  }
  return t;
}

function path(): Sprite {
  const t = tile();
  rect(t, 0, 0, TILE, TILE, C.sand);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const r = h(x, y, 77);
      if (r > 0.9) put(t, x, y, C.sandDark);
      else if (r < 0.06) put(t, x, y, C.cream);
    }
  }
  for (let k = 0; k < 3; k++) {
    const x = 1 + Math.floor(h(k, 3, 91) * (TILE - 3));
    const y = 1 + Math.floor(h(3, k, 93) * (TILE - 3));
    put(t, x, y, C.stoneDark);
    put(t, x + 1, y, C.stone);
  }
  return t;
}

function plaza(): Sprite {
  const t = tile();
  rect(t, 0, 0, TILE, TILE, C.paving);
  // four 8x8 slabs: dark joint along the top and left of each, faint speckle
  for (const gy of [0, 8]) {
    for (const gx of [0, 8]) {
      hline(t, gx, gy, 8, C.pavingDark);
      vline(t, gx, gy, 8, C.pavingDark);
      hline(t, gx + 1, gy + 1, 6, C.white);
      for (let y = 2; y < 8; y++) {
        for (let x = 1; x < 8; x++) if (h(gx + x, gy + y, 131) > 0.9) put(t, gx + x, gy + y, C.pavingDark);
      }
    }
  }
  return t;
}

export const TILES: SpriteMap = {
  grass_0: grass(1),
  grass_1: grass(2),
  grass_2: grass(3, 3),
  water_0: water(11),
  water_1: water(12),
  path: path(),
  plaza: plaza(),
};
