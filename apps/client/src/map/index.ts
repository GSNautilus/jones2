/** Public surface of the town renderer. Nothing outside imports three.js. */
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
