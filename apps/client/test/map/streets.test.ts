import { describe, expect, it } from 'vitest';
import type { Town, TownEdge } from '@jones2/town';
import { PX_PER_UNIT } from '../../src/map/art';
import {
  arcLengths,
  buildStreetChains,
  chainSpan,
  chainsFor,
  samplePath,
  toPaths,
} from '../../src/map/streets';
import { edgePolyline, pointAlongEdge, poseAlongEdge } from '../../src/map/roads';

/**
 * A main street of three edges (one street id), a side street ending on it at
 * a T-junction, and a lone edge with no street id.
 */
const TOWN: Town = {
  id: 't',
  name: 'T',
  startNode: 'a',
  nodes: [
    { id: 'a', x: 0, y: 100 },
    { id: 'b', x: 100, y: 100 },
    { id: 'c', x: 200, y: 100 },
    { id: 'd', x: 300, y: 100 },
    { id: 's1', x: 100, y: 40 },
    { id: 's2', x: 120, y: 0 },
    { id: 'z1', x: 400, y: 0 },
    { id: 'z2', x: 460, y: 40 },
  ],
  edges: [
    { a: 'a', b: 'b', minutes: 5, kind: 'street', street: 'main' },
    { a: 'c', b: 'b', minutes: 5, kind: 'street', street: 'main', curve: [{ x: 150, y: 90 }] },
    { a: 'c', b: 'd', minutes: 5, kind: 'street', street: 'main' },
    { a: 'b', b: 's1', minutes: 4, kind: 'street', street: 'side' },
    { a: 's1', b: 's2', minutes: 4, kind: 'street', street: 'side' },
    { a: 'z1', b: 'z2', minutes: 4, kind: 'path' },
  ],
};

function chain(id: string) {
  const hit = buildStreetChains(TOWN).find((c) => c.nodes.includes(id) && c.street === 'main');
  if (!hit) throw new Error('no main chain');
  return hit;
}

describe('toPaths', () => {
  const edge = (a: string, b: string): TownEdge => ({ a, b, minutes: 1, kind: 'street' });

  it('orders a shuffled, mixed-direction group into one path', () => {
    const paths = toPaths([edge('c', 'd'), edge('b', 'a'), edge('b', 'c')]);
    expect(paths).toHaveLength(1);
    const nodes = [paths[0]![0]!.from, ...paths[0]!.map((s) => s.to)];
    // Either end may come first; what matters is that it is one ordered run.
    expect(nodes[0] === 'a' ? nodes : [...nodes].reverse()).toEqual(['a', 'b', 'c', 'd']);
    // Each step hands its `to` to the next step's `from`.
    for (let i = 1; i < paths[0]!.length; i++) {
      expect(paths[0]![i]!.from).toBe(paths[0]![i - 1]!.to);
    }
  });

  it('splits a branching group into maximal paths', () => {
    // a-b-c with a spur b-x: b has degree 3, so nothing may run through it.
    const paths = toPaths([edge('a', 'b'), edge('b', 'c'), edge('b', 'x')]);
    expect(paths).toHaveLength(3);
    for (const p of paths) expect(p).toHaveLength(1);
    // Every edge is used exactly once.
    expect(paths.flat().length).toBe(3);
  });

  it('keeps a ring in one path', () => {
    const paths = toPaths([edge('a', 'b'), edge('b', 'c'), edge('c', 'a')]);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toHaveLength(3);
  });

  it('uses every edge exactly once whatever the shape', () => {
    const edges = [edge('a', 'b'), edge('b', 'c'), edge('b', 'd'), edge('d', 'e'), edge('p', 'q')];
    const used = toPaths(edges).flat().map((s) => s.edge);
    expect(new Set(used).size).toBe(edges.length);
  });
});

describe('buildStreetChains', () => {
  const chains = buildStreetChains(TOWN);

  it('makes one chain per street plus one per loose edge', () => {
    expect(chains).toHaveLength(3);
    expect(chains.filter((c) => c.street === 'main')).toHaveLength(1);
    expect(chains.filter((c) => c.street === 'side')).toHaveLength(1);
    expect(chains.filter((c) => c.street === undefined)).toHaveLength(1);
  });

  it('orders the main street end to end despite a reversed edge', () => {
    expect(chain('a').nodes).toEqual(['a', 'b', 'c', 'd']);
  });

  it('carries the kind of its edges', () => {
    expect(chain('a').kind).toBe('street');
    expect(chains.find((c) => c.street === undefined)!.kind).toBe('path');
  });

  it('splits a street that branches, rather than guessing an order', () => {
    const branchy: Town = {
      ...TOWN,
      edges: [
        { a: 'a', b: 'b', minutes: 1, kind: 'street', street: 'x' },
        { a: 'b', b: 'c', minutes: 1, kind: 'street', street: 'x' },
        { a: 'b', b: 's1', minutes: 1, kind: 'street', street: 'x' },
      ],
    };
    const out = buildStreetChains(branchy);
    expect(out).toHaveLength(3);
    expect(new Set(out.map((c) => c.id)).size).toBe(3);
  });

  it('splits one street id where the kind changes', () => {
    const mixed: Town = {
      ...TOWN,
      edges: [
        { a: 'a', b: 'b', minutes: 1, kind: 'street', street: 'x' },
        { a: 'b', b: 'c', minutes: 1, kind: 'highway', street: 'x' },
      ],
    };
    const out = buildStreetChains(mixed);
    expect(out).toHaveLength(2);
    expect(out.map((c) => c.kind).sort()).toEqual(['highway', 'street']);
  });

  it('gives every chain a unique id', () => {
    const ids = buildStreetChains(TOWN).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('chain arc length', () => {
  const main = chain('a');

  it('is continuous: it never restarts at an interior node', () => {
    expect(main.acc[0]).toBe(0);
    for (let i = 1; i < main.acc.length; i++) {
      expect(main.acc[i]!).toBeGreaterThan(main.acc[i - 1]!);
    }
    // Spans tile the chain: each one starts where the last ended.
    for (let i = 1; i < main.spans.length; i++) {
      expect(main.spans[i]!.start).toBe(main.spans[i - 1]!.end);
    }
    expect(main.spans[0]!.start).toBe(0);
    expect(main.spans[main.spans.length - 1]!.end).toBe(main.pts.length - 1);
  });

  it('is at least the straight-line distance and no wilder than 1.5x it', () => {
    expect(main.length).toBeGreaterThanOrEqual(300);
    expect(main.length).toBeLessThan(450);
  });

  it('recomputes to the same numbers as arcLengths on the polyline', () => {
    const again = arcLengths(main.pts);
    expect(again[again.length - 1]).toBeCloseTo(main.length, 9);
  });

  it('puts every node at its authored position', () => {
    main.nodes.forEach((id, i) => {
      const idx = i === 0 ? main.spans[0]!.start : main.spans[i - 1]!.end;
      const node = TOWN.nodes.find((n) => n.id === id)!;
      expect(main.pts[idx]!.x).toBeCloseTo(node.x, 6);
      expect(main.pts[idx]!.y).toBeCloseTo(node.y, 6);
    });
  });

  it('samples about every 2 native px', () => {
    for (let i = 1; i < main.pts.length; i++) {
      const d = Math.hypot(main.pts[i]!.x - main.pts[i - 1]!.x, main.pts[i]!.y - main.pts[i - 1]!.y);
      expect(d * PX_PER_UNIT).toBeLessThan(4);
    }
  });
});

describe('samplePath', () => {
  it('reports the index of every control point, in order', () => {
    const ctrl = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ];
    const out = samplePath(ctrl);
    expect(out.ctrlIndex).toHaveLength(3);
    expect(out.ctrlIndex[0]).toBe(0);
    expect(out.ctrlIndex[2]).toBe(out.pts.length - 1);
    for (let i = 0; i < 3; i++) {
      expect(out.pts[out.ctrlIndex[i]!]!.x).toBeCloseTo(ctrl[i]!.x, 6);
    }
  });

  it('survives a repeated control point without losing the index', () => {
    const out = samplePath([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(out.ctrlIndex).toHaveLength(3);
    expect(out.ctrlIndex[0]).toBe(out.ctrlIndex[1]);
    for (let i = 1; i < out.pts.length; i++) {
      expect(out.pts[i]!.x).toBeGreaterThan(out.pts[i - 1]!.x);
    }
  });
});

describe('chainsFor', () => {
  it('is cached per town object', () => {
    expect(chainsFor(TOWN)).toBe(chainsFor(TOWN));
  });

  it('indexes every edge to the chain that draws it', () => {
    for (const edge of TOWN.edges) {
      const hit = chainSpan(TOWN, edge);
      expect(hit).toBeDefined();
      expect(hit!.span.edge).toBe(edge);
    }
  });
});

describe('walking a chained street', () => {
  it('still lands on the two nodes of an edge at t=0 and t=1', () => {
    for (const [from, to] of [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'b'],
      ['c', 'd'],
    ] as const) {
      const f = TOWN.nodes.find((n) => n.id === from)!;
      const t = TOWN.nodes.find((n) => n.id === to)!;
      const p0 = pointAlongEdge(TOWN, from, to, 0);
      const p1 = pointAlongEdge(TOWN, from, to, 1);
      expect(p0.x).toBeCloseTo(f.x, 6);
      expect(p0.y).toBeCloseTo(f.y, 6);
      expect(p1.x).toBeCloseTo(t.x, 6);
      expect(p1.y).toBeCloseTo(t.y, 6);
    }
  });

  it('follows the chain, not the straight line, on a chained edge', () => {
    // b-c carries a control point at y=90, so the middle must lift off y=100.
    expect(pointAlongEdge(TOWN, 'b', 'c', 0.5).y).toBeLessThan(96);
  });

  it('reverses cleanly', () => {
    const fwd = poseAlongEdge(TOWN, 'b', 'c', 0.3);
    const back = poseAlongEdge(TOWN, 'c', 'b', 0.7);
    expect(fwd.x).toBeCloseTo(back.x, 3);
    expect(fwd.y).toBeCloseTo(back.y, 3);
    expect(fwd.dx).toBeCloseTo(-back.dx, 3);
    expect(fwd.dy).toBeCloseTo(-back.dy, 3);
  });

  it('gives edgePolyline the chain samples, oriented from -> to', () => {
    const pts = edgePolyline(TOWN, 'b', 'c');
    expect(pts.length).toBeGreaterThan(2);
    expect(pts[0]!.x).toBeCloseTo(100, 6);
    expect(pts[pts.length - 1]!.x).toBeCloseTo(200, 6);
    expect(edgePolyline(TOWN, 'c', 'b')[0]!.x).toBeCloseTo(200, 6);
  });

  it('returns nothing for two nodes that are not joined', () => {
    expect(edgePolyline(TOWN, 'a', 'd')).toEqual([]);
  });
});
