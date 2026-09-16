/**
 * Street machinery: resolving a `StreetSpec` into a sampled polyline, finding
 * a point and tangent at an arc position, and the occupancy masks the building
 * placer queries.
 *
 * A side street never gets hand-placed endpoints. It declares a parent street
 * and a position on it (an arc length, or simply a point that is snapped to the
 * nearest arc position); the generator computes the junction, the parent's
 * tangent there and lays the first control point along the normal, so every
 * branch leaves its parent at ~90 degrees.
 */
import { type Pt, type Rect, sampleCurve } from '../geom';
import { H, HALF, type Attach, type Mark, type Street, type StreetSpec, W } from './spec';

export function add(a: Pt, b: Pt, k = 1): Pt {
  return { x: a.x + b.x * k, y: a.y + b.y * k };
}

export function unit(a: Pt): Pt {
  const len = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / len, y: a.y / len };
}

/** Left-hand normal of a tangent, flipped by `side` (-1 picks the other kerb). */
export function normalOf(tan: Pt, side: -1 | 1): Pt {
  return { x: -tan.y * side, y: tan.x * side };
}

export function inflate(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export const streets = new Map<string, Street>();

/** Arc position on `id` nearest to a point. */
export function sNearest(id: string, p: Pt): number {
  const st = streets.get(id);
  if (!st) throw new Error(`Unknown street ${id}`);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < st.poly.length; i++) {
    const q = st.poly[i]!;
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = st.cum[i]!;
    }
  }
  return best;
}

/** Resolve an arc position given either as a number or as a point on the street. */
export function arcOf(streetId: string, s: number | Pt): number {
  return typeof s === 'number' ? s : sNearest(streetId, s);
}

export function attachS(a: Attach): number {
  return arcOf(a.street, a.s);
}

export function markS(streetId: string, m: Mark): number {
  return arcOf(streetId, m.s);
}

export function streetAt(id: string, s: number): { p: Pt; tan: Pt } {
  const st = streets.get(id);
  if (!st) throw new Error(`Unknown street ${id}`);
  const want = Math.max(0, Math.min(st.len, s));
  let i = 1;
  while (i < st.cum.length - 1 && st.cum[i]! < want) i++;
  const a = st.poly[i - 1]!;
  const b = st.poly[i]!;
  const segLen = st.cum[i]! - st.cum[i - 1]! || 1;
  const t = (want - st.cum[i - 1]!) / segLen;
  const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  // Tangent over a short window so a single 3px sample never dominates.
  const lo = st.poly[Math.max(0, i - 4)]!;
  const hi = st.poly[Math.min(st.poly.length - 1, i + 3)]!;
  return { p, tan: unit({ x: hi.x - lo.x, y: hi.y - lo.y }) };
}

export function resolveStreet(spec: StreetSpec): Street {
  const wps: Pt[] = [];
  if (spec.start) {
    const { p, tan } = streetAt(spec.start.street, attachS(spec.start));
    wps.push(p, add(p, normalOf(tan, spec.start.side), spec.start.stub ?? 70));
  }
  for (const p of spec.pts ?? []) wps.push(p);
  if (spec.end) {
    const { p, tan } = streetAt(spec.end.street, attachS(spec.end));
    wps.push(add(p, normalOf(tan, spec.end.side), spec.end.stub ?? 70), p);
  }
  if (wps.length < 2) throw new Error(`Street ${spec.id} needs at least two waypoints`);
  const poly = sampleCurve(wps[0]!, wps.slice(1, -1), wps[wps.length - 1]!, 3);
  const cum = [0];
  for (let i = 1; i < poly.length; i++) {
    cum.push(cum[i - 1]! + Math.hypot(poly[i]!.x - poly[i - 1]!.x, poly[i]!.y - poly[i - 1]!.y));
  }
  return { id: spec.id, kind: spec.kind, spec, poly, cum, len: cum[cum.length - 1]! };
}

/** Build every street in order; later specs may attach to earlier ones. */
export function buildStreets(specs: StreetSpec[]): void {
  streets.clear();
  for (const spec of specs) streets.set(spec.id, resolveStreet(spec));
}

/**
 * A 1px occupancy bitmap plus a summed-area table, so "does this sprite box
 * stand on something?" is a constant-time query however many setbacks the
 * placement search tries.
 */
export function maskQuery(stamp: (mark: (x: number, y: number) => void) => void): (box: Rect) => boolean {
  const mask = new Uint8Array(W * H);
  stamp((x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    mask[y * W + x] = 1;
  });
  const sat = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let rowSum = 0;
    for (let x = 0; x < W; x++) {
      rowSum += mask[y * W + x]!;
      sat[(y + 1) * (W + 1) + (x + 1)] = sat[y * (W + 1) + (x + 1)]! + rowSum;
    }
  }
  return (box: Rect): boolean => {
    const x0 = Math.max(0, Math.floor(box.x));
    const y0 = Math.max(0, Math.floor(box.y));
    const x1 = Math.min(W, Math.ceil(box.x + box.w));
    const y1 = Math.min(H, Math.ceil(box.y + box.h));
    if (x1 <= x0 || y1 <= y0) return false;
    const total =
      sat[y1 * (W + 1) + x1]! - sat[y0 * (W + 1) + x1]! - sat[y1 * (W + 1) + x0]! + sat[y0 * (W + 1) + x0]!;
    return total > 0;
  };
}

/** Stamp a disc of radius `r` around every point of a polyline. */
export function stampPolyline(poly: Pt[], r: number, mark: (x: number, y: number) => void): void {
  for (const p of poly) {
    const x0 = Math.floor(p.x - r);
    const x1 = Math.ceil(p.x + r);
    const y0 = Math.floor(p.y - r);
    const y1 = Math.ceil(p.y + r);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if ((x - p.x) ** 2 + (y - p.y) ** 2 <= r * r) mark(x, y);
      }
    }
  }
}

/** Road corridors of every street, padded by `pad`. */
export function roadMask(pad: number): (box: Rect) => boolean {
  return maskQuery((mark) => {
    for (const st of streets.values()) stampPolyline(st.poly, HALF[st.kind] + pad, mark);
  });
}

/**
 * A per-pixel bitmask of which street covers it (one bit per street, in plan
 * order). The placer uses it to make sure the push off the kerb never crosses
 * ANOTHER road: a driveway that hops a street would read as a building on the
 * wrong side of town.
 */
export function streetBits(pad = 3): { bits: Uint16Array; index: Map<string, number> } {
  const bits = new Uint16Array(W * H);
  const index = new Map<string, number>();
  let i = 0;
  for (const st of streets.values()) {
    const bit = 1 << i;
    index.set(st.id, bit);
    stampPolyline(st.poly, HALF[st.kind] + pad, (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      bits[y * W + x]! | 0;
      bits[y * W + x] = bits[y * W + x]! | bit;
    });
    i++;
    if (i >= 16) throw new Error('streetBits supports at most 16 streets');
  }
  return { bits, index };
}
