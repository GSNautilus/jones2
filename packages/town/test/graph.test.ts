import { describe, expect, it } from 'vitest';
import { TownGraph, riverton, type Town } from '../src';

const g = new TownGraph(riverton as Town);

describe('riverton town graph', () => {
  it('has unique node ids and valid edges', () => {
    const ids = riverton.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of riverton.edges) {
      expect(g.hasNode(e.a)).toBe(true);
      expect(g.hasNode(e.b)).toBe(true);
    }
  });

  it('every location is reachable on foot from the start', () => {
    for (const n of riverton.nodes) {
      if (!n.location) continue;
      const r = g.route(riverton.startNode, n.id, 'walk');
      expect(r, `no walking route to ${n.id}`).not.toBeNull();
    }
  });

  it('a car is faster than walking across town', () => {
    const walk = g.route('bus_depot', 'house_lake', 'walk')!;
    const car = g.route('bus_depot', 'house_lake', 'car')!;
    expect(car.minutes).toBeLessThan(walk.minutes);
  });

  it('the bus cannot reach places off its lines', () => {
    expect(g.route('bus_depot', 'lookout', 'bus')).toBeNull();
  });

  it('bestRoute picks the cheapest available mode', () => {
    const r = g.bestRoute('bus_depot', 'factory', ['walk', 'bus'])!;
    expect(r.mode).toBe('bus');
  });
});
