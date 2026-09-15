import { LOCATIONS } from '@jones2/sim';
import { describe, expect, it } from 'vitest';
import { TownGraph, riverton, type Town, type TownEdge } from '../src';

const town = riverton as Town;
const g = new TownGraph(town);

const LOCATION_IDS = Object.keys(LOCATIONS);

const CANVAS_W = 1280;
const CANVAS_H = 768;
const MARGIN = 16;

const nodeById = new Map(town.nodes.map((n) => [n.id, n]));
const pos = (id: string) => {
  const n = nodeById.get(id);
  if (!n) throw new Error(`Unknown node ${id}`);
  return { x: n.x, y: n.y };
};

/** Roads the player walks or drives on — buslines mirror them and are skipped. */
const DRAWN = town.edges.filter((e) => e.kind !== 'busline');
/** The street spine: everything but the short driveways up to a building's door. */
const SPINE = DRAWN.filter((e) => !e.street!.startsWith('dwy_'));

describe('riverton — sim location coverage', () => {
  it('has every sim location exactly once', () => {
    const owners = new Map<string, string[]>();
    for (const n of town.nodes) {
      if (!n.location) continue;
      const list = owners.get(n.location) ?? [];
      list.push(n.id);
      owners.set(n.location, list);
    }
    expect(owners.size, 'expected all 27 sim locations on the map').toBe(27);
    for (const id of LOCATION_IDS) {
      expect(owners.get(id), `location "${id}" is missing a node`).toBeDefined();
      expect(owners.get(id)!.length, `location "${id}" used by more than one node`).toBe(1);
    }
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

  it('starts at the bus depot', () => {
    expect(town.startNode).toBe('bus_depot');
  });

  it('keeps the two-edge walk bus_depot -> j_center -> employment', () => {
    // apps/client hardcodes this path in its replay tests.
    const has = (a: string, b: string) => town.edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
    expect(nodeById.has('j_center')).toBe(true);
    expect(has('bus_depot', 'j_center'), 'no edge bus_depot - j_center').toBe(true);
    expect(has('j_center', 'employment'), 'no edge j_center - employment').toBe(true);
    const route = g.route('bus_depot', 'employment', 'walk')!;
    expect(route.path).toEqual(['bus_depot', 'j_center', 'employment']);
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

describe('riverton — streets', () => {
  it('every edge belongs to a named street', () => {
    for (const e of town.edges) {
      expect(e.street, `edge ${e.a}-${e.b} has no street id`).toBeTruthy();
    }
  });

  it('each street is one connected chain, not scattered fragments', () => {
    const byStreet = new Map<string, TownEdge[]>();
    for (const e of SPINE) {
      const list = byStreet.get(e.street!) ?? [];
      list.push(e);
      byStreet.set(e.street!, list);
    }
    expect(byStreet.size, 'expected at least ten named streets').toBeGreaterThanOrEqual(10);
    for (const [id, list] of byStreet) {
      const seen = new Set<string>([list[0]!.a]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const e of list) {
          if (seen.has(e.a) && !seen.has(e.b)) {
            seen.add(e.b);
            grew = true;
          } else if (seen.has(e.b) && !seen.has(e.a)) {
            seen.add(e.a);
            grew = true;
          }
        }
      }
      const nodesOnStreet = new Set(list.flatMap((e) => [e.a, e.b]));
      expect(seen.size, `street "${id}" is not a single chain`).toBe(nodesOnStreet.size);
    }
  });

  /**
   * Direction an edge leaves `node` in, following the drawn curve rather than
   * the straight line to the far end.
   */
  function heading(e: TownEdge, node: string): { x: number; y: number } {
    const here = pos(node);
    const curve = e.curve ?? [];
    const next = e.a === node ? (curve[0] ?? pos(e.b)) : (curve[curve.length - 1] ?? pos(e.a));
    const dx = next.x - here.x;
    const dy = next.y - here.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  it('every side street meets its parent street at 70-110 degrees', () => {
    const incident = new Map<string, TownEdge[]>();
    for (const e of SPINE) {
      for (const id of [e.a, e.b]) {
        const list = incident.get(id) ?? [];
        list.push(e);
        incident.set(id, list);
      }
    }
    const offenders: string[] = [];
    let checked = 0;
    for (const [node, list] of incident) {
      const streetsHere = new Set(list.map((e) => e.street!));
      if (streetsHere.size < 2) continue;
      for (const side of streetsHere) {
        const mine = list.filter((e) => e.street === side);
        if (mine.length !== 1) continue; // this street runs through; it is not the branch
        const branch = heading(mine[0]!, node);
        for (const parent of streetsHere) {
          if (parent === side) continue;
          const theirs = list.filter((e) => e.street === parent);
          if (theirs.length !== 2) continue; // only a through street defines a tangent
          const a = heading(theirs[0]!, node);
          const b = heading(theirs[1]!, node);
          // the two headings point opposite ways along the parent; average the line
          const lx = a.x - b.x;
          const ly = a.y - b.y;
          const len = Math.hypot(lx, ly) || 1;
          const dot = Math.abs((branch.x * lx + branch.y * ly) / len);
          const deg = (Math.acos(Math.min(1, dot)) * 180) / Math.PI;
          checked++;
          if (deg < 70) offenders.push(`${side} leaves ${parent} at ${node} at ${deg.toFixed(0)}deg`);
        }
      }
    }
    expect(checked, 'expected several T-junctions to check').toBeGreaterThanOrEqual(6);
    expect(offenders, offenders.join('\n')).toHaveLength(0);
  });
});

describe('riverton — geometry', () => {
  it('every node sits within the 1280x768 canvas, with margin', () => {
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

  it('spreads the town across the canvas rather than hugging downtown', () => {
    const xs = town.nodes.map((n) => n.x);
    const ys = town.nodes.map((n) => n.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(CANVAS_W * 0.8);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(CANVAS_H * 0.8);
  });
});

describe('riverton — travel times', () => {
  /** The downtown box: main street and the blocks either side of it. */
  const DOWNTOWN = { x0: 300, y0: 380, x1: 980, y1: 640 };
  const inDowntown = (id: string): boolean => {
    const p = pos(id);
    return p.x >= DOWNTOWN.x0 && p.x <= DOWNTOWN.x1 && p.y >= DOWNTOWN.y0 && p.y <= DOWNTOWN.y1;
  };

  it('a typical downtown hop is 4 to 12 minutes on foot', () => {
    const hops = DRAWN.filter((e) => inDowntown(e.a) && inDowntown(e.b))
      .map((e) => e.minutes)
      .sort((a, b) => a - b);
    expect(hops.length, 'expected a good number of downtown hops').toBeGreaterThanOrEqual(12);
    const median = hops[Math.floor(hops.length / 2)]!;
    expect(median, `downtown hops: ${hops.join(',')}`).toBeGreaterThanOrEqual(4);
    expect(median, `downtown hops: ${hops.join(',')}`).toBeLessThanOrEqual(12);
  });

  it('the lookout is a serious walk from the depot', () => {
    const r = g.route('bus_depot', 'lookout', 'walk')!;
    expect(r).not.toBeNull();
    expect(r.minutes).toBeGreaterThanOrEqual(45);
  });

  it('the far corners cost much more than a downtown errand', () => {
    const near = g.route('bus_depot', 'newsstand', 'walk')!.minutes;
    for (const far of ['lookout', 'house_lake', 'house_hill', 'zmart']) {
      const r = g.route('bus_depot', far, 'walk')!;
      expect(r.minutes, `${far} should be far from the depot`).toBeGreaterThan(near * 2.5);
    }
  });

  it('every edge costs at least two minutes', () => {
    for (const e of town.edges) expect(e.minutes, `${e.a}-${e.b}`).toBeGreaterThanOrEqual(2);
  });
});

describe('riverton — decor', () => {
  it('has at least 150 pieces of decor', () => {
    expect((town.decor ?? []).length).toBeGreaterThanOrEqual(150);
  });

  it('has woods, hedgerows, street furniture, water and bridges', () => {
    const kinds = new Set((town.decor ?? []).map((d) => d.kind));
    for (const kind of ['tree_pine', 'bush', 'lamp', 'bench', 'water', 'bridge', 'dock', 'signpost', 'bus']) {
      expect(kinds.has(kind), `no ${kind} decor`).toBe(true);
    }
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
