import { describe, expect, it } from 'vitest';
import { riverton } from '@jones2/town';
import type { Town } from '@jones2/town';
import { addEdge, addNode, moveNode, removeEdge, removeNode, suggestMinutes, validate } from '../../src/editor/model';

const town = riverton as unknown as Town;

function empty(): Town {
  return {
    id: 't',
    name: 'Test Town',
    startNode: 'a',
    nodes: [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 4, y: 0 },
    ],
    edges: [],
  };
}

describe('addNode', () => {
  it('assigns an auto junction id when unnamed', () => {
    const t = addNode(empty(), 1, 1);
    const added = t.nodes[t.nodes.length - 1]!;
    expect(added.id).toMatch(/^j_\d+$/);
    expect(added.x).toBe(1);
    expect(added.y).toBe(1);
    expect(t.nodes).toHaveLength(3);
  });

  it('slugifies a name into an id and avoids collisions', () => {
    let t = addNode(empty(), 1, 1, { name: 'Corner Shop' });
    expect(t.nodes[t.nodes.length - 1]!.id).toBe('corner_shop');
    t = addNode(t, 2, 2, { name: 'Corner Shop' });
    expect(t.nodes[t.nodes.length - 1]!.id).toBe('corner_shop_2');
  });

  it('does not mutate the original town', () => {
    const original = empty();
    const snapshot = JSON.stringify(original);
    addNode(original, 1, 1);
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe('removeNode', () => {
  it('removes the node and any edges touching it', () => {
    let t = addEdge(empty(), 'a', 'b', 'street', 2);
    t = removeNode(t, 'b');
    expect(t.nodes.map((n) => n.id)).toEqual(['a']);
    expect(t.edges).toHaveLength(0);
  });
});

describe('moveNode', () => {
  it('updates x and y only', () => {
    const t = moveNode(empty(), 'a', 9, 9);
    expect(t.nodes[0]).toMatchObject({ id: 'a', x: 9, y: 9 });
  });
});

describe('addEdge', () => {
  it('adds an edge between two nodes', () => {
    const t = addEdge(empty(), 'a', 'b', 'street', 3);
    expect(t.edges).toHaveLength(1);
    expect(t.edges[0]).toMatchObject({ a: 'a', b: 'b', kind: 'street', minutes: 3 });
  });

  it('rejects a self-loop', () => {
    expect(() => addEdge(empty(), 'a', 'a', 'street', 1)).toThrow();
  });

  it('rejects a duplicate edge regardless of direction', () => {
    const t = addEdge(empty(), 'a', 'b', 'street', 3);
    expect(() => addEdge(t, 'a', 'b', 'street', 5)).toThrow();
    expect(() => addEdge(t, 'b', 'a', 'path', 5)).toThrow();
  });
});

describe('removeEdge', () => {
  it('removes an edge in either direction', () => {
    const t = addEdge(empty(), 'a', 'b', 'street', 3);
    const t2 = removeEdge(t, 'b', 'a');
    expect(t2.edges).toHaveLength(0);
  });
});

describe('suggestMinutes', () => {
  it('rounds straight-line distance to whole minutes', () => {
    expect(suggestMinutes({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('never suggests zero', () => {
    expect(suggestMinutes({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(1);
  });
});

describe('validate on the real riverton town', () => {
  it('has no problems', () => {
    expect(validate(town)).toEqual([]);
  });

  it('flags a location node unreachable on foot from startNode', () => {
    const target = town.nodes.find((n) => n.location === 'lookout')!;
    const disconnected: Town = {
      ...town,
      edges: town.edges.filter((e) => e.a !== target.id && e.b !== target.id),
    };
    const problems = validate(disconnected);
    expect(problems.some((p) => p.includes(target.id) && p.includes('unreachable'))).toBe(true);
  });

  it('flags an unknown location id', () => {
    const bad: Town = {
      ...town,
      nodes: town.nodes.map((n, i) => (i === 0 ? { ...n, location: 'not_a_real_place' } : n)),
    };
    const problems = validate(bad);
    expect(problems.some((p) => p.includes('not_a_real_place'))).toBe(true);
  });
});
