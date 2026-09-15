/**
 * Renders the review artefacts:
 *   art/sheets/contact.png    — every sprite in the package at 3x, grouped and labelled.
 *   art/sheets/scene.png      — the original mock 320x200 town scene at 3x.
 *   art/sheets/town-strip.png — a 640x200 main street at 2x, the scene to judge.
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
  put,
  strokePolyline,
  type Pt,
} from '../src/surface';
import type { Sprite, Surface } from '../src/types';
import { BUILDINGS, buildFromRef } from '../src/buildings/catalogue';
import { LOCATION_RECIPES } from '../src/buildings/recipes';
import { TILES } from '../src/tiles/catalogue';
import { NATURE } from '../src/nature/catalogue';
import { PROPS } from '../src/props/catalogue';
import { UI } from '../src/ui/catalogue';
import { CHARACTERS, tintCharacter } from '../src/characters/catalogue';
import { blitRGBA, encodePNG, spriteToRGBA } from './png';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../../art/sheets');

// ---------------------------------------------------------------- contact

const SCALE = 3;
const PAD = 10;
const LABEL_H = 9;
const HEADING_H = 16;
const BG = C.pavingDark;

type Item = [string, Sprite];
interface Group {
  title: string;
  items: Item[];
}

function groups(): Group[] {
  const buildings: Item[] = Object.entries(BUILDINGS).map(([name, gen]) => [name, gen()] as Item);
  buildings.push(['house-2storey', BUILDINGS.house({ storeys: 2, garage: true, wall: 'cream', roof: 'brick' })]);
  buildings.push(['house-hip-blue', BUILDINGS.house({ roofShape: 'hip', wall: 'white', roof: 'blue' })]);

  const recipes: Item[] = Object.entries(LOCATION_RECIPES).map(
    ([id, ref]) => [id, buildFromRef(ref.kind, ref.params)] as Item,
  );

  const characters: Item[] = Object.entries(CHARACTERS).map(([name, s]) => [name, s] as Item);
  characters.push(['tinted-red', tintCharacter(CHARACTERS.idle_s, C.red)]);
  characters.push(['tinted-blue', tintCharacter(CHARACTERS.idle_s, C.blue)]);
  characters.push(['tinted-green', tintCharacter(CHARACTERS.idle_s, C.green)]);

  return [
    { title: 'BUILDINGS', items: buildings },
    { title: 'LOCATION RECIPES', items: recipes },
    { title: 'TILES & NATURE', items: [...Object.entries(TILES), ...Object.entries(NATURE)] as Item[] },
    { title: 'PROPS', items: Object.entries(PROPS) as Item[] },
    { title: 'UI', items: Object.entries(UI) as Item[] },
    { title: 'CHARACTERS', items: characters },
  ];
}

interface Placed {
  name: string;
  sprite: Sprite;
  x: number;
  y: number;
}

function renderContact(): Surface {
  const sheetW = 1280;
  const all = groups();
  const placed: Placed[] = [];
  const headings: Array<[string, number]> = [];

  let cursorY = PAD + 26;
  for (const group of all) {
    headings.push([group.title, cursorY]);
    cursorY += HEADING_H;
    let cursorX = PAD;
    let rowH = 0;
    for (const [name, sprite] of group.items) {
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
    cursorY += rowH + PAD * 2;
  }
  const sheetH = cursorY + PAD;

  const surf = createSurface(sheetW, sheetH, BG);
  dither(surf, 0, 0, sheetW, sheetH, C.pavingDark, C.paving, 0, 8);
  drawText(surf, PAD, PAD, 'JONES 2 PIXEL ART CONTACT SHEET', C.ink, { spacing: 1 });
  drawText(surf, PAD, PAD + 10, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 .,-$:!?&', C.ink, { spacing: 1 });

  for (const [title, y] of headings) {
    for (let i = 0; i < sheetW - PAD * 2; i++) put(surf, PAD + i, y + 10, C.ink);
    const w = measureText(title) + 6;
    for (let j = 0; j < 9; j++) hline(surf, PAD, y + j, w, C.paving);
    drawText(surf, PAD + 3, y + 1, title, C.ink, { spacing: 1 });
  }

  for (const p of placed) {
    const cellW = Math.max(p.sprite.width * SCALE, measureText(p.name) + 4);
    const bx = p.x - 2;
    const by = p.y - 2;
    for (let y = by; y < by + p.sprite.height * SCALE + 4; y++) hline(surf, bx, y, cellW + 4, C.paving);
    const offX = p.x + Math.floor((cellW - p.sprite.width * SCALE) / 2);
    for (let y = 0; y < p.sprite.height; y++) {
      for (let x = 0; x < p.sprite.width; x++) {
        const idx = p.sprite.pixels[y * p.sprite.width + x];
        if (idx === 0) continue;
        for (let dy = 0; dy < SCALE; dy++) hline(surf, offX + x * SCALE, p.y + y * SCALE + dy, SCALE, idx);
      }
    }
    drawText(surf, p.x, p.y + p.sprite.height * SCALE + 3, p.name.toUpperCase(), C.ink, { spacing: 1 });
  }
  return surf;
}

// ---------------------------------------------------------------- shared scene helpers

function tileGround(s: Surface, variants: Sprite[]): void {
  let n = 0;
  for (let y = 0; y < s.height; y += 16) {
    for (let x = 0; x < s.width; x += 16) {
      const pick = variants[(x * 7 + y * 13 + n) % variants.length];
      blit(s, pick, x, y);
      n++;
    }
  }
}

function place(s: Surface, sprite: Sprite, x: number, y: number): void {
  blit(s, sprite, x - sprite.anchorX, y - sprite.anchorY);
}

/** Nearest sampled y on a polyline for a given x. */
function yAt(pts: readonly Pt[], x: number): number {
  let best = pts[0];
  for (const p of pts) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
  return Math.round(best.y);
}

// ---------------------------------------------------------------- scene

function renderScene(): Surface {
  const W = 320;
  const H = 200;
  const s = createSurface(W, H, C.grass);
  tileGround(s, [TILES.grass_0, TILES.grass_1, TILES.grass_2]);

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

  const kerb = pts.map((p) => ({ x: p.x, y: p.y - 12 }));
  strokePolyline(s, kerb, 10, C.paving);
  strokePolyline(s, kerb.map((p) => ({ x: p.x, y: p.y - 5 })), 1, C.pavingDark);
  strokePolyline(s, kerb.map((p) => ({ x: p.x, y: p.y + 5 })), 1, C.pavingDark);
  for (let i = 0; i < kerb.length; i += 9) {
    const p = kerb[i];
    for (let d = -4; d <= 4; d++) s.pixels[(Math.round(p.y) + d) * W + Math.round(p.x)] = C.pavingDark;
  }

  const line = (x: number): number => yAt(kerb, x) - 3;

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

  for (const [sprite, x, y] of [
    [NATURE.bush, 88, 112],
    [NATURE.bush, 208, 110],
    [NATURE.tree_round, 130, 108],
    [NATURE.bush, 8, 104],
  ] as Array<[Sprite, number, number]>) {
    place(s, sprite, x, y);
  }

  for (const [sprite, x] of [
    [BUILDINGS.bank(), 44],
    [BUILDINGS.zmart(), 148],
    [BUILDINGS.monolith(), 252],
  ] as Array<[Sprite, number]>) {
    place(s, sprite, x, line(x));
  }
  place(s, NATURE.tree_oak, 306, line(306) - 2);
  place(s, NATURE.tree_round, 288, line(288) - 6);

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

  for (const [sprite, x, shirt] of [
    [CHARACTERS.walk_e_1, 96, PLAYER_SHIRTS[0]],
    [CHARACTERS.idle_s, 176, PLAYER_SHIRTS[1]],
    [CHARACTERS.walk_w_2, 244, PLAYER_SHIRTS[2]],
  ] as Array<[Sprite, number, number]>) {
    place(s, tintCharacter(sprite, shirt), x, yAt(pts, x) + 5);
  }

  return s;
}

// ---------------------------------------------------------------- town strip

/**
 * The scene to judge: 640x200 of curvy main street, eight of the new buildings
 * in two ranks, street furniture, trees and two players walking.
 */
function renderTownStrip(): Surface {
  const W = 640;
  const H = 200;
  const s = createSurface(W, H, C.grass);
  tileGround(s, [TILES.grass_0, TILES.grass_1, TILES.grass_2]);

  // --- the street, curving across the bottom third ------------------------
  const spine: Pt[] = [
    { x: -20, y: 176 },
    { x: 90, y: 164 },
    { x: 200, y: 180 },
    { x: 330, y: 162 },
    { x: 450, y: 178 },
    { x: 560, y: 164 },
    { x: 660, y: 176 },
  ];
  const road = curve(null, spine, 0, { steps: 22 });
  strokePolyline(s, road, 21, C.roadEdge);
  strokePolyline(s, road, 19, C.road);
  dashedPolyline(s, road, 2, C.roadLine, 8, 7);

  // pavement along the far side of the road
  const kerb = road.map((p) => ({ x: p.x, y: p.y - 15 }));
  strokePolyline(s, kerb, 13, C.paving);
  strokePolyline(s, kerb.map((p) => ({ x: p.x, y: p.y - 6 })), 1, C.pavingDark);
  strokePolyline(s, kerb.map((p) => ({ x: p.x, y: p.y + 6 })), 1, C.pavingDark);
  for (let i = 0; i < kerb.length; i += 8) {
    const p = kerb[i];
    for (let d = -5; d <= 5; d++) put(s, Math.round(p.x), Math.round(p.y) + d, C.pavingDark);
  }

  /** Ground line for something standing on the pavement at this x. */
  const walk = (x: number): number => yAt(kerb, x) - 4;

  // --- back rank: trees, then three taller blocks -------------------------
  for (const [sprite, x, y] of [
    [NATURE.tree_pine, 18, 40],
    [NATURE.tree_round, 120, 36],
    [NATURE.tree_oak, 268, 40],
    [NATURE.tree_pine, 402, 34],
    [NATURE.tree_round, 500, 38],
    [NATURE.tree_oak, 610, 44],
  ] as Array<[Sprite, number, number]>) {
    place(s, sprite, x, y);
  }

  const backY = 106;
  place(s, buildFromRef('security_apts', LOCATION_RECIPES.security_apts.params), 108, backY);
  place(s, buildFromRef('lowcost', LOCATION_RECIPES.lowcost.params), 292, backY + 2);
  place(s, buildFromRef('shady_acres', LOCATION_RECIPES.shady_acres.params), 484, backY + 2);
  place(s, buildFromRef('house', LOCATION_RECIPES.house_hill.params), 612, backY - 6);

  for (const [sprite, x, y] of [
    [NATURE.bush, 160, 118],
    [NATURE.bush, 330, 116],
    [NATURE.tree_round, 484, 112],
    [NATURE.bush, 20, 112],
  ] as Array<[Sprite, number, number]>) {
    place(s, sprite, x, y);
  }

  // --- front rank on the pavement -----------------------------------------
  const front: Array<[string, number]> = [
    ['bus_depot', 54],
    ['cafe', 152],
    ['qt_clothing', 244],
    ['socket_city', 340],
    ['cinema', 436],
    ['blacks_market', 538],
  ];
  for (const [id, x] of front) {
    const ref = LOCATION_RECIPES[id];
    place(s, buildFromRef(ref.kind, ref.params), x, walk(x));
  }

  // --- street furniture ----------------------------------------------------
  for (const [key, x] of [
    ['lamp', 108],
    ['lamp', 196],
    ['lamp', 292],
    ['lamp', 387],
    ['signpost', 488],
    ['bench', 600],
    ['mailbox', 622],
    ['hydrant', 634],
  ] as Array<[string, number]>) {
    place(s, PROPS[key], x, walk(x) + 8);
  }

  // --- traffic on the road -------------------------------------------------
  const onRoad = (x: number): number => yAt(road, x) + 8;
  place(s, PROPS.bus, 132, onRoad(132));
  place(s, PROPS.car_red, 300, onRoad(300) - 6);
  place(s, PROPS.car_green, 470, onRoad(470));

  // --- two players on the pavement ----------------------------------------
  place(s, tintCharacter(CHARACTERS.walk_e_1, PLAYER_SHIRTS[0]), 200, walk(200) + 9);
  place(s, tintCharacter(CHARACTERS.walk_w_2, PLAYER_SHIRTS[3]), 392, walk(392) + 9);

  // --- foreground below the road -------------------------------------------
  for (const [sprite, x, y] of [
    [NATURE.tree_oak, 60, 199],
    [NATURE.bush, 148, 196],
    [NATURE.flowers, 206, 194],
    [NATURE.rock, 250, 198],
    [NATURE.bush, 352, 197],
    [NATURE.flowers, 404, 196],
    [NATURE.tree_round, 520, 200],
    [NATURE.rock, 596, 195],
  ] as Array<[Sprite, number, number]>) {
    place(s, sprite, x, y);
  }

  return s;
}

// ---------------------------------------------------------------- output

function writeSurface(surface: Surface, file: string, scale: number): void {
  const img = spriteToRGBA(surface, PALETTE, scale);
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
writeSurface(renderTownStrip(), resolve(OUT, 'town-strip.png'), 2);
