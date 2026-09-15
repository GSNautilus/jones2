/**
 * Checker for the generated town. Reports, using the REAL sprite sizes from
 * the art catalogue (dev-only cross-package import):
 *   - buildings whose footprints overlap
 *   - roads that cross an unrelated building's facade band
 *   - buildings that leave the canvas
 *   - near-crossings: two road chains that pass within 8px of each other
 *     without sharing a junction, which would read as an unmarked crossroads
 *   - edges with no `street` id
 *
 *   npx tsx packages/town/tools/overlaps.ts
 */
import { buildFromRef } from '../../pixelart/src/index';
import type { Town, TownEdge } from '../src/types';
import town from '../src/towns/riverton.json';
import { sampleCurve } from './geom';

interface Box { id: string; x: number; y: number; w: number; h: number }

const CANVAS_W = 1280;
const CANVAS_H = 768;
const NEAR = 8;

const T = town as Town;
const nodes = new Map(T.nodes.map((n) => [n.id, n]));

const boxes: Box[] = T.nodes
  .filter((n) => n.location)
  .map((n) => {
    const ref = n.pixel ?? { kind: n.location! };
    const s = buildFromRef(ref.kind, ref.params);
    return { id: n.id, x: n.x - s.anchorX, y: n.y - s.anchorY, w: s.width, h: s.height };
  });

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

let problems = 0;
for (let i = 0; i < boxes.length; i++) {
  for (let j = i + 1; j < boxes.length; j++) {
    const o = overlap(boxes[i]!, boxes[j]!);
    if (o > 0) {
      problems++;
      console.log(`OVERLAP ${boxes[i]!.id} x ${boxes[j]!.id}: ${o}px²`);
    }
  }
}

const HALF: Record<string, number> = { highway: 10, street: 7, path: 4, busline: 7 };

function edgePoly(e: TownEdge) {
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
}

for (const e of T.edges) {
  if (!e.street) {
    problems++;
    console.log(`NOSTREET ${e.a}-${e.b} (${e.kind}) has no street id`);
  }
}

/**
 * Near-crossings. Two road chains that come within 8px without sharing a
 * junction look like an unmarked crossroads. Edges of the same street, and
 * edges that meet at a node, are exempt; so are driveways against the street
 * they hang off, because a driveway legitimately runs up to the kerb.
 */
function segDist(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }): number {
  const dist = (p: { x: number; y: number }, u: { x: number; y: number }, v: { x: number; y: number }): number => {
    const dx = v.x - u.x;
    const dy = v.y - u.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - u.x, p.y - u.y);
    let t = ((p.x - u.x) * dx + (p.y - u.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (u.x + dx * t), p.y - (u.y + dy * t));
  };
  // segments cross?
  const cross = (p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }): number =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return 0;
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

console.log(problems ? `${problems} problems` : 'no overlaps, no roads through facades, no near-crossings, all in canvas');
