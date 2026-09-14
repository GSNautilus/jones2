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

export interface TownNode {
  id: NodeId;
  /** Display name. Junctions can be unnamed. */
  name?: string;
  /** World position in town units (renderer decides the scale). */
  x: number;
  y: number;
  /** If this node is a place the player can act at, the sim location id. */
  location?: LocationId;
}

export interface TownEdge {
  a: NodeId;
  b: NodeId;
  /** Base travel time in minutes on foot. Modes scale this. */
  minutes: number;
  kind: RoadKind;
}

export interface Town {
  id: string;
  name: string;
  /** Node every player starts the game at. */
  startNode: NodeId;
  nodes: TownNode[];
  edges: TownEdge[];
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
