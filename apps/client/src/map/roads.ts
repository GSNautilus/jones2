/**
 * Curvy roads.
 *
 * An edge is a polyline through `a`, its optional `curve` control points, and
 * `b`. With control points the polyline is a uniform Catmull-Rom spline that
 * passes exactly through every control point; without them it is a straight
 * subdivision. Figures walk the same polyline, so a figure on a bendy road
 * follows the bend (see `pointAlongEdge`).
 *
 * All the geometry here is in TOWN UNITS and pure - `sampleEdge` and
 * `pointAlongEdge` are unit-tested. Only `drawRoads` knows about pixels.
 */
import type { NodeId, RoadKind, Town, TownEdge } from '@jones2/town';
import { PX_PER_UNIT } from './art';
import type { Pt } from './camera';
import { type RenderPalette, type Surface, disc, put } from './surface';

/* -------------------------------------------------------------- geometry */

function nodePos(town: Town, id: NodeId): Pt {
  const n = town.nodes.find((x) => x.id === id);
  if (!n) throw new Error(`Unknown node ${id}`);
  return { x: n.x, y: n.y };
}

/** a, then the curve control points, then b - all in town units. */
export function edgeControlPoints(town: Town, edge: TownEdge): Pt[] {
  const pts: Pt[] = [nodePos(town, edge.a)];
  for (const c of edge.curve ?? []) pts.push({ x: c.x, y: c.y });
  pts.push(nodePos(town, edge.b));
  return pts;
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

/** Spacing between samples, in town units, that gives roughly 2 native px. */
const SAMPLE_SPACING = 2 / PX_PER_UNIT;

/**
 * Polyline for an edge, from `a` to `b`, in town units.
 *
 * Every control point is on the returned path exactly, and consecutive points
 * are roughly `SAMPLE_SPACING` apart, so cumulative arc length is strictly
 * increasing. `samples` overrides the total point count (useful in tests).
 */
export function sampleEdge(town: Town, edge: TownEdge, samples?: number): Pt[] {
  const ctrl = edgeControlPoints(town, edge);
  const segCount = ctrl.length - 1;
  if (segCount <= 0) return ctrl;

  let total = 0;
  for (let i = 0; i < segCount; i++) {
    total += Math.hypot(ctrl[i + 1]!.x - ctrl[i]!.x, ctrl[i + 1]!.y - ctrl[i]!.y);
  }
  const wanted = samples && samples >= 2 ? samples : Math.round(total / SAMPLE_SPACING) + 1;
  const perSeg = Math.max(1, Math.min(256, Math.round((wanted - 1) / segCount)));

  // Straight edge: a plain subdivision. Uniform Catmull-Rom over two points is
  // still straight but unevenly spaced, and there is no reason to pay for that.
  if (segCount === 1) {
    const a = ctrl[0]!;
    const b = ctrl[1]!;
    const out: Pt[] = [];
    for (let i = 0; i <= perSeg; i++) {
      const t = i / perSeg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    return dedupe(out);
  }

  const out: Pt[] = [ctrl[0]!];
  for (let i = 0; i < segCount; i++) {
    const p0 = ctrl[i - 1] ?? ctrl[i]!;
    const p1 = ctrl[i]!;
    const p2 = ctrl[i + 1]!;
    const p3 = ctrl[i + 2] ?? ctrl[i + 1]!;
    for (let k = 1; k <= perSeg; k++) out.push(catmullRom(p0, p1, p2, p3, k / perSeg));
  }
  return dedupe(out);
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

/** Cumulative arc length at every point of a polyline. Always starts at 0. */
export function arcLengths(pts: Pt[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) {
    out.push(out[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  }
  return out;
}

export function findEdge(town: Town, a: NodeId, b: NodeId): TownEdge | undefined {
  return town.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
}

export interface EdgePose extends Pt {
  /** Unit tangent, pointing from `from` toward `to`. */
  dx: number;
  dy: number;
}

/**
 * Position and heading a fraction `t` (by ARC LENGTH, not parameter) along the
 * edge from `from` to `to`. Direction is respected: t=0 is at `from`, t=1 at
 * `to`, whichever way round the edge is stored. Falls back to a straight lerp
 * when the two nodes are not joined by an edge.
 */
export function poseAlongEdge(town: Town, from: NodeId, to: NodeId, t: number): EdgePose {
  const edge = findEdge(town, from, to);
  const clamped = Math.max(0, Math.min(1, t));
  if (!edge) {
    const a = nodePos(town, from);
    const b = nodePos(town, to);
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return {
      x: a.x + (b.x - a.x) * clamped,
      y: a.y + (b.y - a.y) * clamped,
      dx: (b.x - a.x) / len,
      dy: (b.y - a.y) / len,
    };
  }
  let pts = sampleEdge(town, edge);
  if (edge.a !== from) pts = pts.slice().reverse();
  const acc = arcLengths(pts);
  const total = acc[acc.length - 1]!;
  if (total <= 0) return { x: pts[0]!.x, y: pts[0]!.y, dx: 1, dy: 0 };
  const target = clamped * total;

  let i = 1;
  while (i < acc.length - 1 && acc[i]! < target) i++;
  const a = pts[i - 1]!;
  const b = pts[i]!;
  const span = acc[i]! - acc[i - 1]!;
  const local = span > 0 ? (target - acc[i - 1]!) / span : 0;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return {
    x: a.x + (b.x - a.x) * local,
    y: a.y + (b.y - a.y) * local,
    dx: (b.x - a.x) / len,
    dy: (b.y - a.y) / len,
  };
}

/** Point a fraction `t` (by arc length) along the edge from `from` to `to`. */
export function pointAlongEdge(town: Town, from: NodeId, to: NodeId, t: number): Pt {
  const p = poseAlongEdge(town, from, to, t);
  return { x: p.x, y: p.y };
}

/** Compass direction of a tangent, for choosing a character sprite. */
export function facingOf(dx: number, dy: number): 'n' | 's' | 'e' | 'w' {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'e' : 'w';
  return dy >= 0 ? 's' : 'n';
}

/* --------------------------------------------------------------- painting */

export interface RoadStyle {
  /** Total width in native pixels, borders included. */
  width: number;
  /** Dashed centre line down the middle. */
  centreLine: boolean;
}

export const ROAD_STYLE: Record<RoadKind, RoadStyle> = {
  highway: { width: 18, centreLine: true },
  street: { width: 12, centreLine: true },
  path: { width: 6, centreLine: false },
  busline: { width: 0, centreLine: false },
};

/** Widest to narrowest: wider roads are laid down first. */
const PAINT_ORDER: RoadKind[] = ['highway', 'street', 'path'];

/** Resample a native-pixel polyline to ~1px spacing so disc stamps overlap. */
function densify(pts: Pt[], spacing = 1): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(len / spacing));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  const last = pts[pts.length - 1];
  if (last) out.push(last);
  return out;
}

export interface RoadColours {
  fill: number;
  dark: number;
  edge: number;
  centre: number;
  path: number;
  pathEdge: number;
  bus: number;
}

export function roadColours(pal: RenderPalette): RoadColours {
  return {
    fill: pal.index('road', [74, 78, 86]),
    dark: pal.index('roadDark', [56, 60, 67]),
    edge: pal.index('roadEdge', [109, 114, 123]),
    centre: pal.index('roadLine', [198, 202, 210]),
    path: pal.index('path', [184, 160, 106]),
    pathEdge: pal.index('pathDark', [154, 131, 84]),
    bus: pal.index('busline', [232, 194, 42]),
  };
}

function stamp(s: Surface, pts: Pt[], radius: number, idx: number): void {
  if (radius < 0.5) {
    for (const p of pts) put(s, p.x, p.y, idx);
    return;
  }
  for (const p of pts) disc(s, p.x, p.y, radius, idx);
}

/**
 * Paint every road into a native-pixel surface. `offsetX/offsetY` are the
 * native-pixel coordinates of the surface's top-left corner.
 *
 * Borders for all kinds go down first, then fills, then a disc at every node so
 * joins are solid, then centre lines, then the bus overlay. Painting in that
 * order means crossings and T-junctions never show a seam.
 */
export function drawRoads(
  s: Surface,
  town: Town,
  pal: RenderPalette,
  offsetX: number,
  offsetY: number,
): void {
  const c = roadColours(pal);
  const cache = new Map<TownEdge, Pt[]>();

  const nativePts = (edge: TownEdge): Pt[] => {
    let hit = cache.get(edge);
    if (!hit) {
      hit = densify(
        sampleEdge(town, edge).map((p) => ({
          x: p.x * PX_PER_UNIT - offsetX,
          y: p.y * PX_PER_UNIT - offsetY,
        })),
      );
      cache.set(edge, hit);
    }
    return hit;
  };

  const solid = town.edges.filter((e) => e.kind !== 'busline');

  // 1. Borders.
  for (const kind of PAINT_ORDER) {
    const style = ROAD_STYLE[kind];
    for (const edge of solid) {
      if (edge.kind !== kind) continue;
      stamp(s, nativePts(edge), style.width / 2, kind === 'path' ? c.pathEdge : c.edge);
    }
  }
  // 2. Fills.
  for (const kind of PAINT_ORDER) {
    const style = ROAD_STYLE[kind];
    for (const edge of solid) {
      if (edge.kind !== kind) continue;
      const fill = kind === 'path' ? c.path : kind === 'highway' ? c.dark : c.fill;
      stamp(s, nativePts(edge), style.width / 2 - 1, fill);
    }
  }

  // 3. Junction discs so differently sized roads meet cleanly.
  const widest = new Map<NodeId, RoadKind>();
  for (const edge of solid) {
    for (const id of [edge.a, edge.b]) {
      const cur = widest.get(id);
      if (!cur || ROAD_STYLE[edge.kind].width > ROAD_STYLE[cur].width) widest.set(id, edge.kind);
    }
  }
  for (const node of town.nodes) {
    const kind = widest.get(node.id);
    if (!kind) continue;
    const r = ROAD_STYLE[kind].width / 2;
    const x = node.x * PX_PER_UNIT - offsetX;
    const y = node.y * PX_PER_UNIT - offsetY;
    disc(s, x, y, r, kind === 'path' ? c.pathEdge : c.edge);
    disc(s, x, y, r - 1, kind === 'path' ? c.path : kind === 'highway' ? c.dark : c.fill);
  }

  // 4. Dashed centre lines, measured along arc length so curves dash evenly.
  for (const edge of solid) {
    if (!ROAD_STYLE[edge.kind].centreLine) continue;
    dashAlong(s, nativePts(edge), 6, 4, 0, (x, y) => put(s, x, y, c.centre));
  }

  // 5. Bus lines: a 2px dashed overlay riding on top of whatever road they share.
  for (const edge of town.edges) {
    if (edge.kind !== 'busline') continue;
    dashAlong(s, nativePts(edge), 5, 5, 2, (x, y) => {
      put(s, x, y, c.bus);
      put(s, x + 1, y, c.bus);
      put(s, x, y + 1, c.bus);
      put(s, x + 1, y + 1, c.bus);
    });
  }
}

/** Walk a densified polyline, calling `paint` only inside the dash part of the cycle. */
export function dashAlong(
  _s: Surface,
  pts: Pt[],
  dash: number,
  gap: number,
  phase: number,
  paint: (x: number, y: number) => void,
): void {
  const period = dash + gap;
  let travelled = phase;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    travelled += Math.hypot(b.x - a.x, b.y - a.y);
    if (travelled % period < dash) paint(b.x, b.y);
  }
}
