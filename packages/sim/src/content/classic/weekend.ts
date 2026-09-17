/**
 * "Oh What a Weekend!" texts and cost bands, plus the other start-of-turn events (Starvation is
 * in food.ts; this file covers Doctor, Wild Willy, appliance breakdowns and food spoilage
 * triggers that aren't already fully specified in food.ts/items.ts).
 *
 * Source: "# Weekend" (4890-5114), "# Doctor" / "# Doctor Visit" (near-duplicate articles,
 * 6277-6427), "# Relaxation" (4694-4886), "# Wild Willy" (6572-6787).
 *
 * Per docs/PLAN.md decision 6, the first classic ruleset does NOT implement Wild Willy or Doctor
 * visits — but the task brief asks for their numbers to be recorded as data anyway, for a later
 * variant. They're included below in full.
 */

export type WeekendPriceBand = 'cheap' | 'medium' | 'expensive';

export const WEEKEND_PRICE_RANGES: Record<WeekendPriceBand, { min: number; max: number }> = {
  // "## Prices" (4975-5021)
  cheap: { min: 5, max: 20 },
  medium: { min: 15, max: 55 },
  expensive: { min: 50, max: 100 },
};

/** Before Week #8 (CD-ROM version), Weekends can't cost more than $55 and Expensive weekends are priced as Medium. */
export const WEEKEND_EXPENSIVE_UNLOCK_WEEK = 8;
export const WEEKEND_CHEAP_MAX_BEFORE_WEEK_8 = 55;

export interface TicketWeekend {
  ticket: 'baseball_tickets' | 'theatre_tickets' | 'concert_tickets';
  text: string;
  band: WeekendPriceBand;
}

/** "### Ticket-Specific Weekends" (5025-5030). Checked in priority order: Baseball, then Theatre, then Concert. */
export const TICKET_WEEKENDS: TicketWeekend[] = [
  { ticket: 'baseball_tickets', text: 'You went to the baseball game this weekend and ate hotdogs till you puked.', band: 'medium' },
  { ticket: 'theatre_tickets', text: 'You went to the theatre this weekend and saw the one MAN version of Cats.', band: 'medium' },
  { ticket: 'concert_tickets', text: 'You had front row seats at a rock concert. The doctor said that the hearing loss shouldn’t be permanent.', band: 'medium' },
];

export interface DurableWeekend {
  itemId: string; // items.ts ClassicItem id
  text: string;
  band: WeekendPriceBand;
}

/**
 * "### Durable-Specific Weekends" (5032-5047). Each owned Durable type has a 20% chance to
 * trigger its Weekend, unless it already triggered the *previous* player's Weekend.
 */
export const DURABLE_WEEKENDS: DurableWeekend[] = [
  { itemId: 'fridge', text: 'You spent the whole weekend watching some of the food in your refrigerator grow mold and spores. It sure was fun.', band: 'cheap' },
  { itemId: 'freezer', text: 'You spent the whole weekend watching the water in your refrigerator freeze.', band: 'cheap' },
  { itemId: 'stove', text: 'You spent the weekend baking oatmeal cookies.', band: 'cheap' },
  { itemId: 'color_tv', text: 'You spent the entire weekend watching Star Trek reruns.', band: 'cheap' },
  { itemId: 'vcr', text: 'You rented some movies and ate artificially flavored buttered popcorn.', band: 'cheap' },
  { itemId: 'stereo', text: 'You spent the weekend playing your stereo and patching the plaster your speakers cracked.', band: 'cheap' },
  { itemId: 'microwave', text: 'You spent the weekend cleaning your microwave after you tried to dry your pet rat in it. You also need a new pet rat.', band: 'cheap' },
  { itemId: 'hot_tub', text: 'You and some friends had a hot tub party this weekend.', band: 'cheap' },
  { itemId: 'computer', text: 'You played games on your computer all weekend.', band: 'cheap' },
  { itemId: 'bw_tv', text: 'You watched CELEBRITY INCOME TAX EVASION on TV this weekend.', band: 'cheap' },
  { itemId: 'encyclopedia', text: 'You read all about the mating habits of the North American computer programmer in your encyclopedia.', band: 'cheap' },
  { itemId: 'dictionary', text: 'You read your dictionary all weekend. Boy, was that fun.', band: 'cheap' },
  { itemId: 'atlas', text: 'You read your atlas and committed the population of 43 countries to memory. OH WOW!!!', band: 'cheap' },
];

export const DURABLE_WEEKEND_TRIGGER_CHANCE = 0.2;

export interface RandomWeekend {
  n: number;
  text: string;
  /** Band before Week #8; see WEEKEND_EXPENSIVE_UNLOCK_WEEK for #36-42 becoming 'expensive'. */
  band: WeekendPriceBand;
  /** Weekend #42 (and the floppy-only #43/#44) award +2 to +4 Happiness instead of costing money in the normal sense. */
  happinessBonus?: [number, number];
}

/**
 * "### Random Weekends" (5049-5097). The CD-ROM version has 42; the Floppy Disk version adds two
 * more (#43-44, see FLOPPY_ONLY_WEEKENDS) that the CD-ROM version made unreachable.
 * Bands: #1-28 are always Cheap. #29-35 are Medium. #36-42 are Medium until Week #8, then
 * Expensive ("## Prices" > "### Medium/Expensive Weekends", 4999-5021).
 */
export const RANDOM_WEEKENDS: RandomWeekend[] = [
  { n: 1, text: 'You watched them change the mannequins at QT Clothing this weekend.', band: 'cheap' },
  { n: 2, text: 'You washed and waxed your marble this weekend right before it rained.', band: 'cheap' },
  { n: 3, text: 'You stayed home and did absolutely nothing this weekend.', band: 'cheap' },
  { n: 4, text: 'You spent the weekend hiking around Yosemite.', band: 'cheap' },
  { n: 5, text: 'You listened to the Talking Bear 256 times this weekend.', band: 'cheap' },
  { n: 6, text: "You read the 'Wall Street Journal' this weekend.", band: 'cheap' },
  { n: 7, text: 'You thought about what you would do on your next turn.', band: 'cheap' },
  { n: 8, text: 'You spent the weekend in a hotel because they had to fumigate your apartment.', band: 'cheap' },
  { n: 9, text: 'You played in a ping pong tournament this weekend.', band: 'cheap' },
  { n: 10, text: 'You pitched horseshoes in your apartment all weekend. The people downstairs love you.', band: 'cheap' },
  { n: 11, text: 'You sat around and played solitaire all weekend.', band: 'cheap' },
  { n: 12, text: 'You went panning for gold this weekend, but all you got was wet.', band: 'cheap' },
  { n: 13, text: 'You spent the weekend in the laundromat washing your clothes. Now that was exciting.', band: 'cheap' },
  { n: 14, text: 'You took a friend out to a cheap restaurant this weekend.', band: 'cheap' },
  { n: 15, text: 'You went out and caught your own froglegs this weekend.', band: 'cheap' },
  { n: 16, text: 'You crawled around on your knees chasing snails this weekend.', band: 'cheap' },
  { n: 17, text: 'You spent your weekend thinking about work. Eccch.', band: 'cheap' },
  { n: 18, text: 'You spent your weekend trying to remove the mildew between the shower tiles.', band: 'cheap' },
  { n: 19, text: 'You spent the weekend listening to the newlyweds in the next apartment set up a new waterbed.', band: 'cheap' },
  { n: 20, text: 'This weekend, you won first prize in a beauty contest and collected $10. Whoops, wrong game.', band: 'cheap' },
  { n: 21, text: 'This weekend, you closed your curtains, locked your doors, turned off the lights, and ate presweetened morning breakfast cereal, with little marshmallows!', band: 'cheap' },
  { n: 22, text: 'You played stickball this weekend with the neighborhood kids and ended up wrenching your back and spraining your ankle.', band: 'cheap' },
  { n: 23, text: "You read a romance novel, NURSE'S TURN TO CRY, in one sitting.", band: 'cheap' },
  { n: 24, text: 'You took a long hot bath this weekend and emerged looking like a California Raisin.', band: 'cheap' },
  { n: 25, text: "You watched a torrid romance movie, LIBRARIAN'S DILEMMA, this weekend.", band: 'cheap' },
  { n: 26, text: "One of your fillings came loose this weekend. It's a good thing you're handy with a soldering iron.", band: 'cheap' },
  { n: 27, text: 'You spent the weekend examining yourself under the fluorescent lights in the bathroom. Eccch!', band: 'cheap' },
  { n: 28, text: 'You spent the weekend wondering if black holes were lit with black lights.', band: 'cheap' },
  { n: 29, text: 'This weekend, you hung out at the mall, filled up on junk food, and made your mother ashamed of you.', band: 'medium' },
  { n: 30, text: 'You went bowling with friends this weekend.', band: 'medium' },
  { n: 31, text: 'You played two rounds of golf this weekend.', band: 'medium' },
  { n: 32, text: 'This weekend, you had to bail your nephew out of jail.', band: 'medium' },
  { n: 33, text: 'You had your marble repainted this weekend.', band: 'medium' },
  { n: 34, text: 'You played in a volleyball tournament this weekend.', band: 'medium' },
  { n: 35, text: 'You took a friend out to an expensive restaurant this weekend.', band: 'medium' },
  { n: 36, text: 'You went to San Diego to play in the Over The Line Tournament.', band: 'expensive' },
  { n: 37, text: 'You went to Las Vegas in a $20,000 car and came back in a $200,000 Greyhound bus.', band: 'expensive' },
  { n: 38, text: 'You tried to drive to Hawaii to watch a surfing contest.', band: 'expensive' },
  { n: 39, text: 'You went scuba diving in La Jolla.', band: 'expensive' },
  { n: 40, text: 'You went deep sea fishing this weekend.', band: 'expensive' },
  { n: 41, text: 'You volunteered to take the local scouts to Disneyland.', band: 'expensive' },
  { n: 42, text: 'You drove the senior citizens’ bus this weekend and they drove you - crazy.', band: 'expensive', happinessBonus: [2, 4] },
];

/** Floppy Disk only (5099-5113): unreachable in the CD-ROM version this repo otherwise follows. */
export const FLOPPY_ONLY_WEEKENDS: RandomWeekend[] = [
  { n: 43, text: 'You helped several little old ladies cross the street to get to their aerobics class.', band: 'expensive', happinessBonus: [2, 4] },
  { n: 44, text: 'You visited a sick friend in the hospital. REALLY!', band: 'expensive', happinessBonus: [2, 4] },
];

export const RANDOM_WEEKEND_COUNT_CD_ROM = 42;
export const RANDOM_WEEKEND_COUNT_FLOPPY = 44;

// ---------------------------------------------------------------------------
// Doctor ("# Doctor" / "# Doctor Visit" — the wiki has two near-identical articles for this)
// ---------------------------------------------------------------------------

export const DOCTOR = {
  hourPenalty: 10, // 6297-6299, 6335-6336
  happiness: -4, // 6299-6301, 6337-6339
  /** Chance of a visit per triggering condition; only one visit per turn even if several trigger. "## Triggering the Event" (6318-6323). */
  triggerChance: {
    starvation: 0.25,
    spoiledFoodNoFridge: 0.5,
    relaxationAtMinimum: 0.2,
  },
  /** Requires at least $1 Cash; otherwise the event is skipped entirely. */
  requiresCash: true,
  /** Cost bands by Cash on hand at the time. "## Effects" (6341-6349). */
  costByCash: [
    { minCash: 500, cost: { min: 30, max: 200 } },
    { minCash: 50, maxCash: 499, cost: { min: 30, max: 50 } },
    { minCash: 31, maxCash: 49, cost: { min: 30, max: 'allCash' as const } },
    { minCash: 0, maxCash: 30, cost: { min: 'allCash' as const, max: 'allCash' as const } },
  ],
} as const;

// ---------------------------------------------------------------------------
// Relaxation stat ("# Relaxation", 4694-4886)
// ---------------------------------------------------------------------------

export const RELAXATION = {
  start: 10,
  min: 10,
  max: 50,
  /** -1 per turn, unless the player owns a Hot Tub (then it doesn't decay at all). */
  weeklyDecay: 1,
  /** +3 per Relax action, up to the max. */
  relaxGain: 3,
  relaxHours: 6,
  /** First Relax each turn also gives +2 Happiness (see happiness.ts relax_first_this_turn). */
} as const;

// ---------------------------------------------------------------------------
// Wild Willy ("# Wild Willy", 6572-6787; duplicated/summarised in "# Relaxation" > "## Effects")
// ---------------------------------------------------------------------------

export const WILD_WILLY = {
  streetRobbery: {
    // "## Street Robbery" (6597-6639)
    chance: { bank: 1 / 31, blacks_market: 1 / 51 },
    /** CD-ROM version only enforces this gate; the Floppy version has no week gate documented. */
    minWeekCdRom: 4,
    happiness: -3,
    /** Sets the player's Cash to exactly $0. */
    setsCashToZero: true,
  },
  apartmentRobbery: {
    // "## Apartment Robbery" (6640-6787), formula also given in "# Relaxation" > "### Apartment Robbery" (4782-4886)
    /** chance = 1 / (relaxationStat + 1); ranges from 1/11 (relaxation 10) to 1/51 (relaxation 50). */
    chanceDenominatorOffset: 1,
    requiresLowCostHousing: true,
    requiresAnyNonExemptDurable: true,
    /** Each owned Durable TYPE (not unit) independently has this chance to be stolen; multiple types may go at once. */
    perItemTypeStealChance: 0.25,
    happiness: -4,
    /**
     * Exempt items — see the contradiction note on items.ts ClassicItem.wildWillyExempt for why
     * this 7-item list (not the Low-Cost Housing article's 3-item list, nor the Durables table's
     * Hot-Tub-inclusive version) was chosen.
     */
    exemptItemIds: ['fridge', 'freezer', 'stove', 'computer', 'encyclopedia', 'dictionary', 'atlas'] as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Appliance breakdowns and food spoilage triggers are fully specified in items.ts and food.ts —
// see APPLIANCE_BREAKAGE_MIN_CASH/APPLIANCE_BREAK_CHANCE (items.ts) and
// SPOIL_NO_FRIDGE_HAPPINESS/SPOIL_OVER_CAPACITY_HAPPINESS/STARVATION_* (food.ts). Not duplicated
// here to keep a single source of truth per table.
// ---------------------------------------------------------------------------
