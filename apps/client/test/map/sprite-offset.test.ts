/**
 * `TownNode.spriteOffset`: the building sprite hangs off the node while the
 * node itself stays where routes end and figures stand. The classic ring
 * relies on it (every node is on the walkway, sprites outside the loop).
 */
import { describe, expect, it } from 'vitest';
import { classic } from '@jones2/town';
import type { Town } from '@jones2/town';
import { getArt } from '../../src/map/art';
import { buildGround, pickNode, pickRectFor, townBounds } from '../../src/map/ground';
import { RenderPalette } from '../../src/map/surface';

const art = getArt();

function tinyTown(offset?: { x: number; y: number }): Town {
  return {
    id: 't',
    name: 't',
    startNode: 'bank',
    nodes: [{ id: 'bank', name: 'Bank', x: 200, y: 200, location: 'bank', pixel: { kind: 'bank' }, spriteOffset: offset }],
    edges: [],
  };
}

describe('spriteOffset', () => {
  it('moves the drawn building but not the node', () => {
    const town = tinyTown({ x: 0, y: -60 });
    const g = buildGround(town, art, new RenderPalette(art.palette));
    const p = g.placements.find((x) => x.id === 'bank')!;
    expect(p.nx).toBe(200);
    expect(p.ny).toBe(140);
    expect(town.nodes[0]!.y).toBe(200);
  });

  it('is picked where it is drawn', () => {
    const town = tinyTown({ x: 0, y: -60 });
    const g = buildGround(town, art, new RenderPalette(art.palette));
    const sprite = p(g);
    const r = pickRectFor(town.nodes[0]!, sprite);
    // The facade is above the node now; clicking inside the drawn sprite hits it.
    expect(r.y + r.h).toBeLessThanOrEqual(140 + sprite.footprintH / 2 + 1);
    expect(pickNode(town, g.picks, 200, 140 - sprite.height / 2)).toBe('bank');
    // Below the node there is only grass.
    expect(pickNode(town, g.picks, 200, 240)).not.toBe('bank');
  });

  it('is included in the town bounds', () => {
    const plain = townBounds(tinyTown(), art);
    const shifted = townBounds(tinyTown({ x: 0, y: -60 }), art);
    expect(shifted.y).toBeLessThan(plain.y);
  });

  it('the classic ring draws every building off its node and stays inside its canvas', () => {
    const town = classic as unknown as Town;
    const g = buildGround(town, art, new RenderPalette(art.palette));
    for (const n of town.nodes) {
      const pl = g.placements.find((x) => x.id === n.id)!;
      expect(pl.nx).toBe(n.x + n.spriteOffset!.x);
      expect(pl.ny).toBe(n.y + n.spriteOffset!.y);
    }
    const b = townBounds(town, art);
    expect(b.x).toBeLessThanOrEqual(0);
    expect(b.y).toBeLessThanOrEqual(0);
    expect(b.x + b.w).toBeGreaterThanOrEqual(640);
    expect(b.y + b.h).toBeGreaterThanOrEqual(400);
  });
});

function p(g: ReturnType<typeof buildGround>) {
  return g.placements.find((x) => x.id === 'bank')!.sprite;
}
