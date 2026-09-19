/**
 * Renders the current riverton.json to `art/sheets/riverton-graph.png` for a
 * quick visual sanity check of the layout: every street drawn as ONE
 * continuous polyline (edges are grouped by their `street` id and chained end
 * to end), water rectangles, real-size building boxes labelled with their
 * location id, junction dots, and decor as coloured pixels.
 *
 * Run from the repo root: npx tsx packages/town/tools/preview.ts [riverton|classic]
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
import classic from '../src/towns/classic.json';
import type { RoadKind, Town, TownEdge } from '../src/types';
import { type Pt, sampleCurve } from './geom';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOWN_ID = process.argv[2] ?? 'riverton';
const OUT = resolve(HERE, `../../../art/sheets/${TOWN_ID}-graph.png`);

const town = (TOWN_ID === 'classic' ? classic : riverton) as unknown as Town;
const SCALE = 1; // preview scale, not the game's

const W = town.canvas?.w ?? 1920;
const H = town.canvas?.h ?? 1152;
const s = createSurface(W, H, C.grass);

// faint grid every 64px so distances are easy to eyeball
for (let x = 0; x < W; x += 64) for (let y = 0; y < H; y++) if (y % 4 === 0) put(s, x, y, C.grassDark);
for (let y = 0; y < H; y += 64) for (let x = 0; x < W; x++) if (x % 4 === 0) put(s, x, y, C.grassDark);

const nodeById = new Map(town.nodes.map((n) => [n.id, n]));

function nodePos(id: string): Pt {
  const n = nodeById.get(id);
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

const WIDTH: Record<RoadKind, number> = { highway: 10, street: 7, path: 4, busline: 2 };
const COLOUR: Record<RoadKind, number> = {
  highway: C.roadEdge,
  street: C.road,
  path: C.sand ?? C.roadEdge,
  busline: C.roadLine,
};

function edgePoly(e: TownEdge): Pt[] {
  return sampleCurve(nodePos(e.a), e.curve ?? [], nodePos(e.b));
}

/**
 * Chain a street's edges into one ordered point list so the stroke is
 * continuous through its junctions instead of a row of separate segments.
 */
function streetPolyline(list: TownEdge[]): Pt[][] {
  const remaining = [...list];
  const runs: Pt[][] = [];
  while (remaining.length) {
    const first = remaining.shift()!;
    let head = first.a;
    let tail = first.b;
    let pts = edgePoly(first);
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < remaining.length; i++) {
        const e = remaining[i]!;
        if (e.a === tail) {
          pts = pts.concat(edgePoly(e).slice(1));
          tail = e.b;
        } else if (e.b === tail) {
          pts = pts.concat(edgePoly(e).reverse().slice(1));
          tail = e.a;
        } else if (e.b === head) {
          pts = edgePoly(e).concat(pts.slice(1));
          head = e.a;
        } else if (e.a === head) {
          pts = edgePoly(e).reverse().concat(pts.slice(1));
          head = e.b;
        } else {
          continue;
        }
        remaining.splice(i, 1);
        grew = true;
        break;
      }
    }
    runs.push(pts);
  }
  return runs;
}

const byStreet = new Map<string, TownEdge[]>();
for (const e of town.edges) {
  const key = e.street ?? `${e.a}|${e.b}`;
  const list = byStreet.get(key) ?? [];
  list.push(e);
  byStreet.set(key, list);
}

function drawStreets(kind: RoadKind): void {
  for (const [, list] of byStreet) {
    if (list[0]!.kind !== kind) continue;
    for (const run of streetPolyline(list)) {
      for (let i = 1; i < run.length; i++) thickLine(run[i - 1]!, run[i]!, WIDTH[kind], COLOUR[kind]);
    }
  }
}

// 1. water, under everything: the authored courses first, then rectangle ponds
for (const w of town.water ?? []) {
  const poly = sampleCurve(w.points[0]!, w.points.slice(1, -1), w.points[w.points.length - 1]!, 2);
  for (let i = 1; i < poly.length; i++) thickLine(poly[i - 1]!, poly[i]!, w.width, C.water);
  // a darker bank line either side, so the channel reads as water not road
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1]!;
    const b = poly[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / len) * (w.width / 2);
    const ny = ((b.x - a.x) / len) * (w.width / 2);
    put(s, a.x + nx, a.y + ny, C.waterDark);
    put(s, a.x - nx, a.y - ny, C.waterDark);
  }
}
for (const d of town.decor ?? []) {
  if (d.kind !== 'water') continue;
  rect(s, d.x, d.y, d.w ?? 10, d.h ?? 10, C.water);
  outline(s, d.x, d.y, d.w ?? 10, d.h ?? 10, C.waterDark);
}
for (const d of town.decor ?? []) {
  if (d.kind !== 'grass' && d.kind !== 'plaza') continue;
  outline(s, d.x, d.y, d.w ?? 10, d.h ?? 10, C.grassLight);
}

// 2. roads: highway, then street, then path, then the busline overlay
drawStreets('highway');
drawStreets('street');
drawStreets('path');
drawStreets('busline');

// 3. decor as dots (skip area kinds already drawn)
const AREA = new Set(['water', 'grass', 'plaza', 'path']);
const PROP_COLOUR: Record<string, number> = {
  lamp: C.yellow,
  bench: C.wood,
  bus: C.orange,
  bridge: C.stone,
  viaduct: C.stone,
  underpass: C.ink,
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
  if (d.dir) {
    // Crossings are drawn as a short bar across the road, along `dir`, so the
    // preview shows which way a deck or a tunnel mouth runs.
    const span = d.kind === 'underpass' ? 16 : 26;
    thickLine(
      { x: d.x - d.dir.x * span, y: d.y - d.dir.y * span },
      { x: d.x + d.dir.x * span, y: d.y + d.dir.y * span },
      d.kind === 'underpass' ? 6 : 10,
      idx,
    );
    continue;
  }
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
  const x = n.x + (n.spriteOffset?.x ?? 0) - sprite.anchorX;
  const y = n.y + (n.spriteOffset?.y ?? 0) - sprite.anchorY;
  rect(s, x, y, sprite.width, sprite.height, C.creamShade ?? C.paving);
  outline(s, x, y, sprite.width, sprite.height, C.ink);
  drawText(s, x + 3, y + 3, n.location.slice(0, 11).toUpperCase(), C.ink, { spacing: 0 });
  put(s, n.x, n.y, C.red);
  put(s, n.x - 1, n.y, C.red);
  put(s, n.x + 1, n.y, C.red);
  put(s, n.x, n.y - 1, C.red);
  put(s, n.x, n.y + 1, C.red);
}

// 5. junctions and waypoint nodes as small dots
for (const n of town.nodes) {
  if (n.location) continue;
  const named = !n.id.startsWith('w_') && !n.id.startsWith('a_');
  const idx = named ? C.ink : C.stone;
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 0],
    [0, -1],
  ] as const) {
    put(s, n.x + dx, n.y + dy, idx);
  }
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
