import type { ClassicFoodId } from './ids';

/**
 * Monolith Burgers menu (Fast Food + Soft Drinks) and Black's Market Fresh Food + Lottery.
 * Source: "# Monolith Burgers" > "## Items" (original-rules.md:4215-4247), "# Fast Food"
 * (4453-4515), "# Soft Drinks" (4600-4634), "# Black's Market" > "## Items" (3952-4003),
 * "# Fresh Food" (4519-4596), "# Lottery" (6195-6273).
 */
/**
 * Declaration order below IS the counter's menu order, top to bottom, as the original lists it
 * (the wiki tables and a screenshot of the original agree: ... Fries, Shakes, Colas).
 */
export type ClassicFoodCategory = 'fast_food' | 'soft_drink' | 'fresh_food';

export interface ClassicFood {
  id: ClassicFoodId;
  name: string;
  category: ClassicFoodCategory;
  price: number;
  /** Happiness on purchase, subject to the "first purchase per category, per turn" rule below. */
  happiness: number;
}

export const CLASSIC_FOODS: Record<ClassicFoodId, ClassicFood> = {
  // Fast Food — Monolith Burgers. Eating any one prevents Starvation for one turn; all Fast Food
  // in inventory disappears at the start of the next turn either way.
  hamburgers: { id: 'hamburgers', name: 'Hamburgers', category: 'fast_food', price: 79, happiness: 0 },
  cheeseburger: { id: 'cheeseburger', name: 'Cheeseburger', category: 'fast_food', price: 89, happiness: 1 },
  astro_chicken: { id: 'astro_chicken', name: 'Astro Chicken', category: 'fast_food', price: 124, happiness: 2 },
  fries: { id: 'fries', name: 'Fries', category: 'fast_food', price: 65, happiness: 0 },

  // Soft Drinks — Monolith Burgers. No Starvation effect; not added to inventory.
  shakes: { id: 'shakes', name: 'Shakes', category: 'soft_drink', price: 102, happiness: 2 },
  colas: { id: 'colas', name: 'Colas', category: 'soft_drink', price: 69, happiness: 1 },

  // Fresh Food — Black's Market. 1 unit consumed per Turn (needs a Refrigerator or it spoils).
  fresh_food_1_week: { id: 'fresh_food_1_week', name: 'Food for 1 Week', category: 'fresh_food', price: 55, happiness: 1 },
  fresh_food_2_weeks: { id: 'fresh_food_2_weeks', name: 'Food for 2 Weeks', category: 'fresh_food', price: 100, happiness: 2 },
  fresh_food_4_weeks: { id: 'fresh_food_4_weeks', name: 'Food for 4 Weeks', category: 'fresh_food', price: 190, happiness: 4 },
};

export const CLASSIC_FOOD_LIST: ClassicFood[] = Object.values(CLASSIC_FOODS);

/** "## Effects" (4482-4515): only ONE Fast Food happiness bonus per turn, no matter how many bought. */
export const FAST_FOOD_HAPPINESS_ONCE_PER_TURN = true;
/** "## Effects" (4619-4633): only the FIRST Soft Drink purchased this turn gives Happiness. */
export const SOFT_DRINK_HAPPINESS_ONCE_PER_TURN = true;
/** Fresh Food Happiness also only applies to the first purchase this turn ("## Effect", 4540-4543). */
export const FRESH_FOOD_HAPPINESS_ONCE_PER_TURN = true;

// "# Fresh Food" > "## Effect" / "### Spoiled Food" (4552-4596)
/** Units a Refrigerator alone can store before Fresh Food spoils. */
export const FRIDGE_CAPACITY = 6;
/** Extra capacity when a Freezer is also owned (total 12). */
export const FRIDGE_FREEZER_CAPACITY = 12;
export const SPOIL_NO_FRIDGE_HAPPINESS = -2;
export const SPOIL_OVER_CAPACITY_HAPPINESS = -1;
/** Chance of a Doctor visit when Fresh Food spoils entirely for lack of a Refrigerator. */
export const SPOIL_NO_FRIDGE_DOCTOR_CHANCE = 0.5;

// "# Starvation" (4638-4691)
/** Triggers if the player bought no Fast Food AND has no Fresh Food at the start of their turn. */
export const STARVATION_HOUR_PENALTY = 20;
export const STARVATION_HAPPINESS = -2;
export const STARVATION_DOCTOR_CHANCE = 0.25;

/**
 * Lottery — Black's Market. "# Lottery" (6195-6273). Placed here per the task brief ("food.ts —
 * ... plus lottery tickets at Black's Market"), even though it isn't food.
 */
export const LOTTERY = {
  /** Tickets are bought in packs of 10 for $10 total ($1/ticket, fixed price). */
  ticketsPerPurchase: 10,
  pricePerPurchase: 10,
  /** Happiness on the first purchase of tickets each turn. */
  happiness: 2,
  /** The game rolls 0..500; a win requires roll < ticket count (~1/501 per ticket). */
  rollMax: 500,
  /** Prize thresholds: roll <= tickets/20 -> jackpot; else roll <= tickets/5 -> medium; else small. */
  jackpotDivisor: 20,
  mediumDivisor: 5,
  prizes: { jackpot: 5000, medium: 500, small: 200 },
} as const;
