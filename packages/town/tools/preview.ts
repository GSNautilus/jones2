/**
 * Renders the current riverton.json to `art/sheets/riverton-graph.png` for a
 * quick visual sanity check of the layout: roads as their sampled curves,
 * water rectangles, crude building boxes labelled with their location id,
 * and decor as coloured dots.
 *
 * Run from the repo root: npx tsx packages/town/tools/preview.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { C } from '../../pixelart/src/palette';
import { drawText } from '../../pixelart/src/font';
import { buildFromRef } from '../../pixelart/src/index';
import { createSurface, line, outline, put, rect } from '../../pixelart/src/surface';
import type { Surface } from '../../pixelart/src/types';
import { blitRGBA, encodePNG, spriteToRGBA } from '../../pixelart/tools/png';
import { PALETTE } from '../../pixelart/src/palette';

import riverton from '../src/towns/riverton.json';
import type { RoadKind, Town, TownEdge } from '../src/types';
import { type Pt, sampleCurve } from './geom';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../../art/sheets/riverton-graph.png');

const town = riverton as unknown as Town;
const SCALE = 2; // preview scale, not the game's

const W = 768;
const H = 448;
const s = createSurface(W, H, C.grass);

// faint grid every 40px so distances are easy to eyeball
for (let x = 0; x < W; x += 40) for (let y = 0; y < H; y++) if (y % 4 === 0) put(s, x, y, C.grassDark);
for (let y = 0; y < H; y += 40) for (let x = 0; x < W; x++) if (x % 4 === 0) put(s, x, y, C.grassDark);

function nodePos(id: string): Pt {
  const n = town.nodes.find((x) => x.id === id);
  if (!n) throw new Error(`Unknown node ${id}`);
  return { x: n.x, y: n.y };
}

function thickLine(a: Pt, b: Pt, width: number, idx: number): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const half = width / 2;
  for (let o = -half; o <= half; o++) {
    line(s, a.x + px * o, a.y + py * o, b.x + px * o, b.y + py * o, idx);
  }
}

function drawEdge(e: TownEdge): void {
  const a = nodePos(e.a);
  const b = nodePos(e.b);
  const pts = sampleCurve(a, e.curve ?? [], b);
  const width: Record<RoadKind, number> = { highway: 9, street: 6, path: 3, busline: 2 };
  const colour: Record<RoadKind, number> = { highway: C.roadEdge, street: C.road, path: C.sand ?? C.roadEdge, busline: C.roadLine };
  for (let i = 1; i < pts.length; i++) thickLine(pts[i - 1]!, pts[i]!, width[e.kind], colour[e.kind]);
}

// 1. water, under everything
for (const d of town.decor ?? []) {
  if (d.kind !== 'water') continue;
  rect(s, d.x, d.y, d.w ?? 10, d.h ?? 10, C.water);
  outline(s, d.x, d.y, d.w ?? 10, d.h ?? 10, C.waterDark);
}
for (const d of town.decor ?? []) {
  if (d.kind !== 'grass' && d.kind !== 'plaza') continue;
  outline(s, d.x, d.y, d.w ?? 10, d.h ?? 10, C.grassLight);
}

// 2. roads: highway, then street, then path, then busline overlay
for (const kind of ['highway', 'street', 'path'] as RoadKind[]) {
  for (const e of town.edges) if (e.kind === kind) drawEdge(e);
}
for (const e of town.edges) if (e.kind === 'busline') drawEdge(e);

// 3. decor as dots (skip area kinds already drawn)
const AREA = new Set(['water', 'grass', 'plaza', 'path']);
const PROP_COLOUR: Record<string, number> = {
  lamp: C.yellow,
  bench: C.wood,
  bus: C.orange,
  bridge: C.stone,
  dock: C.wood,
  hydrant: C.red,
  mailbox: C.blue,
  signpost: C.ink,
  fence_h: C.stone,
  fence_v: C.stone,
  car_red: C.red,
  car_blue: C.blue,
  car_green: C.green,
};
for (const d of town.decor ?? []) {
  if (AREA.has(d.kind)) continue;
  const idx = PROP_COLOUR[d.kind] ?? C.leaf;
  put(s, d.x, d.y, idx);
  put(s, d.x + 1, d.y, idx);
  put(s, d.x, d.y + 1, idx);
  put(s, d.x + 1, d.y + 1, idx);
}

// 4. real building boxes (from the actual catalogue sprite) + label, on top
for (const n of town.nodes) {
  if (!n.location) continue;
  const ref = (n as { pixel?: { kind: string; params?: Record<string, string | number | boolean> } }).pixel ?? {
    kind: n.location,
  };
  const sprite = buildFromRef(ref.kind, ref.params);
  const bw = sprite.width;
  const bh = sprite.height;
  const x = n.x - sprite.anchorX;
  const y = n.y - sprite.anchorY;
  rect(s, x, y, bw, bh, C.creamShade ?? C.paving);
  outline(s, x, y, bw, bh, C.ink);
  const label = n.location.slice(0, 10).toUpperCase();
  drawText(s, x + 3, y + 3, label, C.ink, { spacing: 0 });
  // anchor marker
  put(s, n.x, n.y, C.red);
  put(s, n.x - 1, n.y, C.red);
  put(s, n.x + 1, n.y, C.red);
  put(s, n.x, n.y - 1, C.red);
  put(s, n.x, n.y + 1, C.red);
}

// 5. junctions as small dots
for (const n of town.nodes) {
  if (n.location) continue;
  put(s, n.x, n.y, C.ink);
  put(s, n.x + 1, n.y, C.ink);
  put(s, n.x, n.y + 1, C.ink);
}

function writeSurface(surface: Surface, file: string, scale: number): void {
  const img = spriteToRGBA(surface, PALETTE, scale);
  const canvas = { width: img.width, height: img.height, data: new Uint8Array(img.width * img.height * 4) };
  for (let i = 0; i < canvas.data.length; i += 4) {
    canvas.data[i] = 20;
    canvas.data[i + 1] = 20;
    canvas.data[i + 2] = 24;
    canvas.data[i + 3] = 255;
  }
  blitRGBA(canvas, img, 0, 0);
  writeFileSync(file, encodePNG(canvas.width, canvas.height, canvas.data));
  console.log(`${file}  ${canvas.width}x${canvas.height}`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeSurface(s, OUT, SCALE);
