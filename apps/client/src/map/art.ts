/**
 * THE ART ADAPTER — the only file that knows where sprites come from.
 *
 * The renderer asks for an `ArtSet` and blits whatever comes back. Sprites are
 * generated once and cached. Buildings without an explicit `pixel` recipe in
 * the town JSON get one inferred from their sim location id; anything the
 * catalogue does not know yet becomes a house with the location name on a
 * plate, so the town never has holes while the catalogue grows.
 */
import type { TownNode } from '@jones2/town';
import {
  CAR_HEADINGS,
  CHARACTERS,
  LOCATION_RECIPES,
  NATURE,
  PALETTE,
  PET_IDS,
  PET_MOTION,
  PROPS,
  SKY,
  TILES,
  UI,
  bicycle,
  buildFromRef,
  carTopDown,
  petSprite,
  rideCar,
  skateboard,
  tintCharacter,
  walkFrame,
  type PetId,
} from '@jones2/pixelart';
import type { Palette, PixelBuildingRef, Sprite } from './pixelart';

export type TileKind = 'grass' | 'water' | 'path' | 'plaza';
export type Direction = 's' | 'n' | 'e' | 'w';

export interface ArtSet {
  palette: Palette;
  /** Building for a node. `ref` comes from the town JSON when present. */
  building(ref: PixelBuildingRef | undefined, node: TownNode): Sprite;
  tile(kind: TileKind, variant: number): Sprite;
  nature(kind: string): Sprite;
  character(dir: Direction, frame: number, tintIndex: number): Sprite;
  /**
   * A UI sprite by catalogue name (`token_1`, `sign_closed`, ...). Optional so
   * hand-rolled test art sets stay valid; see the MARKERS note in `figures.ts`.
   */
  ui?(name: string): Sprite | undefined;
  /** A driving car pointing along `angle` (radians, 0 = east), in one of the catalogue's colours. */
  vehicle?(angle: number, colour: number): Sprite;
  /** A sky sprite by catalogue name (`bird_0`, `plane_e`, `heli_w_1`, ...). */
  sky?(name: string): Sprite | undefined;
  /** A skateboard or bicycle facing `dir`, ridden under a walker. */
  ride?(kind: 'skateboard' | 'bicycle', dir: Direction): Sprite;
  /** A player's car along `angle` (radians, 0 = east), painted in palette indices `face`/`shade`. */
  playerCar?(kind: 'used_car' | 'sports_car', angle: number, face: number, shade: number): Sprite;
  /** A pet facing east or west, frame 0 or 1; undefined for an unknown pet. */
  pet?(id: string, dir: 'e' | 'w', frame: number): Sprite | undefined;
}

/**
 * Native pixels per town unit. Riverton's coordinates predate the pixel-art
 * scale (buildings are 64–96 px), so units are scaled up until the town is
 * re-authored at 1 unit = 1 px. Must stay an integer.
 */
export const PX_PER_UNIT = 1;

/** Tile size in native pixels. Matches the art package's 16px tile grid. */
export const TILE = 16;

export function inferRef(node: TownNode): PixelBuildingRef {
  const loc = node.location ?? '';
  return LOCATION_RECIPES[loc] ?? { kind: 'house', params: { sign: (node.name ?? loc).toUpperCase().slice(0, 12) } };
}

function realArt(): ArtSet {
  const buildings = new Map<string, Sprite>();
  const chars = new Map<string, Sprite>();
  const vehicles = new Map<string, Sprite>();
  return {
    palette: PALETTE,
    building(ref, node) {
      const r = ref ?? inferRef(node);
      const key = JSON.stringify(r);
      let s = buildings.get(key);
      if (!s) {
        s = buildFromRef(r.kind, r.params);
        buildings.set(key, s);
      }
      return s;
    },
    tile(kind, variant) {
      const n = kind === 'grass' ? 3 : kind === 'water' ? 2 : 1;
      const name = n === 1 ? kind : `${kind}_${((variant % n) + n) % n}`;
      return TILES[name] ?? TILES.grass_0!;
    },
    nature(kind) {
      return NATURE[kind] ?? PROPS[kind] ?? NATURE[`tree_${kind}`] ?? NATURE.tree_round!;
    },
    character(dir, frame, tintIndex) {
      const key = `${dir}|${((frame % 3) + 3) % 3}|${tintIndex}`;
      let s = chars.get(key);
      if (!s) {
        s = tintCharacter(CHARACTERS[walkFrame(dir, frame)]!, tintIndex);
        chars.set(key, s);
      }
      return s;
    },
    ui(name) {
      return UI[name];
    },
    vehicle(angle, colour) {
      const step = (Math.PI * 2) / CAR_HEADINGS;
      const idx = ((Math.round(angle / step) % CAR_HEADINGS) + CAR_HEADINGS) % CAR_HEADINGS;
      const key = `car|${idx}|${colour}`;
      let s = vehicles.get(key);
      if (!s) {
        s = carTopDown(idx * step, colour);
        vehicles.set(key, s);
      }
      return s;
    },
    sky(name) {
      return SKY[name];
    },
    ride(kind, dir) {
      const key = `ride|${kind}|${dir}`;
      let s = vehicles.get(key);
      if (!s) {
        s = kind === 'skateboard' ? skateboard(dir) : bicycle(dir);
        vehicles.set(key, s);
      }
      return s;
    },
    playerCar(kind, angle, face, shade) {
      const step = (Math.PI * 2) / CAR_HEADINGS;
      const idx = ((Math.round(angle / step) % CAR_HEADINGS) + CAR_HEADINGS) % CAR_HEADINGS;
      const key = `pcar|${kind}|${idx}|${face}|${shade}`;
      let s = vehicles.get(key);
      if (!s) {
        s = rideCar(idx * step, kind, face, shade);
        vehicles.set(key, s);
      }
      return s;
    },
    pet(id, dir, frame) {
      return (PET_IDS as readonly string[]).includes(id) ? petSprite(id as PetId, dir, frame) : undefined;
    },
  };
}

let cached: ArtSet | null = null;

/** The art the renderer draws with. Cached; sprites are generated once. */
export function getArt(): ArtSet {
  if (!cached) cached = realArt();
  return cached;
}

/** Test/demo hook: drop the cache so a different ArtSet can be installed. */
export function setArt(art: ArtSet | null): void {
  cached = art;
}

/** Kept for the demo; the real catalogue is always in use now. */
export function usingPlaceholderArt(): boolean {
  return false;
}

/** The town JSON may carry an optional `pixel` recipe per node. */
export function pixelRef(node: TownNode): PixelBuildingRef | undefined {
  return (node as TownNode & { pixel?: PixelBuildingRef }).pixel;
}

/** How a pet moves on the map ('ground', 'swim' or 'fly'); 'ground' for anything unknown. */
export function petMotion(id: string): 'ground' | 'swim' | 'fly' {
  return PET_MOTION[id as PetId] ?? 'ground';
}
