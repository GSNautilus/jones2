import type { ClassicClothingTier, ClassicItemId } from './ids';

/**
 * Socket City and Z-Mart goods: Durables (Appliances + Books) and Z-Mart-only Tickets/Junk.
 * Source: "# Appliances" (3673-3752), "# Durables" (3755-3808), "# Socket City" > "## Items"
 * (3448-3493), "# Z-Mart" > "## Items" (3218-3294), "# Junk" (3863-3897).
 *
 * Tickets and Junk are recorded here too (they're Z-Mart goods); Clothes live in clothes.ts,
 * Food/Lottery/Newspaper live in food.ts and economy.ts per the task's table split.
 */
export type ClassicItemCategory = 'appliance' | 'book' | 'ticket' | 'junk' | 'vehicle' | 'pet';

export interface ClassicItem {
  id: ClassicItemId;
  name: string;
  category: ClassicItemCategory;
  /** Base price at Socket City. Appliances only (Socket City doesn't sell tickets/junk/books). */
  socketCityPrice?: number;
  /** Base price at Z-Mart. Undefined = not sold at Z-Mart (e.g. Freezer, Hot Tub, Computer). */
  zmartPrice?: number;
  /** Happiness on first purchase this turn (purchase rules vary — see notes). */
  happiness: number;
  notes: string;
  /**
   * Whether this Durable is exempt from Wild Willy's Low-Cost apartment robbery.
   *
   * CONTRADICTION: three sections disagree on which items are exempt.
   * - "# Low-Cost Housing" > "## Events" (1147-1155) says only Refrigerator/Freezer/Stove are
   *   exempt (implying everything else, including the Hot Tub, is stealable).
   * - The Durables table (3794-3806) marks Fridge/Freezer/Stove/Encyclopedia/Dictionary/Atlas
   *   "Can't be stolen", AND separately marks the Hot Tub "Can't be stolen" too.
   * - "# Wild Willy" > "## Apartment Robbery" > "### Exceptions" (6761-6787) — the most specific,
   *   dedicated section — lists exactly 7 exempt items: Refrigerator, Freezer, Stove, Computer,
   *   Encyclopedia, Dictionary, Atlas. The Hot Tub is *not* on this list.
   * Followed the dedicated Exceptions section (Hot Tub is stealable).
   */
  wildWillyExempt: boolean;
  /** Reduces lessons-to-graduate by 1 alone (Computer) or as a trio (the three books). "### Extra Credit" (2638-2668). */
  extraCredit?: 'computer' | 'reference_set';
  /** Expansion goods (expansions.ts): the one store that sells it, and its base price there. */
  store?: 'auto' | 'pet_store';
  price?: number;
  /** Vehicles: travel hours as a fraction of walking's. */
  travelFactor?: number;
  /** Vehicles: the verb for a trip ("Drove"). */
  verb?: string;
}

// "## Repairs" (3704-3750): breakage is checked only if the player has > $500 Cash.
export const APPLIANCE_BREAKAGE_MIN_CASH = 500;
/** Chance an owned Appliance breaks this turn, by where the *current* unit was bought/acquired. */
export const APPLIANCE_BREAK_CHANCE: Record<'socket_city' | 'zmart' | 'pawn_shop', number> = {
  socket_city: 1 / 51,
  zmart: 1 / 36,
  pawn_shop: 1 / 36,
};
/**
 * NOTE: "# Happiness Goal" (271) gives rougher figures — "Chance is 1/35 or 1/50 per Appliance" —
 * that don't match the dedicated "# Appliances" > "## Repairs" percentages above (1/51, 1/36).
 * Followed the dedicated Appliances section as the more specific/precise source.
 */
export const REPAIR_COST_FRACTION = { min: 1 / 20, max: 1 / 4 } as const;
export const APPLIANCE_BREAK_HAPPINESS = -1;

// "# Pawn Shop" (6043-6159).
export const PAWN_FACTOR = 0.4; // player receives 40% of original purchase price, economy-adjusted
export const REDEEM_FACTOR = 0.5; // costs 50% of original purchase price, NOT economy-adjusted
export const REDEEM_WEEKS = 3; // including the week it was pawned
export const PAWN_SHOP_CAPACITY = 6; // distinct items held at once, across all players
export const PAWN_HAPPINESS = -1;
/** Extra -1 (on top of PAWN_HAPPINESS) if pawning a Refrigerator while owning Fresh Food. */
export const PAWN_FRIDGE_WITH_FOOD_HAPPINESS = -1;
/** Buying an Appliance from the Pawn Shop flags it as second-hand: same break chance as Z-Mart. */
export const PAWN_SHOP_APPLIANCE_BREAK_CHANCE = APPLIANCE_BREAK_CHANCE.pawn_shop;

export const CLASSIC_ITEMS: Record<ClassicItemId, ClassicItem> = {
  // Appliances — "# Appliances" > "## List of Appliances" (3689-3703)
  fridge: {
    id: 'fridge', name: 'Refrigerator', category: 'appliance', socketCityPrice: 876, zmartPrice: 650, happiness: 1,
    notes: 'Prevents 6 units of Fresh Food from spoiling (12 with a Freezer too). Required to avoid Fresh Food spoilage.',
    wildWillyExempt: true,
  },
  freezer: {
    id: 'freezer', name: 'Freezer', category: 'appliance', socketCityPrice: 513, happiness: 2,
    notes: 'With a Refrigerator, raises Fresh Food storage to 12 units.',
    wildWillyExempt: true,
  },
  stove: {
    id: 'stove', name: 'Stove', category: 'appliance', socketCityPrice: 570, zmartPrice: 490, happiness: 1,
    notes: '+1 Happiness at the start of each turn (not cumulative with the Microwave).',
    wildWillyExempt: true,
  },
  color_tv: {
    id: 'color_tv', name: 'Color TV', category: 'appliance', socketCityPrice: 525, zmartPrice: 450, happiness: 2,
    notes: 'Displayed at the Security Apartment.', wildWillyExempt: false,
  },
  vcr: {
    id: 'vcr', name: 'VCR', category: 'appliance', socketCityPrice: 333, zmartPrice: 250, happiness: 2,
    notes: 'Displayed at the Security Apartment.', wildWillyExempt: false,
  },
  bw_tv: {
    id: 'bw_tv', name: 'Black & White TV', category: 'appliance', zmartPrice: 110, happiness: 0,
    notes: 'Z-Mart only; no Happiness bonus.', wildWillyExempt: false,
  },
  stereo: {
    id: 'stereo', name: 'Stereo', category: 'appliance', socketCityPrice: 412, zmartPrice: 450, happiness: 2,
    notes: 'The one item that costs MORE at Z-Mart ($450) than Socket City ($412). Displayed at the Security Apartment.',
    wildWillyExempt: false,
  },
  microwave: {
    id: 'microwave', name: 'Microwave', category: 'appliance', socketCityPrice: 330, zmartPrice: 220, happiness: 2,
    notes: '+1 Happiness at the start of each turn (not cumulative with the Stove).', wildWillyExempt: false,
  },
  hot_tub: {
    id: 'hot_tub', name: 'Hot Tub', category: 'appliance', socketCityPrice: 1255, happiness: 3,
    notes: 'Prevents the Relaxation stat from decreasing each turn. Socket City only.',
    wildWillyExempt: false, // see the contradiction note on ClassicItem.wildWillyExempt above
  },
  computer: {
    id: 'computer', name: 'Computer', category: 'appliance', socketCityPrice: 1599, happiness: 3,
    notes: 'Socket City only. 1-in-7 chance each turn to make $20-$100 and +3 Happiness.',
    wildWillyExempt: true, extraCredit: 'computer',
  },

  // Books — Z-Mart only ("# Z-Mart" > "## Items", 3244-3246; also "# Durables" 3804-3806)
  encyclopedia: {
    id: 'encyclopedia', name: 'Encyclopedia', category: 'book', zmartPrice: 475, happiness: 1,
    notes: 'With Dictionary and Atlas (all three owned), -1 lesson to graduate any course.',
    wildWillyExempt: true, extraCredit: 'reference_set',
  },
  dictionary: {
    id: 'dictionary', name: 'Dictionary', category: 'book', zmartPrice: 70, happiness: 1,
    notes: 'Part of the reference-set Extra Credit bonus (see Encyclopedia).', wildWillyExempt: true, extraCredit: 'reference_set',
  },
  atlas: {
    id: 'atlas', name: 'Atlas', category: 'book', zmartPrice: 55, happiness: 1,
    notes: 'Part of the reference-set Extra Credit bonus (see Encyclopedia).', wildWillyExempt: true, extraCredit: 'reference_set',
  },

  // Tickets — Z-Mart only ("# Z-Mart" > "## Items", 3249-3251); force a specific Weekend (see weekend.ts)
  baseball_tickets: {
    id: 'baseball_tickets', name: 'Baseball Tickets', category: 'ticket', zmartPrice: 45, happiness: 2,
    notes: 'Only the first purchase of each ticket type this Turn gives Happiness (max +6/turn for all three). Forces a Baseball Weekend next turn.',
    wildWillyExempt: false,
  },
  theatre_tickets: {
    id: 'theatre_tickets', name: 'Theatre Tickets', category: 'ticket', zmartPrice: 30, happiness: 2,
    notes: 'Same rule as Baseball Tickets. Forces a Theatre Weekend next turn.', wildWillyExempt: false,
  },
  concert_tickets: {
    id: 'concert_tickets', name: 'Concert Tickets', category: 'ticket', zmartPrice: 40, happiness: 2,
    notes: 'Same rule as Baseball Tickets. Forces a Concert Weekend next turn.', wildWillyExempt: false,
  },

  // Junk — Z-Mart ("## Items" 3252-3254); Newspaper is also Junk but bought at Black's Market (see economy.ts)
  dog_food: {
    id: 'dog_food', name: 'Dog Food', category: 'junk', zmartPrice: 18, happiness: -1,
    notes: 'Happiness lost on every purchase. No other effect.', wildWillyExempt: false,
  },
  eight_track: {
    id: 'eight_track', name: '8-Track Player', category: 'junk', zmartPrice: 75, happiness: -1,
    notes: 'Happiness lost on every purchase. No other effect.', wildWillyExempt: false,
  },
  works_of_capote: {
    id: 'works_of_capote', name: 'Works of Capote', category: 'junk', zmartPrice: 100, happiness: -2,
    notes: 'Happiness lost on every purchase. No other effect.', wildWillyExempt: false,
  },
};

/** Declaration order above is Socket City's shelf, top to bottom ("# Socket City" > "## Items"). */
export const CLASSIC_ITEM_LIST: ClassicItem[] = Object.values(CLASSIC_ITEMS);

/**
 * Z-Mart's shelf, top to bottom, as the original lists it ("# Z-Mart" > "## Items", 3236-3258):
 * its appliances run in a different order from Socket City's, and its two clothing rows sit
 * between the books and the tickets.
 */
export const ZMART_SHELF: readonly ({ item: ClassicItemId } | { clothing: ClassicClothingTier })[] = [
  { item: 'fridge' },
  { item: 'stove' },
  { item: 'stereo' },
  { item: 'color_tv' },
  { item: 'bw_tv' },
  { item: 'microwave' },
  { item: 'vcr' },
  { item: 'encyclopedia' },
  { item: 'dictionary' },
  { item: 'atlas' },
  { clothing: 'casual' },
  { clothing: 'dress' },
  { item: 'baseball_tickets' },
  { item: 'theatre_tickets' },
  { item: 'concert_tickets' },
  { item: 'dog_food' },
  { item: 'eight_track' },
  { item: 'works_of_capote' },
];

/**
 * Z-Mart randomizes its stock: "Out of the 17 possible items, only 6 are available to purchase
 * each turn", re-rolled at the start of each player's turn ("# Z-Mart" > "## Items", 3197-3234).
 * The wiki's own shelf table has 18 rows (ZMART_SHELF above); all 18 are in the draw.
 */
export const ZMART_RANDOMIZED_SLOTS = 6;
export const ZMART_POSSIBLE_ITEMS = 17;

/** A stable key for one Z-Mart shelf row: the item id, or `clothing:<tier>`. */
export function zmartShelfKey(row: (typeof ZMART_SHELF)[number]): string {
  return 'item' in row ? row.item : `clothing:${row.clothing}`;
}
