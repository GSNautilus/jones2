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
export const CRASH_JOB_LOSS_HAPPINESS = -7;
export const CRASH_WAGE_CUT_HAPPINESS = -3;

/**
 * The economy itself. Source: the fan wiki's "Economy", "Market Crash" and "Economic Boom" pages
 * (docs/original-rules-extra.md). Two hidden numbers: a trend from -3 to +3 (where the economy
 * is heading) and a reading from -30 to +90 (where it is). Every economy-priced thing costs
 * base * (1 + reading / 60): 50% to 250% of base. A player's current wage and rent never move
 * with it; the wages on offer, shop prices, tuition and new-apartment rents do.
 */
export const ECONOMY_READING_RANGE = { min: -30, max: 90 } as const;
export const ECONOMY_TREND_RANGE = { min: -3, max: 3 } as const;
export const ECONOMY_READING_PER_PRICE_POINT = 60;
/** Price multiplier for a reading: 1 + reading/60. */
export function economyMultiplier(reading: number): number {
  return 1 + reading / ECONOMY_READING_PER_PRICE_POINT;
}

/**
 * Chance of a crash, and separately of a boom, at the start of each Turn (CD-ROM):
 * 1 / (1 + 30 * players). With one Turn per player per Week that is about 1 in 31 a week
 * whatever the table size.
 */
export function economyEventChancePerTurn(players: number): number {
  return 1 / (1 + 30 * players);
}
/** "Market Crash" > "Triggering a Crash": only when the reading is at least 80. */
export const CRASH_MIN_READING = 80;
/**
 * "Economic Boom" > "Triggering a Boom" gives "no more than 120", which is outside the
 * reading's own range; the same page says a boom needs the economy "neutral or slightly better
 * than neutral". We read that as a reading of at most +15 (prices at most 25% over base).
 */
export const BOOM_MAX_READING = 15;
/** Each crash severity is equally likely. */
export const CRASH_SEVERITIES = ['minor', 'moderate', 'major'] as const;
/**
 * The trend jumps by 3: a crash turns a strong economy neutral and a neutral one into the worst
 * decline; a boom the reverse.
 */
export const EVENT_TREND_SHIFT = 3;
/** After the trend moves, prices drop (crash) or rise (boom) by this fraction at once. */
export const CRASH_PRICE_DROP: Record<'minor' | 'moderate' | 'major', number> = { minor: 0.05, moderate: 0.1, major: 0.15 };
export const BOOM_PRICE_RISE = 0.1;
/**
 * Firings and pay cuts, per employed player: a moderate crash fires half of them and cuts the
 * rest to 80% of their wage (rounded down); a major crash fires everyone and empties every bank
 * account. A minor crash only moves the economy.
 */
export const CRASH_FIRE_CHANCE: Record<'minor' | 'moderate' | 'major', number> = { minor: 0, moderate: 0.5, major: 1 };
export const CRASH_PAY_CUT_TO = 0.8;
export const MAJOR_CRASH_WIPES_BANK = true;

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
