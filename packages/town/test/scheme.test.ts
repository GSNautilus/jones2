/**
 * TARGET TESTS for the river/highway map scheme (docs/PLAN.md §1, decided
 * 2026-09-16). Written before the map was rebuilt; they define what "the map
 * is right" means. They fail against the old Riverton and must pass once the
 * generator has been rewritten.
 *
 * The scheme: a river on one diagonal, a highway on the other, crossing near
 * the town bridge. Poor bank below the river (the bridgehead with the jobs
 * board, the mill district, the strip), rich bank above it (the high street
 * and uptown, the campus). The classic ruleset charges whole hours per trip
 * (see `routeHours`), so the map is tuned in hour bands, not minutes; the
 * trips that matter are listed in `tools/ladder-table.ts`.
 */
import { describe, expect, it } from 'vitest';
import { TownGraph, riverton, routeHours, type Town } from '../src';
import { DISTRICTS, LADDER } from '../tools/ladder-table';

const town = riverton as Town;
const g = new TownGraph(town);

const CANVAS = { w: 1920, h: 1152 };

/** The 13 classic locations by district, and the trips that must land in their hour. */
const WEDGES = DISTRICTS;
const CLASSIC = Object.values(WEDGES).flat();

const nodeOf = (loc: string) => {
  const n = g.nodeForLocation(loc);
  if (!n) throw new Error(`no node for location ${loc}`);
  return n;
};

describe('routeHours', () => {
  it('rounds minutes up to whole hours and never charges zero', () => {
    expect(routeHours(0)).toBe(1);
    expect(routeHours(1)).toBe(1);
    expect(routeHours(60)).toBe(1);
    expect(routeHours(61)).toBe(2);
    expect(routeHours(120)).toBe(2);
    expect(routeHours(121)).toBe(3);
  });
});

describe('scheme — canvas and water', () => {
  it('declares the 1920x1152 canvas and keeps every node inside it', () => {
    expect(town.canvas).toEqual(CANVAS);
    for (const n of town.nodes) {
      if (n.id.startsWith('exit_')) continue; // road stubs that leave the map on purpose
      expect(n.x, `${n.id}.x`).toBeGreaterThanOrEqual(0);
      expect(n.x, `${n.id}.x`).toBeLessThanOrEqual(CANVAS.w);
      expect(n.y, `${n.id}.y`).toBeGreaterThanOrEqual(0);
      expect(n.y, `${n.id}.y`).toBeLessThanOrEqual(CANVAS.h);
    }
  });

  it('has a river authored as a curve running top-left to bottom-right', () => {
    const river = (town.water ?? []).find((w) => w.id === 'river');
    expect(river, 'no water course with id "river"').toBeDefined();
    expect(river!.points.length, 'a meander needs several waypoints').toBeGreaterThanOrEqual(6);
    expect(river!.width).toBeGreaterThanOrEqual(24);
    const first = river!.points[0]!;
    const last = river!.points[river!.points.length - 1]!;
    // Enters near the top-left, leaves near the bottom-right.
    expect(first.x + first.y, 'river should start near the top-left corner').toBeLessThan(CANVAS.w * 0.35);
    expect(last.x + last.y, 'river should end near the bottom-right corner').toBeGreaterThan(CANVAS.w + CANVAS.h - CANVAS.w * 0.35);
  });

  it('the river is not a straight line', () => {
    const river = (town.water ?? []).find((w) => w.id === 'river')!;
    const a = river.points[0]!;
    const b = river.points[river.points.length - 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    let maxOff = 0;
    for (const p of river.points) {
      const off = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / len;
      maxOff = Math.max(maxOff, off);
    }
    expect(maxOff, 'the river should wander at least 80px off its chord').toBeGreaterThanOrEqual(80);
  });
});

describe('scheme — highway', () => {
  const highway = town.edges.filter((e) => e.kind === 'highway');

  it('runs bottom-left to top-right as one continuous road', () => {
    expect(highway.length, 'no highway edges').toBeGreaterThanOrEqual(4);
    const ids = new Set(highway.flatMap((e) => [e.a, e.b]));
    const pts = [...ids].map((id) => g.node(id));
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    expect(maxX - minX, 'highway should span most of the canvas').toBeGreaterThan(CANVAS.w * 0.7);
    const west = pts.reduce((a, b) => (a.x < b.x ? a : b));
    const east = pts.reduce((a, b) => (a.x > b.x ? a : b));
    expect(west.y, 'west end should be low (bottom-left)').toBeGreaterThan(east.y + CANVAS.h * 0.4);
  });

  it('is a barrier to walkers: no street shares a node with it except at ramps', () => {
    // Walkers may never reach a highway node from a street. A street that
    // merely crosses the highway gets an 'underpass' decor and no junction.
    const highwayNodes = new Set(highway.flatMap((e) => [e.a, e.b]));
    const streetNodes = new Set(town.edges.filter((e) => e.kind === 'street' || e.kind === 'path').flatMap((e) => [e.a, e.b]));
    const shared = [...highwayNodes].filter((n) => streetNodes.has(n));
    expect(shared, `walkable roads touch the highway at: ${shared.join(', ')}`).toHaveLength(0);
  });

  it('has about two underpasses per half, each oriented along its street', () => {
    const under = (town.decor ?? []).filter((d) => d.kind === 'underpass');
    expect(under.length).toBeGreaterThanOrEqual(3);
    expect(under.length).toBeLessThanOrEqual(6);
    for (const u of under) expect(u.dir, 'underpass needs a direction').toBeDefined();
  });
});

describe('scheme — bridges', () => {
  it('has three bridges over the river, each oriented along its road', () => {
    const bridges = (town.decor ?? []).filter((d) => d.kind === 'bridge');
    expect(bridges.length).toBe(3);
    for (const b of bridges) expect(b.dir, 'bridge needs a direction').toBeDefined();
  });
});

describe('scheme — locations by wedge', () => {
  it('places all thirteen classic locations, including the Rent Office', () => {
    for (const loc of CLASSIC) expect(g.nodeForLocation(loc), `no node for ${loc}`).toBeDefined();
  });

  it('starts everyone at the bus depot beside Low-Cost Housing', () => {
    expect(town.startNode).toBe('bus_depot');
    const r = g.route(town.startNode, nodeOf('lowcost').id, 'walk')!;
    expect(r.minutes, 'the depot should be a short walk from Low-Cost Housing').toBeLessThanOrEqual(60);
  });

  it('puts the jobs board and the burger bar on the poor bank at the town bridge', () => {
    const bridges = (town.decor ?? []).filter((d) => d.kind === 'bridge');
    for (const loc of WEDGES.bridgehead) {
      const p = nodeOf(loc);
      const nearest = Math.min(...bridges.map((b) => Math.hypot(b.x - p.x, b.y - p.y)));
      expect(nearest, `${loc} should stand within 320px of a bridge`).toBeLessThanOrEqual(320);
    }
  });

  it('puts the rich wedges above the river and the poor wedges below it', () => {
    // "Above" = on the top-right side of the river's chord (top-left to
    // bottom-right). The chord is a rough test; the meander is small
    // compared with wedge distances.
    const river = (town.water ?? []).find((w) => w.id === 'river')!;
    const a = river.points[0]!;
    const b = river.points[river.points.length - 1]!;
    const side = (p: { x: number; y: number }) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    for (const loc of [...WEDGES.uptown, ...WEDGES.campus]) {
      expect(side(nodeOf(loc)), `${loc} should be on the rich (north-east) side`).toBeLessThan(0);
    }
    for (const loc of [...WEDGES.bridgehead, ...WEDGES.mill, ...WEDGES.strip]) {
      expect(side(nodeOf(loc)), `${loc} should be on the poor (south-west) side`).toBeGreaterThan(0);
    }
  });
});

describe('scheme — the hour ladder', () => {
  it('every trip in the ladder table costs the hours it says', () => {
    const wrong: string[] = [];
    for (const [from, to, want] of LADDER) {
      const r = g.route(nodeOf(from).id, nodeOf(to).id, 'walk');
      if (!r) {
        wrong.push(`${from} -> ${to}: unreachable`);
        continue;
      }
      const got = routeHours(r.minutes);
      if (got !== want) wrong.push(`${from} -> ${to}: ${got}h (${r.minutes} min), wanted ${want}h`);
    }
    expect(wrong, `\n${wrong.join('\n')}`).toHaveLength(0);
  });

  it('no classic location is more than six hours from any other', () => {
    for (let i = 0; i < CLASSIC.length; i++) {
      for (let j = i + 1; j < CLASSIC.length; j++) {
        const r = g.route(nodeOf(CLASSIC[i]!).id, nodeOf(CLASSIC[j]!).id, 'walk')!;
        expect(routeHours(r.minutes), `${CLASSIC[i]} -> ${CLASSIC[j]} (${r.minutes} min)`).toBeLessThanOrEqual(6);
      }
    }
  });
});
