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
// Bank
// ---------------------------------------------------------------------------

/** The original's buttons move $100 at a time; we accept any amount and only require it positive. */
export const BANK_FREE_AMOUNTS = true;

// ---------------------------------------------------------------------------
// Economy (decision 7: booms and crashes resolve at week end, for everyone)
// ---------------------------------------------------------------------------

/**
 * The original keeps two hidden numbers (content/classic/economy.ts has the documented facts):
 * a trend from -3 to +3 and a reading from -30 to +90 that sets every price. The wiki calls the
 * weekly update "quite complex" and does not give it, so the walk below is a GUESS built to show
 * the documented behaviour: a strong economy tends to get stronger and a weak one weaker, and
 * the CD-ROM version climbs back out of a slump.
 */
/** GUESS: reading points moved per week per point of trend (a +3 trend crosses the range in ~13 weeks). */
export const READING_PER_TREND = 3;
/** GUESS: +/- random reading points on top of the trend each week. */
export const READING_NOISE = 4;
/** GUESS: base chance each week that the trend moves up, and (separately) down, one step. */
export const TREND_STEP_CHANCE = 0.2;
/**
 * GUESS: extra chance of a step back toward neutral at the ends of the range (scaled by how far
 * out the reading is), so the economy recovers from a slump and does not sit at the ceiling.
 */
export const TREND_RECOVERY_CHANCE = 0.3;

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
