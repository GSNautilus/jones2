/**
 * TARGET TESTS for the river/highway map scheme (docs/PLAN.md §1, decided
 * 2026-09-16). Written before the map was rebuilt; they define what "the map
 * is right" means. They fail against the old Riverton and must pass once the
 * generator has been rewritten.
 *
 * The scheme: a river on one diagonal, a highway on the other, crossing at an
 * off-centre town centre. Four wedges: two poor (mill, strip) below the river,
 * two rich (uptown, campus) above it. The classic ruleset charges whole hours
 * per trip (see `routeHours`), so the map is tuned in hour bands, not minutes.
 */
import { describe, expect, it } from 'vitest';
import { TownGraph, riverton, routeHours, type Town } from '../src';

const town = riverton as Town;
const g = new TownGraph(town);

const CANVAS = { w: 1920, h: 1152 };

/** The 13 classic locations, by wedge. */
const WEDGES = {
  centre: ['employment', 'monolith', 'rent_office'],
  mill: ['factory', 'lowcost'],
  strip: ['zmart', 'blacks_market', 'pawn'],
  uptown: ['bank', 'qt_clothing', 'socket_city'],
  campus: ['university', 'security_apts'],
} as const;
type Wedge = keyof typeof WEDGES;
const CLASSIC = Object.values(WEDGES).flat();

/**
 * Expected walking hours between every pair of wedges. Symmetric. Within a
 * wedge everything is an hour apart. The rich side is an hour from the
 * centre, the poor side two; the two wedges of one half are two hours apart
 * through an underpass; crossing the river is three hours from anywhere.
 */
const HOURS: Record<Wedge, Record<Wedge, number>> = {
  centre: { centre: 1, mill: 2, strip: 2, uptown: 1, campus: 1 },
  mill: { centre: 2, mill: 1, strip: 2, uptown: 3, campus: 3 },
  strip: { centre: 2, mill: 2, strip: 1, uptown: 3, campus: 3 },
  uptown: { centre: 1, mill: 3, strip: 3, uptown: 1, campus: 2 },
  campus: { centre: 1, mill: 3, strip: 3, uptown: 2, campus: 1 },
};

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

  it('starts everyone at the centre', () => {
    const start = g.node(town.startNode);
    const centre = WEDGES.centre.map(nodeOf);
    for (const c of centre) {
      const r = g.route(start.id, c.id, 'walk')!;
      expect(routeHours(r.minutes), `${c.id} should be an hour from the start`).toBe(1);
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
    for (const loc of [...WEDGES.mill, ...WEDGES.strip]) {
      expect(side(nodeOf(loc)), `${loc} should be on the poor (south-west) side`).toBeGreaterThan(0);
    }
  });
});

describe('scheme — the hour ladder', () => {
  const wedgeOf = new Map<string, Wedge>();
  for (const [w, locs] of Object.entries(WEDGES)) for (const l of locs) wedgeOf.set(l, w as Wedge);

  it('every pair of classic locations costs the hours its wedges say', () => {
    const wrong: string[] = [];
    for (let i = 0; i < CLASSIC.length; i++) {
      for (let j = i + 1; j < CLASSIC.length; j++) {
        const from = CLASSIC[i]!;
        const to = CLASSIC[j]!;
        const r = g.route(nodeOf(from).id, nodeOf(to).id, 'walk');
        if (!r) {
          wrong.push(`${from} -> ${to}: unreachable`);
          continue;
        }
        const want = HOURS[wedgeOf.get(from)!][wedgeOf.get(to)!];
        const got = routeHours(r.minutes);
        if (got !== want) wrong.push(`${from} -> ${to}: ${got}h (${r.minutes} min), wanted ${want}h`);
      }
    }
    expect(wrong, `\n${wrong.join('\n')}`).toHaveLength(0);
  });

  it('the week can hold a commute: home to work and back within two hours on the poor side', () => {
    const r = g.route(nodeOf('lowcost').id, nodeOf('factory').id, 'walk')!;
    expect(routeHours(r.minutes)).toBe(1);
  });
});
