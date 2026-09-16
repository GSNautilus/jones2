/**
 * Water courses, authored the way a street is: a smooth curve through
 * waypoints with a drawn width. The generator rasterises them exactly like a
 * road corridor, so the same occupancy queries keep buildings out of the water
 * and the same run-detection finds where a road crosses — which is where the
 * bridges go.
 */
import { type Pt, sampleCurve } from '../geom';
import type { WaterCourse } from '../../src/types';
import type { WaterSpec } from './spec';

export interface Course {
  id: string;
  poly: Pt[];
  width: number;
}

export function buildCourses(specs: WaterSpec[]): Course[] {
  return specs.map((w) => ({
    id: w.id,
    poly: sampleCurve(w.points[0]!, w.points.slice(1, -1), w.points[w.points.length - 1]!, 3),
    width: w.width,
  }));
}

export function toWaterCourses(specs: WaterSpec[]): WaterCourse[] {
  return specs.map((w) => ({ id: w.id, points: w.points.map((p) => ({ x: p.x, y: p.y })), width: w.width }));
}

/** Distance from a point to a course's centreline. */
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
    const d = Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
    if (d < best) best = d;
  }
  return best;
}

/** True when the point lies in (or within `pad` of) any water course. */
export function inWater(courses: Course[], p: Pt, pad = 0): boolean {
  for (const c of courses) if (distToPoly(p, c.poly) <= c.width / 2 + pad) return true;
  return false;
}

export interface Crossing {
  /** Midpoint of the run, in town units. */
  x: number;
  y: number;
  /** Unit tangent of the crossing road there. */
  dir: { x: number; y: number };
  /** How long the run is, in pixels. */
  span: number;
  /** Which water course, or which road, was crossed. */
  other: string;
}

/**
 * Where a road polyline runs through water. Each contiguous run becomes one
 * crossing: a bridge deck at its midpoint, laid along the road's tangent.
 */
export function waterCrossings(poly: Pt[], courses: Course[], pad = 0): Crossing[] {
  const out: Crossing[] = [];
  for (const c of courses) {
    let run: number[] = [];
    const flush = (): void => {
      if (run.length >= 2) {
        const first = run[0]!;
        const last = run[run.length - 1]!;
        const mid = run[Math.floor(run.length / 2)]!;
        const a = poly[Math.max(0, first - 2)]!;
        const b = poly[Math.min(poly.length - 1, last + 2)]!;
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        let span = 0;
        for (let i = first + 1; i <= last; i++) {
          span += Math.hypot(poly[i]!.x - poly[i - 1]!.x, poly[i]!.y - poly[i - 1]!.y);
        }
        out.push({
          x: poly[mid]!.x,
          y: poly[mid]!.y,
          dir: { x: (b.x - a.x) / len, y: (b.y - a.y) / len },
          span,
          other: c.id,
        });
      }
      run = [];
    };
    for (let i = 0; i < poly.length; i++) {
      if (distToPoly(poly[i]!, c.poly) <= c.width / 2 + pad) run.push(i);
      else flush();
    }
    flush();
  }
  return out;
}

/**
 * Where two road polylines cross without sharing a node — a grade separation.
 * Used for street-under-highway underpasses, which deliberately get no
 * junction node so walkers can never step onto the highway.
 */
export function roadCrossings(poly: Pt[], other: Pt[], otherId: string): Crossing[] {
  const out: Crossing[] = [];
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1]!;
    const b = poly[i]!;
    for (let j = 1; j < other.length; j++) {
      const c = other[j - 1]!;
      const d = other[j]!;
      const hit = segmentHit(a, b, c, d);
      if (!hit) continue;
      const p = Math.max(0, i - 6);
      const q = Math.min(poly.length - 1, i + 6);
      const len = Math.hypot(poly[q]!.x - poly[p]!.x, poly[q]!.y - poly[p]!.y) || 1;
      out.push({
        x: hit.x,
        y: hit.y,
        dir: { x: (poly[q]!.x - poly[p]!.x) / len, y: (poly[q]!.y - poly[p]!.y) / len },
        span: 0,
        other: otherId,
      });
    }
  }
  // Two samples either side of the true crossing can both report; keep one.
  const merged: Crossing[] = [];
  for (const c of out) {
    if (merged.some((m) => Math.hypot(m.x - c.x, m.y - c.y) < 24)) continue;
    merged.push(c);
  }
  return merged;
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
