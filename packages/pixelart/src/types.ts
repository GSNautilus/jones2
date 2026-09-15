/**
 * CONTRACT: pixel art as code. Everything in this package is pure TypeScript
 * with no DOM dependency, so sprites can be generated in Node (contact sheets,
 * tests) and in the browser (the renderer paints them into a canvas).
 *
 * A sprite is an indexed-colour grid: `pixels[y * width + x]` is a palette
 * index, or 0 for transparent. Index 0 is always transparent.
 */

export type RGB = readonly [number, number, number];

export interface Palette {
  /** Index 0 is transparent and must be present. */
  colors: RGB[];
  /** Named lookups into `colors`, e.g. `ink`, `grass`, `brick`. */
  names: Record<string, number>;
}

export interface Sprite {
  width: number;
  height: number;
  /** Palette indices, row-major, length width*height. */
  pixels: Uint8Array;
  /** Anchor in sprite pixels: the point placed at the world position (usually bottom-centre of the footprint). */
  anchorX: number;
  anchorY: number;
  /** Ground footprint in pixels around the anchor, used for picking and shadow. */
  footprintW: number;
  footprintH: number;
}

/** A named sprite in a sheet. Animations are numbered frames: `walk_s_0`, `walk_s_1`, ... */
export type SpriteMap = Record<string, Sprite>;

/** Drawing target abstraction so the DSL never touches a canvas directly. */
export interface Surface {
  width: number;
  height: number;
  pixels: Uint8Array;
}

/** Building sprite recipe: which generator to run and its parameters. Kept in the town JSON as `node.pixel`. */
export interface PixelBuildingRef {
  /** Generator id from the building catalogue, e.g. 'monolith', 'house', 'shop'. */
  kind: string;
  /** Free-form parameters the generator accepts (colours, sign text, width in tiles, ...). */
  params?: Record<string, string | number | boolean>;
}
