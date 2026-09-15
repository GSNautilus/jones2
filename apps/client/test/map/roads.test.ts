import { describe, expect, it } from 'vitest';
import type { Town } from '@jones2/town';
import {
  arcLengths,
  edgeControlPoints,
  facingOf,
  pointAlongEdge,
  poseAlongEdge,
  sampleEdge,
} from '../../src/map/roads';

/** a --(straight)-- b, and a --(one control point)-- c. */
const TOWN: Town = {
  id: 't',
  name: 'T',
  startNode: 'a',
  nodes: [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 100, y: 0 },
    { id: 'c', x: 100, y: 0 },
    { id: 'd', x: 0, y: 80 },
  ],
  edges: [
    { a: 'a', b: 'b', minutes: 5, kind: 'street' },
    { a: 'a', b: 'c', minutes: 5, kind: 'street', curve: [{ x: 50, y: 30 }] },
    {
      a: 'a',
      b: 'd',
      minutes: 5,
      kind: 'street',
      curve: [
        { x: -20, y: 20 },
        { x: -20, y: 60 },
      ],
    },
  ],
};

const straight = TOWN.edges[0]!;
const curved = TOWN.edges[1]!;
const wiggly = TOWN.edges[2]!;

describe('edgeControlPoints', () => {
  it('runs a -> control points -> b', () => {
    expect(edgeControlPoints(TOWN, curved)).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 30 },
      { x: 100, y: 0 },
    ]);
  });
});

describe('sampleEdge', () => {
  it('starts at a and ends at b', () => {
    for (const edge of [straight, curved, wiggly]) {
      const pts = sampleEdge(TOWN, edge);
      expect(pts[0]).toEqual({ x: 0, y: 0 });
      const last = pts[pts.length - 1]!;
      const b = TOWN.nodes.find((n) => n.id === edge.b)!;
      expect(last.x).toBeCloseTo(b.x, 6);
      expect(last.y).toBeCloseTo(b.y, 6);
    }
  });

  it('passes exactly through every control point', () => {
    const pts = sampleEdge(TOWN, wiggly);
    for (const c of wiggly.curve!) {
      const hit = pts.some((p) => Math.abs(p.x - c.x) < 1e-6 && Math.abs(p.y - c.y) < 1e-6);
      expect(hit).toBe(true);
    }
  });

  it('has strictly increasing arc length', () => {
    for (const edge of [straight, curved, wiggly]) {
      const acc = arcLengths(sampleEdge(TOWN, edge));
      expect(acc[0]).toBe(0);
      for (let i = 1; i < acc.length; i++) expect(acc[i]!).toBeGreaterThan(acc[i - 1]!);
    }
  });

  it('is smooth: no sample turns a sharp corner', () => {
    const pts = sampleEdge(TOWN, wiggly);
    for (let i = 2; i < pts.length; i++) {
      const ax = pts[i - 1]!.x - pts[i - 2]!.x;
      const ay = pts[i - 1]!.y - pts[i - 2]!.y;
      const bx = pts[i]!.x - pts[i - 1]!.x;
      const by = pts[i]!.y - pts[i - 1]!.y;
      const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by));
      // 2px samples on a curve this size should never bend more than ~25 degrees.
      expect(cos).toBeGreaterThan(0.9);
    }
  });

  it('bulges toward the control point rather than cutting straight across', () => {
    const pts = sampleEdge(TOWN, curved);
    expect(Math.max(...pts.map((p) => p.y))).toBeGreaterThan(25);
  });

  it('honours an explicit sample count', () => {
    expect(sampleEdge(TOWN, straight, 11).length).toBe(11);
  });
});

describe('pointAlongEdge', () => {
  it('t=0 is at `from` and t=1 is at `to`', () => {
    for (const [from, to] of [
      ['a', 'c'],
      ['c', 'a'],
      ['a', 'd'],
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

  it('lands on the control point at the midpoint of a symmetric curve', () => {
    const mid = pointAlongEdge(TOWN, 'a', 'c', 0.5);
    expect(mid.x).toBeCloseTo(50, 1);
    expect(mid.y).toBeCloseTo(30, 1);
  });

  it('is symmetric under reversal', () => {
    const fwd = pointAlongEdge(TOWN, 'a', 'c', 0.25);
    const back = pointAlongEdge(TOWN, 'c', 'a', 0.75);
    expect(fwd.x).toBeCloseTo(back.x, 3);
    expect(fwd.y).toBeCloseTo(back.y, 3);
  });

  it('advances monotonically along the curve', () => {
    let prev = -1;
    for (let i = 0; i <= 10; i++) {
      const p = pointAlongEdge(TOWN, 'a', 'c', i / 10);
      expect(p.x).toBeGreaterThan(prev);
      prev = p.x;
    }
  });

  it('clamps out-of-range t', () => {
    expect(pointAlongEdge(TOWN, 'a', 'b', -1)).toEqual(pointAlongEdge(TOWN, 'a', 'b', 0));
    expect(pointAlongEdge(TOWN, 'a', 'b', 2)).toEqual(pointAlongEdge(TOWN, 'a', 'b', 1));
  });

  it('falls back to a straight line between unconnected nodes', () => {
    const p = pointAlongEdge(TOWN, 'b', 'd', 0.5);
    expect(p.x).toBeCloseTo(50, 6);
    expect(p.y).toBeCloseTo(40, 6);
  });
});

describe('poseAlongEdge', () => {
  it('reports a unit tangent pointing from -> to', () => {
    const p = poseAlongEdge(TOWN, 'a', 'b', 0.5);
    expect(Math.hypot(p.dx, p.dy)).toBeCloseTo(1, 6);
    expect(p.dx).toBeCloseTo(1, 6);
    expect(facingOf(p.dx, p.dy)).toBe('e');
  });

  it('flips the tangent when the edge is walked backwards', () => {
    const p = poseAlongEdge(TOWN, 'b', 'a', 0.5);
    expect(p.dx).toBeCloseTo(-1, 6);
    expect(facingOf(p.dx, p.dy)).toBe('w');
  });

  it('turns with the curve', () => {
    const early = poseAlongEdge(TOWN, 'a', 'c', 0.1);
    const late = poseAlongEdge(TOWN, 'a', 'c', 0.9);
    expect(early.dy).toBeGreaterThan(0);
    expect(late.dy).toBeLessThan(0);
  });
});

describe('facingOf', () => {
  it('picks the dominant axis', () => {
    expect(facingOf(0, 1)).toBe('s');
    expect(facingOf(0, -1)).toBe('n');
    expect(facingOf(1, 0.5)).toBe('e');
    expect(facingOf(-1, 0.5)).toBe('w');
  });
});
