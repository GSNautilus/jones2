/**
 * Checker for the generated town. Reports, using the REAL sprite sizes from
 * the art catalogue (dev-only cross-package import):
 *   - buildings whose footprints overlap
 *   - roads that cross an unrelated building's facade band
 *   - buildings that leave the canvas or stand in the water
 *   - roads in the water with no bridge (or, for the highway, no viaduct)
 *   - streets crossing the highway with no underpass prop, and any walkable
 *     road that shares a node with the highway (there are no ramps)
 *   - near-crossings: two road chains that pass within 8px of each other
 *     without sharing a junction, which would read as an unmarked crossroads.
 *     Highway pairs are exempt: the highway is grade separated everywhere.
 *   - edges with no `street` id
 *
 *   npx tsx packages/town/tools/overlaps.ts
 */
import { buildFromRef } from '../../pixelart/src/index';
import type { Town, TownEdge } from '../src/types';
import town from '../src/towns/riverton.json';
import { sampleCurve } from './geom';

interface Box { id: string; x: number; y: number; w: number; h: number }
interface Pt { x: number; y: number }

const T = town as unknown as Town;
const CANVAS_W = T.canvas?.w ?? 1920;
const CANVAS_H = T.canvas?.h ?? 1152;
const NEAR = 8;

const nodes = new Map(T.nodes.map((n) => [n.id, n]));

const boxes: Box[] = T.nodes
  .filter((n) => n.location)
  .map((n) => {
    const ref = n.pixel ?? { kind: n.location! };
    const s = buildFromRef(ref.kind, ref.params);
    return { id: n.id, x: n.x - s.anchorX, y: n.y - s.anchorY, w: s.width, h: s.height };
  });

/* ------------------------------------------------------------------ water */

const courses = (T.water ?? []).map((w) => ({
  id: w.id,
  half: w.width / 2,
  poly: sampleCurve(w.points[0]!, w.points.slice(1, -1), w.points[w.points.length - 1]!, 3),
}));

function distToPoly(p: Pt, poly: Pt[]): number {
  let best = Infinity;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1]!;
    const b = poly[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
  }
  return best;
}

/** Depth of a point into the water: positive inside the drawn channel. */
function intoWater(p: Pt): number {
  let deepest = -Infinity;
  for (const c of courses) deepest = Math.max(deepest, c.half - distToPoly(p, c.poly));
  return deepest;
}

let problems = 0;

for (let i = 0; i < boxes.length; i++) {
  for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i]!;
    const b = boxes[j]!;
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (w > 0 && h > 0) {
      problems++;
      console.log(`OVERLAP ${a.id} x ${b.id}: ${w * h}px²`);
    }
  }
}

const HALF: Record<string, number> = { highway: 10, street: 7, path: 4, busline: 7 };

function edgePoly(e: TownEdge): Pt[] {
  const a = nodes.get(e.a)!;
  const b = nodes.get(e.b)!;
  return sampleCurve({ x: a.x, y: a.y }, e.curve ?? [], { x: b.x, y: b.y }, 2);
}

const drawn = T.edges.filter((e) => e.kind !== 'busline');
const polys = drawn.map(edgePoly);

for (let i = 0; i < drawn.length; i++) {
  const e = drawn[i]!;
  const half = HALF[e.kind] ?? 7;
  for (const b of boxes) {
    if (b.id === e.a || b.id === e.b) continue;
    // Only the facade band matters visually; roads under the roof band read as "behind".
    const facadeTop = b.y + b.h * 0.45;
    const hit = polys[i]!.some(
      (p) => p.x >= b.x - half && p.x <= b.x + b.w + half && p.y >= facadeTop && p.y <= b.y + b.h,
    );
    if (hit) {
      problems++;
      console.log(`ROAD ${e.a}-${e.b} (${e.kind}) crosses ${b.id}`);
    }
  }
}

for (const b of boxes) {
  if (b.x < 4 || b.y < 4 || b.x + b.w > CANVAS_W - 4 || b.y + b.h > CANVAS_H - 4) {
    problems++;
    console.log(`EDGE ${b.id} leaves the canvas (${b.x},${b.y} ${b.w}x${b.h})`);
  }
  const corners: Pt[] = [
    { x: b.x, y: b.y + b.h },
    { x: b.x + b.w, y: b.y + b.h },
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w / 2, y: b.y + b.h / 2 },
  ];
  if (corners.some((p) => intoWater(p) > -4)) {
    problems++;
    console.log(`WET ${b.id} stands in the water (${b.x},${b.y} ${b.w}x${b.h})`);
  }
}

for (const e of T.edges) {
  if (!e.street) {
    problems++;
    console.log(`NOSTREET ${e.a}-${e.b} (${e.kind}) has no street id`);
  }
}

/* ------------------------------------------- water crossings need bridges */

const bridgeDecor = (T.decor ?? []).filter((d) => d.kind === 'bridge' || d.kind === 'viaduct');

for (let i = 0; i < drawn.length; i++) {
  const e = drawn[i]!;
  const want = e.kind === 'highway' ? 'viaduct' : 'bridge';
  let wettest: { p: Pt; depth: number } | null = null;
  for (const p of polys[i]!) {
    const d = intoWater(p);
    if (d > 0 && (!wettest || d > wettest.depth)) wettest = { p, depth: d };
  }
  if (!wettest) continue;
  const marked = bridgeDecor.some(
    (d) => d.kind === want && Math.hypot(d.x - wettest!.p.x, d.y - wettest!.p.y) < 60,
  );
  if (!marked) {
    problems++;
    console.log(
      `WATER ${e.a}-${e.b} (${e.kind}) runs through the water at ${wettest.p.x.toFixed(0)},${wettest.p.y.toFixed(0)} with no ${want}`,
    );
  }
}

/* ------------------------------ the highway is a barrier, not a crossroads */

const highwayNodes = new Set(T.edges.filter((e) => e.kind === 'highway').flatMap((e) => [e.a, e.b]));
for (const e of T.edges) {
  if (e.kind === 'highway' || e.kind === 'busline') continue;
  for (const id of [e.a, e.b]) {
    if (!highwayNodes.has(id)) continue;
    problems++;
    console.log(`RAMP ${e.a}-${e.b} (${e.kind}) touches the highway at ${id}`);
  }
}

function segmentHit(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const denom = r.x * s.y - r.y * s.x;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denom;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + r.x * t, y: a.y + r.y * t };
}

const highwayPolys = drawn.map((e, i) => (e.kind === 'highway' ? polys[i]! : null)).filter(Boolean) as Pt[][];
const underpasses = (T.decor ?? []).filter((d) => d.kind === 'underpass');

for (let i = 0; i < drawn.length; i++) {
  const e = drawn[i]!;
  if (e.kind === 'highway') continue;
  for (const hp of highwayPolys) {
    for (let m = 1; m < polys[i]!.length; m++) {
      let hit: Pt | null = null;
      for (let n = 1; n < hp.length && !hit; n++) {
        hit = segmentHit(polys[i]![m - 1]!, polys[i]![m]!, hp[n - 1]!, hp[n]!);
      }
      if (!hit) continue;
      const marked = underpasses.some((d) => Math.hypot(d.x - hit!.x, d.y - hit!.y) < 60);
      if (!marked) {
        problems++;
        console.log(
          `CROSS ${e.a}-${e.b} (${e.kind}) crosses the highway at ${hit.x.toFixed(0)},${hit.y.toFixed(0)} with no underpass`,
        );
      }
      break;
    }
  }
}

/**
 * Near-crossings. Two road chains that come within 8px without sharing a
 * junction look like an unmarked crossroads. Edges of the same street, and
 * edges that meet at a node, are exempt; so are driveways against the street
 * they hang off, because a driveway legitimately runs up to the kerb. So is
 * anything involving the highway, which is grade separated by construction.
 */
function segDist(a: Pt, b: Pt, c: Pt, d: Pt): number {
  const dist = (p: Pt, u: Pt, v: Pt): number => {
    const dx = v.x - u.x;
    const dy = v.y - u.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - u.x, p.y - u.y);
    let t = ((p.x - u.x) * dx + (p.y - u.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (u.x + dx * t), p.y - (u.y + dy * t));
  };
  const cross = (p: Pt, q: Pt, r: Pt): number => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  if (d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0) return 0;
  return Math.min(dist(a, c, d), dist(b, c, d), dist(c, a, b), dist(d, a, b));
}

/** Nodes shared by two edges, directly or through one hop, count as a junction. */
const touches = new Map<string, Set<string>>();
for (const e of drawn) {
  for (const id of [e.a, e.b]) {
    const set = touches.get(id) ?? new Set<string>();
    set.add(e.a);
    set.add(e.b);
    touches.set(id, set);
  }
}

function sharesJunction(a: TownEdge, b: TownEdge): boolean {
  if (a.a === b.a || a.a === b.b || a.b === b.a || a.b === b.b) return true;
  for (const x of [a.a, a.b]) {
    const near = touches.get(x);
    if (near && (near.has(b.a) || near.has(b.b))) return true;
  }
  return false;
}

for (let i = 0; i < drawn.length; i++) {
  for (let j = i + 1; j < drawn.length; j++) {
    const a = drawn[i]!;
    const b = drawn[j]!;
    if (a.kind === 'highway' || b.kind === 'highway') continue;
    if (a.street && a.street === b.street) continue;
    if (sharesJunction(a, b)) continue;
    const pa = polys[i]!;
    const pb = polys[j]!;
    const clear = (HALF[a.kind] ?? 7) + (HALF[b.kind] ?? 7) + NEAR;
    let best = Infinity;
    for (let m = 1; m < pa.length && best > 0; m++) {
      for (let n = 1; n < pb.length; n++) {
        const d = segDist(pa[m - 1]!, pa[m]!, pb[n - 1]!, pb[n]!);
        if (d < best) best = d;
        if (best === 0) break;
      }
    }
    if (best < clear) {
      problems++;
      console.log(
        `NEAR ${a.street ?? '?'} ${a.a}-${a.b} and ${b.street ?? '?'} ${b.a}-${b.b}: ${best.toFixed(1)}px apart (need ${clear})`,
      );
    }
  }
}

console.log(
  problems
    ? `${problems} problems`
    : 'no overlaps, nothing in the water, every crossing marked, no near-crossings, all in canvas',
);
