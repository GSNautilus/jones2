/**
 * What the road rasteriser must produce, checked on the same synthetic town
 * `tools/roads-png.ts` renders: a chained main street, two T-junctions, a
 * crossroads, a highway, a footpath and a bus line.
 */
import { describe, expect, it } from 'vitest';
import { ROAD_STYLE, buildStreetChains, chainsFor, findJunctions } from '../../src/map/roads';
import { ROAD_TEST_TOWN, WIDTH, paintRoadTest } from '../../tools/roads-png';

const { surface, colours, grass } = paintRoadTest();
const px = (x: number, y: number): number => surface.pixels[y * WIDTH + x]!;
const node = (id: string) => ROAD_TEST_TOWN.nodes.find((n) => n.id === id)!;

const ASPHALT = new Set([colours.fill, colours.dark, colours.path]);
const ANY_ROAD = new Set([...ASPHALT, colours.edge, colours.pathEdge, colours.centre, colours.bus]);

/** Every pixel index inside a box around a point. */
function box(cx: number, cy: number, r: number): number[] {
  const out: number[] = [];
  for (let y = Math.round(cy - r); y <= Math.round(cy + r); y++) {
    for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) out.push(px(x, y));
  }
  return out;
}

describe('junction detection', () => {
  const junctions = findJunctions(ROAD_TEST_TOWN, chainsFor(ROAD_TEST_TOWN));
  const ids = junctions.map((j) => j.id).sort();

  it('finds exactly the nodes where roads meet', () => {
    // m1/m3 are T-junctions, m2 a crossroads, x1 where the path joins.
    expect(ids).toEqual(['m1', 'm2', 'm3', 'x1']);
  });

  it('does not treat a node in the middle of one street as a junction', () => {
    // h1 joins two highway edges of the same chain; a1 likewise on sideA.
    expect(ids).not.toContain('h1');
    expect(ids).not.toContain('a1');
  });

  it('counts an arm per incident road end, and sizes the apron by the widest', () => {
    const cross = junctions.find((j) => j.id === 'm2')!;
    expect(cross.arms).toHaveLength(4);
    expect(cross.half).toBe(ROAD_STYLE.street.width / 2);
    const tee = junctions.find((j) => j.id === 'm1')!;
    expect(tee.arms).toHaveLength(3);
  });
});

describe('asphalt and kerbs', () => {
  it('lays a street down at its declared width', () => {
    // A column well clear of every junction, straight through the main street.
    const x = 60;
    let top = -1;
    let bottom = -1;
    for (let y = 120; y < 190; y++) {
      if (ANY_ROAD.has(px(x, y))) {
        if (top < 0) top = y;
        bottom = y;
      }
    }
    expect(bottom - top + 1).toBeGreaterThanOrEqual(ROAD_STYLE.street.width);
    expect(bottom - top + 1).toBeLessThanOrEqual(ROAD_STYLE.street.width + 2);
  });

  it('gives a straight street exactly one kerb pixel on each side', () => {
    const x = 60;
    const kerbs: number[] = [];
    for (let y = 120; y < 190; y++) if (px(x, y) === colours.edge) kerbs.push(y);
    expect(kerbs).toHaveLength(2);
  });

  it('paints the highway wider than a street', () => {
    const count = (kind: 'highway' | 'street', x: number, from: number, to: number): number => {
      let n = 0;
      for (let y = from; y < to; y++) if (ANY_ROAD.has(px(x, y))) n++;
      return n;
    };
    expect(count('highway', 300, 280, 330)).toBeGreaterThan(count('street', 60, 120, 190));
  });

  it('never leaves a kerb pixel surrounded by asphalt', () => {
    // A kerb inside the road is exactly the artefact junctions used to produce.
    for (let y = 1; y < surface.height - 1; y++) {
      for (let x = 1; x < WIDTH - 1; x++) {
        if (px(x, y) !== colours.edge && px(x, y) !== colours.pathEdge) continue;
        const ring = [px(x - 1, y), px(x + 1, y), px(x, y - 1), px(x, y + 1)];
        expect(ring.some((v) => !ANY_ROAD.has(v))).toBe(true);
      }
    }
  });

  it('welds the junction shut: no grass anywhere inside a crossroads', () => {
    const m2 = node('m2');
    for (const v of box(m2.x, m2.y, 4)) expect(v).not.toBe(grass);
  });

  it('rounds the corners of a crossroads', () => {
    const m2 = node('m2');
    const half = ROAD_STYLE.street.width / 2;
    // The square notch corner is now asphalt...
    expect(ANY_ROAD.has(px(m2.x + half, m2.y - half))).toBe(true);
    // ...but the fillet never reaches the far diagonal, so it is still a corner.
    expect(px(m2.x + half + 6, m2.y - half - 6)).toBe(grass);
  });
});

describe('centre lines', () => {
  const dashesNear = (x: number, y: number, r: number): number =>
    box(x, y, r).filter((v) => v === colours.centre).length;

  it('keeps clear of every junction', () => {
    for (const id of ['m1', 'm2', 'm3']) {
      const n = node(id);
      expect(dashesNear(n.x, n.y, 6)).toBe(0);
    }
  });

  it('runs straight through a node in the middle of a street', () => {
    // h1 is an interior node of the highway chain: the dashes must not restart.
    const n = node('h1');
    expect(dashesNear(n.x, n.y, 8)).toBeGreaterThan(0);
  });

  it('dashes rather than draws a solid line', () => {
    let on = 0;
    let off = 0;
    for (let x = 30; x < 90; x++) {
      let hit = false;
      for (let y = 140; y < 162; y++) if (px(x, y) === colours.centre) hit = true;
      if (hit) on++;
      else off++;
    }
    expect(on).toBeGreaterThan(0);
    expect(off).toBeGreaterThan(0);
  });

  it('gives a highway two centre lines and a path none', () => {
    // How far apart the centre-line pixels sit in one column: a single line is
    // one pixel (two where the road slopes), a double line is three apart.
    const spread = (x: number, from: number, to: number): number => {
      const ys: number[] = [];
      for (let y = from; y < to; y++) if (px(x, y) === colours.centre) ys.push(y);
      return ys.length ? ys[ys.length - 1]! - ys[0]! : -1;
    };
    let highway = 0;
    for (let x = 240; x < 340; x++) highway = Math.max(highway, spread(x, 280, 330));
    expect(highway).toBeGreaterThanOrEqual(3);

    let street = 0;
    for (let x = 30; x < 90; x++) street = Math.max(street, spread(x, 130, 175));
    expect(street).toBeLessThanOrEqual(1);

    // The footpath carries no centre line at all.
    for (let x = 130; x < 200; x++) {
      for (let y = 225; y < 265; y++) expect(px(x, y)).not.toBe(colours.centre);
    }
  });
});

describe('bus overlay', () => {
  it('runs beside the centreline, never on it', () => {
    let seen = 0;
    for (let x = 30; x < 100; x++) {
      for (let y = 130; y < 175; y++) {
        if (px(x, y) !== colours.bus) continue;
        seen++;
        // Nothing painted bus-blue may share a pixel with a dash.
        expect(px(x, y)).not.toBe(colours.centre);
      }
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('stays on one side of the road along the whole chain', () => {
    // Every bus pixel is below the main street's centre, never above it.
    const above: number[] = [];
    for (let x = 30; x < 300; x++) {
      for (let y = 120; y < 180; y++) {
        if (px(x, y) === colours.bus && y < 143) above.push(x);
      }
    }
    expect(above).toEqual([]);
  });

  it('marks a stop at bus-line places and junctions only', () => {
    const hasSign = (id: string): boolean =>
      box(node(id).x, node(id).y, 22).some((v) => v === colours.busSign);
    expect(hasSign('m1')).toBe(true);
    expect(hasSign('m2')).toBe(true);
    expect(hasSign('m3')).toBe(true);
    // m0 is on the bus line but is neither a place nor a junction.
    expect(box(node('m0').x + 12, node('m0').y, 12).some((v) => v === colours.busSign)).toBe(false);
    // b2 is not on a bus line at all.
    expect(hasSign('b2')).toBe(false);
  });
});

describe('street chains', () => {
  it('draws the main street as one chain of four edges', () => {
    const main = buildStreetChains(ROAD_TEST_TOWN).find((c) => c.street === 'main')!;
    expect(main.spans).toHaveLength(4);
    expect(main.nodes).toEqual(['m0', 'm1', 'm2', 'm3', 'm4']);
    expect(main.acc[main.acc.length - 1]).toBeGreaterThan(380);
  });

  it('keeps the bus line as its own chain, apart from the street it shadows', () => {
    const bus = buildStreetChains(ROAD_TEST_TOWN).filter((c) => c.kind === 'busline');
    expect(bus).toHaveLength(1);
    expect(bus[0]!.nodes).toEqual(['m0', 'm1', 'm2', 'm3']);
  });
});
