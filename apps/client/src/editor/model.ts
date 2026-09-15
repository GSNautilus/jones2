/**
 * Pure functions over a `Town`. Every mutator returns a new `Town`; nothing
 * here touches the DOM, three.js, or React. `EditorPanel.tsx` is the only
 * consumer inside this package, but these are plain enough to unit test on
 * their own (see `test/editor/model.test.ts`).
 */
import { LOCATIONS } from '@jones2/sim';
import { TownGraph } from '@jones2/town';
import type { BuildingRecipe, Decor, LocationId, NodeId, RoadKind, Town, TownEdge, TownNode } from '@jones2/town';

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s || 'node';
}

/** Pick an id that doesn't collide with an existing node. */
function uniqueId(town: Town, base: string): string {
  if (!town.nodes.some((n) => n.id === base)) return base;
  let i = 2;
  while (town.nodes.some((n) => n.id === `${base}_${i}`)) i++;
  return `${base}_${i}`;
}

/** Next free `j_<n>` id for unnamed junctions. */
function nextJunctionId(town: Town): string {
  let max = 0;
  for (const n of town.nodes) {
    const m = /^j_(\d+)$/.exec(n.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `j_${max + 1}`;
}

export interface AddNodeOptions {
  id?: string;
  name?: string;
  location?: LocationId;
  building?: BuildingRecipe;
}

export function addNode(town: Town, x: number, y: number, opts: AddNodeOptions = {}): Town {
  const id = opts.id ? uniqueId(town, opts.id) : opts.name ? uniqueId(town, slugify(opts.name)) : nextJunctionId(town);
  const node: TownNode = { id, x, y };
  if (opts.name !== undefined) node.name = opts.name;
  if (opts.location !== undefined) node.location = opts.location;
  if (opts.building !== undefined) node.building = opts.building;
  return { ...town, nodes: [...town.nodes, node] };
}

export function removeNode(town: Town, id: NodeId): Town {
  return {
    ...town,
    nodes: town.nodes.filter((n) => n.id !== id),
    edges: town.edges.filter((e) => e.a !== id && e.b !== id),
  };
}

export function moveNode(town: Town, id: NodeId, x: number, y: number): Town {
  return {
    ...town,
    nodes: town.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
  };
}

export function updateNode(town: Town, id: NodeId, partial: Partial<Omit<TownNode, 'id'>>): Town {
  return {
    ...town,
    nodes: town.nodes.map((n) => (n.id === id ? { ...n, ...partial } : n)),
  };
}

function edgeMatches(e: TownEdge, a: NodeId, b: NodeId): boolean {
  return (e.a === a && e.b === b) || (e.a === b && e.b === a);
}

export function addEdge(town: Town, a: NodeId, b: NodeId, kind: RoadKind, minutes: number): Town {
  if (a === b) throw new Error(`Cannot connect a node to itself (${a}).`);
  if (town.edges.some((e) => edgeMatches(e, a, b))) {
    throw new Error(`An edge between ${a} and ${b} already exists.`);
  }
  const edge: TownEdge = { a, b, kind, minutes };
  return { ...town, edges: [...town.edges, edge] };
}

export function removeEdge(town: Town, a: NodeId, b: NodeId): Town {
  return { ...town, edges: town.edges.filter((e) => !edgeMatches(e, a, b)) };
}

export function updateEdge(town: Town, a: NodeId, b: NodeId, partial: Partial<Pick<TownEdge, 'kind' | 'minutes'>>): Town {
  return {
    ...town,
    edges: town.edges.map((e) => (edgeMatches(e, a, b) ? { ...e, ...partial } : e)),
  };
}

export function setBuilding(town: Town, nodeId: NodeId, recipe: BuildingRecipe | undefined): Town {
  return {
    ...town,
    nodes: town.nodes.map((n) => {
      if (n.id !== nodeId) return n;
      if (recipe === undefined) {
        const { building, ...rest } = n;
        return rest;
      }
      return { ...n, building: recipe };
    }),
  };
}

export function addDecor(town: Town, decor: Decor): Town {
  return { ...town, decor: [...(town.decor ?? []), decor] };
}

export function removeDecor(town: Town, index: number): Town {
  return { ...town, decor: (town.decor ?? []).filter((_, i) => i !== index) };
}

export function updateDecor(town: Town, index: number, partial: Partial<Decor>): Town {
  return {
    ...town,
    decor: (town.decor ?? []).map((d, i) => (i === index ? { ...d, ...partial } : d)),
  };
}

export function setStartNode(town: Town, id: NodeId): Town {
  return { ...town, startNode: id };
}

/** A plain, editable default recipe so a newly-marked location isn't invisible. */
export function defaultRecipe(name: string): BuildingRecipe {
  return {
    width: 8,
    depth: 8,
    height: 5,
    color: '#c9c2a8',
    roof: 'flat',
    facing: 0,
    sign: name.toUpperCase(),
  };
}

/** Straight-line distance rounded to whole minutes, used to seed a new edge's `minutes`. */
export function suggestMinutes(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy) * 1.0));
}

export function validate(town: Town): string[] {
  const problems: string[] = [];

  const seenIds = new Set<NodeId>();
  for (const n of town.nodes) {
    if (seenIds.has(n.id)) problems.push(`Duplicate node id: ${n.id}`);
    seenIds.add(n.id);
  }

  for (const e of town.edges) {
    if (!seenIds.has(e.a)) problems.push(`Edge references unknown node: ${e.a}`);
    if (!seenIds.has(e.b)) problems.push(`Edge references unknown node: ${e.b}`);
    if (e.minutes <= 0) problems.push(`Edge ${e.a} - ${e.b} has non-positive minutes (${e.minutes}).`);
  }

  const locationOwners = new Map<LocationId, NodeId[]>();
  for (const n of town.nodes) {
    if (n.location === undefined) continue;
    if (!(n.location in LOCATIONS)) {
      problems.push(`Node ${n.id} uses unknown location id "${n.location}".`);
    }
    if (!n.building) {
      problems.push(`Location node ${n.id} (${n.location}) has no building.`);
    }
    const owners = locationOwners.get(n.location) ?? [];
    owners.push(n.id);
    locationOwners.set(n.location, owners);
  }
  for (const [loc, owners] of locationOwners) {
    if (owners.length > 1) {
      problems.push(`Location id "${loc}" is used by more than one node: ${owners.join(', ')}.`);
    }
  }

  if (!seenIds.has(town.startNode)) {
    problems.push(`startNode "${town.startNode}" does not exist.`);
  } else {
    // Reachability: only meaningful once the graph itself is well-formed
    // (no dangling edges), otherwise TownGraph's constructor throws.
    const danglingEdges = town.edges.some((e) => !seenIds.has(e.a) || !seenIds.has(e.b));
    if (!danglingEdges) {
      const graph = new TownGraph(town);
      for (const n of town.nodes) {
        if (n.location === undefined) continue;
        const route = graph.route(town.startNode, n.id, 'walk');
        if (!route) {
          problems.push(`Location node ${n.id} (${n.location}) is unreachable on foot from startNode.`);
        }
      }
    }
  }

  return problems;
}
