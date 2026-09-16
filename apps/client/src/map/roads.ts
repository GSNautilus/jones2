/**
 * Roads that look like roads.
 *
 * Geometry lives in `streets.ts`: edges sharing a `street` id are joined into
 * ONE polyline (a `StreetChain`) with continuous arc length, so nothing ever
 * restarts at an intermediate junction. This file turns those chains into
 * pixels, in passes over ALL chains so overlaps compose:
 *
 *   1. asphalt         - every chain, widest kind first
 *   2. junction aprons - a disc plus corner fillets wherever chains meet
 *   3. curbs           - the OUTLINE of the asphalt mask, 1px
 *   4. centre dashes   - along chain arc length, suppressed near junctions
 *   5. bus overlay     - offset off the centreline, plus stop markers
 *
 * Curbs being the mask outline rather than two offset strokes is what makes a
 * T-junction read as one: a curb can only ever appear where asphalt meets
 * not-asphalt, so no curb or dash can cross a junction, and the corner fillets
 * turn the square notch where two strips cross into a rounded curb return.
 */
import type { NodeId, RoadKind, Town, TownNode } from '@jones2/town';
import { PX_PER_UNIT } from './art';
import type { Pt } from './camera';
import {
  type ChainSpan,
  type StreetChain,
  arcLengths,
  chainSpan,
  chainsFor,
  edgeControlPoints,
  findEdge,
  sampleEdge,
} from './streets';
import { type RenderPalette, type Surface, createSurface, disc, fillRect, put, strokeRect } from './surface';

export {
  arcLengths,
  buildStreetChains,
  chainSpan,
  chainsFor,
  edgeControlPoints,
  findEdge,
  sampleEdge,
  samplePath,
  type ChainSpan,
  type StreetChain,
} from './streets';

/* ------------------------------------------------- walking a road (poses) */

export interface EdgePose extends Pt {
  /** Unit tangent, pointing from `from` toward `to`. */
  dx: number;
  dy: number;
}

function straightPose(town: Town, from: NodeId, to: NodeId, t: number): EdgePose {
  const a = town.nodes.find((n) => n.id === from);
  const b = town.nodes.find((n) => n.id === to);
  if (!a || !b) return { x: 0, y: 0, dx: 1, dy: 0 };
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    dx: (b.x - a.x) / len,
    dy: (b.y - a.y) / len,
  };
}

/** Sample a chain between two of its sample indices, at arc-length fraction `t`. */
function alongSpan(chain: StreetChain, span: ChainSpan, forward: boolean, t: number): EdgePose {
  const { pts, acc } = chain;
  const i0 = span.start;
  const i1 = span.end;
  const s0 = acc[i0]!;
  const total = acc[i1]! - s0;
  const sign = forward ? 1 : -1;
  if (total <= 0) {
    const p = pts[i0]!;
    return { x: p.x, y: p.y, dx: sign, dy: 0 };
  }
  const target = forward ? s0 + t * total : acc[i1]! - t * total;
  let i = i0 + 1;
  while (i < i1 && acc[i]! < target) i++;
  const a = pts[i - 1]!;
  const b = pts[i]!;
  const span2 = acc[i]! - acc[i - 1]!;
  const local = span2 > 0 ? (target - acc[i - 1]!) / span2 : 0;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return {
    x: a.x + (b.x - a.x) * local,
    y: a.y + (b.y - a.y) * local,
    dx: (sign * (b.x - a.x)) / len,
    dy: (sign * (b.y - a.y)) / len,
  };
}

/**
 * Position and heading a fraction `t` (by ARC LENGTH, not parameter) along the
 * edge from `from` to `to`. Direction is respected: t=0 is at `from`, t=1 at
 * `to`, whichever way round the edge is stored. The sample comes off the CHAIN
 * the edge belongs to, restricted to that edge's span, so a figure crossing a
 * junction inside one street follows the same smooth line the road is drawn on.
 * Falls back to a straight lerp when the two nodes are not joined by an edge.
 */
export function poseAlongEdge(town: Town, from: NodeId, to: NodeId, t: number): EdgePose {
  const clamped = Math.max(0, Math.min(1, t));
  const edge = findEdge(town, from, to);
  if (!edge) return straightPose(town, from, to, clamped);
  const hit = chainSpan(town, edge);
  if (!hit) return straightPose(town, from, to, clamped);
  return alongSpan(hit.chain, hit.span, hit.span.from === from, clamped);
}

/** Point a fraction `t` (by arc length) along the edge from `from` to `to`. */
export function pointAlongEdge(town: Town, from: NodeId, to: NodeId, t: number): Pt {
  const p = poseAlongEdge(town, from, to, t);
  return { x: p.x, y: p.y };
}

/**
 * The drawn polyline for one edge, in town units, running from `from` to `to`.
 * This is the chain's own samples restricted to the edge, so a route overlay
 * sits exactly on the road. Falls back to the edge on its own.
 */
export function edgePolyline(town: Town, from: NodeId, to: NodeId): Pt[] {
  const edge = findEdge(town, from, to);
  if (!edge) return [];
  const hit = chainSpan(town, edge);
  if (!hit) {
    const pts = sampleEdge(town, edge);
    return edge.a === from ? pts : pts.slice().reverse();
  }
  const slice = hit.chain.pts.slice(hit.span.start, hit.span.end + 1);
  return hit.span.from === from ? slice : slice.reverse();
}

/** Compass direction of a tangent, for choosing a character sprite. */
export function facingOf(dx: number, dy: number): 'n' | 's' | 'e' | 'w' {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'e' : 'w';
  return dy >= 0 ? 's' : 'n';
}

/* --------------------------------------------------------------- painting */

export interface RoadStyle {
  /** Total width in native pixels, curbs included. */
  width: number;
  /** Dashed centre line down the middle. */
  centreLine: boolean;
  /** Two centre lines instead of one. */
  doubleLine?: boolean;
}

export const ROAD_STYLE: Record<RoadKind, RoadStyle> = {
  highway: { width: 18, centreLine: true, doubleLine: true },
  street: { width: 12, centreLine: true },
  path: { width: 6, centreLine: false },
  busline: { width: 0, centreLine: false },
};

/**
 * Streets first, then paths, then the HIGHWAY LAST. The highway never shares a
 * node with a walkable road — it is a barrier, crossed only at underpasses —
 * so painting it on top is exactly the grade separation the map means: the
 * street disappears under it and comes out the other side.
 */
const PAINT_ORDER: RoadKind[] = ['street', 'path', 'highway'];

/** Mask values. The mask is only ever read for its outline and its kind. */
const MASK: Record<RoadKind, number> = { path: 1, street: 2, highway: 3, busline: 0 };

/** Dash cycle of the centre line, in native pixels. */
const DASH = 6;
const GAP = 4;
/** Dashes stop this far short of a junction apron. */
const DASH_CLEARANCE = 4;
/** How far off the centreline the bus overlay rides. */
const BUS_OFFSET = 4;

export interface RoadColours {
  fill: number;
  dark: number;
  edge: number;
  centre: number;
  path: number;
  pathEdge: number;
  bus: number;
  busInk: number;
  busSign: number;
  busSignInk: number;
}

export function roadColours(pal: RenderPalette): RoadColours {
  return {
    fill: pal.index('road', [84, 84, 94]),
    dark: pal.index('roadDark', [66, 66, 76]),
    edge: pal.index('roadEdge', [122, 122, 132]),
    centre: pal.index('roadLine', [222, 190, 84]),
    path: pal.index('sand', [206, 176, 122]),
    pathEdge: pal.index('sandDark', [168, 138, 92]),
    bus: pal.index('glass', [142, 180, 200]),
    busInk: pal.index('ink', [34, 28, 42]),
    busSign: pal.index('blue', [70, 112, 176]),
    busSignInk: pal.index('white', [238, 236, 226]),
  };
}

function fillFor(kind: RoadKind, c: RoadColours): number {
  return kind === 'path' ? c.path : kind === 'highway' ? c.dark : c.fill;
}

/** Resample a native-pixel polyline to a fixed spacing so disc stamps overlap. */
export function densify(pts: Pt[], spacing = 1): Pt[] {
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

function stamp(s: Surface, pts: Pt[], radius: number, idx: number): void {
  if (radius < 0.5) {
    for (const p of pts) put(s, p.x, p.y, idx);
    return;
  }
  for (const p of pts) disc(s, p.x, p.y, radius, idx);
}

/* ------------------------------------------------------------- junctions */

interface Arm {
  chain: StreetChain;
  /** Unit direction leaving the node along this arm, in native pixels. */
  dx: number;
  dy: number;
  /** Half width of the arm's road, native pixels. */
  half: number;
}

export interface Junction {
  id: NodeId;
  /** Native world pixels. */
  x: number;
  y: number;
  arms: Arm[];
  /** Widest incident half width: the apron disc is flush with it. */
  half: number;
  /** How far the centre dashes must keep clear of the node. */
  radius: number;
  kind: RoadKind;
}

/**
 * Nodes where roads actually meet: three or more arms, or two arms belonging to
 * different chains (one street ending on another). A node in the middle of a
 * single chain is not a junction - the road just carries on through it.
 */
export function findJunctions(town: Town, chains: StreetChain[]): Junction[] {
  const arms = new Map<NodeId, Arm[]>();
  const seen = new Map<NodeId, Set<StreetChain>>();
  for (const chain of chains) {
    if (chain.kind === 'busline') continue;
    const half = ROAD_STYLE[chain.kind].width / 2;
    chain.nodes.forEach((id, i) => {
      const list = arms.get(id) ?? [];
      const chainsHere = seen.get(id) ?? new Set<StreetChain>();
      chainsHere.add(chain);
      const idx = i === 0 ? chain.spans[0]!.start : chain.spans[i - 1]!.end;
      if (i > 0) {
        const d = direction(chain.pts, idx, -1);
        if (d) list.push({ chain, dx: d.x, dy: d.y, half });
      }
      if (i < chain.nodes.length - 1) {
        const d = direction(chain.pts, idx, 1);
        if (d) list.push({ chain, dx: d.x, dy: d.y, half });
      }
      arms.set(id, list);
      seen.set(id, chainsHere);
    });
  }

  const out: Junction[] = [];
  for (const node of town.nodes) {
    const list = arms.get(node.id);
    if (!list || list.length < 2) continue;
    if (list.length === 2 && (seen.get(node.id)?.size ?? 1) < 2) continue;
    let widest: RoadKind = 'path';
    let half = 0;
    for (const a of list) {
      if (a.half > half) {
        half = a.half;
        widest = a.chain.kind;
      }
    }
    out.push({
      id: node.id,
      x: node.x * PX_PER_UNIT,
      y: node.y * PX_PER_UNIT,
      arms: list,
      half,
      radius: half + 2,
      kind: widest,
    });
  }
  return out;
}

/** Unit direction leaving `pts[idx]`, looking a few samples in `step`'s sense. */
function direction(pts: Pt[], idx: number, step: 1 | -1): Pt | null {
  const here = pts[idx];
  if (!here) return null;
  for (let k = 3; k <= 8; k++) {
    const p = pts[idx + step * k];
    if (!p) continue;
    const len = Math.hypot(p.x - here.x, p.y - here.y);
    if (len > 0.5) return { x: (p.x - here.x) / len, y: (p.y - here.y) / len };
  }
  const p = pts[idx + step];
  if (!p) return null;
  const len = Math.hypot(p.x - here.x, p.y - here.y) || 1;
  return { x: (p.x - here.x) / len, y: (p.y - here.y) / len };
}

/**
 * The apron at a junction: a disc that welds the arms together, plus a corner
 * fillet in each angular gap between neighbouring arms. The fillets are what
 * round the square notch two crossing strips leave behind, so the curb pass
 * traces a curb return rather than a right angle. Gaps near 180 degrees (a road
 * running straight through) get nothing, which is why a T-junction keeps a
 * straight kerb along the top of the through road.
 */
export function paintJunction(
  j: Junction,
  apron: (x: number, y: number, r: number) => void,
  pixel: (x: number, y: number) => void,
): void {
  apron(j.x, j.y, j.half);
  if (j.arms.length < 2) return;
  const angles = j.arms
    .map((a) => ({ a: Math.atan2(a.dy, a.dx), dx: a.dx, dy: a.dy, half: a.half }))
    .sort((p, q) => p.a - q.a);
  for (let i = 0; i < angles.length; i++) {
    const cur = angles[i]!;
    const next = angles[(i + 1) % angles.length]!;
    let gap = next.a - cur.a;
    if (gap <= 0) gap += Math.PI * 2;
    // Below ~50 degrees the corner is a long spike no fillet can improve;
    // above ~155 the road simply runs through and must stay straight, which is
    // what keeps the top kerb of a T-junction dead straight.
    if (gap < 0.9 || gap > 2.7) continue;

    // The two kerb lines bounding this gap, and where they cross.
    const n1x = -cur.dy;
    const n1y = cur.dx;
    const n2x = next.dy;
    const n2y = -next.dx;
    const det = n1x * n2y - n1y * n2x;
    if (Math.abs(det) < 1e-6) continue;
    const px = j.x + (cur.half * n2y - next.half * n1y) / det;
    const py = j.y + (n1x * next.half - n2x * cur.half) / det;

    // Fillet: the circle of radius r tangent to both kerbs, sitting in the
    // grass corner. It touches them `tangent` from the corner point.
    const r = Math.max(2, Math.min(5, Math.round(Math.min(cur.half, next.half) * 0.5)));
    const reach = r / Math.sin(gap / 2);
    const tangent = r / Math.tan(gap / 2);
    const cx = px + Math.cos(cur.a + gap / 2) * reach;
    const cy = py + Math.sin(cur.a + gap / 2) * reach;

    // Asphalt = the curvilinear triangle between the corner, the two tangent
    // points and the arc. That is exactly a kerb return: the square notch two
    // crossing strips leave behind becomes a curve.
    const box = Math.ceil(reach) + 1;
    for (let y = Math.floor(py - box); y <= Math.ceil(py + box); y++) {
      for (let x = Math.floor(px - box); x <= Math.ceil(px + box); x++) {
        const vx = x - px;
        const vy = y - py;
        if (cur.dx * vy - cur.dy * vx < -0.25) continue;
        if (vx * next.dy - vy * next.dx < -0.25) continue;
        const t1 = vx * cur.dx + vy * cur.dy;
        const t2 = vx * next.dx + vy * next.dy;
        if (t1 < -0.25 || t1 > tangent + 0.25) continue;
        if (t2 < -0.25 || t2 > tangent + 0.25) continue;
        if (Math.hypot(x - cx, y - cy) < r - 0.25) continue;
        pixel(x, y);
      }
    }
  }
}

/* ----------------------------------------------------------------- curbs */

/**
 * Trace the outline of the asphalt mask. A pixel is a curb when it is asphalt
 * and at least one of its four neighbours is not, which makes the curb exactly
 * 1px, continuous around rounded junction aprons, and impossible to draw across
 * a junction.
 */
export function drawCurbs(s: Surface, mask: Surface, c: RoadColours): void {
  const w = mask.width;
  const h = mask.height;
  const m = mask.pixels;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const v = m[row + x]!;
      if (v === 0) continue;
      const up = y > 0 ? m[row - w + x]! : 0;
      const dn = y < h - 1 ? m[row + w + x]! : 0;
      const lf = x > 0 ? m[row + x - 1]! : 0;
      const rt = x < w - 1 ? m[row + x + 1]! : 0;
      if (up && dn && lf && rt) continue;
      s.pixels[row + x] = v === MASK.path ? c.pathEdge : c.edge;
    }
  }
}

/* ------------------------------------------------------------- bus stops */

/** A 6x10 pole-and-sign marker, hand-drawn here so the art package stays put. */
export function drawBusStop(s: Surface, c: RoadColours, x: number, y: number): void {
  const bx = Math.round(x);
  const by = Math.round(y);
  // Pole: 4px under the sign, standing on (bx, by).
  for (let k = 0; k < 4; k++) put(s, bx, by - k, c.busInk);
  // Sign: 6x6, blue with an ink outline and a light bar for the route strip.
  fillRect(s, bx - 3, by - 9, 6, 6, c.busSign);
  strokeRect(s, bx - 3, by - 9, 6, 6, c.busInk);
  fillRect(s, bx - 2, by - 7, 4, 1, c.busSignInk);
  fillRect(s, bx - 2, by - 5, 3, 1, c.busSignInk);
}

/* ------------------------------------------------------------ the raster */

/** Painted geometry of one chain, in the surface's own pixel coordinates. */
interface Stroke {
  chain: StreetChain;
  /** ~0.5px spacing so offsets and dashes are gap-free. */
  pts: Pt[];
  /** Cumulative arc length along `pts`, native pixels, continuous. */
  acc: number[];
}

/**
 * Paint every road into a native-pixel surface. `offsetX/offsetY` are the
 * native-pixel coordinates of the surface's top-left corner. Called once per
 * static-layer rebuild; everything expensive happens here and nowhere else.
 */
export function drawRoads(
  s: Surface,
  town: Town,
  pal: RenderPalette,
  offsetX: number,
  offsetY: number,
): void {
  const c = roadColours(pal);
  const chains = chainsFor(town);
  const mask = createSurface(s.width, s.height);

  const strokes = new Map<StreetChain, Stroke>();
  for (const chain of chains) {
    const pts = densify(
      chain.pts.map((p) => ({ x: p.x * PX_PER_UNIT - offsetX, y: p.y * PX_PER_UNIT - offsetY })),
      0.5,
    );
    strokes.set(chain, { chain, pts, acc: arcLengths(pts) });
  }

  const roads = chains.filter((ch) => ch.kind !== 'busline');

  // 1. Asphalt, widest kind first, into the surface and the mask together.
  for (const kind of PAINT_ORDER) {
    const radius = ROAD_STYLE[kind].width / 2;
    for (const chain of roads) {
      if (chain.kind !== kind) continue;
      const pts = strokes.get(chain)!.pts;
      stamp(s, pts, radius, fillFor(kind, c));
      stamp(mask, pts, radius, MASK[kind]!);
    }
  }

  // 2. Junction aprons.
  const junctions = findJunctions(town, roads);
  for (const j of junctions) {
    const fill = fillFor(j.kind, c);
    const kindMask = MASK[j.kind]!;
    paintJunction(
      { ...j, x: j.x - offsetX, y: j.y - offsetY },
      (x, y, r) => {
        disc(s, x, y, r, fill);
        disc(mask, x, y, r, kindMask);
      },
      (x, y) => {
        put(s, x, y, fill);
        put(mask, x, y, kindMask);
      },
    );
  }

  // 3. Curbs: the outline of everything painted so far.
  drawCurbs(s, mask, c);

  // 4. Centre dashes, along chain arc length, cleared around junctions.
  const blockers = new Map<NodeId, number>();
  for (const j of junctions) blockers.set(j.id, j.radius + DASH_CLEARANCE);
  for (const chain of roads) {
    const style = ROAD_STYLE[chain.kind];
    if (!style.centreLine) continue;
    const stroke = strokes.get(chain)!;
    const blocked = blockedSpans(chain, blockers);
    dashCentre(s, stroke, blocked, style.doubleLine === true, c.centre);
  }

  // 5. Bus overlay: never on the centreline.
  const busChains = chains.filter((ch) => ch.kind === 'busline');
  for (const chain of busChains) drawBusLine(s, strokes.get(chain)!, c);
  for (const p of busStops(town, chains, junctions, strokes)) {
    drawBusStop(s, c, p.x - offsetX, p.y - offsetY);
  }
}

/** Arc-length windows on a chain that the centre line must skip. */
function blockedSpans(chain: StreetChain, blockers: Map<NodeId, number>): [number, number][] {
  const out: [number, number][] = [];
  chain.nodes.forEach((id, i) => {
    const clear = blockers.get(id);
    if (clear === undefined) return;
    const idx = i === 0 ? chain.spans[0]!.start : chain.spans[i - 1]!.end;
    const at = chain.acc[idx]! * PX_PER_UNIT;
    out.push([at - clear, at + clear]);
  });
  return out;
}

function isBlocked(spans: [number, number][], at: number): boolean {
  for (const [a, b] of spans) if (at >= a && at <= b) return true;
  return false;
}

function dashCentre(
  s: Surface,
  stroke: Stroke,
  blocked: [number, number][],
  double: boolean,
  idx: number,
): void {
  const { pts, acc } = stroke;
  const period = DASH + GAP;
  for (let i = 1; i < pts.length; i++) {
    const at = acc[i]!;
    if (at % period >= DASH - 0.5) continue;
    if (isBlocked(blocked, at)) continue;
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    if (!double) {
      put(s, b.x, b.y, idx);
      continue;
    }
    const nx = -((b.y - a.y) / len) * 1.5;
    const ny = ((b.x - a.x) / len) * 1.5;
    put(s, b.x + nx, b.y + ny, idx);
    put(s, b.x - nx, b.y - ny, idx);
  }
}

/** A thin dotted line riding one consistent side of the road it follows. */
function drawBusLine(s: Surface, stroke: Stroke, c: RoadColours): void {
  const { pts, acc } = stroke;
  for (let i = 1; i < pts.length; i++) {
    if (acc[i]! % 5 >= 1.5) continue;
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / len) * BUS_OFFSET;
    const ny = ((b.x - a.x) / len) * BUS_OFFSET;
    put(s, b.x + nx, b.y + ny, c.bus);
  }
}

/**
 * Where bus stop markers go: any node on a bus line that is either a place or a
 * junction. The marker stands clear of the asphalt, on the same side the dotted
 * overlay runs.
 */
function busStops(
  town: Town,
  chains: StreetChain[],
  junctions: Junction[],
  strokes: Map<StreetChain, Stroke>,
): Pt[] {
  const junctionClear = new Map<NodeId, number>(junctions.map((j) => [j.id, j.radius + 4]));
  const byId = new Map<NodeId, TownNode>(town.nodes.map((n) => [n.id, n]));
  const roadHalf = new Map<NodeId, number>();
  for (const chain of chains) {
    if (chain.kind === 'busline') continue;
    const half = ROAD_STYLE[chain.kind].width / 2;
    for (const id of chain.nodes) roadHalf.set(id, Math.max(roadHalf.get(id) ?? 0, half));
  }

  const out: Pt[] = [];
  const done = new Set<NodeId>();
  for (const chain of chains) {
    if (chain.kind !== 'busline') continue;
    chain.nodes.forEach((id, i) => {
      if (done.has(id)) return;
      const node = byId.get(id);
      if (!node) return;
      const clear = junctionClear.get(id);
      if (!node.location && clear === undefined) return;
      done.add(id);
      const idx = i === 0 ? chain.spans[0]!.start : chain.spans[i - 1]!.end;
      const dir = direction(chain.pts, idx, i === 0 ? 1 : -1) ?? { x: 1, y: 0 };
      const sign = i === 0 ? 1 : -1;
      const off = (roadHalf.get(id) ?? 5) + 5;
      // Sideways off the kerb, and - at a junction - back along the road so the
      // sign does not land in the middle of the crossing street. The pole base
      // sits 5px below the offset point so the 10px sign clears the asphalt.
      // `dir` always points INTO the chain, so the shift stays on the road.
      const back = clear ?? 0;
      out.push({
        x: node.x * PX_PER_UNIT + -dir.y * off * sign + dir.x * back,
        y: node.y * PX_PER_UNIT + dir.x * off * sign + dir.y * back + 5,
      });
    });
  }
  return out;
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
