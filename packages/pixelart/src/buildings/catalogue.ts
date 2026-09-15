/** Every building generator, keyed by the `kind` used in `PixelBuildingRef`. */
import type { Sprite } from '../types';
import type { BuildingGenerator, Params } from './common';
import { monolith } from './monolith';
import { bank } from './bank';
import { zmart } from './zmart';
import { university } from './university';
import { factory } from './factory';
import { house } from './house';

export const BUILDINGS: Record<string, BuildingGenerator> = {
  monolith,
  bank,
  zmart,
  university,
  factory,
  house,
};

/** Build a sprite from a town node's `pixel` recipe. Unknown kinds fall back to a house. */
export function buildFromRef(kind: string, params?: Params): Sprite {
  const gen = BUILDINGS[kind] ?? BUILDINGS.house;
  return gen(params);
}
