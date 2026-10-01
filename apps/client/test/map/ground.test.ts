import { describe, expect, it } from 'vitest';
import { riverton } from '@jones2/town';
import type { Town, TownNode } from '@jones2/town';
import { PX_PER_UNIT, getArt } from '../../src/map/art';
import {
  JUNCTION_HIT_RADIUS,
  buildGround,
  pickNode,
  pickRectFor,
  sortByDepth,
  townBounds,
} from '../../src/map/ground';
import { RenderPalette } from '../../src/map/surface';

const TOWN = riverton as unknown as Town;
const art = getArt();

describe('sortByDepth', () => {
  it('sorts back to front by anchor y', () => {
    const items = [
      { nx: 0, ny: 30, order: 0 },
      { nx: 0, ny: 10, order: 1 },
      { nx: 0, ny: 20, order: 2 },
    ];
    expect(sortByDepth(items).map((i) => i.ny)).toEqual([10, 20, 30]);
  });

  it('is stable for equal depths', () => {
    const items = [
      { nx: 5, ny: 10, order: 0 },
      { nx: 5, ny: 10, order: 1 },
      { nx: 5, ny: 10, order: 2 },
    ];
    expect(sortByDepth(items).map((i) => i.order)).toEqual([0, 1, 2]);
    // Sorting an already-sorted list must not reshuffle it.
    expect(sortByDepth(sortByDepth(items)).map((i) => i.order)).toEqual([0, 1, 2]);
  });

  it('breaks ties on x before insertion order', () => {
    const items = [
      { nx: 9, ny: 10, order: 0 },
      { nx: 1, ny: 10, order: 1 },
    ];
    expect(sortByDepth(items).map((i) => i.nx)).toEqual([1, 9]);
  });

  it('does not mutate its input', () => {
    const items = [
      { nx: 0, ny: 30, order: 0 },
      { nx: 0, ny: 10, order: 1 },
    ];
    sortByDepth(items);
    expect(items.map((i) => i.ny)).toEqual([30, 10]);
  });
});

describe('pickRectFor', () => {
  const node: TownNode = {
    id: 'n',
    name: 'Node',
    x: 100,
    y: 50,
    building: { width: 8, depth: 6, height: 4, color: '#cccccc', roof: 'flat', facing: 0 },
  };

  it('covers the ground footprint and the facade above it', () => {
    const sprite = art.building(undefined, node);
    const r = pickRectFor(node, sprite);
    const nx = node.x * PX_PER_UNIT;
    const ny = node.y * PX_PER_UNIT;
    // Anchor-centred footprint.
    expect(r.x).toBeLessThanOrEqual(nx - sprite.footprintW / 2);
    expect(r.x + r.w).toBeGreaterThanOrEqual(nx + sprite.footprintW / 2);
    // The facade reaches above the node.
    expect(r.y).toBeLessThan(ny);
    expect(r.y + r.h).toBeGreaterThanOrEqual(ny);
  });
});

describe('buildGround', () => {
  const pal = new RenderPalette(art.palette);
  const ground = buildGround(TOWN, art, pal);

  it('produces a surface covering the town bounds', () => {
    const b = townBounds(TOWN, art);
    expect(ground.surface.width).toBe(b.w);
    expect(ground.surface.height).toBe(b.h);
    expect(ground.offsetX).toBe(b.x);
    expect(ground.offsetY).toBe(b.y);
  });

  it('leaves no transparent pixels: the ground is fully tiled', () => {
    expect(ground.surface.pixels.some((v) => v === 0)).toBe(false);
  });

  it('places one pick rect per building node, in painter order', () => {
    const buildings = TOWN.nodes.filter((n) => n.location || n.pixel).length;
    expect(ground.picks.length).toBe(buildings);
    for (let i = 1; i < ground.picks.length; i++) {
      const prev = TOWN.nodes.find((n) => n.id === ground.picks[i - 1]!.id)!;
      const cur = TOWN.nodes.find((n) => n.id === ground.picks[i]!.id)!;
      expect(cur.y).toBeGreaterThanOrEqual(prev.y);
    }
  });

  it('depth-sorts every placement', () => {
    for (let i = 1; i < ground.placements.length; i++) {
      expect(ground.placements[i]!.ny).toBeGreaterThanOrEqual(ground.placements[i - 1]!.ny);
    }
  });
});

describe('pickNode', () => {
  const pal = new RenderPalette(art.palette);
  const ground = buildGround(TOWN, art, pal);

  it('hits a building when the cursor is on its footprint', () => {
    const node = TOWN.nodes.find((n) => n.location || n.pixel)!;
    const hit = pickNode(TOWN, ground.picks, node.x * PX_PER_UNIT, node.y * PX_PER_UNIT);
    expect(hit).toBe(node.id);
  });

  it('hits a junction within the radius and misses outside it', () => {
    const j = TOWN.nodes.find((n) => !n.location && !n.pixel)!;
    const nx = j.x * PX_PER_UNIT;
    const ny = j.y * PX_PER_UNIT;
    expect(pickNode(TOWN, ground.picks, nx, ny)).toBe(j.id);
    const far = pickNode(TOWN, ground.picks, nx + JUNCTION_HIT_RADIUS * 40, ny + JUNCTION_HIT_RADIUS * 40);
    expect(far).not.toBe(j.id);
  });

  it('returns null on empty ground far from everything', () => {
    expect(pickNode(TOWN, ground.picks, -100000, -100000)).toBeNull();
  });

  it('with a finger slop, takes the nearest building a tap just missed', () => {
    const empty = { ...TOWN, nodes: [] } as Town;
    const picks = [
      { id: 'bank', x: 100, y: 100, w: 40, h: 30 },
      { id: 'shop', x: 200, y: 100, w: 40, h: 30 },
    ];
    // 6px right of the bank: a miss for a mouse, a hit for a finger.
    expect(pickNode(empty, picks, 145, 110)).toBeNull();
    expect(pickNode(empty, picks, 145, 110, 10)).toBe('bank');
    // Nearer the shop than the bank: the shop.
    expect(pickNode(empty, picks, 195, 110, 10)).toBe('shop');
    // Beyond the slop: still nothing.
    expect(pickNode(empty, picks, 170, 110, 10)).toBeNull();
  });
});
