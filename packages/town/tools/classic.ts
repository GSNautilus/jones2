/**
 * Generator for the CLASSIC town — the original Jones in the Fast Lane board
 * as our engine sees it. The source of truth is this script, not the JSON:
 *
 *   npx tsx packages/town/tools/classic.ts
 *
 * The original board (art/reference/original/wiki_map.png, 320×200) is a
 * walkway running round a centre window with the thirteen buildings on the
 * outside of the loop. Clockwise from the top-left corner: Security
 * Apartments, Rent Office, Low-Cost Housing, Pawn Shop, Z-Mart, Monolith
 * Burgers, QT Clothing, Socket City, Hi-Tech U, Employment Office, Factory,
 * Bank, Black's Market. The centre is empty: that is where the location
 * window sits.
 *
 * Here the canvas is the original at 2× (640×400) and every building's node
 * is ON the walkway, with the sprite hung off it outward via `spriteOffset`
 * (above the top row, below the bottom row, beside the columns), so tokens
 * stand on the ring in front of the building exactly as the marble did.
 *
 * Travel: the fan wiki gives "a full lap around the entire board costing
 * about 10 Hours", so the ring's perimeter is 600 minutes (`LAP_MINUTES`) and
 * a hop between neighbours rounds up to one hour, the far side to five. The
 * town's `travelHourMultiplier` is 1: no doubling here, unlike Riverton.
 * Players start at their apartment, Low-Cost Housing by default.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NATURE, buildFromRef } from '../../pixelart/src/index';
import type { Decor, Town, TownEdge, TownNode } from '../src/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(HERE, '../src/towns/classic.json');

/** The original's 320×200 screen at 2×. */
export const W = 640;
export const H = 400;

/** The walkway rectangle: the ring every node sits on. */
export const RING = { left: 118, right: 522, top: 128, bottom: 296 };
/** Drawn width of the paved band under the walkway. */
export const BAND = 20;
/** Kerb-to-facade gap between the band's edge and a sprite. */
const GAP = 10;
/** A full lap of the walkway, in minutes: the wiki's "about 10 Hours". */
export const LAP_MINUTES = 600;

type Side = 'top' | 'right' | 'bottom' | 'left';

interface Spot {
  location: string;
  name: string;
  /** Which edge of the ring the sprite hangs off; corners name both. */
  side: Side | [Side, Side];
  /** Arc position: x for top/bottom, y for left/right, ignored at corners. */
  at?: number;
}

/** Clockwise from the top-left corner, as the original lists them. */
export const SPOTS: Spot[] = [
  { location: 'security_apts', name: 'Security Apartments', side: ['top', 'left'] },
  { location: 'rent_office', name: 'Rent Office', side: 'top', at: 215 },
  { location: 'lowcost', name: 'Low-Cost Housing', side: 'top', at: 320 },
  { location: 'pawn', name: 'Pawn Shop', side: 'top', at: 425 },
  { location: 'zmart', name: 'Z-Mart', side: ['top', 'right'] },
  { location: 'monolith', name: 'Monolith Burgers', side: 'right', at: 180 },
  { location: 'qt_clothing', name: 'QT Clothing', side: 'right', at: 258 },
  { location: 'socket_city', name: 'Socket City', side: ['bottom', 'right'] },
  { location: 'university', name: 'Hi-Tech University', side: 'bottom', at: 425 },
  { location: 'employment', name: 'Employment Office', side: 'bottom', at: 215 },
  { location: 'factory', name: 'Consolidated Widgets Factory', side: ['bottom', 'left'] },
  { location: 'bank', name: 'First Jones Bank', side: 'left', at: 262 },
  { location: 'blacks_market', name: "Black's Market", side: 'left', at: 180 },
];

function sides(spot: Spot): Side[] {
  return Array.isArray(spot.side) ? spot.side : [spot.side];
}

/** The node on the ring for a spot. */
function ringPoint(spot: Spot): { x: number; y: number } {
  const ss = sides(spot);
  const x = ss.includes('left') ? RING.left : ss.includes('right') ? RING.right : spot.at!;
  const y = ss.includes('top') ? RING.top : ss.includes('bottom') ? RING.bottom : spot.at!;
  return { x, y };
}

/**
 * Where the sprite's anchor (bottom-centre) goes: outward from the ring by
 * the band and the gap. A corner building is pushed out on both axes.
 */
function anchorFor(spot: Spot, w: number, h: number): { x: number; y: number } {
  const p = ringPoint(spot);
  const out = BAND / 2 + GAP;
  let { x, y } = p;
  for (const s of sides(spot)) {
    if (s === 'top') y = RING.top - out;
    if (s === 'bottom') y = RING.bottom + out + h;
    if (s === 'left') x = RING.left - out - w / 2;
    if (s === 'right') x = RING.right + out + w / 2;
  }
  // A column building (no top/bottom) is centred on its node vertically.
  if (!sides(spot).some((s) => s === 'top' || s === 'bottom')) y = p.y + h / 2;
  return { x: Math.round(x), y: Math.round(y) };
}

interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const nodes: TownNode[] = [];
const boxes: Box[] = [];

for (const spot of SPOTS) {
  const sprite = buildFromRef(spot.location);
  const p = ringPoint(spot);
  const a = anchorFor(spot, sprite.width, sprite.height);
  nodes.push({
    id: spot.location,
    name: spot.name,
    x: p.x,
    y: p.y,
    location: spot.location,
    pixel: { kind: spot.location },
    spriteOffset: { x: a.x - p.x, y: a.y - p.y },
  });
  boxes.push({ id: spot.location, x: a.x - sprite.anchorX, y: a.y - sprite.anchorY, w: sprite.width, h: sprite.height });
}

/* ------------------------------------------------------------- the ring */

const perimeter = 2 * (RING.right - RING.left + RING.bottom - RING.top);
const edges: TownEdge[] = [];
for (let i = 0; i < nodes.length; i++) {
  const a = nodes[i]!;
  const b = nodes[(i + 1) % nodes.length]!;
  const px = Math.hypot(b.x - a.x, b.y - a.y);
  edges.push({
    a: a.id,
    b: b.id,
    minutes: Math.max(1, Math.round((px * LAP_MINUTES) / perimeter)),
    kind: 'path',
    street: 'ring',
  });
}

/* --------------------------------------------------------------- decor */

const decor: Decor[] = [];
const half = BAND / 2;
// The paved band the walkway runs on: four rectangles round the ring.
decor.push({ kind: 'plaza', x: RING.left - half, y: RING.top - half, w: RING.right - RING.left + BAND, h: BAND });
decor.push({ kind: 'plaza', x: RING.left - half, y: RING.bottom - half, w: RING.right - RING.left + BAND, h: BAND });
decor.push({ kind: 'plaza', x: RING.left - half, y: RING.top - half, w: BAND, h: RING.bottom - RING.top + BAND });
decor.push({ kind: 'plaza', x: RING.right - half, y: RING.top - half, w: BAND, h: RING.bottom - RING.top + BAND });

// Greenery in the gaps between buildings, roughly where the original has it.
const PROPS: Decor[] = [
  { kind: 'tree_round', x: 137, y: 104 },
  { kind: 'bush', x: 266, y: 106 },
  { kind: 'tree_round', x: 379, y: 104 },
  { kind: 'tree_round', x: 498, y: 100 },
  { kind: 'bush', x: 600, y: 128 },
  { kind: 'tree_round', x: 300, y: 372 },
  { kind: 'bush', x: 340, y: 360 },
  { kind: 'tree_pine', x: 138, y: 372 },
  { kind: 'bush', x: 506, y: 360 },
  { kind: 'tree_round', x: 40, y: 132 },
];
for (const d of PROPS) decor.push(d);

/* --------------------------------------------------------------- checks */

const problems: string[] = [];
for (const b of boxes) {
  if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H) problems.push(`${b.id} leaves the canvas`);
}
for (let i = 0; i < boxes.length; i++) {
  for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i]!;
    const b = boxes[j]!;
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) problems.push(`${a.id} overlaps ${b.id}`);
  }
}
for (const d of PROPS) {
  const s = NATURE[d.kind];
  if (!s) {
    problems.push(`unknown prop ${d.kind}`);
    continue;
  }
  const pb = { x: d.x - s.anchorX, y: d.y - s.anchorY, w: s.width, h: s.height };
  for (const b of boxes) {
    if (pb.x < b.x + b.w && b.x < pb.x + pb.w && pb.y < b.y + b.h && b.y < pb.y + pb.h) problems.push(`${d.kind} at ${d.x},${d.y} overlaps ${b.id}`);
  }
  const onBand =
    pb.x < RING.right + half && pb.x + pb.w > RING.left - half && pb.y < RING.bottom + half && pb.y + pb.h > RING.top - half &&
    !(pb.x > RING.left + half && pb.x + pb.w < RING.right - half && pb.y > RING.top + half && pb.y + pb.h < RING.bottom - half);
  if (onBand) problems.push(`${d.kind} at ${d.x},${d.y} stands on the walkway`);
}
for (const b of boxes) {
  const inBand =
    (b.y + b.h > RING.top - half && b.y < RING.bottom + half && b.x + b.w > RING.left - half && b.x < RING.right + half) &&
    !(b.y + b.h <= RING.top - half || b.y >= RING.bottom + half || b.x + b.w <= RING.left - half || b.x >= RING.right + half);
  if (inBand) problems.push(`${b.id} stands on the walkway`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const lapMinutes = edges.reduce((s, e) => s + e.minutes, 0);

const town: Town = {
  id: 'classic',
  name: 'Classic',
  startNode: 'lowcost',
  canvas: { w: W, h: H },
  travelHourMultiplier: 1,
  nodes,
  edges,
  decor,
};

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(town, null, 2) + '\n');
console.log(`wrote ${OUT_FILE}: ${nodes.length} nodes, ${edges.length} edges, lap ${lapMinutes} min`);
for (const e of edges) console.log(`  ${e.a} -> ${e.b}: ${e.minutes} min`);
