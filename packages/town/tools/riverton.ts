/**
 * Generator for Riverton — the source of truth is this script, not the JSON.
 * Run it to rebuild `src/towns/riverton.json`:
 *
 *   npx tsx packages/town/tools/riverton.ts
 *
 * STREETS FIRST, and now WATER FIRST too. The plan (`riverton/plan.ts`) is
 * pure data: a meandering river and a lake authored as curves with a width, a
 * highway sweeping the other diagonal, and a dozen named streets. A side
 * street declares its parent and a point on it; the generator computes the
 * junction, the parent's tangent there and lays the first control point along
 * the normal, so every branch leaves at ~90 degrees.
 *
 * Buildings are placed ALONG streets: a location declares its street, an
 * arc-length address and a kerb, and the anchor is pushed out along the normal
 * until the REAL catalogue sprite box from `buildFromRef` clears every road
 * corridor, every water course and every building already placed.
 *
 * The graph falls out of that. Two crossing kinds are found automatically and
 * emitted as decor rather than as nodes:
 *   - a walkable road over a water course becomes a `bridge` (three of them);
 *     the highway's own span becomes a `viaduct`.
 *   - a street crossing the highway becomes an `underpass`. There is
 *     deliberately no junction there, so walkers can never step onto the
 *     highway — grade separation is automatic in a streets-first generator.
 *
 * `tools/overlaps.ts` must report zero problems, `tools/ladder.ts` prints the
 * hour table the scheme test checks, and `tools/preview.ts` renders
 * `art/sheets/riverton-graph.png` for eyeballing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildFromRef } from '../../pixelart/src/index';
import type { Decor, RoadKind, Town, TownEdge, TownNode } from '../src/types';
import { type Pt, type Rect, frange, mulberry32, resample, sampleCurve } from './geom';
import {
  attachS,
  buildStreets,
  inflate,
  markS,
  maskQuery,
  normalOf,
  rectsOverlap,
  roadMask,
  stampPolyline,
  streetAt,
  streetBits,
  streets,
  unit,
} from './riverton/curves';
import {
  AREAS,
  BENCHES,
  BUS_LINES,
  CARS,
  HEDGES,
  LAMPED,
  LOCATIONS,
  PICNIC,
  PONDS,
  STREETS,
  STREET_FURNITURE,
  WATER,
  WOODS,
} from './riverton/plan';
import { DRIVEWAY_MINUTES, H, HALF, MARGIN, MAX_GAP, PER_MINUTE, SETBACK, W, type LocSpec } from './riverton/spec';
import { type Crossing, buildCourses, inWater, roadCrossings, toWaterCourses, waterCrossings } from './riverton/water';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(HERE, '../src/towns/riverton.json');

const rng = mulberry32(20260916);

buildStreets(STREETS);
const courses = buildCourses(WATER);

/* ------------------------------------------------------------- occupancy */

const boxOnRoad = roadMask(6);
const pointNearRoad = roadMask(4);
const boxInWater = maskQuery((mark) => {
  for (const c of courses) stampPolyline(c.poly, c.width / 2 + 8, mark);
});
const { bits: ROAD_BITS, index: STREET_BIT } = streetBits();
/** Water as a point lookup, for walking a driveway out from the kerb. */
const WET = new Uint8Array(W * H);
for (const c of courses) {
  stampPolyline(c.poly, c.width / 2 + 4, (x, y) => {
    if (x >= 0 && y >= 0 && x < W && y < H) WET[y * W + x] = 1;
  });
}

/**
 * Does the push from the kerb to `t` cross water, somebody else's road, or a
 * building already standing? The driveway is drawn as a road, so anything it
 * would run through is a placement that has to be rejected.
 */
function blockedRay(p: Pt, n: Pt, t: number, ownBit: number): boolean {
  const x = Math.round(p.x + n.x * t);
  const y = Math.round(p.y + n.y * t);
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  if (WET[y * W + x]) return true;
  if ((ROAD_BITS[y * W + x]! & ~ownBit) !== 0) return true;
  return placed.some((q) => x >= q.box.x - 3 && x <= q.box.x + q.box.w + 3 && y >= q.box.y - 3 && y <= q.box.y + q.box.h + 3);
}

/**
 * Same test, along the whole driveway from `a` to `b`. The first stretch is
 * skipped: a driveway leaving a junction necessarily starts inside the apron
 * where every road meeting there overlaps.
 */
function segmentBlocked(a: Pt, b: Pt, ownBit: number, skip = 26): boolean {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len <= skip) return false;
  const n = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  for (let t = skip; t < len - 1; t += 3) {
    if (blockedRay(a, n, t, ownBit)) return true;
  }
  return false;
}

/* ---------------------------------------------- placing the real sprite box */

function spriteFor(l: LocSpec) {
  return buildFromRef(l.pixel.kind, l.pixel.params);
}

function boxAt(anchor: Pt, l: LocSpec): Rect {
  const s = spriteFor(l);
  return { x: anchor.x - s.anchorX, y: anchor.y - s.anchorY, w: s.width, h: s.height };
}

function boxInCanvas(box: Rect): boolean {
  return box.x >= 6 && box.y >= 6 && box.x + box.w <= W - 6 && box.y + box.h <= H - 6;
}

/** Longest a building may stand from its kerb. */
const MAX_PUSH = 170;

const placed: Array<{ id: string; box: Rect }> = [];
/** Driveways already laid, so a later building never lands under one. */
const drives: Array<{ a: Pt; b: Pt }> = [];
const warnings: string[] = [];

/** The building a driveway ends at, so a new driveway can be tested against it. */
function placedBoxOf(d: { a: Pt; b: Pt }): Rect {
  const hit = placed.find((q) => d.b.x >= q.box.x && d.b.x <= q.box.x + q.box.w && d.b.y >= q.box.y && d.b.y <= q.box.y + q.box.h);
  return hit ? hit.box : { x: d.b.x, y: d.b.y, w: 1, h: 1 };
}

/** Does a driveway run through a building's facade band, as the checker sees it? */
function driveHitsFacade(d: { a: Pt; b: Pt }, box: Rect, half = 8): boolean {
  const len = Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) || 1;
  const steps = Math.max(1, Math.ceil(len / 2));
  const top = box.y + box.h * 0.45;
  for (let k = 0; k <= steps; k++) {
    const x = d.a.x + ((d.b.x - d.a.x) * k) / steps;
    const y = d.a.y + ((d.b.y - d.a.y) * k) / steps;
    if (x >= box.x - half && x <= box.x + box.w + half && y >= top && y <= box.y + box.h) return true;
  }
  return false;
}
/** How far each building drifted from its authored address, and off the kerb. */
const drift: Array<{ id: string; street: string; want: number; got: number; push: number }> = [];

/**
 * Push the anchor out along the kerb normal until the real sprite box clears
 * every road corridor, every water course and every building already placed,
 * sliding the address along the street only if the straight push cannot be
 * made to work.
 */
function placeBuilding(l: LocSpec, s: number, origin?: Pt): { anchor: Pt; s: number } {
  const street = streets.get(l.street)!;
  // A building on a junction stands well back, so the little square in front
  // of it is open and the other driveways off that junction can pass.
  const base = l.at ? 76 : HALF[street.kind] + SETBACK;
  const ownBit = STREET_BIT.get(l.street) ?? 0;
  // A building hung straight off a named junction pays a flat driveway however
  // far along the street it ends up, so it may wander further to find room.
  const reach = l.at ? 150 : 120;
  const maxPush = l.at ? 200 : MAX_PUSH;
  const nudge = l.nudge ?? 0;
  const slides = [nudge];
  for (let d = 6; d <= reach; d += 6) slides.push(nudge + d, nudge - d);
  let fallback: { anchor: Pt; s: number } | null = null;
  for (const ds of slides) {
    const sAt = Math.max(8, Math.min(street.len - 8, s + ds));
    const at = streetAt(l.street, sAt);
    const n = normalOf(at.tan, l.side);
    for (let t = base; t <= maxPush; t += 2) {
      // Once the driveway would have to cross water or another road, no
      // greater setback on this bearing is legitimate either.
      if (!origin && blockedRay(at.p, n, t, ownBit)) break;
      const anchor = { x: Math.round(at.p.x + n.x * t), y: Math.round(at.p.y + n.y * t) };
      // A building hung off a junction is reached from the junction itself, so
      // it is that line, not the kerb normal, that must stay clear.
      if (origin && segmentBlocked(origin, anchor, ownBit)) continue;
      if (anchor.x < MARGIN || anchor.x > W - MARGIN || anchor.y < MARGIN || anchor.y > H - MARGIN) continue;
      const box = boxAt(anchor, l);
      if (!boxInCanvas(box)) continue;
      if (boxOnRoad(box)) continue;
      if (boxInWater(box)) continue;
      if (!fallback) fallback = { anchor, s: sAt };
      if (placed.some((q) => rectsOverlap(inflate(q.box, 5), box))) continue;
      if (drives.some((d) => driveHitsFacade(d, box))) continue;
      const from = origin ?? at.p;
      if (drives.some((d) => driveHitsFacade({ a: from, b: anchor }, placedBoxOf(d)))) continue;
      drift.push({ id: l.id, street: l.street, want: s, got: sAt, push: t });
      drives.push({ a: from, b: anchor });
      return { anchor, s: sAt };
    }
  }
  const at = streetAt(l.street, s);
  const n = normalOf(at.tan, l.side);
  warnings.push(
    `${l.id} on ${l.street}@${s} (${at.p.x.toFixed(0)},${at.p.y.toFixed(0)}, len ${street.len.toFixed(0)}) — no clear spot`,
  );
  return fallback ?? { anchor: { x: Math.round(at.p.x + n.x * base), y: Math.round(at.p.y + n.y * base) }, s };
}

/* ------------------------------------------------------------ street stops */

type StopKind = 'junction' | 'address' | 'waypoint';

interface Stop {
  s: number;
  node: string;
  kind: StopKind;
}

const stops = new Map<string, Stop[]>();
const nodePos = new Map<string, Pt>();
/** Junctions where two streets meet — the angle check and the signposts use these. */
const junctions = new Map<string, { parent: string; child: string; s: number }>();

for (const spec of STREETS) stops.set(spec.id, []);

function addStop(street: string, s: number, node: string, kind: StopKind): void {
  stops.get(street)!.push({ s, node, kind });
}

// 1. attachment junctions — one node shared by both streets
for (const spec of STREETS) {
  const st = streets.get(spec.id)!;
  if (spec.start) {
    const s = attachS(spec.start);
    nodePos.set(spec.start.id, streetAt(spec.start.street, s).p);
    addStop(spec.start.street, s, spec.start.id, 'junction');
    addStop(spec.id, 0, spec.start.id, 'junction');
    junctions.set(spec.start.id, { parent: spec.start.street, child: spec.id, s });
  } else {
    const id = `${spec.id}_w`;
    nodePos.set(id, st.poly[0]!);
    addStop(spec.id, 0, id, 'waypoint');
  }
  if (spec.end) {
    const s = attachS(spec.end);
    nodePos.set(spec.end.id, streetAt(spec.end.street, s).p);
    addStop(spec.end.street, s, spec.end.id, 'junction');
    addStop(spec.id, st.len, spec.end.id, 'junction');
    junctions.set(spec.end.id, { parent: spec.end.street, child: spec.id, s });
  } else {
    const id = `${spec.id}_e`;
    nodePos.set(id, st.poly[st.poly.length - 1]!);
    addStop(spec.id, st.len, id, 'waypoint');
  }
  for (const m of spec.marks ?? []) {
    const s = markS(spec.id, m);
    nodePos.set(m.id, streetAt(spec.id, s).p);
    addStop(spec.id, s, m.id, 'junction');
  }
}

// 2. one address node per location, then the building itself, off the kerb
interface PlacedLoc extends LocSpec {
  anchor: Pt;
  address: string;
}

const locNodes: PlacedLoc[] = [];

for (const l of LOCATIONS) {
  if (l.at) {
    const owner = stops.get(l.street)!.find((q) => q.node === l.at);
    if (!owner) throw new Error(`${l.id} attaches to ${l.at}, which is not a stop on ${l.street}`);
    const hit = placeBuilding(l, owner.s, nodePos.get(l.at));
    nodePos.set(l.id, hit.anchor);
    placed.push({ id: l.id, box: boxAt(hit.anchor, l) });
    locNodes.push({ ...l, anchor: hit.anchor, address: l.at });
    continue;
  }
  if (l.s === undefined) throw new Error(`${l.id} needs an address`);
  const hit = placeBuilding(l, l.s);
  const addressId = `a_${l.id}`;
  nodePos.set(addressId, streetAt(l.street, hit.s).p);
  addStop(l.street, hit.s, addressId, 'address');
  nodePos.set(l.id, hit.anchor);
  placed.push({ id: l.id, box: boxAt(hit.anchor, l) });
  locNodes.push({ ...l, anchor: hit.anchor, address: addressId });
}

// 3. tidy each street's stops: sort, merge near-duplicates, break long gaps
/** Stops swallowed by a neighbour, so driveways can follow them. */
const mergedTo = new Map<string, string>();

function resolveNode(id: string): string {
  let cur = id;
  const seen = new Set<string>();
  while (mergedTo.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    cur = mergedTo.get(cur)!;
  }
  return cur;
}

/** A waypoint node must not land in the river; slide it along the street. */
function dryArc(streetId: string, s: number, lo: number, hi: number): number {
  if (!inWater(courses, streetAt(streetId, s).p, 14)) return s;
  for (let d = 8; d <= 220; d += 8) {
    for (const cand of [s + d, s - d]) {
      if (cand <= lo + 6 || cand >= hi - 6) continue;
      if (!inWater(courses, streetAt(streetId, cand).p, 14)) return cand;
    }
  }
  return s;
}

for (const spec of STREETS) {
  const list = stops.get(spec.id)!;
  list.sort((a, b) => a.s - b.s);
  const merged: Stop[] = [];
  for (const stop of list) {
    const last = merged[merged.length - 1];
    if (last && stop.s - last.s < 24) {
      // Two stops that close would draw a stub edge; keep the more structural
      // one and point everything that referenced the other at it.
      if (last.kind === 'junction' || (last.kind === 'address' && stop.kind !== 'junction')) {
        mergedTo.set(stop.node, last.node);
        continue;
      }
      mergedTo.set(last.node, stop.node);
      merged.pop();
    }
    merged.push(stop);
  }
  const filled: Stop[] = [];
  for (let i = 0; i < merged.length; i++) {
    filled.push(merged[i]!);
    const next = merged[i + 1];
    if (!next) continue;
    const gap = next.s - merged[i]!.s;
    if (gap <= MAX_GAP) continue;
    const parts = Math.ceil(gap / MAX_GAP);
    for (let k = 1; k < parts; k++) {
      const want = merged[i]!.s + (gap * k) / parts;
      const s = dryArc(spec.id, want, merged[i]!.s, next.s);
      const id = `w_${spec.id}_${i}_${k}`;
      nodePos.set(id, streetAt(spec.id, s).p);
      filled.push({ s, node: id, kind: 'waypoint' });
    }
  }
  filled.sort((a, b) => a.s - b.s);
  stops.set(spec.id, filled);
}

/* ------------------------------------------------------------ nodes, edges */

const nodes: TownNode[] = [];
const seenNode = new Set<string>();

for (const l of locNodes) {
  nodes.push({ id: l.id, name: l.name, x: l.anchor.x, y: l.anchor.y, location: l.id, pixel: l.pixel });
  seenNode.add(l.id);
}
const usedJunctions = new Set<string>();
for (const list of stops.values()) for (const stop of list) usedJunctions.add(stop.node);
for (const [id, p] of nodePos) {
  if (seenNode.has(id) || !usedJunctions.has(id)) continue;
  nodes.push({ id, x: Math.round(p.x), y: Math.round(p.y) });
  seenNode.add(id);
}

const edges: TownEdge[] = [];
/** Sampled polyline per edge — the overlap report uses these. */
const edgePolys: Array<{ edge: TownEdge; poly: Pt[] }> = [];

function minutesFor(kind: RoadKind, length: number): number {
  return Math.max(2, Math.round(length / PER_MINUTE[kind]));
}

/** The street's own samples between two arc positions, thinned to control points. */
function curveBetween(streetId: string, s0: number, s1: number): Pt[] {
  const st = streets.get(streetId)!;
  const inner: Pt[] = [];
  for (let i = 1; i < st.poly.length - 1; i++) {
    if (st.cum[i]! <= s0 + 3 || st.cum[i]! >= s1 - 3) continue;
    inner.push(st.poly[i]!);
  }
  if (inner.length === 0) return [];
  const want = Math.max(1, Math.min(8, Math.round((s1 - s0) / 26)));
  const out: Pt[] = [];
  for (let k = 1; k <= want; k++) {
    const idx = Math.round(((inner.length - 1) * k) / (want + 1));
    const p = inner[idx]!;
    const last = out[out.length - 1];
    const q = { x: Math.round(p.x), y: Math.round(p.y) };
    if (!last || last.x !== q.x || last.y !== q.y) out.push(q);
  }
  return out;
}

function pushEdge(a: string, b: string, kind: RoadKind, streetId: string, curve: Pt[], length: number): TownEdge {
  const edge: TownEdge = { a, b, minutes: minutesFor(kind, length), kind, street: streetId };
  if (curve.length) edge.curve = curve;
  edges.push(edge);
  edgePolys.push({ edge, poly: sampleCurve(nodePos.get(a)!, curve, nodePos.get(b)!, 3) });
  return edge;
}

// spine edges: consecutive stops along each street
for (const spec of STREETS) {
  const list = stops.get(spec.id)!;
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1]!;
    const b = list[i]!;
    if (a.node === b.node) continue;
    pushEdge(a.node, b.node, spec.kind, spec.id, curveBetween(spec.id, a.s, b.s), b.s - a.s);
  }
}

// driveways: address node -> the building's door. Clamped, because how far a
// sprite had to be pushed off the kerb is an art problem, not a travel cost.
for (const l of locNodes) {
  l.address = resolveNode(l.address);
  const from = nodePos.get(l.address)!;
  const kind = streets.get(l.street)!.kind;
  const edge = pushEdge(l.address, l.id, kind, `dwy_${l.id}`, [], Math.hypot(l.anchor.x - from.x, l.anchor.y - from.y));
  edge.minutes = Math.max(DRIVEWAY_MINUTES[0], Math.min(DRIVEWAY_MINUTES[1], edge.minutes));
}

/* ------------------------------------------------------------- bus routes */

/** Cheapest walkable chain of nodes, used to lay bus lines over real streets. */
function walkPath(from: string, to: string): string[] {
  const adj = new Map<string, Array<{ to: string; minutes: number }>>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (e.kind !== 'street') continue;
    adj.get(e.a)!.push({ to: e.b, minutes: e.minutes });
    adj.get(e.b)!.push({ to: e.a, minutes: e.minutes });
  }
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const todo = new Set<string>(nodes.map((n) => n.id));
  while (todo.size) {
    let best: string | null = null;
    for (const id of todo) {
      const d = dist.get(id);
      if (d === undefined) continue;
      if (best === null || d < dist.get(best)!) best = id;
    }
    if (best === null) break;
    todo.delete(best);
    if (best === to) break;
    for (const step of adj.get(best) ?? []) {
      if (!todo.has(step.to)) continue;
      const alt = dist.get(best)! + step.minutes;
      if (dist.get(step.to) === undefined || alt < dist.get(step.to)!) {
        dist.set(step.to, alt);
        prev.set(step.to, best);
      }
    }
  }
  if (!dist.has(to)) throw new Error(`No street route from ${from} to ${to}`);
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]!)!);
  return path;
}

const edgeByPair = new Map<string, TownEdge>();
for (const e of edges) {
  edgeByPair.set(`${e.a}|${e.b}`, e);
  edgeByPair.set(`${e.b}|${e.a}`, e);
}

const busDone = new Set<string>();
/** Which line serves each stop, so a location's driveway joins the right route. */
const lineAtNode = new Map<string, string>();

function layBus(a: string, b: string, lineId: string): void {
  const key = `${a}|${b}`;
  if (busDone.has(key)) return;
  busDone.add(key);
  busDone.add(`${b}|${a}`);
  const base = edgeByPair.get(key)!;
  const edge: TownEdge = { a: base.a, b: base.b, minutes: base.minutes, kind: 'busline', street: lineId };
  if (base.curve) edge.curve = base.curve;
  edges.push(edge);
}

for (const line of BUS_LINES) {
  const path = walkPath('bus_depot', line.to);
  for (const node of path) if (!lineAtNode.has(node)) lineAtNode.set(node, line.id);
  for (let i = 1; i < path.length; i++) layBus(path[i - 1]!, path[i]!, line.id);
}

// The bus also pulls in at every building it drives past. Places off the lines
// — the bluff path, the ridge path — stay a walk or a drive.
for (const l of locNodes) {
  const lineId = lineAtNode.get(l.address);
  if (!lineId || streets.get(l.street)!.kind !== 'street') continue;
  layBus(l.address, l.id, lineId);
}

/* -------------------------------------------------------------- occupancy */

const BUILDING_BOXES: Rect[] = placed.map((p) => p.box);

function inCanvas(p: Pt, pad = 10): boolean {
  return p.x >= pad && p.x <= W - pad && p.y >= pad && p.y <= H - pad;
}

function onBuilding(p: Pt): boolean {
  return BUILDING_BOXES.some((b) => p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 4 && p.y <= b.y + b.h + 4);
}

function isFree(p: Pt): boolean {
  return (
    inCanvas(p) &&
    !pointNearRoad({ x: p.x, y: p.y, w: 1, h: 1 }) &&
    !onBuilding(p) &&
    !inWater(courses, p, 6) &&
    !inPond(p)
  );
}

function inPond(p: Pt): boolean {
  return PONDS.some(([x, y, w, h]) => p.x >= x - 4 && p.x <= x + w + 4 && p.y >= y - 4 && p.y <= y + h + 4);
}

function nearestFree(p: Pt, maxRadius = 64): Pt | null {
  if (isFree(p)) return p;
  for (let r = 4; r <= maxRadius; r += 4) {
    for (let a = 0; a < 360; a += 20) {
      const rad = (a * Math.PI) / 180;
      const cand = { x: p.x + Math.cos(rad) * r, y: p.y + Math.sin(rad) * r };
      if (isFree(cand)) return cand;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ decor */

const decor: Decor[] = [];

for (const [x, y, w, h] of PONDS) decor.push({ kind: 'water', x, y, w, h });
for (const a of AREAS) decor.push({ kind: a.kind, x: a.x, y: a.y, w: a.w, h: a.h });

function pushProp(kind: string, x: number, y: number): boolean {
  const p = nearestFree({ x, y });
  if (!p) return false;
  decor.push({ kind, x: Math.round(p.x), y: Math.round(p.y) });
  return true;
}

/* --------------------------------------------------- bridges and underpasses */

const highway = streets.get('highway')!;

function pushCrossing(kind: string, c: Crossing): void {
  decor.push({ kind, x: Math.round(c.x), y: Math.round(c.y), dir: { x: +c.dir.x.toFixed(4), y: +c.dir.y.toFixed(4) } });
}

let bridges = 0;
let viaducts = 0;
let underpasses = 0;
const crossingNotes: string[] = [];

for (const st of streets.values()) {
  for (const c of waterCrossings(st.poly, courses)) {
    if (st.kind === 'highway') {
      pushCrossing('viaduct', c);
      viaducts++;
    } else {
      pushCrossing('bridge', c);
      bridges++;
    }
    crossingNotes.push(`${st.kind === 'highway' ? 'viaduct' : 'bridge'} ${st.id} over ${c.other} at ${c.x.toFixed(0)},${c.y.toFixed(0)} (${c.span.toFixed(0)}px)`);
  }
  if (st.kind === 'highway') continue;
  for (const c of roadCrossings(st.poly, highway.poly, 'highway')) {
    pushCrossing('underpass', c);
    underpasses++;
    crossingNotes.push(`underpass ${st.id} under highway at ${c.x.toFixed(0)},${c.y.toFixed(0)}`);
  }
}

// --- the dock on the lake shore -------------------------------------------
pushProp('dock', 1640, 1022);

/** Lamp posts every ~52px down a street, alternating kerbs. */
function lampsAlong(streetId: string, spacing = 52): void {
  const st = streets.get(streetId)!;
  const samples = resample(st.poly, spacing);
  samples.forEach((p, i) => {
    const prev = samples[i - 1] ?? p;
    const next = samples[i + 1] ?? p;
    const n = normalOf(unit({ x: next.x - prev.x, y: next.y - prev.y }), i % 2 === 0 ? 1 : -1);
    pushProp('lamp', p.x + n.x * (HALF[st.kind] + 7), p.y + n.y * (HALF[st.kind] + 7));
  });
}

for (const id of LAMPED) lampsAlong(id);

/** Bushes threaded along a road shoulder — hedgerows, not a random scatter. */
function hedgeAlong(streetId: string, spacing: number, kind = 'bush'): void {
  const st = streets.get(streetId)!;
  const samples = resample(st.poly, spacing);
  samples.forEach((p, i) => {
    const prev = samples[i - 1] ?? p;
    const next = samples[i + 1] ?? p;
    const n = normalOf(unit({ x: next.x - prev.x, y: next.y - prev.y }), i % 3 === 0 ? -1 : 1);
    const off = HALF[st.kind] + frange(rng, 9, 18);
    pushProp(kind, p.x + n.x * off, p.y + n.y * off);
  });
}

for (const [id, spacing, kind] of HEDGES) hedgeAlong(id, spacing, kind);

let woodPieces = 0;
for (const cluster of WOODS) {
  for (let i = 0; i < cluster.n; i++) {
    const a = frange(rng, 0, Math.PI * 2);
    const r = cluster.r * Math.sqrt(rng());
    const kind = rng() < 0.55 ? 'tree_pine' : rng() < 0.6 ? 'tree_oak' : 'tree_round';
    if (pushProp(kind, cluster.x + Math.cos(a) * r, cluster.y + Math.sin(a) * r)) woodPieces++;
  }
}

for (const p of BENCHES) pushProp('bench', p.x, p.y);
for (const p of PICNIC) pushProp('picnic_table', p.x, p.y);
for (const [kind, x, y] of CARS) pushProp(kind, x, y);
for (const [kind, x, y] of STREET_FURNITURE) pushProp(kind, x, y);

// --- the bus, parked at the depot -----------------------------------------
{
  const depot = nodePos.get('bus_depot')!;
  pushProp('bus', depot.x + 66, depot.y + 10);
}

// --- signposts at the junctions -------------------------------------------
for (const id of junctions.keys()) {
  const p = nodePos.get(id);
  if (!p) continue;
  pushProp('signpost', p.x + frange(rng, -26, 26), p.y + frange(rng, -26, 26));
}

// --- a fence around Hilltop Manor -----------------------------------------
{
  const manor = nodePos.get('house_hill')!;
  for (let i = -2; i <= 2; i++) {
    pushProp('fence_h', manor.x + i * 22, manor.y - 78);
    pushProp('fence_h', manor.x + i * 22, manor.y + 16);
  }
  for (let i = -1; i <= 1; i++) {
    pushProp('fence_v', manor.x - 54, manor.y - 32 + i * 24);
    pushProp('fence_v', manor.x + 54, manor.y - 32 + i * 24);
  }
}

// --- flowers, rocks and scrub filling the remaining open ground -----------
const FILLERS = ['flowers', 'rock', 'bush', 'tree_round'] as const;
const FILLER_WEIGHTS = [5, 3, 4, 2];
const fillerTotal = FILLER_WEIGHTS.reduce((a, b) => a + b, 0);
function pickFiller(): string {
  let r = rng() * fillerTotal;
  for (let i = 0; i < FILLERS.length; i++) {
    r -= FILLER_WEIGHTS[i]!;
    if (r <= 0) return FILLERS[i]!;
  }
  return FILLERS[0]!;
}

const FILLER_TARGET = 170;
let fillers = 0;
let attempts = 0;
while (fillers < FILLER_TARGET && attempts < FILLER_TARGET * 80) {
  attempts++;
  const p = { x: frange(rng, MARGIN, W - MARGIN), y: frange(rng, MARGIN, H - MARGIN) };
  if (!isFree(p)) continue;
  decor.push({ kind: pickFiller(), x: Math.round(p.x), y: Math.round(p.y) });
  fillers++;
}

/* ------------------------------------------------------------------- town */

const town: Town = {
  id: 'riverton',
  name: 'Riverton',
  startNode: 'bus_depot',
  canvas: { w: W, h: H },
  nodes,
  edges,
  water: toWaterCourses(WATER),
  decor,
};

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(town, null, 2) + '\n');

const AREA_KINDS = new Set(['water', 'grass', 'plaza', 'path']);
const spine = edges.filter((e) => e.kind !== 'busline' && !e.street!.startsWith('dwy_'));
const spineMinutes = spine.map((e) => e.minutes).sort((a, b) => a - b);

console.log(`Riverton written to ${OUT_FILE}`);
console.log(`  canvas: ${W}x${H}`);
for (const st of streets.values()) {
  console.log(
    `    ${st.id.padEnd(14)} ${st.kind.padEnd(8)} len ${st.len.toFixed(0).padStart(5)}  stops ${stops.get(st.id)!.length}`,
  );
}
console.log(`  streets: ${STREETS.length} (+${new Set(BUS_LINES.map((b) => b.id)).size} bus lines, ${locNodes.length} driveways)`);
console.log(`  nodes: ${nodes.length} (${locNodes.length} locations + ${nodes.length - locNodes.length} junctions/waypoints)`);
console.log(`  edges: ${edges.length} (${spine.length} spine, ${locNodes.length} driveway, ${edges.filter((e) => e.kind === 'busline').length} busline)`);
console.log(`  water: ${WATER.length} courses, ${PONDS.length} ponds`);
console.log(`  crossings: ${bridges} bridges, ${viaducts} viaducts, ${underpasses} underpasses`);
for (const note of crossingNotes) console.log(`    ${note}`);
console.log(`  decor: ${decor.length} (${decor.filter((d) => !AREA_KINDS.has(d.kind)).length} props, ${woodPieces} in woods)`);
console.log(`  spine minutes: min ${spineMinutes[0]} median ${spineMinutes[Math.floor(spineMinutes.length / 2)]} max ${spineMinutes[spineMinutes.length - 1]}`);
const drifted = drift.filter((d) => Math.abs(d.got - d.want) > 40 || d.push > 90);
if (drifted.length) {
  console.log('  drift (authored address -> placed address, push off the kerb):');
  for (const d of drifted) {
    console.log(`    ${d.id.padEnd(18)} ${d.street.padEnd(12)} ${d.want.toFixed(0).padStart(5)} -> ${d.got.toFixed(0).padStart(5)}  push ${d.push}`);
  }
}
for (const w of warnings) console.log(`  WARN ${w}`);
