import type { NodeId, Route, Town, TownEdge, TransportMode, TransportProfile } from './types';

export const TRANSPORT: Record<TransportMode, TransportProfile> = {
  walk: { mode: 'walk', speed: 1.0, roads: ['street', 'path'], overhead: 0 },
  bike: { mode: 'bike', speed: 0.5, roads: ['street', 'path'], overhead: 2 },
  bus: { mode: 'bus', speed: 0.35, roads: ['busline'], overhead: 10 },
  car: { mode: 'car', speed: 0.25, roads: ['street', 'highway'], overhead: 5 },
};

/** Precomputed adjacency for fast repeated queries. */
export class TownGraph {
  readonly town: Town;
  private readonly adj = new Map<NodeId, { to: NodeId; edge: TownEdge }[]>();
  private readonly nodeIndex = new Map<NodeId, number>();
  private readonly cache = new Map<string, Route | null>();

  constructor(town: Town) {
    this.town = town;
    town.nodes.forEach((n, i) => {
      this.nodeIndex.set(n.id, i);
      this.adj.set(n.id, []);
    });
    for (const e of town.edges) {
      if (!this.adj.has(e.a) || !this.adj.has(e.b)) {
        throw new Error(`Edge references unknown node: ${e.a} - ${e.b}`);
      }
      this.adj.get(e.a)!.push({ to: e.b, edge: e });
      this.adj.get(e.b)!.push({ to: e.a, edge: e });
    }
  }

  hasNode(id: NodeId): boolean {
    return this.nodeIndex.has(id);
  }

  node(id: NodeId) {
    const i = this.nodeIndex.get(id);
    if (i === undefined) throw new Error(`Unknown node ${id}`);
    return this.town.nodes[i]!;
  }

  nodeForLocation(locationId: string) {
    return this.town.nodes.find((n) => n.location === locationId);
  }

  /**
   * Cheapest route for a transport mode. Walking is always allowed as a
   * fallback for modes that cannot reach the destination on their own roads,
   * but a single trip uses one mode (no mixed itineraries in v1).
   */
  route(from: NodeId, to: NodeId, mode: TransportMode): Route | null {
    const key = `${from}|${to}|${mode}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    const r = this.dijkstra(from, to, mode);
    this.cache.set(key, r);
    return r;
  }

  /** Best available route across the modes the player can use. */
  bestRoute(from: NodeId, to: NodeId, modes: TransportMode[]): Route | null {
    let best: Route | null = null;
    for (const m of modes) {
      const r = this.route(from, to, m);
      if (r && (!best || r.minutes < best.minutes)) best = r;
    }
    return best;
  }

  private dijkstra(from: NodeId, to: NodeId, mode: TransportMode): Route | null {
    if (from === to) return { from, to, mode, path: [from], minutes: 0 };
    const profile = TRANSPORT[mode];
    const allowed = new Set(profile.roads);
    const dist = new Map<NodeId, number>();
    const prev = new Map<NodeId, NodeId>();
    const done = new Set<NodeId>();
    dist.set(from, 0);
    // Small graph: a linear scan frontier is fine and keeps this dependency-free.
    const frontier: NodeId[] = [from];
    while (frontier.length) {
      let bi = 0;
      for (let i = 1; i < frontier.length; i++) {
        if (dist.get(frontier[i]!)! < dist.get(frontier[bi]!)!) bi = i;
      }
      const u = frontier.splice(bi, 1)[0]!;
      if (u === to) break;
      if (done.has(u)) continue;
      done.add(u);
      for (const { to: v, edge } of this.adj.get(u)!) {
        if (!allowed.has(edge.kind)) continue;
        const nd = dist.get(u)! + edge.minutes * profile.speed;
        if (nd < (dist.get(v) ?? Infinity)) {
          dist.set(v, nd);
          prev.set(v, u);
          if (!done.has(v)) frontier.push(v);
        }
      }
    }
    if (!dist.has(to)) return null;
    const path: NodeId[] = [to];
    let cur = to;
    while (cur !== from) {
      cur = prev.get(cur)!;
      path.push(cur);
    }
    path.reverse();
    const minutes = Math.round(dist.get(to)! + profile.overhead);
    return { from, to, mode, path, minutes };
  }
}
