/**
 * Expansion packs for the classic ruleset (DESIGN decision log 2026-09-30, "Expansions"). Each
 * pack opens some of Riverton's closed buildings and brings their goods. Chosen at new game
 * time (`GameConfig.expansions`) and fixed for the game. None of this is from the original game:
 * every number here is ours.
 */
import type { ExpansionId, ExpansionLocationId, OpenLocationId } from './ids';
import { CLASSIC_ITEMS, type ClassicItem } from './items';
import { CLASSIC_LOCATIONS, type ClassicLocation } from './locations';

export interface Expansion {
  id: ExpansionId;
  name: string;
  /** One line for the new game screen. */
  blurb: string;
  /** Towns that have its buildings. */
  towns: readonly string[];
  locations: readonly ExpansionLocationId[];
}

export const EXPANSIONS: Record<ExpansionId, Expansion> = {
  wheels_whiskers: {
    id: 'wheels_whiskers',
    name: 'Wheels & Whiskers',
    blurb: "Honest Al's Autos sells rides that cut travel time; the Pet Store sells company that cheers you up.",
    towns: ['riverton'],
    locations: ['auto', 'pet_store'],
  },
};

export const EXPANSION_LIST: Expansion[] = Object.values(EXPANSIONS);

export const EXPANSION_LOCATIONS: Record<ExpansionLocationId, ClassicLocation & { expansion: ExpansionId }> = {
  auto: {
    id: 'auto',
    name: "Honest Al's Autos",
    expansion: 'wheels_whiskers',
    openingHours: 'Open every week.',
    greetings: [
      "Welcome to Honest Al's! Every vehicle comes with a full tank of optimism.",
      "Honest Al's: we put the 'used' in used car.",
      "Welcome to Honest Al's. If it rolls, we sell it. If it doesn't, we push it.",
      "Step right up! At Honest Al's the only thing we inflate is the tyres.",
    ],
  },
  pet_store: {
    id: 'pet_store',
    name: 'Pet Store',
    expansion: 'wheels_whiskers',
    openingHours: 'Open every week.',
    greetings: [
      'Welcome to the Pet Store. Everything is for sale except the cat.',
      'Welcome! Our dragons are fire-rated and mostly house-trained.',
      'Welcome to the Pet Store, where every purchase is a lifelong commitment to vacuuming.',
      'Hello! The owl has been expecting you. The owl is always expecting you.',
    ],
  },
};

/** Weekly happiness for owning any pet, at the start of the week. Not cumulative across pets. */
export const PET_WEEKLY_HAPPINESS = 1;

/**
 * Vehicles and pets, in shelf order. A vehicle's `travelFactor` scales the walking charge: on
 * Riverton a walk costs 2h per hour band, so 0.75 / 0.625 / 0.5 / 0.375 give ×1.5 / ×1.25 / ×1 /
 * ×0.75, rounded to whole hours (`rideHours`). Vehicles break down like appliances (1/51 a week
 * new, 1/36 second-hand) and the repair bill is a share of what was paid, so a sports car costs
 * the most to fix. Pets give happiness on purchase and `PET_WEEKLY_HAPPINESS` while owned.
 */
export const EXPANSION_ITEMS: Record<string, ClassicItem> = {
  skateboard: {
    id: 'skateboard', name: 'Skateboard', category: 'vehicle', store: 'auto', price: 80, happiness: 1,
    travelFactor: 0.75, verb: 'Skated', notes: 'Travel ×1.5 instead of ×2 on Riverton.', wildWillyExempt: false,
  },
  bicycle: {
    id: 'bicycle', name: 'Bicycle', category: 'vehicle', store: 'auto', price: 240, happiness: 1,
    travelFactor: 0.625, verb: 'Cycled', notes: 'Travel ×1.25 instead of ×2 on Riverton.', wildWillyExempt: false,
  },
  used_car: {
    id: 'used_car', name: 'Used Car', category: 'vehicle', store: 'auto', price: 1500, happiness: 2,
    travelFactor: 0.5, verb: 'Drove', notes: 'Travel ×1 instead of ×2 on Riverton.', wildWillyExempt: false,
  },
  sports_car: {
    id: 'sports_car', name: 'Sports Car', category: 'vehicle', store: 'auto', price: 7500, happiness: 4,
    travelFactor: 0.375, verb: 'Raced', notes: 'Travel ×0.75 instead of ×2 on Riverton.', wildWillyExempt: false,
  },
  goldfish: {
    id: 'goldfish', name: 'Goldfish', category: 'pet', store: 'pet_store', price: 30, happiness: 1,
    notes: 'Swims along behind you.', wildWillyExempt: true,
  },
  cat: {
    id: 'cat', name: 'Cat', category: 'pet', store: 'pet_store', price: 120, happiness: 2,
    notes: 'Follows you, when it feels like it.', wildWillyExempt: true,
  },
  dog: {
    id: 'dog', name: 'Dog', category: 'pet', store: 'pet_store', price: 200, happiness: 2,
    notes: 'Follows you everywhere.', wildWillyExempt: true,
  },
  clownfish: {
    id: 'clownfish', name: 'Clownfish', category: 'pet', store: 'pet_store', price: 650, happiness: 3,
    notes: 'Follows you around town. Do not ask how.', wildWillyExempt: true,
  },
  owl: {
    id: 'owl', name: 'Owl', category: 'pet', store: 'pet_store', price: 650, happiness: 3,
    notes: 'Flies along behind you.', wildWillyExempt: true,
  },
  dragon: {
    id: 'dragon', name: 'Dragon', category: 'pet', store: 'pet_store', price: 4000, happiness: 5,
    notes: 'Flies along behind you. Mind the hedges.', wildWillyExempt: true,
  },
};

export const EXPANSION_ITEM_LIST: ClassicItem[] = Object.values(EXPANSION_ITEMS);

/** Every item the classic ruleset knows: the original's 19 and the expansions' goods. */
export const ALL_CLASSIC_ITEMS: Record<string, ClassicItem> = { ...CLASSIC_ITEMS, ...EXPANSION_ITEMS };

/** Name, greetings and quotes for any openable building. */
export function locationInfo(id: string): ClassicLocation | undefined {
  return CLASSIC_LOCATIONS[id as keyof typeof CLASSIC_LOCATIONS] ?? EXPANSION_LOCATIONS[id as ExpansionLocationId];
}

/** The expansions a town can host. */
export function expansionsFor(townId: string): Expansion[] {
  return EXPANSION_LIST.filter((x) => x.towns.includes(townId));
}

/** Is this building open in a game with these expansions? The 13 classic buildings always are. */
export function isOpenLocation(id: string | null | undefined, expansions: readonly string[] | undefined): id is OpenLocationId {
  if (!id) return false;
  if (CLASSIC_LOCATIONS[id as keyof typeof CLASSIC_LOCATIONS]) return true;
  const x = EXPANSION_LOCATIONS[id as ExpansionLocationId];
  return !!x && !!expansions?.includes(x.expansion);
}

/** Why a config's expansions are not playable, or null. */
export function expansionProblem(townId: string, expansions: readonly string[] | undefined): string | null {
  for (const id of expansions ?? []) {
    const x = EXPANSIONS[id as ExpansionId];
    if (!x) return `Unknown expansion: ${id}`;
    if (!x.towns.includes(townId)) return `${x.name} needs the Jones 2 map`;
  }
  return null;
}
