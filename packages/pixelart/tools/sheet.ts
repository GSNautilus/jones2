/**
 * Renders the review artefacts:
 *   art/sheets/contact.png — every sprite in the package at 3x, labelled.
 *   art/sheets/scene.png   — a mock 320x200 town scene at 3x.
 *
 * Run from the repo root: npx tsx packages/pixelart/tools/sheet.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PALETTE, C, PLAYER_SHIRTS } from '../src/palette';
import { drawText, measureText } from '../src/font';
import {
  blit,
  createSurface,
  curve,
  dashedPolyline,
  dither,
  hline,
  strokePolyline,
  type Pt,
} from '../src/surface';
import type { Sprite, Surface } from '../src/types';
import { BUILDINGS } from '../src/buildings/catalogue';
import { TILES } from '../src/tiles/catalogue';
import { NATURE } from '../src/nature/catalogue';
import { CHARACTERS, tintCharacter } from '../src/characters/catalogue';
import { blitRGBA, encodePNG, spriteToRGBA } from './png';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../../art/sheets');

// ---------------------------------------------------------------- contact

const SCALE = 3;
const PAD = 10;
const LABEL_H = 9;
const BG = C.pavingDark;

function collect(): Array<[string, Sprite]> {
  const out: Array<[string, Sprite]> = [];
  for (const [name, gen] of Object.entries(BUILDINGS)) out.push([name, gen()]);
  out.push(['house-2storey', BUILDINGS.house({ storeys: 2, garage: true, wall: 'cream', roof: 'brick' })]);
  out.push(['house-hip-blue', BUILDINGS.house({ roofShape: 'hip', wall: 'white', roof: 'blue' })]);
  for (const [name, sprite] of Object.entries(TILES)) out.push([name, sprite]);
  for (const [name, sprite] of Object.entries(NATURE)) out.push([name, sprite]);
  for (const [name, sprite] of Object.entries(CHARACTERS)) out.push([name, sprite]);
  out.push(['tinted-red', tintCharacter(CHARACTERS.idle_s, C.red)]);
  out.push(['tinted-blue', tintCharacter(CHARACTERS.idle_s, C.blue)]);
  out.push(['tinted-green', tintCharacter(CHARACTERS.idle_s, C.green)]);
  return out;
}

function renderContact(): Surface {
  const items = collect();
  const sheetW = 1180;

  // Row-pack by height.
  interface Placed {
    name: string;
    sprite: Sprite;
    x: number;
    y: number;
  }
  const placed: Placed[] = [];
  let cursorX = PAD;
  let cursorY = PAD + 26;
  let rowH = 0;
  for (const [name, sprite] of items) {
    const cellW = Math.max(sprite.width * SCALE, measureText(name) + 4);
    const cellH = sprite.height * SCALE + LABEL_H + 4;
    if (cursorX + cellW + PAD > sheetW) {
      cursorX = PAD;
      cursorY += rowH + PAD;
      rowH = 0;
    }
    placed.push({ name, sprite, x: cursorX, y: cursorY });
    cursorX += cellW + PAD;
    rowH = Math.max(rowH, cellH);
  }
  const sheetH = cursorY + rowH + PAD;

  const surf = createSurface(sheetW, sheetH, BG);
  // faint check so transparent pixels are obvious
  dither(surf, 0, 0, sheetW, sheetH, C.pavingDark, C.paving, 0, 8);
  drawText(surf, PAD, PAD, 'JONES 2 PIXEL ART CONTACT SHEET', C.ink, { spacing: 1 });
  drawText(surf, PAD, PAD + 10, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 .,-$:!?&', C.ink, { spacing: 1 });

  for (const p of placed) {
    const cellW = Math.max(p.sprite.width * SCALE, measureText(p.name) + 4);
    // cell backdrop
    const bx = p.x - 2;
    const by = p.y - 2;
    for (let y = by; y < by + p.sprite.height * SCALE + 4; y++) hline(surf, bx, y, cellW + 4, C.paving);
    const offX = p.x + Math.floor((cellW - p.sprite.width * SCALE) / 2);
    for (let y = 0; y < p.sprite.height; y++) {
      for (let x = 0; x < p.sprite.width; x++) {
        const idx = p.sprite.pixels[y * p.sprite.width + x];
        if (idx === 0) continue;
        for (let dy = 0; dy < SCALE; dy++) {
          hline(surf, offX + x * SCALE, p.y + y * SCALE + dy, SCALE, idx);
        }
      }
    }
    drawText(surf, p.x, p.y + p.sprite.height * SCALE + 3, p.name.toUpperCase(), C.ink, { spacing: 1 });
  }
  return surf;
}

// ---------------------------------------------------------------- scene

function tileGround(s: Surface, variants: Sprite[]): void {
  let n = 0;
  for (let y = 0; y < s.height; y += 16) {
    for (let x = 0; x < s.width; x += 16) {
      // deterministic shuffle so the ground is varied but reproducible
      const pick = variants[(x * 7 + y * 13 + n) % variants.length];
      blit(s, pick, x, y);
      n++;
    }
  }
}

function place(s: Surface, sprite: Sprite, x: number, y: number): void {
  blit(s, sprite, x - sprite.anchorX, y - sprite.anchorY);
}

function renderScene(): Surface {
  const W = 320;
  const H = 200;
  const s = createSurface(W, H, C.grass);
  tileGround(s, [TILES.grass_0, TILES.grass_1, TILES.grass_2]);

  // a pond in the bottom-left corner, masked to an ellipse
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - 14) / 46;
      const dy = (y - 196) / 30;
      if (dx * dx + dy * dy < 1) {
        const tileSprite = ((x >> 4) + (y >> 4)) % 2 === 0 ? TILES.water_0 : TILES.water_1;
        s.pixels[y * W + x] = tileSprite.pixels[(y % 16) * 16 + (x % 16)];
      }
    }
  }

  // --- the road ----------------------------------------------------------
  const spine: Pt[] = [
    { x: -12, y: 156 },
    { x: 60, y: 146 },
    { x: 130, y: 160 },
    { x: 205, y: 142 },
    { x: 270, y: 154 },
    { x: 334, y: 140 },
  ];
  const pts = curve(null, spine, 0, { steps: 20 });
  strokePolyline(s, pts, 17, C.roadEdge);
  strokePolyline(s, pts, 15, C.road);
  dashedPolyline(s, pts, 2, C.roadLine, 7, 6);

  // pavement running along the top side of the road
  const kerb = pts.map((p) => ({ x: p.x, y: p.y - 12 }));
  strokePolyline(s, kerb, 10, C.paving);
  strokePolyline(
    s,
    kerb.map((p) => ({ x: p.x, y: p.y - 5 })),
    1,
    C.pavingDark,
  );
  strokePolyline(
    s,
    kerb.map((p) => ({ x: p.x, y: p.y + 5 })),
    1,
    C.pavingDark,
  );
  // paving joints every few pixels along the walk
  for (let i = 0; i < kerb.length; i += 9) {
    const p = kerb[i];
    for (let d = -4; d <= 4; d++) s.pixels[(Math.round(p.y) + d) * W + Math.round(p.x)] = C.pavingDark;
  }

  /** Ground line for a building standing on the pavement at this x. */
  const line = (x: number): number => {
    let best = kerb[0];
    for (const p of kerb) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
    return Math.round(best.y) - 3;
  };

  // --- back rank: trees, then the three buildings behind ------------------
  for (const [sprite, x, y] of [
    [NATURE.tree_pine, 10, 46],
    [NATURE.tree_round, 46, 42],
    [NATURE.tree_oak, 148, 44],
    [NATURE.tree_pine, 258, 40],
    [NATURE.tree_round, 300, 46],
    [NATURE.tree_round, 196, 40],
  ] as Array<[Sprite, number, number]>) {
    place(s, sprite, x, y);
  }

  // tan footpaths running down through the gaps to the pavement
  for (const bx of [94, 202]) {
    const bottom = { x: bx, y: line(bx) + 6 };
    const trail = curve(null, [{ x: bx + 5, y: 88 }, { x: bx - 1, y: 116 }, bottom], 0, { steps: 12 });
    strokePolyline(s, trail, 8, C.sandDark);
    strokePolyline(s, trail, 6, C.sand);
  }

  const backY = 96;
  place(s, BUILDINGS.factory(), 46, backY);
  place(s, BUILDINGS.university(), 158, backY + 2);
  place(s, BUILDINGS.house({ storeys: 2, garage: true, wall: 'cream', roof: 'brick' }), 298, backY - 2);

  // trees tucked into the gaps between the two ranks
  for (const [sprite, x, y] of [
    [NATURE.bush, 88, 112],
    [NATURE.bush, 208, 110],
    [NATURE.tree_round, 130, 108],
    [NATURE.bush, 8, 104],
  ] as Array<[Sprite, number, number]>) {
    place(s, sprite, x, y);
  }

  // --- front rank along the pavement --------------------------------------
  for (const [sprite, x] of [
    [BUILDINGS.bank(), 44],
    [BUILDINGS.zmart(), 148],
    [BUILDINGS.monolith(), 252],
  ] as Array<[Sprite, number]>) {
    place(s, sprite, x, line(x));
  }
  // trees closing off the right-hand end of the parade
  place(s, NATURE.tree_oak, 306, line(306) - 2);
  place(s, NATURE.tree_round, 288, line(288) - 6);

  // --- foreground below the road -------------------------------------------
  for (const [sprite, x, y] of [
    [NATURE.tree_oak, 92, 196],
    [NATURE.bush, 64, 180],
    [NATURE.flowers, 118, 182],
    [NATURE.rock, 140, 190],
    [NATURE.bush, 170, 184],
    [NATURE.flowers, 196, 194],
    [NATURE.tree_round, 232, 198],
    [NATURE.bush, 268, 182],
    [NATURE.flowers, 292, 190],
    [NATURE.rock, 306, 176],
    [NATURE.bush, 206, 176],
  ] as Array<[Sprite, number, number]>) {
    place(s, sprite, x, y);
  }

  // --- figures on the road --------------------------------------------------
  const onRoad = (x: number): number => {
    let best = pts[0];
    for (const p of pts) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
    return Math.round(best.y) + 5;
  };
  for (const [sprite, x, shirt] of [
    [CHARACTERS.walk_e_1, 96, PLAYER_SHIRTS[0]],
    [CHARACTERS.idle_s, 176, PLAYER_SHIRTS[1]],
    [CHARACTERS.walk_w_2, 244, PLAYER_SHIRTS[2]],
  ] as Array<[Sprite, number, number]>) {
    place(s, tintCharacter(sprite, shirt), x, onRoad(x));
  }

  return s;
}

// ---------------------------------------------------------------- output

function writeSurface(surface: Surface, file: string, scale: number): void {
  const img = spriteToRGBA(surface, PALETTE, scale);
  // opaque background for the sheet
  const canvas = { width: img.width, height: img.height, data: new Uint8Array(img.width * img.height * 4) };
  for (let i = 0; i < canvas.data.length; i += 4) {
    canvas.data[i] = 120;
    canvas.data[i + 1] = 120;
    canvas.data[i + 2] = 126;
    canvas.data[i + 3] = 255;
  }
  blitRGBA(canvas, img, 0, 0);
  writeFileSync(file, encodePNG(canvas.width, canvas.height, canvas.data));
  console.log(`${file}  ${canvas.width}x${canvas.height}`);
}

mkdirSync(OUT, { recursive: true });
writeSurface(renderContact(), resolve(OUT, 'contact.png'), 1);
writeSurface(renderScene(), resolve(OUT, 'scene.png'), 3);
