import { LOCATIONS } from '@jones2/sim';
import { describe, expect, it } from 'vitest';
import { TownGraph, riverton, type Town } from '../src';

const town = riverton as Town;
const g = new TownGraph(town);

const LOCATION_IDS = Object.keys(LOCATIONS);

describe('riverton — sim location coverage', () => {
  it('has every sim location exactly once', () => {
    const owners = new Map<string, string[]>();
    for (const n of town.nodes) {
      if (!n.location) continue;
      const list = owners.get(n.location) ?? [];
      list.push(n.id);
      owners.set(n.location, list);
    }
    for (const id of LOCATION_IDS) {
      expect(owners.get(id), `location "${id}" is missing a node`).toBeDefined();
      expect(owners.get(id)!.length, `location "${id}" used by more than one node`).toBe(1);
    }
    // and nothing extra
    for (const [loc] of owners) {
      expect(LOCATION_IDS, `node uses unknown location "${loc}"`).toContain(loc);
    }
  });
});

describe('riverton — graph integrity', () => {
  it('every edge references existing nodes', () => {
    const ids = new Set(town.nodes.map((n) => n.id));
    for (const e of town.edges) {
      expect(ids.has(e.a), `edge references unknown node ${e.a}`).toBe(true);
      expect(ids.has(e.b), `edge references unknown node ${e.b}`).toBe(true);
    }
  });

  it('has unique node ids', () => {
    const ids = town.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every location is reachable on foot from bus_depot', () => {
    for (const n of town.nodes) {
      if (!n.location) continue;
      const r = g.route(town.startNode, n.id, 'walk');
      expect(r, `no walking route to ${n.id}`).not.toBeNull();
    }
  });

  it('the bus reaches factory, auto and house_lake from the depot', () => {
    for (const dest of ['factory', 'auto', 'house_lake']) {
      const r = g.route('bus_depot', dest, 'bus');
      expect(r, `no bus route to ${dest}`).not.toBeNull();
    }
  });

  it('a car is faster than walking to the lakeside', () => {
    const walk = g.route('bus_depot', 'house_lake', 'walk')!;
    const car = g.route('bus_depot', 'house_lake', 'car')!;
    expect(walk).not.toBeNull();
    expect(car).not.toBeNull();
    expect(car.minutes).toBeLessThan(walk.minutes);
  });
});

describe('riverton — geometry', () => {
  const CANVAS_W = 768;
  const CANVAS_H = 448;
  const MARGIN = 16;

  it('every node sits within the 768x448 canvas, with margin', () => {
    for (const n of town.nodes) {
      expect(n.x, `${n.id}.x`).toBeGreaterThanOrEqual(MARGIN);
      expect(n.x, `${n.id}.x`).toBeLessThanOrEqual(CANVAS_W - MARGIN);
      expect(n.y, `${n.id}.y`).toBeGreaterThanOrEqual(MARGIN);
      expect(n.y, `${n.id}.y`).toBeLessThanOrEqual(CANVAS_H - MARGIN);
    }
  });

  it('every curve control point sits within the canvas', () => {
    for (const e of town.edges) {
      for (const c of e.curve ?? []) {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x).toBeLessThanOrEqual(CANVAS_W);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeLessThanOrEqual(CANVAS_H);
      }
    }
  });

  it('no two location anchors sit closer than 56px apart', () => {
    const locs = town.nodes.filter((n) => n.location);
    const offenders: string[] = [];
    for (let i = 0; i < locs.length; i++) {
      for (let j = i + 1; j < locs.length; j++) {
        const a = locs[i]!;
        const b = locs[j]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 56) offenders.push(`${a.id} - ${b.id} (${d.toFixed(1)}px)`);
      }
    }
    expect(offenders, offenders.join(', ')).toHaveLength(0);
  });
});

describe('riverton — decor', () => {
  it('has at least 60 pieces of scattered decor', () => {
    const AREA = new Set(['water', 'grass', 'plaza', 'path']);
    const scattered = (town.decor ?? []).filter((d) => !AREA.has(d.kind));
    expect(scattered.length).toBeGreaterThanOrEqual(60);
  });
});

/**
 * Mirrors `apps/client/src/editor/model.ts`'s `validate(town)` without
 * importing across the package boundary (the town package cannot depend on
 * the client). The client's own test suite runs the real `validate` against
 * this same JSON — see `apps/client/test`.
 */
describe('riverton — passes the editor validation rules', () => {
  it('has no duplicate node ids, no dangling edges, a valid startNode, known locations, and full foot reachability', () => {
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const n of town.nodes) {
      if (seen.has(n.id)) problems.push(`duplicate node id: ${n.id}`);
      seen.add(n.id);
    }
    for (const e of town.edges) {
      if (!seen.has(e.a)) problems.push(`edge references unknown node: ${e.a}`);
      if (!seen.has(e.b)) problems.push(`edge references unknown node: ${e.b}`);
      if (e.minutes <= 0) problems.push(`edge ${e.a}-${e.b} has non-positive minutes`);
    }
    const owners = new Map<string, string[]>();
    for (const n of town.nodes) {
      if (n.location === undefined) continue;
      if (!(n.location in LOCATIONS)) problems.push(`node ${n.id} uses unknown location "${n.location}"`);
      const list = owners.get(n.location) ?? [];
      list.push(n.id);
      owners.set(n.location, list);
    }
    for (const [loc, list] of owners) {
      if (list.length > 1) problems.push(`location "${loc}" used by more than one node: ${list.join(', ')}`);
    }
    if (!seen.has(town.startNode)) problems.push(`startNode "${town.startNode}" does not exist`);
    else {
      for (const n of town.nodes) {
        if (n.location === undefined) continue;
        const route = g.route(town.startNode, n.id, 'walk');
        if (!route) problems.push(`location node ${n.id} (${n.location}) is unreachable on foot from startNode`);
      }
    }
    expect(problems, problems.join('\n')).toHaveLength(0);
  });
});
