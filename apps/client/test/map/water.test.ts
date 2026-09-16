/**
 * What the water rasteriser must produce. Checked on a small synthetic town
 * (a curved river, a pond, a road over the river and a street under a highway)
 * and then on the real Riverton, which is the map the renderer actually has to
 * draw.
 */
import { describe, expect, it } from 'vitest';
import { riverton } from '@jones2/town';
import type { Town } from '@jones2/town';
import { PX_PER_UNIT, getArt } from '../../src/map/art';
import { buildGround } from '../../src/map/ground';
import { CROSSING_KINDS, crossingSize, drawCrossings } from '../../src/map/crossings';
import { buildWaterMask, courseSamples, drawWater, waterColours } from '../../src/map/water';
import { RenderPalette, createSurface } from '../../src/map/surface';

const art = getArt();
const pal = new RenderPalette(art.palette);
const RIVERTON = riverton as unknown as Town;

const TOWN: Town = {
  id: 'water-test',
  name: 'Water Test',
  startNode: 'a',
  canvas: { w: 200, h: 200 },
  water: [
    { id: 'brook', points: [{ x: 10, y: 40 }, { x: 60, y: 70 }, { x: 110, y: 60 }, { x: 190, y: 100 }], width: 20 },
  ],
  nodes: [
    { id: 'a', x: 20, y: 150 },
    { id: 'b', x: 180, y: 150 },
  ],
  edges: [{ a: 'a', b: 'b', minutes: 5, kind: 'street', street: 'cross_st' }],
  decor: [
    { kind: 'water', x: 30, y: 10, w: 24, h: 20 },
    { kind: 'bridge', x: 85, y: 64, dir: { x: 0, y: 1 } },
    { kind: 'underpass', x: 100, y: 150, dir: { x: 1, y: 0 } },
  ],
};

const W = 200;
const H = 200;

function paint(): { surface: ReturnType<typeof createSurface>; mask: ReturnType<typeof createSurface> } {
  const surface = createSurface(W, H, 2);
  const mask = drawWater(surface, TOWN, pal, 0, 0, () => art.tile('water', 0));
  return { surface, mask };
}

describe('water mask', () => {
  const mask = buildWaterMask(TOWN, W, H, 0, 0);
  const at = (x: number, y: number) => mask.pixels[y * W + x]!;

  it('is wet on the course centreline and dry well off it', () => {
    for (const p of courseSamples(TOWN.water![0]!)) {
      expect(at(Math.round(p.x), Math.round(p.y)), `centreline ${p.x},${p.y}`).toBe(1);
    }
    expect(at(10, 190)).toBe(0);
    expect(at(190, 10)).toBe(0);
  });

  it('is as wide as the course says, and no wider', () => {
    // A column through the brook, clear of its ends.
    let top = -1;
    let bottom = -1;
    for (let y = 0; y < H; y++) {
      if (at(60, y) === 1) {
        if (top < 0) top = y;
        bottom = y;
      }
    }
    const width = bottom - top + 1;
    expect(width).toBeGreaterThanOrEqual(TOWN.water![0]!.width - 2);
    expect(width).toBeLessThanOrEqual(TOWN.water![0]!.width + 4);
  });

  it('follows the meander rather than stair-stepping a rectangle', () => {
    const mid = (x: number): number => {
      let sum = 0;
      let n = 0;
      for (let y = 0; y < H; y++) if (at(x, y) === 1) { sum += y; n++; }
      return n ? sum / n : NaN;
    };
    // The brook rises between x=60 and x=110 and falls again by x=170.
    expect(mid(110)).toBeLessThan(mid(60));
    expect(mid(170)).toBeGreaterThan(mid(110));
  });

  it('includes rectangle water decor', () => {
    expect(at(40, 20)).toBe(1);
    expect(at(40, 5)).toBe(0);
  });
});

describe('shoreline', () => {
  const { surface, mask } = paint();
  const c = waterColours(pal);
  const px = (x: number, y: number) => surface.pixels[y * W + x]!;
  const wet = (x: number, y: number) => mask.pixels[y * W + x]! === 1;

  it('draws the bank on every wet pixel that touches dry land, and only there', () => {
    let banks = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (!wet(x, y)) {
          expect(px(x, y), `dry pixel ${x},${y} painted`).not.toBe(c.shore);
          continue;
        }
        const edge = !wet(x - 1, y) || !wet(x + 1, y) || !wet(x, y - 1) || !wet(x, y + 1);
        if (edge) {
          expect(px(x, y), `bank missing at ${x},${y}`).toBe(c.shore);
          banks++;
        }
      }
    }
    expect(banks).toBeGreaterThan(100);
  });

  it('fills the channel with water rather than leaving the grass showing', () => {
    // The middle of the brook is wet and is not the surface's original fill.
    expect(px(60, 70)).not.toBe(2);
    expect(px(60, 70)).not.toBe(0);
  });

  it('leaves dry ground untouched', () => {
    expect(px(10, 190)).toBe(2);
  });
});

describe('crossing props', () => {
  const { surface } = paint();
  drawCrossings(surface, TOWN, pal, 0, 0);
  const px = (x: number, y: number) => surface.pixels[y * W + x]!;
  const c = waterColours(pal);

  it('knows which decor kinds it owns', () => {
    expect([...CROSSING_KINDS].sort()).toEqual(['bridge', 'underpass', 'viaduct']);
  });

  it('lays the bridge deck along dir, covering the water under it', () => {
    const d = TOWN.decor!.find((x) => x.kind === 'bridge')!;
    const { along } = crossingSize('bridge');
    // dir is (0,1): the deck runs down the column through the bridge point.
    for (let k = -along + 2; k <= along - 2; k += 4) {
      expect(px(d.x, d.y + k), `deck missing at ${d.x},${d.y + k}`).not.toBe(c.fill);
      expect(px(d.x, d.y + k)).not.toBe(c.shore);
    }
    // ... and does not spill sideways across the whole river.
    expect(px(d.x + 30, d.y)).not.toBe(px(d.x, d.y));
  });

  it('sizes a viaduct wider than a road bridge and a portal narrower', () => {
    expect(crossingSize('viaduct').across).toBeGreaterThan(crossingSize('bridge').across);
    expect(crossingSize('underpass').across).toBeLessThan(crossingSize('bridge').across);
  });

  it('puts a tunnel mouth on each side of the highway, not in the middle', () => {
    const d = TOWN.decor!.find((x) => x.kind === 'underpass')!;
    const centre = px(d.x, d.y);
    const left = px(d.x - 12, d.y);
    const right = px(d.x + 12, d.y);
    expect(left).toBe(right);
    expect(left).not.toBe(centre);
  });
});

describe('riverton in the renderer', () => {
  it('covers the authored canvas', () => {
    const ground = buildGround(RIVERTON, art, pal);
    const canvas = RIVERTON.canvas!;
    expect(ground.offsetX).toBeLessThanOrEqual(0);
    expect(ground.offsetY).toBeLessThanOrEqual(0);
    expect(ground.offsetX + ground.width).toBeGreaterThanOrEqual(canvas.w * PX_PER_UNIT);
    expect(ground.offsetY + ground.height).toBeGreaterThanOrEqual(canvas.h * PX_PER_UNIT);
  });

  it('rasterises the river and the lake, and banks them', () => {
    const b = buildGround(RIVERTON, art, pal);
    const mask = buildWaterMask(RIVERTON, b.width, b.height, b.offsetX, b.offsetY);
    const wet = mask.pixels.reduce((n, v) => n + (v ? 1 : 0), 0);
    // The river alone is ~2000px long and 48 wide.
    expect(wet).toBeGreaterThan(80_000);
    const c = waterColours(pal);
    const banks = b.surface.pixels.reduce((n, v) => n + (v === c.shore ? 1 : 0), 0);
    expect(banks).toBeGreaterThan(1000);
  });

  it('draws every bridge, viaduct and underpass, each with a direction', () => {
    const crossings = (RIVERTON.decor ?? []).filter((d) => CROSSING_KINDS.has(d.kind));
    expect(crossings.length).toBeGreaterThanOrEqual(7);
    for (const d of crossings) {
      expect(d.dir, `${d.kind} at ${d.x},${d.y}`).toBeDefined();
      expect(Math.hypot(d.dir!.x, d.dir!.y)).toBeCloseTo(1, 2);
    }
  });

  it('never turns a crossing prop into a scenery sprite', () => {
    const ground = buildGround(RIVERTON, art, pal);
    const props = (RIVERTON.decor ?? []).filter(
      (d) => !CROSSING_KINDS.has(d.kind) && !['water', 'grass', 'plaza'].includes(d.kind),
    );
    const buildings = RIVERTON.nodes.filter((n) => n.location || n.pixel).length;
    expect(ground.placements.length).toBe(props.length + buildings);
  });
});
