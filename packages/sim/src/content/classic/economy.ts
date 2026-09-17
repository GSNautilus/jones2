/**
 * The Newspaper (headlines) and boom/crash economy mechanics. Source: "# Newspaper" (5117-5215),
 * "# Month" > "## Delayed Events" (477-513), "# Happiness Goal" > "## Decreasing Happiness"
 * (266-281, crash/boom happiness figures — see happiness.ts for the authoritative copies).
 */

export const NEWSPAPER = {
  price: 1, // fixed, never affected by the economy — "# Newspaper" (5123-5125)
  hourCost: 1, // "## Effect" / "# Black's Market" > "## Items" (5127-5129, 3991)
  location: 'blacks_market' as const,
  /** A free copy (no time cost) is also given automatically on a major economic event or a Wild Willy robbery. */
  freeOn: ['boom', 'crash', 'wild_willy_apartment', 'wild_willy_street'] as const,
} as const;

export type EconomyHeadlineEvent = 'boom' | 'crash_minor' | 'crash_moderate' | 'crash_major' | 'wild_willy_apartment' | 'wild_willy_street';

/** "### Specific Events" (5161-5171): these override the random pool for the turn they occur. */
export const SPECIFIC_HEADLINES: Record<EconomyHeadlineEvent, string> = {
  boom: 'INFLATION IS UP! PRICES COULD SOAR!',
  crash_minor: "MORE S & L'S FAIL! ECONOMY SUFFERS",
  crash_moderate: 'SCANDAL ON WALL ST. ECONOMY DROPS! UNEMPLOYMENT RISES',
  crash_major: 'BANKS FALTER! SAVINGS LOST! JOBS LOST!',
  wild_willy_apartment: 'WILD WILLY RIPS OFF ANOTHER APARTMENT',
  wild_willy_street: 'WILD WILLY HAS LIFTED ANOTHER WALLET',
};

/**
 * "### Random Headlines" (5173-5214). Entry #26 is transcribed verbatim from the wiki
 * ("TYpEsETTrs U ion shr ds Agre mNt!") — it reads like garbled OCR of something close to
 * "TYPESETTERS UNION SHREDS AGREEMENT!", but the source gives no clean version, so it's kept
 * as-extracted rather than guessed at.
 */
export const RANDOM_HEADLINES: string[] = [
  'PRESIDENT HATES BROCCOLI',
  'MORE FAST FOOD PLACES USING SOYBEANS',
  'SCHOOL ENROLLMENT UP',
  'SCHOOL ENROLLMENT DOWN',
  'THERE IS MONEY IN COMPUTERS',
  'HOUSING MARKET LOOKS GOOD',
  'SALES OF NEWSPAPERS HAVE SKYROCKETED',
  'PAWN SHOPS SERVE USEFUL PURPOSE',
  'NORTH SHORE OF BASS LAKE SINKS',
  'ALICE COOPER GIVES BIRTH TO TWIN BOYS',
  'COARSEGOLD PURCHASED BY JAPAN',
  'SPACE QUEST III WINS BIG AWARD',
  'ELVIS SIGHTED AT KFC IN OAKHURST',
  'TALKING BEAR KIDNAPPED! FBI INVESTIGATING',
  'KINGS QUEST XXIX GOES TO PRODUCTION',
  'MR. WHIPPLE FOUND SQUEEZED TO DEATH IN APARTMENT',
  "REAGAN'S NAP INTERRUPTS SPEECH",
  'MOTHER GOOSE GETS DIVORCE! FEATHERS RUFFLED',
  'MOTHER GOOSE SUSPECTED OF FOWL PLAY',
  'SALMON BITING OFF NORTH SHORE OF BASS LAKE',
  'NIXON MAKES ROCK VIDEO',
  'FORD STUMBLES ON CURE',
  'NEW GOVT STUDY SHOWS GAME PLAYERS GET SICK TOO!',
  'IMELDA M. LOOKING FOR A FEW GOOD SHOES',
  'NANCY IS LOOKING FOR A NEW DRESS',
  'TYpEsETTrs U ion shr ds Agre mNt!',
  'FIREMEN ARE ALWAYS IN HEAT',
  'PRESIDENT FINALLY EATS BROCCOLI',
  'PRESIDENT EATS BROCCOLI AND LIVES!',
  'STUDY SHOWS WE HAVE MORE LEISURE TIME',
  'EXTRA! EXTRA!',
  'TORNADO KILLS 8 THEN COMMITS SUICIDE!',
  'CIGARETTES FOUND TO CAUSE LABORATORY ANIMALS!',
  'COURTS JAMMED! WAPNER REINSTATED!',
  'GRAND CANYON DESIGNATED NATIONAL LANDFILL!',
  'CELEBRITY BULLFIGHTING DISASTER; LESLEY GORED',
  'GURUKA SINGH GETS HAIRCUT! PHOTOS UNDER WRAPS!',
  'RAP GROUP ARRESTED FOR NOT STARTING RIOT!',
  'TRAILER PARK DEMOLISHES 6 TORNADOES!',
];

// --- Boom/Crash mechanics ---

/** Stock holding threshold above which boom/crash happiness modifiers apply. "### Events" (209, 274). */
export const STOCK_HAPPINESS_THRESHOLD = 1000;

/** Extra happiness penalty for crashes IF the player has >= STOCK_HAPPINESS_THRESHOLD invested, by severity. "### Events" (274-278). */
export const CRASH_STOCK_PENALTY: Record<'minor' | 'moderate' | 'major', number> = { minor: -1, moderate: -2, major: -5 };
export const BOOM_STOCK_HAPPINESS = 5;

/** Additional, separate penalties a crash may trigger (cumulative with the base crash happiness in happiness.ts). */
export const CRASH_JOB_LOSS_HAPPINESS = -7; // major crash only
export const CRASH_WAGE_CUT_HAPPINESS = -3; // moderate or major crash

/**
 * NOTE: the wiki gives no percentage/dollar figures for how much a crash or boom actually moves
 * prices/wages beyond: "During a Market Crash, Rents can reach half their baseline values"
 * ("# Rent" > "## Switching Apartments", 709-713), and "up to 100% chance" of job loss "in the
 * worst type of Crash" ("# Jobs" > "## Losing a Job", 1647) — no per-severity percentage table.
 * Left unspecified rather than invented.
 */
export const CRASH_RENT_MIN_FRACTION = 0.5; // the one concrete number given
export const CRASH_JOB_LOSS_CHANCE_DOCUMENTED = false;
export const CRASH_WAGE_CUT_PERCENT_DOCUMENTED = false;

/**
 * Week gating for crashes/booms differs by game version — "# Month" > "## Delayed Events"
 * (477-513):
 * - Floppy Disk version: Market Crashes only from Week #4+; no stated gate for Booms.
 * - CD-ROM version: both Market Crashes AND Economic Booms only from Week #8+; Weekend cost also
 *   caps at $55 until Week #8 (see weekend.ts WEEKEND_CHEAP_MAX_BEFORE_WEEK_8).
 * This repo otherwise follows the CD-ROM version's numbers (it has the more complete/precise
 * data throughout, and other tables mark CD-ROM-only content explicitly), so CD-ROM is default.
 */
export const CRASH_BOOM_MIN_WEEK_CD_ROM = 8;
export const CRASH_MIN_WEEK_FLOPPY = 4;
