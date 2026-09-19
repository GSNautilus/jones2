/**
 * The classic town: the original board as a ring. These are the facts the
 * generator (`tools/classic.ts`) must keep, taken from the original's screen
 * (art/reference/original/wiki_map.png) and the fan wiki's Locations page
 * ("a full lap around the entire board costing about 10 Hours"; the list is
 * "sorted by their position on the board, going clockwise from the very top").
 */
import { classic as classicRules } from '@jones2/sim';
import { describe, expect, it } from 'vitest';
import { TownGraph, classic, routeHours, travelHourMultiplier, type Town } from '../src';

const town = classic as Town;
const g = new TownGraph(town);
const CLASSIC_IDS = Object.keys(classicRules.CLASSIC_LOCATIONS);

/** Clockwise from the top-left corner, as the original board reads. */
const CLOCKWISE = [
  'security_apts',
  'rent_office',
  'lowcost',
  'pawn',
  'zmart',
  'monolith',
  'qt_clothing',
  'socket_city',
  'university',
  'employment',
  'factory',
  'bank',
  'blacks_market',
];

describe('classic — exactly the original thirteen', () => {
  it('has one node per classic location and nothing else', () => {
    expect(town.nodes.map((n) => n.location).sort()).toEqual([...CLASSIC_IDS].sort());
    expect(town.nodes).toHaveLength(13);
    for (const n of town.nodes) expect(n.id, 'node ids double as location ids (the sim sends players home by location id)').toBe(n.location);
  });

  it('runs clockwise from Security Apartments at the top-left', () => {
    expect(town.nodes.map((n) => n.id)).toEqual(CLOCKWISE);
    // and each edge joins a node to the next one round the ring
    for (let i = 0; i < CLOCKWISE.length; i++) {
      const e = town.edges[i]!;
      expect([e.a, e.b]).toEqual([CLOCKWISE[i], CLOCKWISE[(i + 1) % CLOCKWISE.length]]);
    }
  });

  it('is a single ring: every node has two neighbours and every edge is on it', () => {
    const degree = new Map<string, number>();
    for (const e of town.edges) {
      degree.set(e.a, (degree.get(e.a) ?? 0) + 1);
      degree.set(e.b, (degree.get(e.b) ?? 0) + 1);
    }
    expect(town.edges).toHaveLength(13);
    for (const n of town.nodes) expect(degree.get(n.id), `${n.id} degree`).toBe(2);
    for (const e of town.edges) {
      expect(e.kind).toBe('path');
      expect(e.street).toBe('ring');
    }
  });

  it('starts everyone at their apartment, Low-Cost Housing', () => {
    expect(town.startNode).toBe('lowcost');
  });
});

describe('classic — travel is the original’s', () => {
  it('a full lap is about ten hours', () => {
    const lap = town.edges.reduce((s, e) => s + e.minutes, 0);
    expect(lap).toBeGreaterThanOrEqual(595);
    expect(lap).toBeLessThanOrEqual(605);
  });

  it('charges its hours once, not doubled like Riverton', () => {
    expect(travelHourMultiplier(town)).toBe(1);
  });

  it('a hop to the next building is one hour, except across the clock at the bottom', () => {
    for (const e of town.edges) {
      const across = e.a === 'university' && e.b === 'employment';
      expect(routeHours(e.minutes), `${e.a} -> ${e.b} (${e.minutes} min)`).toBe(across ? 2 : 1);
    }
  });

  it('the far side of the board is five hours, never more', () => {
    let worst = 0;
    for (const a of town.nodes) {
      for (const b of town.nodes) {
        if (a === b) continue;
        const r = g.route(a.id, b.id, 'walk');
        expect(r, `${a.id} -> ${b.id}`).not.toBeNull();
        worst = Math.max(worst, routeHours(r!.minutes));
      }
    }
    expect(worst).toBe(5);
  });

  it('goes the short way round', () => {
    // Security Apartments and Black's Market are neighbours across the top-left corner.
    const r = g.route('security_apts', 'blacks_market', 'walk')!;
    expect(r.path).toEqual(['security_apts', 'blacks_market']);
    expect(routeHours(r.minutes)).toBe(1);
  });
});

describe('classic — geometry', () => {
  // Sprite boxes (overlaps, canvas, walkway, greenery) are checked by the
  // generator itself, which refuses to write the JSON when any fail; this
  // package cannot typecheck the art package's sources, so the test stays
  // sprite-free.
  it('is the original screen at 2x', () => {
    expect(town.canvas).toEqual({ w: 640, h: 400 });
    for (const n of town.nodes) {
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThan(640);
      expect(n.y).toBeGreaterThan(0);
      expect(n.y).toBeLessThan(400);
    }
  });

  it('every node stands on the walkway band and its building hangs off it, outward', () => {
    const bands = (town.decor ?? []).filter((d) => d.kind === 'plaza');
    expect(bands).toHaveLength(4);
    const onBand = (x: number, y: number) => bands.some((d) => x >= d.x && x <= d.x + d.w! && y >= d.y && y <= d.y + d.h!);
    const xs = town.nodes.map((n) => n.x);
    const ys = town.nodes.map((n) => n.y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    for (const n of town.nodes) {
      expect(onBand(n.x, n.y), `${n.id} node is on the band`).toBe(true);
      const o = n.spriteOffset;
      expect(o, `${n.id} hangs its sprite off the node`).toBeDefined();
      if (n.y === top) expect(o!.y, `${n.id} sprite above the top row`).toBeLessThan(0);
      if (n.y === bottom) expect(o!.y, `${n.id} sprite below the bottom row`).toBeGreaterThan(0);
      if (n.x === left) expect(o!.x, `${n.id} sprite left of the ring`).toBeLessThan(0);
      if (n.x === right) expect(o!.x, `${n.id} sprite right of the ring`).toBeGreaterThan(0);
      if (n.y !== top && n.y !== bottom) expect(o!.x !== 0, `${n.id} column sprite is beside the ring`).toBe(true);
    }
  });

  it('has some greenery and nothing else in the decor', () => {
    const kinds = new Set((town.decor ?? []).map((d) => d.kind));
    expect(kinds.has('tree_round')).toBe(true);
    expect(kinds.has('bush')).toBe(true);
    for (const k of kinds) expect(['plaza', 'tree_round', 'tree_pine', 'bush']).toContain(k);
  });
});
