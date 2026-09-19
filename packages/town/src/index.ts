export * from './types';
export * from './graph';
export { default as riverton } from './towns/riverton.json';
export { default as classic } from './towns/classic.json';

import type { Town } from './types';
import rivertonJson from './towns/riverton.json';
import classicJson from './towns/classic.json';

/**
 * Every playable town by id. `GameConfig.townId` indexes this: 'riverton' is
 * the Jones 2 map, 'classic' the original's ring.
 */
export const TOWNS: Record<string, Town> = {
  riverton: rivertonJson as Town,
  classic: classicJson as Town,
};
