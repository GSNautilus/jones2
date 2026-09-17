import type { ClassicLocationId } from './ids';

/**
 * Low-Cost Housing and Security Apartments. Source: "# Rent" (544-745), "# Rent Office"
 * (749-1046), "# Low-Cost Housing" (1050-1281), "# Security Apartments" (1284-1372).
 *
 * The task brief mentions a "deposit"; the wiki has no separate security-deposit concept — the
 * only up-front cost when renting (including switching apartments) is one month's Rent at the
 * new place ("## Switching Apartments", 685-717; "# Security Apartments" > "## Renting", 1307-1321).
 */
export interface ClassicHousing {
  id: ClassicLocationId;
  name: string;
  /** Baseline monthly rent, before the economy's rent index. */
  baseRent: number;
  benefits: string[];
  drawbacks: string[];
}

export const CLASSIC_HOUSING: Record<'lowcost' | 'security_apts', ClassicHousing> = {
  lowcost: {
    id: 'lowcost',
    name: 'Low-Cost Housing',
    baseRent: 325, // original-rules.md:587, 1087
    benefits: [
      // original-rules.md:1105-1112
      'Closer to Z-Mart, Monolith Burgers and QT Clothing.',
    ],
    drawbacks: [
      // original-rules.md:1116-1121; robbery mechanics recorded in weekend.ts's WILD_WILLY table
      'Can be robbed by Wild Willy at the start of each Turn if the player owns any non-exempt Durable.',
    ],
  },
  security_apts: {
    id: 'security_apts',
    name: 'Le Security Apartments',
    baseRent: 475, // original-rules.md:1323
    benefits: [
      // original-rules.md:1329-1341
      'Can never be robbed by Wild Willy.',
      "Closer to Black's Market, the Bank and the Factory.",
    ],
    drawbacks: [],
  },
};

export const CLASSIC_HOUSING_LIST: ClassicHousing[] = Object.values(CLASSIC_HOUSING);

// "## Initial Rent" (573-587): all players start in Low-Cost Housing, paid through week 4.
export const STARTING_HOUSING: ClassicLocationId = 'lowcost';
/** Rent is due on week 4, 8, 12, ... — the last week of every 4-week Month. "## Rent Notice and Payment" (589-605). */
export const RENT_DUE_WEEK_INTERVAL = 4;

// "## Rent Debt" (607-625)
/** Fraction of Wage garnished per work session while any Rent Debt remains. */
export const RENT_DEBT_GARNISH_FRACTION = 0.5;
/** Extra interest fee charged per garnished work session (only when the garnish doesn't clear the debt). */
export const RENT_DEBT_INTEREST_FEE = 2;

// "## Rent Advance" (627-642)
/** Each advance payment (paid while not owing rent) extends the lease by this many weeks. */
export const RENT_ADVANCE_WEEKS = 4;

/**
 * "## Rent Extension" (644-683): approval chance drops 25 points per extension already granted
 * (to this player, at this housing), floor 25%. First request is always approved.
 * Index = number of extensions already approved so far.
 */
export const RENT_EXTENSION_APPROVAL_CHANCE = [1, 0.75, 0.5, 0.25] as const; // index 3+ all read 0.25
export const RENT_EXTENSION_APPROVAL_FLOOR = 0.25;
/**
 * Once a player has ever been garnished for Rent Debt, all further Extension requests are
 * auto-denied for the rest of the game ("## Rent Extension", 681-683).
 */
export const RENT_EXTENSION_LOCKED_AFTER_DEBT = true;

/**
 * "## Lowering Rent" (719-744): switching to the other apartment type and immediately back can
 * lower rent if the market price for your current type has dropped. Cost = current price of
 * BOTH apartment types added together (you pay for both switches in the same Turn). No formula
 * beyond that is given — it depends on live economy-adjusted prices, not fixed numbers.
 */
export const LOWER_RENT_REQUIRES_BOTH_APARTMENT_PRICES = true;
