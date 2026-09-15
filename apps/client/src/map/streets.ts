/**
 * Street chains: the geometry layer under the road rasteriser.
 *
 * A road in the town JSON is a list of edges. Edges that share a `street` id
 * are ONE road: the renderer must stroke them as a single polyline so the
 * asphalt, the curbs and above all the dashed centre line run continuously
 * through the junctions in between. That is what a `StreetChain` is.
 *
 * Everything here is in TOWN UNITS and pure. The curve is a CENTRIPETAL
 * Catmull-Rom through the chain's control points (node, curve points, node,
 * curve points, ...), which unlike the uniform variant never cusps or loops
 * when consecutive control points are unevenly spaced - and a chain joining
 * several authored edges is exactly that case.
 */
import type { NodeId, RoadKind, Town, TownEdge } from '@jones2/town';
import { PX_PER_UNIT } from './art';
import type { Pt } from './camera';

/** Spacing between samples, in town units, that gives roughly 2 native px. */
export const SAMPLE_SPACING = 2 / PX_PER_UNIT;

/* ------------------------------------------------------------- primitives */

export function nodePos(town: Town, id: NodeId): Pt {
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

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Mirror `q` through `p`, giving a phantom control point for an open end. */
function reflect(p: Pt, q: Pt): Pt {
  return { x: 2 * p.x - q.x, y: 2 * p.y - q.y };
}

function knot(prev: number, p: Pt, q: Pt): number {
  return prev + Math.max(1e-6, Math.sqrt(Math.hypot(q.x - p.x, q.y - p.y)));
}

/**
 * Centripetal Catmull-Rom, evaluated between p1 and p2. `u` runs 0..1 and the
 * curve passes exactly through p1 at u=0 and p2 at u=1.
 */
export function centripetal(p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt {
  const t0 = 0;
  const t1 = knot(t0, p0, p1);
  const t2 = knot(t1, p1, p2);
  const t3 = knot(t2, p2, p3);
  const t = t1 + (t2 - t1) * u;
  const a1 = lerpPt(p0, p1, (t - t0) / (t1 - t0));
  const a2 = lerpPt(p1, p2, (t - t1) / (t2 - t1));
  const a3 = lerpPt(p2, p3, (t - t2) / (t3 - t2));
  const b1 = lerpPt(a1, a2, (t - t0) / (t2 - t0));
  const b2 = lerpPt(a2, a3, (t - t1) / (t3 - t1));
  return lerpPt(b1, b2, (t - t1) / (t2 - t1));
}

export interface SampledPath {
  pts: Pt[];
  /** `ctrlIndex[i]` is the index in `pts` of control point `i`. Same length as the input. */
  ctrlIndex: number[];
}

/**
 * Sample a control polyline. Consecutive samples are roughly `SAMPLE_SPACING`
 * apart unless `perSeg` forces a fixed count per control segment. Zero-length
 * control segments emit no points but still get an index, so `ctrlIndex` always
 * lines up with the input array.
 */
export function samplePath(ctrl: Pt[], perSeg?: number): SampledPath {
  if (ctrl.length === 0) return { pts: [], ctrlIndex: [] };
  if (ctrl.length === 1) return { pts: [ctrl[0]!], ctrlIndex: [0] };
  const pts: Pt[] = [ctrl[0]!];
  const ctrlIndex: number[] = [0];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p1 = ctrl[i]!;
    const p2 = ctrl[i + 1]!;
    const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (d < 1e-9) {
      ctrlIndex.push(pts.length - 1);
      continue;
    }
    const steps = perSeg && perSeg >= 1 ? perSeg : Math.max(1, Math.min(512, Math.round(d / SAMPLE_SPACING)));
    const before = ctrl[i - 1];
    const after = ctrl[i + 2];
    const p0 = before && Math.hypot(before.x - p1.x, before.y - p1.y) > 1e-9 ? before : reflect(p1, p2);
    const p3 = after && Math.hypot(after.x - p2.x, after.y - p2.y) > 1e-9 ? after : reflect(p2, p1);
    for (let k = 1; k <= steps; k++) pts.push(centripetal(p0, p1, p2, p3, k / steps));
    ctrlIndex.push(pts.length - 1);
  }
  return { pts, ctrlIndex };
}

/**
 * Polyline for a single edge, from `a` to `b`, in town units. Kept for callers
 * that want an edge on its own; the renderer and the figures use the chain the
 * edge belongs to (see `chainsFor`). `samples` overrides the point count.
 */
export function sampleEdge(town: Town, edge: TownEdge, samples?: number): Pt[] {
  const ctrl = edgeControlPoints(town, edge);
  const segCount = Math.max(1, ctrl.length - 1);
  const perSeg = samples && samples >= 2 ? Math.max(1, Math.round((samples - 1) / segCount)) : undefined;
  return samplePath(ctrl, perSeg).pts;
}

/* ----------------------------------------------------------------- chains */

/** One edge inside a chain, oriented the way the chain traverses it. */
export interface ChainSpan {
  edge: TownEdge;
  from: NodeId;
  to: NodeId;
  /** Index into `chain.pts` of `from`. */
  start: number;
  /** Index into `chain.pts` of `to`. */
  end: number;
}

export interface StreetChain {
  /** Stable, unique: the street id (plus a part number when split) or the edge index. */
  id: string;
  street?: string;
  kind: RoadKind;
  /** Nodes in traversal order; `nodes.length === spans.length + 1`. */
  nodes: NodeId[];
  spans: ChainSpan[];
  /** The whole road as one polyline, town units, ~2 native px apart. */
  pts: Pt[];
  /** Cumulative arc length along `pts`; continuous through every interior node. */
  acc: number[];
  length: number;
  /** True when the chain returns to its first node (a ring road). */
  closed: boolean;
}

interface Oriented {
  edge: TownEdge;
  from: NodeId;
  to: NodeId;
}

/**
 * Order a group of edges into maximal simple paths.
 *
 * A street is meant to be a path, but nothing stops an author from branching
 * one. A branch node (three or more edges of the same street) splits the group
 * rather than producing an arbitrary ordering, so every chain that comes out is
 * still a single continuous stroke.
 */
export function toPaths(edges: TownEdge[]): Oriented[][] {
  const inc = new Map<NodeId, number[]>();
  const push = (id: NodeId, i: number): void => {
    const list = inc.get(id);
    if (list) list.push(i);
    else inc.set(id, [i]);
  };
  edges.forEach((e, i) => {
    push(e.a, i);
    if (e.b !== e.a) push(e.b, i);
  });

  const used = new Set<number>();
  const walk = (startNode: NodeId, firstIdx: number): Oriented[] => {
    const path: Oriented[] = [];
    let node = startNode;
    let idx = firstIdx;
    for (;;) {
      used.add(idx);
      const edge = edges[idx]!;
      const to = edge.a === node ? edge.b : edge.a;
      path.push({ edge, from: node, to });
      node = to;
      const next = inc.get(node);
      // Stop at a dead end and at any branch: only a degree-2 node continues.
      if (!next || next.length !== 2) break;
      const step = next.find((i) => !used.has(i));
      if (step === undefined) break;
      idx = step;
    }
    return path;
  };

  const paths: Oriented[][] = [];
  for (const [node, idxs] of inc) {
    if (idxs.length === 2) continue;
    for (const i of idxs) if (!used.has(i)) paths.push(walk(node, i));
  }
  // Whatever is left is a closed ring; start it anywhere.
  for (let i = 0; i < edges.length; i++) {
    if (!used.has(i)) paths.push(walk(edges[i]!.a, i));
  }
  return paths;
}

function makeChain(town: Town, id: string, path: Oriented[]): StreetChain {
  const ctrl: Pt[] = [];
  const nodeCtrl: number[] = [];
  for (const step of path) {
    nodeCtrl.push(ctrl.length);
    ctrl.push(nodePos(town, step.from));
    const curve = step.edge.curve ?? [];
    const ordered = step.edge.a === step.from ? curve : [...curve].reverse();
    for (const c of ordered) ctrl.push({ x: c.x, y: c.y });
  }
  nodeCtrl.push(ctrl.length);
  ctrl.push(nodePos(town, path[path.length - 1]!.to));

  const sampled = samplePath(ctrl);
  const acc = arcLengths(sampled.pts);
  const spans: ChainSpan[] = path.map((step, i) => ({
    edge: step.edge,
    from: step.from,
    to: step.to,
    start: sampled.ctrlIndex[nodeCtrl[i]!]!,
    end: sampled.ctrlIndex[nodeCtrl[i + 1]!]!,
  }));
  const nodes = [path[0]!.from, ...path.map((s) => s.to)];
  return {
    id,
    street: path[0]!.edge.street,
    kind: path[0]!.edge.kind,
    nodes,
    spans,
    pts: sampled.pts,
    acc,
    length: acc[acc.length - 1] ?? 0,
    closed: nodes.length > 2 && nodes[0] === nodes[nodes.length - 1],
  };
}

/**
 * Every road in the town as one continuous polyline each.
 *
 * Edges are grouped by `street` id AND kind - a street that changes from
 * `street` to `highway` half way along is two chains, because the two halves
 * are different widths and cannot share one stroke. Edges without a street id
 * are a chain of one edge.
 */
export function buildStreetChains(town: Town): StreetChain[] {
  const groups = new Map<string, TownEdge[]>();
  town.edges.forEach((e, i) => {
    const key = e.street ? `s:${e.street}|${e.kind}` : `e:${i}`;
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  });

  const out: StreetChain[] = [];
  for (const [key, edges] of groups) {
    const paths = toPaths(edges);
    paths.forEach((path, i) => {
      if (path.length === 0) return;
      out.push(makeChain(town, paths.length > 1 ? `${key}#${i}` : key, path));
    });
  }
  return out;
}

/* ------------------------------------------------------------ chain cache */

interface ChainIndex {
  chains: StreetChain[];
  byEdge: Map<TownEdge, { chain: StreetChain; span: ChainSpan }>;
}

const CACHE = new WeakMap<Town, ChainIndex>();

function indexFor(town: Town): ChainIndex {
  let hit = CACHE.get(town);
  if (!hit) {
    const chains = buildStreetChains(town);
    const byEdge = new Map<TownEdge, { chain: StreetChain; span: ChainSpan }>();
    for (const chain of chains) {
      for (const span of chain.spans) if (!byEdge.has(span.edge)) byEdge.set(span.edge, { chain, span });
    }
    hit = { chains, byEdge };
    CACHE.set(town, hit);
  }
  return hit;
}

/** Chains for a town, built once per town object (the static layer rebuilds it). */
export function chainsFor(town: Town): StreetChain[] {
  return indexFor(town).chains;
}

/** The chain an edge belongs to, and its span inside it. */
export function chainSpan(town: Town, edge: TownEdge): { chain: StreetChain; span: ChainSpan } | undefined {
  return indexFor(town).byEdge.get(edge);
}
