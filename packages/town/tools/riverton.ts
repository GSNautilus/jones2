/**
 * Generator for Riverton — the source of truth is this script, not the JSON.
 * Run it to rebuild `src/towns/riverton.json`:
 *
 *   npx tsx packages/town/tools/riverton.ts
 *
 * Town units are native pixels (1 unit = 1 px) on a 768x448 canvas (grown
 * from the original 640x400 plan once real sprite sizes — up to 108x88 —
 * turned out bigger than the placeholder 80x64 box). Node x,y is the
 * anchor: the bottom centre of the building footprint (sprites extend
 * upward and half their width either side). Locations are placed with a
 * force-relaxation pass against the REAL catalogue sprite sizes (see
 * `tools/overlaps.ts`, which must report zero problems); everything else is
 * hand-placed and checked by `test/riverton.test.ts` and eyeballed via
 * `tools/preview.ts`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildFromRef } from '../../pixelart/src/index';
import type { Decor, RoadKind, Town, TownEdge, TownNode } from '../src/types';
import { type Pt, type Rect, distToPolyline, frange, mulberry32, polylineLength, rectContains, resample, sampleCurve } from './geom';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(HERE, '../src/towns/riverton.json');

const W = 768;
const H = 448;
const MARGIN = 16;

/**
 * Five building kinds are still being drawn by the art agent and currently
 * fall back to a generic 64x50 house sprite — too small to plan around. Until
 * they land, treat them as this size for layout purposes (matches the other
 * "large" buildings: university, zmart, auto, factory).
 */
const FALLBACK_SIZES: Record<string, { w: number; h: number }> = {
  gilded_fork: { w: 96, h: 80 },
  chez_cholesterol: { w: 96, h: 80 },
  shady_acres: { w: 96, h: 80 },
  lowcost: { w: 96, h: 80 },
  security_apts: { w: 96, h: 80 },
};

const rng = mulberry32(20240914); // deterministic: today's date as a seed, nothing more

/* ------------------------------------------------------------ locations */

interface LocSpec {
  id: string;
  name: string;
  x: number;
  y: number;
  pixel: { kind: string; params?: Record<string, string | number | boolean> };
}

const HOUSE_PARAMS: Record<string, Record<string, string | number | boolean>> = {
  house_elm: { wall: 'cream', roof: 'brick' },
  house_lake: { roofShape: 'hip', wall: 'blue', roof: 'greenDark' },
  house_hill: { storeys: 2, garage: true, wall: 'white', roof: 'blueDark' },
};

/**
 * Name + anchor for every sim location. Hand-placed by region, then relaxed
 * with a force-directed pass against the REAL sprite sizes from the art
 * catalogue (`tools/overlaps.ts`'s box model) so that no two building
 * footprints overlap, no road crosses an unrelated building's facade band,
 * every node stays within the canvas margin, and every pair of location
 * anchors is at least 56px apart.
 */
const LOCATIONS: Array<{ id: string; name: string; x: number; y: number }> = [
  // downtown, on and just off the curving main street
  { id: 'bank', name: 'First Jones Bank', x: 164, y: 205 },
  { id: 'university', name: 'Hi-Tech University', x: 371, y: 186 },
  { id: 'clinic', name: "Doc's Walk-In Clinic", x: 465, y: 198 },
  { id: 'employment', name: 'Employment Office', x: 204, y: 325 },
  { id: 'bus_depot', name: 'Bus Depot', x: 268, y: 245 },
  { id: 'newsstand', name: 'Corner Newsstand', x: 255, y: 170 },
  { id: 'monolith', name: 'Monolith Burgers', x: 413, y: 300 },
  { id: 'cafe', name: 'Java Hut', x: 501, y: 300 },
  // shopping strip, NE/E
  { id: 'qt_clothing', name: 'QT Clothing', x: 565, y: 95 },
  { id: 'zmart', name: 'Z-Mart', x: 648, y: 168 },
  { id: 'socket_city', name: 'Socket City', x: 555, y: 199 },
  { id: 'blacks_market', name: "Black's Market", x: 590, y: 320 },
  { id: 'pawn', name: 'Pawn Shop', x: 680, y: 365 },
  { id: 'auto', name: "Honest Al's Autos", x: 680, y: 240 },
  // river, park and the leisure cluster SW
  { id: 'park', name: 'Riverside Park', x: 60, y: 200 },
  { id: 'gym', name: 'Flex Factory Gym', x: 223, y: 406 },
  { id: 'cinema', name: 'Bijou Cinema', x: 318, y: 337 },
  { id: 'gilded_fork', name: 'The Gilded Fork', x: 129, y: 420 },
  { id: 'chez_cholesterol', name: 'Chez Cholesterol', x: 319, y: 432 },
  // industrial north
  { id: 'factory', name: 'Consolidated Widgets', x: 336, y: 94 },
  { id: 'shady_acres', name: 'Shady Acres', x: 468, y: 106 },
  { id: 'lowcost', name: 'Low-Cost Housing', x: 180, y: 112 },
  // residential
  { id: 'security_apts', name: 'Security Apartments', x: 413, y: 406 },
  { id: 'house_elm', name: '12 Elm Street', x: 48, y: 430 },
  { id: 'house_hill', name: 'Hilltop Manor', x: 660, y: 80 },
  { id: 'house_lake', name: 'Lakeside Cottage', x: 696, y: 432 },
  // the far corner
  { id: 'lookout', name: 'Lookout Point', x: 54, y: 70 },
];

const locSpecs: LocSpec[] = LOCATIONS.map((l) => ({
  id: l.id,
  name: l.name,
  x: l.x,
  y: l.y,
  pixel: HOUSE_PARAMS[l.id]
    ? { kind: 'house', params: HOUSE_PARAMS[l.id] }
    : { kind: l.id },
}));

/* -------------------------------------------------------------- junctions */

// Junction ids mostly carry over from the original riverton.json (j_center,
// j_west, j_north, j_east, j_south, j_elm, j_hill, j_lake) — other packages
// (the client's replay/editor tests) hardcode a couple of these literally.
// A few new junctions (j_mc, j_shop*, j_hwy*) are added for the richer curvy
// network; nothing outside this package references those.
// Every junction below was placed with `tools/overlaps.ts`'s exact box model
// in mind: a short grid search (see git history) found each position clear of
// every OTHER building's facade band, for every edge that touches it. Do not
// move one without re-checking `npx tsx packages/town/tools/overlaps.ts`.
const JUNCTIONS: Array<{ id: string; x: number; y: number }> = [
  { id: 'j_west', x: 120, y: 300 }, // toward the river bridge, park and gym
  { id: 'j_center', x: 210, y: 246 }, // just off bus_depot's corner, closer to it than to employment
  { id: 'j_mc', x: 356, y: 226 },
  { id: 'j_shop1', x: 546, y: 118 },
  { id: 'j_north', x: 306, y: 103 },
  { id: 'j_hill', x: 590, y: 107 },
  { id: 'j_lake', x: 628, y: 372 },
  { id: 'j_elm', x: 87, y: 431 },
  { id: 'j_hwyNW', x: 120, y: 20 },
  { id: 'j_hwyN', x: 270, y: 20 },
  { id: 'j_hwyNE', x: 650, y: 20 },
  { id: 'j_hwyE', x: 750, y: 150 },
  { id: 'j_hwyE2', x: 750, y: 380 },
];

/* ------------------------------------------------------------------ nodes */

const nodes: TownNode[] = [
  ...locSpecs.map((l): TownNode => ({ id: l.id, name: l.name, x: l.x, y: l.y, location: l.id, pixel: l.pixel })),
  ...JUNCTIONS.map((j): TownNode => ({ id: j.id, x: j.x, y: j.y })),
];

const pos = new Map<string, Pt>(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));

/* ------------------------------------------------------------------ edges */

interface EdgeSpec {
  a: string;
  b: string;
  kind: RoadKind;
  /** Force the number of curve control points instead of deriving it from length. */
  points?: number;
  /**
   * Explicit control points, verified clear of every unrelated building's
   * facade band with `tools/overlaps.ts` (see git history for the search).
   * Bypasses the random wiggle entirely — used only where the town is too
   * tight for a random bend to be safe.
   */
  curve?: Pt[];
}

const PER_MINUTE: Record<RoadKind, number> = { street: 4, busline: 4, path: 3, highway: 6 };

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** A gentle, deterministic wiggle between two points — never a hairpin. */
function wiggle(a: Pt, b: Pt, kind: RoadKind, count: number): Pt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  // Riverton is dense: real sprite footprints leave narrow corridors between
  // buildings, so bends stay gentler here than a spacious town could afford.
  const capBase = kind === 'highway' ? 0.05 : kind === 'path' ? 0.1 : 0.07;
  const cap = Math.min(kind === 'path' ? 16 : 12, len * capBase);
  let sign = rng() < 0.5 ? -1 : 1;
  const out: Pt[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const base = { x: a.x + dx * t, y: a.y + dy * t };
    const mag = frange(rng, cap * 0.45, cap) * sign;
    out.push({ x: clamp(base.x + px * mag, 2, W - 2), y: clamp(base.y + py * mag, 2, H - 2) });
    if (rng() < 0.75) sign *= -1; // mostly alternate for a soft S-bend, occasionally hold a side
  }
  return out;
}

const builtEdges = new Map<string, { edge: TownEdge; poly: Pt[] }>();

function edgeKey(a: string, b: string): string {
  return `${a}|${b}`;
}

function makeEdge(spec: EdgeSpec): TownEdge {
  const a = pos.get(spec.a);
  const b = pos.get(spec.b);
  if (!a || !b) throw new Error(`Edge references unknown node: ${spec.a} - ${spec.b}`);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const count = spec.points ?? (len < 60 ? 1 : len < 160 ? 2 : 3);
  const curve = spec.curve ?? wiggle(a, b, spec.kind, count);
  const poly = sampleCurve(a, curve, b);
  const minutes = Math.max(2, Math.round(polylineLength(poly) / PER_MINUTE[spec.kind]));
  const edge: TownEdge = { a: spec.a, b: spec.b, kind: spec.kind, minutes, curve };
  builtEdges.set(edgeKey(spec.a, spec.b), { edge, poly });
  return edge;
}

// The town is dense enough that a hub-and-spoke shopping strip crossed its
// own neighbours' facades once real sprite sizes came in (see overlaps.ts's
// report in the task history). Rebuilt as a chain of short edges instead:
// each building connects only to its immediate neighbours, so every edge is
// short and never needs to clip past a THIRD building to reach its own two
// endpoints. `points: 0` keeps a few of the tightest edges straight.
const EDGE_SPECS: EdgeSpec[] = [
  // --- main street spine, west to east: a chain, not a hub ---
  { a: 'j_west', b: 'j_center', kind: 'street' },
  { a: 'j_center', b: 'bus_depot', kind: 'street' },
  { a: 'bus_depot', b: 'newsstand', kind: 'street' },
  // bowed north of bus_depot's corner — hand-verified with overlaps.ts
  { a: 'newsstand', b: 'j_mc', kind: 'street', curve: [{ x: 300, y: 194 }] },
  { a: 'j_mc', b: 'clinic', kind: 'street' },
  { a: 'clinic', b: 'monolith', kind: 'street' },
  { a: 'monolith', b: 'cafe', kind: 'street' },
  { a: 'cafe', b: 'socket_city', kind: 'street', points: 1 },
  // downtown spurs
  { a: 'j_center', b: 'employment', kind: 'street' },
  { a: 'j_center', b: 'bank', kind: 'street' },
  { a: 'j_mc', b: 'university', kind: 'street' },
  // shopping strip: a chain along the curve, not a hub
  { a: 'j_shop1', b: 'qt_clothing', kind: 'street' },
  { a: 'j_shop1', b: 'socket_city', kind: 'street' },
  { a: 'socket_city', b: 'zmart', kind: 'street', points: 1 },
  { a: 'socket_city', b: 'blacks_market', kind: 'street' },
  { a: 'blacks_market', b: 'pawn', kind: 'street' },
  { a: 'pawn', b: 'auto', kind: 'street', points: 1 },
  // industrial north — reached via university, not a separate spoke off j_mc
  { a: 'university', b: 'j_north', kind: 'street' },
  { a: 'j_north', b: 'factory', kind: 'street' },
  { a: 'j_north', b: 'lowcost', kind: 'street' },
  { a: 'j_north', b: 'shady_acres', kind: 'street', points: 0 },
  { a: 'shady_acres', b: 'j_hill', kind: 'street' },
  { a: 'j_hill', b: 'house_hill', kind: 'street', points: 0 },
  { a: 'j_hill', b: 'qt_clothing', kind: 'street' },
  // leisure cluster SW, off the river bridge
  { a: 'j_west', b: 'park', kind: 'path' },
  { a: 'j_west', b: 'gym', kind: 'street' },
  { a: 'gym', b: 'cinema', kind: 'street' },
  { a: 'gym', b: 'gilded_fork', kind: 'street' },
  { a: 'cinema', b: 'chez_cholesterol', kind: 'street' },
  { a: 'gilded_fork', b: 'chez_cholesterol', kind: 'street' },
  { a: 'gilded_fork', b: 'j_elm', kind: 'street' },
  { a: 'j_elm', b: 'house_elm', kind: 'street' },
  // south — chained through cinema rather than a hub, on to the lake
  { a: 'bus_depot', b: 'cinema', kind: 'street', points: 1 },
  { a: 'cinema', b: 'security_apts', kind: 'street', points: 1 },
  { a: 'security_apts', b: 'j_lake', kind: 'street', points: 1 },
  { a: 'j_lake', b: 'house_lake', kind: 'street' },
  { a: 'j_lake', b: 'pawn', kind: 'street' },
  { a: 'j_lake', b: 'auto', kind: 'street', points: 0 },
  // lookout, far NW corner, reached only by winding paths
  { a: 'park', b: 'lookout', kind: 'path', points: 3 },
  { a: 'lowcost', b: 'lookout', kind: 'path', points: 3 },
  // highway skirting the north and east edges
  { a: 'j_hwyNW', b: 'j_hwyN', kind: 'highway' },
  { a: 'j_hwyN', b: 'j_hwyNE', kind: 'highway' },
  // this bend was hand-verified clear of house_hill with overlaps.ts
  { a: 'j_hwyNE', b: 'j_hwyE', kind: 'highway', curve: [{ x: 708, y: 47 }] },
  { a: 'j_hwyE', b: 'j_hwyE2', kind: 'highway' },
  // on-ramps — house_hill stands in for j_hill (its own box blocks a direct
  // line to j_hill from the highway); j_north's ramp bends around factory
  { a: 'j_hwyN', b: 'j_north', kind: 'highway', curve: [{ x: 278, y: 99 }] },
  { a: 'j_hwyNE', b: 'house_hill', kind: 'highway' },
  { a: 'j_hwyE2', b: 'j_lake', kind: 'highway' },
  // bus lines: depot <-> factory
  { a: 'bus_depot', b: 'newsstand', kind: 'busline' },
  { a: 'newsstand', b: 'j_mc', kind: 'busline', curve: [{ x: 300, y: 194 }] },
  { a: 'j_mc', b: 'university', kind: 'busline' },
  { a: 'university', b: 'j_north', kind: 'busline' },
  { a: 'j_north', b: 'factory', kind: 'busline' },
  // bus lines: depot <-> auto, along the strip
  { a: 'j_mc', b: 'clinic', kind: 'busline' },
  { a: 'clinic', b: 'monolith', kind: 'busline' },
  { a: 'monolith', b: 'cafe', kind: 'busline' },
  { a: 'cafe', b: 'socket_city', kind: 'busline', points: 1 },
  { a: 'socket_city', b: 'blacks_market', kind: 'busline' },
  { a: 'blacks_market', b: 'pawn', kind: 'busline' },
  { a: 'pawn', b: 'auto', kind: 'busline', points: 1 },
  // bus lines: depot <-> lakeside
  { a: 'bus_depot', b: 'cinema', kind: 'busline', points: 1 },
  { a: 'cinema', b: 'security_apts', kind: 'busline', points: 1 },
  { a: 'security_apts', b: 'j_lake', kind: 'busline', points: 1 },
  { a: 'j_lake', b: 'house_lake', kind: 'busline' },
];

const edges: TownEdge[] = EDGE_SPECS.map(makeEdge);

/* -------------------------------------------------------------- occupancy */

/**
 * The real sprite footprint for a location, anchored the same way the
 * renderer does. `FALLBACK_SIZES` only kicks in while a kind is still
 * genuinely falling back to the generic 64x50 house (exact match); once the
 * art catalogue grows a real generator for it, its true size is used
 * automatically.
 */
function realBox(l: LocSpec): Rect {
  const s = buildFromRef(l.pixel.kind, l.pixel.params);
  const fb = FALLBACK_SIZES[l.id];
  if (fb && s.width === 64 && s.height === 50) return { x: l.x - fb.w / 2, y: l.y - fb.h, w: fb.w, h: fb.h };
  return { x: l.x - s.anchorX, y: l.y - s.anchorY, w: s.width, h: s.height };
}

const BUILDING_BOXES: Rect[] = locSpecs.map(realBox);

const WATER: Rect[] = [
  { x: 95, y: 12, w: 55, h: 110 }, // river enters NW, clear of the lookout building
  { x: 35, y: 120, w: 75, h: 100 },
  { x: 40, y: 210, w: 80, h: 120 }, // the bridge crosses here, by the park
  { x: 50, y: 320, w: 30, h: 35 },
  { x: 600, y: 390, w: 150, h: 58 }, // the lake, SE, beside house_lake
];

/** Road polylines to keep decor off, tagged with a half-width to clear. */
const ROAD_POLYS: Array<{ pts: Pt[]; half: number }> = [...builtEdges.values()].map(({ edge, poly }) => ({
  pts: poly,
  half: edge.kind === 'highway' ? 9 : edge.kind === 'street' || edge.kind === 'busline' ? 6 : 3,
}));

function inCanvas(p: Pt, pad = 6): boolean {
  return p.x >= pad && p.x <= W - pad && p.y >= pad && p.y <= H - pad;
}

function onBuilding(p: Pt): boolean {
  return BUILDING_BOXES.some((b) => rectContains(p, b));
}

function onWater(p: Pt): boolean {
  return WATER.some((r) => rectContains(p, r));
}

function onRoad(p: Pt, clearance = 3): boolean {
  return ROAD_POLYS.some((r) => distToPolyline(p, r.pts) < r.half + clearance);
}

function isFree(p: Pt): boolean {
  return inCanvas(p) && !onBuilding(p) && !onWater(p) && !onRoad(p);
}

/** Nudge a hand-placed point to the nearest free spot, spiralling outward. */
function nearestFree(p: Pt, maxRadius = 48): Pt {
  if (isFree(p)) return p;
  for (let r = 4; r <= maxRadius; r += 4) {
    for (let a = 0; a < 360; a += 24) {
      const rad = (a * Math.PI) / 180;
      const cand = { x: p.x + Math.cos(rad) * r, y: p.y + Math.sin(rad) * r };
      if (isFree(cand)) return cand;
    }
  }
  return p;
}

/* ---------------------------------------------------------------- decor */

const decor: Decor[] = [];

for (const w of WATER) decor.push({ kind: 'water', x: w.x, y: w.y, w: w.w, h: w.h });

// a couple of plazas / grass accents for texture (area kinds), modest — most
// of the canvas is the default grass tile.
decor.push({ kind: 'plaza', x: 310, y: 230, w: 70, h: 46 });
decor.push({ kind: 'grass', x: 90, y: 165, w: 34, h: 46 });

function pushProp(kind: string, x: number, y: number): void {
  const p = nearestFree({ x, y });
  decor.push({ kind, x: Math.round(p.x), y: Math.round(p.y) });
}

// --- the river bridge, by j_west where the road meets the water's edge ---
decor.push({ kind: 'bridge', x: 108, y: 288 });

// --- the lake dock, beside house_lake ---
decor.push({ kind: 'dock', x: 650, y: 395 });

// --- lamps down the main street, every ~48px of arc length ---
const SPINE: [string, string][] = [
  ['j_west', 'j_center'],
  ['j_center', 'bus_depot'],
  ['bus_depot', 'newsstand'],
  ['newsstand', 'j_mc'],
  ['j_mc', 'clinic'],
  ['clinic', 'monolith'],
  ['monolith', 'cafe'],
];
let spinePts: Pt[] = [];
for (const [a, b] of SPINE) {
  const hit = builtEdges.get(edgeKey(a, b));
  if (hit) spinePts = spinePts.concat(hit.poly);
}
const lampSamples = resample(spinePts, 48);
lampSamples.forEach((p, i) => {
  // offset off the road shoulder, alternating sides; tangent from neighbours
  // in this same (already arc-ordered) sample list.
  const prev = lampSamples[i - 1] ?? p;
  const next = lampSamples[i + 1] ?? p;
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const side = i % 2 === 0 ? 1 : -1;
  pushProp('lamp', p.x + px * 10 * side, p.y + py * 10 * side);
});

// --- benches: park and downtown plaza ---
for (const [x, y] of [
  [100, 175],
  [50, 225],
  [350, 225],
  [290, 235],
] as const) {
  pushProp('bench', x, y);
}

// --- parked cars near the auto lot and along the shopping strip ---
for (const [kind, x, y] of [
  ['car_red', 730, 280],
  ['car_blue', 745, 240],
  ['car_green', 725, 300],
  ['car_red', 660, 290],
  ['car_blue', 610, 210],
  ['car_green', 600, 130],
] as const) {
  pushProp(kind, x, y);
}

// --- the bus, parked at the depot ---
pushProp('bus', 300, 215);

// --- signposts: the lookout and a couple of far junctions ---
for (const [x, y] of [
  [70, 110],
  [110, 400],
  [610, 88],
] as const) {
  pushProp('signpost', x, y);
}

// --- a hydrant and a mailbox or two downtown ---
pushProp('hydrant', 350, 220);
pushProp('hydrant', 500, 255);
pushProp('mailbox', 320, 235);
pushProp('mailbox', 480, 190);

// --- a fence around Hilltop Manor ---
for (const [kind, x, y] of [
  ['fence_h', 660, 10],
  ['fence_h', 750, 10],
  ['fence_h', 660, 90],
  ['fence_h', 750, 90],
  ['fence_v', 655, 30],
  ['fence_v', 655, 60],
  ['fence_v', 755, 30],
  ['fence_v', 755, 60],
] as const) {
  pushProp(kind, x, y);
}

// --- dense scatter: trees, bushes, flowers, rock, seeded and collision-free ---
const NATURE_KINDS = ['tree_round', 'tree_pine', 'tree_oak', 'bush', 'flowers', 'rock'] as const;
const NATURE_WEIGHTS = [4, 3, 1, 5, 4, 2]; // rough mix: lots of bush/tree_round/flowers, oak is a rare landmark
const weightTotal = NATURE_WEIGHTS.reduce((a, b) => a + b, 0);
function pickNatureKind(): string {
  let r = rng() * weightTotal;
  for (let i = 0; i < NATURE_KINDS.length; i++) {
    r -= NATURE_WEIGHTS[i]!;
    if (r <= 0) return NATURE_KINDS[i]!;
  }
  return NATURE_KINDS[0]!;
}

const SCATTER_TARGET = 96;
let scattered = 0;
let attempts = 0;
while (scattered < SCATTER_TARGET && attempts < SCATTER_TARGET * 40) {
  attempts++;
  const x = frange(rng, MARGIN + 4, W - MARGIN - 4);
  const y = frange(rng, MARGIN + 4, H - MARGIN - 4);
  const p = { x, y };
  if (!isFree(p)) continue;
  decor.push({ kind: pickNatureKind(), x: Math.round(x), y: Math.round(y) });
  scattered++;
}

/* ------------------------------------------------------------------ town */

const town: Town = {
  id: 'riverton',
  name: 'Riverton',
  startNode: 'bus_depot',
  nodes,
  edges,
  decor,
};

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(town, null, 2) + '\n');

const scatterCount = decor.filter((d) => NATURE_KINDS.includes(d.kind as (typeof NATURE_KINDS)[number])).length;
console.log(`Riverton written to ${OUT_FILE}`);
console.log(`  nodes: ${nodes.length} (${locSpecs.length} locations + ${JUNCTIONS.length} junctions)`);
console.log(`  edges: ${edges.length}`);
console.log(`  decor: ${decor.length} (${scatterCount} scattered nature, ${decor.length - scatterCount} structured/area)`);
console.log(`  scatter attempts used: ${attempts}`);
