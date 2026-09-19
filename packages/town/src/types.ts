/**
 * Town graph schema. The town is pure data: nodes (places and junctions),
 * edges (roads with a base travel time), and lots (where a building recipe
 * sits, for the renderer). Movement, travel cost, and the replay all run on
 * this graph. The renderer draws whatever it likes on top.
 */

export type NodeId = string;
export type LocationId = string;

/** Road kinds restrict which transport modes may use an edge. */
export type RoadKind = 'street' | 'path' | 'highway' | 'busline';

export type TransportMode = 'walk' | 'bike' | 'bus' | 'car';

/**
 * How the renderer draws a location's building. Purely visual: the sim never
 * reads this. Town units: 1 unit = 1 metre-ish; x runs east, y runs south.
 */
export interface BuildingRecipe {
  width: number;
  depth: number;
  height: number;
  /** Hex colour of the walls. */
  color: string;
  roof: 'flat' | 'gable' | 'hip' | 'none';
  roofColor?: string;
  /** Text on the sign. Defaults to the node name. */
  sign?: string;
  /** One landmark prop on or beside the building. */
  prop?: 'burger' | 'tree' | 'chimney' | 'antenna' | 'fountain' | 'car' | 'book' | 'dumbbell' | 'cross' | 'dollar' | 'none';
  /** Quarter turns clockwise from facing south (toward +y). The door is on the facing side. */
  facing: 0 | 1 | 2 | 3;
}

export interface Decor {
  /**
   * Area kinds (water, grass, plaza, path) fill a w×h rectangle with tiles.
   * Anything else is a sprite from the pixelart NATURE or PROPS catalogues
   * (tree_round, tree_pine, tree_oak, bush, flowers, rock, lamp, bench, car,
   * bus, signpost, hydrant, mailbox, ...). 'tree' is an alias for tree_round.
   *
   * Two kinds mark road crossings and are placed by the generator, one per
   * crossing, at the crossing's midpoint:
   * - 'bridge': a road crosses a water course. The renderer draws the deck
   *   along the road, so the road stays walkable over the water.
   * - 'viaduct': the highway's own span over a water course. Drawn like a
   *   bridge, but kept a separate kind so 'bridge' stays the count of the
   *   crossings a walker can actually use.
   * - 'underpass': a street passes under the highway. There is deliberately
   *   no junction node there; walkers cannot get onto the highway.
   */
  kind: string;
  x: number;
  y: number;
  /** Size for area decor (water, grass, plaza). */
  w?: number;
  h?: number;
  /**
   * Unit tangent of the road at a crossing (bridge, underpass), so the
   * renderer can lay the deck or the tunnel mouth along the road rather than
   * axis-aligned. Absent for ordinary props.
   */
  dir?: { x: number; y: number };
}

/**
 * A river or lake authored the way a street is: a smooth curve through
 * `points` (in order) with a drawn `width` in town units. The renderer
 * rasterises it like a road and outlines the water mask to get the
 * shoreline, so the water meanders instead of stair-stepping. Roads that
 * cross it need a 'bridge' decor; the generator finds those crossings.
 */
export interface WaterCourse {
  id: string;
  /** Waypoints the curve passes through, at least two. */
  points: { x: number; y: number }[];
  /** Drawn width in town units. May vary along the course later; one value for now. */
  width: number;
}

export interface TownNode {
  id: NodeId;
  /** Display name. Junctions can be unnamed. */
  name?: string;
  /** World position in town units (renderer decides the scale). */
  x: number;
  y: number;
  /** If this node is a place the player can act at, the sim location id. */
  location?: LocationId;
  /** Legacy 3D recipe; unused by the pixel renderer. */
  building?: BuildingRecipe;
  /**
   * Pixel-art recipe: a generator kind from the @jones2/pixelart catalogue
   * plus its parameters. Nodes without one get a recipe inferred from their
   * sim location id.
   */
  pixel?: { kind: string; params?: Record<string, string | number | boolean> };
  /**
   * Draw the building sprite with its anchor displaced from the node by this
   * much, in town units. The node itself stays where routes end and figures
   * stand. The classic ring uses it: every building's node is ON the walkway,
   * and the sprite hangs off it outward (above the top row, below the bottom
   * row, beside the columns), the way the original board is drawn.
   */
  spriteOffset?: { x: number; y: number };
}

export interface TownEdge {
  a: NodeId;
  b: NodeId;
  /** Base travel time in minutes on foot. Modes scale this. */
  minutes: number;
  kind: RoadKind;
  /**
   * Optional control points between a and b, in order, in town units. The
   * road is drawn as a smooth curve through a, these points, and b; figures
   * follow the same curve. Travel time is still `minutes`, not curve length.
   */
  curve?: { x: number; y: number }[];
  /**
   * Optional street id. Edges sharing a street id form one continuous road:
   * the renderer joins them end to end and draws a single stroke with
   * unbroken dashes through their shared junctions. Edges without one are
   * drawn on their own.
   */
  street?: string;
}

export interface Town {
  id: string;
  name: string;
  /** Node every player starts the game at. */
  startNode: NodeId;
  /**
   * Size of the authored canvas in town units. Tools (preview, overlap
   * checker, tests) read it from here instead of hardcoding it. The renderer
   * still derives its bounds from the content.
   */
  canvas?: { w: number; h: number };
  /**
   * The classic ruleset charges every trip its whole hours (`routeHours`)
   * times this. Riverton sets 2 (decided 2026-09-18: the big map felt too
   * cheap to cross); the classic ring sets 1 so a lap costs the original's
   * ten hours. Absent means 1.
   */
  travelHourMultiplier?: number;
  nodes: TownNode[];
  edges: TownEdge[];
  /** Rivers and lakes as curves. Rectangle 'water' decor still works for small ponds. */
  water?: WaterCourse[];
  /** Visual-only scenery. */
  decor?: Decor[];
}

export interface TransportProfile {
  mode: TransportMode;
  /** Multiplier applied to an edge's base minutes. */
  speed: number;
  /** Road kinds this mode may travel on. */
  roads: RoadKind[];
  /** Flat minutes added per trip (boarding, parking). */
  overhead: number;
}

export interface Route {
  from: NodeId;
  to: NodeId;
  mode: TransportMode;
  path: NodeId[];
  minutes: number;
}
