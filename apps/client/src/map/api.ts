/**
 * CONTRACT: the town renderer's public surface. Everything outside `src/map/`
 * talks to the scene only through this interface. Implemented in
 * `src/map/TownScene.ts` and created with `createTownScene()`.
 *
 * Coordinate conventions
 * - Town units come from the town JSON: `x` runs east, `y` runs south. Every
 *   coordinate crossing this interface (`panTo`, `PickResult`) is in town units.
 * - The renderer is 2D pixel art with a fixed top-down camera, so there is no
 *   rotation: `rotate()` is accepted and ignored. `zoom()` steps through integer
 *   zoom levels (factor < 1 zooms in, > 1 zooms out). `panTo()` centres the view
 *   on a town point.
 */
import type { NodeId, Town, TransportMode } from '@jones2/town';

export interface FigureStyle {
  /** Hex colour for the figure's body. */
  color: string;
  /** Short label shown above the figure (player name). */
  label: string;
  /** Drawn larger and bobbing: the player whose turn it is. Only a token figure changes. */
  emphasis?: boolean;
  /** What the figure is doing right now, in a bubble above the name plate (the week recap). */
  caption?: string;
  /** A pet that follows the figure (a sim item id: 'dog', 'clownfish'...). Token figures only. */
  pet?: string;
}

/** Where a figure is, either standing at a node or part-way along an edge. */
export type FigurePose =
  | { kind: 'at'; node: NodeId; ghost?: boolean; mode?: TransportMode }
  | {
      kind: 'between';
      from: NodeId;
      to: NodeId;
      t: number;
      ghost?: boolean;
      mode?: TransportMode;
      /** What a token figure rides while moving (a sim item id: 'bicycle', 'sports_car'...). */
      vehicle?: string;
    };

export interface PickResult {
  /** Node under the cursor, if any (location nodes and junctions). */
  node: NodeId | null;
  /** Ground position in town units, always set. */
  x: number;
  y: number;
}

export interface TownSceneOptions {
  /** Called on click. */
  onPick?: (hit: PickResult) => void;
  /** Called on pointer move, throttled by the renderer. */
  onHover?: (hit: PickResult) => void;
  /** Editor mode: draw junctions as visible handles and show edge midpoints. */
  editable?: boolean;
  /**
   * Editor mode only. A left-drag that starts on a node becomes a node drag
   * instead of a camera pan: onDragStart(hit on the node), onDrag(ground hit)
   * per move, onDragEnd() on release. A click without movement still fires onPick.
   */
  onDragStart?: (hit: PickResult) => void;
  onDrag?: (hit: PickResult) => void;
  onDragEnd?: () => void;
  /** Ambient life (traffic, birds, aircraft). Defaults to on, unless the user prefers reduced motion. */
  ambient?: boolean;
}

export interface TownScene {
  /** Attach to a canvas and start the render loop. Idempotent. */
  mount(canvas: HTMLCanvasElement): void;
  /** Detach from the canvas and stop the loop, keeping the town, figures, and camera so a later mount() resumes. */
  unmount(): void;
  /** Stop rendering and free GPU resources. */
  dispose(): void;
  /** Replace the town. Rebuilds roads, buildings, decor. Cheap enough to call from an editor on every change. */
  setTown(town: Town): void;
  /** Highlight these nodes (e.g. reachable destinations). Empty clears. */
  setHighlight(nodeIds: NodeId[]): void;
  /** Draw a route as a line on the ground. Null clears. */
  setRoute(path: NodeId[] | null): void;
  /** Declare which figures exist and how they look. Figures not listed are removed. */
  setFigures(figures: Record<string, FigureStyle>): void;
  /** Move figures. Figures not listed keep their previous pose. */
  setPoses(poses: Record<string, FigurePose>): void;
  /** Camera follows this figure until null is passed. */
  follow(figureId: string | null): void;
  /** Accepted and ignored: the camera is fixed top-down. Kept so callers need not change. */
  rotate(quarterTurns: number): void;
  zoom(factor: number): void;
  panTo(x: number, y: number): void;
  /** Fit the whole town in view. */
  fitAll(): void;
  /** Turn the ambient life (cars, birds, aircraft) on or off. */
  setAmbient(on: boolean): void;
  /** Turn the ambient life (cars, birds, aircraft) on or off. */
  setAmbient(on: boolean): void;
  /** Re-read canvas size. Call on window resize. */
  resize(): void;
  /** Editor support: move a node's visual immediately without a full rebuild. */
  moveNode(id: NodeId, x: number, y: number): void;
}

export type CreateTownScene = (options?: TownSceneOptions) => TownScene;
