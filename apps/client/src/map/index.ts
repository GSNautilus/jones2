/** Public surface of the town renderer. `api.ts` is the contract. */
export type {
  CreateTownScene,
  FigurePose,
  FigureStyle,
  PickResult,
  TownScene,
  TownSceneOptions,
} from './api';
export { createTownScene } from './TownScene';
export { MapCanvas, useTownScene, type MapCanvasProps } from './MapCanvas';
export { getArt, setArt, PX_PER_UNIT, TILE, type ArtSet } from './art';
