/**
 * Small geometry toolkit shared by the riverton generator and its preview
 * renderer. Pure, dependency-free, and deliberately mirrors the maths in
 * `apps/client/src/map/roads.ts` (`sampleEdge`) so a curve drawn here looks
 * the same as the one the client will eventually draw — without this
 * package depending on the client.
 */

export interface Pt {
  x: number;
  y: number;
}

/** Deterministic PRNG (mulberry32). Same seed -> same sequence, forever. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [lo, hi). */
export function frange(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

/** Pick a uniformly random element. */
export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length]!;
}

function catmullRom(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function dedupe(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 1e-9 && Math.abs(last.y - p.y) < 1e-9) continue;
    out.push(p);
  }
  return out.length >= 2 ? out : pts.slice(0, 2);
}

/**
 * Polyline through `a`, the curve control points, and `b` — a uniform
 * Catmull-Rom spline in town units (which are native pixels). Mirrors
 * `sampleEdge` in `apps/client/src/map/roads.ts`.
 */
export function sampleCurve(a: Pt, ctrl: Pt[], b: Pt, spacing = 3): Pt[] {
  const pts = [a, ...ctrl, b];
  const segCount = pts.length - 1;
  if (segCount <= 0) return pts;

  let total = 0;
  for (let i = 0; i < segCount; i++) {
    total += Math.hypot(pts[i + 1]!.x - pts[i]!.x, pts[i + 1]!.y - pts[i]!.y);
  }
  const wanted = Math.max(2, Math.round(total / spacing) + 1);
  const perSeg = Math.max(1, Math.min(256, Math.round((wanted - 1) / segCount)));

  if (segCount === 1) {
    const out: Pt[] = [];
    for (let i = 0; i <= perSeg; i++) {
      const t = i / perSeg;
      out.push({ x: pts[0]!.x + (pts[1]!.x - pts[0]!.x) * t, y: pts[0]!.y + (pts[1]!.y - pts[0]!.y) * t });
    }
    return dedupe(out);
  }

  const out: Pt[] = [pts[0]!];
  for (let i = 0; i < segCount; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? pts[i + 1]!;
    for (let k = 1; k <= perSeg; k++) out.push(catmullRom(p0, p1, p2, p3, k / perSeg));
  }
  return dedupe(out);
}

/** Total length of a polyline. */
export function polylineLength(pts: Pt[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  return total;
}

/** Points spaced roughly `spacing` apart along a polyline, by arc length. */
export function resample(pts: Pt[], spacing: number): Pt[] {
  const out: Pt[] = [];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen <= 0) continue;
    let travelled = carry;
    while (travelled < segLen) {
      const t = travelled / segLen;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      travelled += spacing;
    }
    carry = travelled - segLen;
  }
  return out;
}

/** Shortest distance from a point to a polyline (straight-segment approximation). */
export function distToPolyline(p: Pt, pts: Pt[]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    best = Math.min(best, distToSegment(p, pts[i - 1]!, pts[i]!));
  }
  return best;
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = a.x + dx * t;
  const py = a.y + dy * t;
  return Math.hypot(p.x - px, p.y - py);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectContains(p: Pt, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}
