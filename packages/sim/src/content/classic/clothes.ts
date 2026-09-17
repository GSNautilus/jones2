import type { ClassicClothingTier } from './ids';

/**
 * QT Clothing and Z-Mart clothing options. Source: "# Clothes" > "## List of Clothes"
 * (original-rules.md:2830-2838) and "# QT Clothing" > "## Items" (3029-3054); Z-Mart's clothing
 * rows are cross-checked against "# Z-Mart" > "## Items" (3236-3258) — the two sources agree.
 *
 * Z-Mart does not sell Business Suits — QT Clothing is the only source for that tier.
 */
export interface ClassicClothingOption {
  tier: ClassicClothingTier;
  store: 'qt_clothing' | 'zmart';
  /** Base price, economy-adjusted. */
  price: number;
  /** Weeks of that clothing category added per purchase. */
  weeks: number;
  /** Happiness on purchase. QT Clothing only — Z-Mart clothing gives none ("## Effects" > "### Happiness", 2881-2891). */
  happiness: number;
}

export const CLASSIC_CLOTHES: ClassicClothingOption[] = [
  { tier: 'casual', store: 'qt_clothing', price: 73, weeks: 11, happiness: 0 },
  { tier: 'casual', store: 'zmart', price: 35, weeks: 9, happiness: 0 },
  { tier: 'dress', store: 'qt_clothing', price: 125, weeks: 13, happiness: 1 },
  { tier: 'dress', store: 'zmart', price: 90, weeks: 9, happiness: 0 },
  { tier: 'business', store: 'qt_clothing', price: 295, weeks: 13, happiness: 2 },
];

/** Ordering used to compare "at least this good" for a job's uniform requirement. */
export const CLOTHING_TIER_ORDER: ClassicClothingTier[] = ['casual', 'dress', 'business'];

// "## Effects" (original-rules.md:2839-2879)
/** All players start with this many weeks of Casual Clothes, and 0 Dress/Business. */
export const STARTING_CASUAL_WEEKS = 6;
/** Every category loses 1 week at the start of each Turn, worn or not. */
export const WEEKLY_CLOTHING_DECAY = 1;
