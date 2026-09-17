/**
 * Tuning constants for the classic ruleset.
 *
 * EVERY value in this file is something `docs/original-rules.md` does not specify (or specifies
 * only qualitatively). Each one is marked GUESS with the reason. Numbers the wiki *does* give
 * live in `../content/classic/*` and are never duplicated here.
 */

// ---------------------------------------------------------------------------
// Starting state
// ---------------------------------------------------------------------------

/** GUESS: the wiki never states the starting wallet. $200 matches the original's opening screen. */
export const START_CASH = 200;
/** GUESS: the wiki never states the starting Happiness. 0 makes every Happiness point earned. */
export const START_HAPPINESS = 0;

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

/**
 * GUESS: "The only penalty for losing a Job is a loss of Happiness" with no figure
 * (content/classic/happiness.ts FIRED_HAPPINESS_UNDOCUMENTED). -5 sits between being refused a
 * job (-1) and losing one to a major crash (-7).
 */
export const FIRED_HAPPINESS = -5;

/**
 * GUESS: the wiki does not say whether the 1..100 "No Openings" roll must be `<` or `<=` the luck
 * score (content/classic/goals.ts APPLICATION_LUCK_ROLL_COMPARISON_DOCUMENTED = false).
 * `roll <= luck` succeeds, which makes the documented starting luck of 43 a 43% pass rate.
 */
export const APPLICATION_LUCK_INCLUSIVE = true;

/**
 * GUESS: Maximum Experience is described only as "mostly based on the Job's Required Experience"
 * plus +5 per Degree. Mirrored from the documented Maximum Dependability formula
 * (20 + required + 5 * degrees).
 */
export function maxExperience(requiredExperience: number, degreeCount: number): number {
  return 20 + requiredExperience + 5 * degreeCount;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/**
 * GUESS/simplification: the original lets a player own several units of the same Durable. We
 * hold one unit per item type, which keeps Wild-Willy-style per-type rules and the break roll
 * one-per-type. Buying an item you already own is refused.
 */
export const ONE_UNIT_PER_ITEM = true;

// ---------------------------------------------------------------------------
// Rent
// ---------------------------------------------------------------------------

/**
 * GUESS: the wiki says an unpaid month becomes a Rent Debt that is garnished from wages, and
 * that a player "may remain in Rent Debt indefinitely", but never says whether the following
 * months' rent keeps piling on top. We pause accrual while a debt stands and restart the monthly
 * cycle once it clears, so a bad month cannot spiral into an unpayable debt.
 */
export const RENT_DEBT_PAUSES_ACCRUAL = true;

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

/** The original's buttons move $100 at a time; we accept any amount and only require it positive. */
export const BANK_FREE_AMOUNTS = true;

// ---------------------------------------------------------------------------
// Economy (decision 7: booms and crashes resolve at week end, for everyone)
// ---------------------------------------------------------------------------

/**
 * The wiki describes one "Economic Index" that prices, wages and rents all track, but gives no
 * formula and no range. GUESS: a bounded random walk starting at 1.
 */
export const ECONOMY_START = 1;
export const ECONOMY_DRIFT = 0.03; // GUESS: +/- per week
export const ECONOMY_MIN = 0.6; // GUESS
export const ECONOMY_MAX = 1.5; // GUESS

/** GUESS: per-week chance of each event, once the CD-ROM week gate (week 8) has passed. */
export const BOOM_CHANCE = 1 / 12;
export const CRASH_CHANCE = 1 / 10;
/** GUESS: severity split of a crash. */
export const CRASH_SEVERITY_WEIGHTS: { severity: 'minor' | 'moderate' | 'major'; weight: number }[] = [
  { severity: 'minor', weight: 0.5 },
  { severity: 'moderate', weight: 0.3 },
  { severity: 'major', weight: 0.2 },
];

/** GUESS: how far a boom/crash shoves the economy index. */
export const BOOM_INDEX_DELTA = 0.15;
export const CRASH_INDEX_DELTA: Record<'minor' | 'moderate' | 'major', number> = {
  minor: -0.1,
  moderate: -0.2,
  major: -0.35,
};

/**
 * GUESS: the wiki says a crash can cost jobs ("up to 100% chance in the worst type of Crash")
 * and wages, with no table. Chances per severity, rolled per employed player.
 */
export const CRASH_JOB_LOSS_CHANCE: Record<'minor' | 'moderate' | 'major', number> = {
  minor: 0,
  moderate: 0,
  major: 0.5,
};
export const CRASH_WAGE_CUT_CHANCE: Record<'minor' | 'moderate' | 'major', number> = {
  minor: 0,
  moderate: 0.25,
  major: 0.5,
};
/** GUESS: size of the wage cut a crash inflicts. */
export const CRASH_WAGE_CUT_FRACTION = 0.2;

// ---------------------------------------------------------------------------
// Stocks
// ---------------------------------------------------------------------------

/**
 * The wiki explicitly refuses to give the stock-price formula (content/classic/bank.ts
 * STOCK_PRICE_FORMULA_DOCUMENTED = false); only the 50%..250%-of-base band is documented.
 * GUESS: each stock keeps a multiplier that random-walks inside that band and is pulled toward
 * the economy index.
 */
export const STOCK_VOLATILITY = 0.25; // GUESS: +/- fraction per week
export const STOCK_ECONOMY_PULL = 0.3; // GUESS: weight of the pull toward the economy index
export const STOCK_BOOM_FACTOR = 1.25; // GUESS
export const STOCK_CRASH_FACTOR: Record<'minor' | 'moderate' | 'major', number> = {
  minor: 0.9,
  moderate: 0.75,
  major: 0.5,
}; // GUESS

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** GUESS: default goal values when a caller does not set them. The wiki's "default" is 50 each. */
export const DEFAULT_GOALS = { money: 50, happiness: 50, education: 50, career: 50 };

/**
 * GUESS: with simultaneous weeks (PLAN §3) several players can meet all four goals at the same
 * week start. Tie-break is by total goal excess (sum of value - target over the four goals),
 * then by seating order. "Earliest in the week" cannot separate them: every start-of-week
 * sequence happens at the same instant.
 */
export const TIEBREAK_BY_GOAL_EXCESS = true;
