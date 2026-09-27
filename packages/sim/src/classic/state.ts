/**
 * The extra state the classic ruleset needs. It hangs off `PlayerState.classic` and
 * `GameState.classic` so the Jones 2 ruleset is untouched: those fields are simply absent when
 * `config.ruleset` is 'jones2'.
 */
import { nextFloat, seedRng, type RngState } from '../rng';
import type { Delta, GameState, PlayerState } from '../types';
import {
  CLASSIC_ITEMS,
  CLASSIC_JOBS,
  CLASSIC_STOCKS,
  CLOTHING_TIER_ORDER,
  FRIDGE_CAPACITY,
  FRIDGE_FREEZER_CAPACITY,
  LESSONS_PER_DEGREE,
  MIN_LESSONS_WITH_EXTRA_CREDIT,
  maxDependability,
  type ClassicClothingTier,
} from '../content/classic';
import { maxExperience } from './config';

export type ItemSource = 'socket_city' | 'zmart' | 'pawn_shop';

/** One card of the start-of-week sequence, in the order it happened. */
export interface WeekStartEvent {
  /** 'weekend' | 'lottery' | 'starvation' | 'relaxation' | 'breakdown' | 'spoilage' | 'rent' | 'consumables' | 'computer' | 'appliance_comfort' | 'news' | 'loan' */
  step: string;
  text: string;
  deltas: Delta[];
}

/** Once-per-week gates and counters. Reset by startWeek. */
export interface ClassicWeekFlags {
  relaxed: boolean;
  fastFoodHappiness: boolean;
  softDrinkHappiness: boolean;
  freshFoodHappiness: boolean;
  lotteryHappiness: boolean;
  /** Ticket item ids bought this week (each type's happiness is once per week). */
  ticketsBought: string[];
  workSessions: number;
  /** The Broker menu has been opened (2h) this week. */
  brokerOpen: boolean;
  askedExtension: boolean;
  paidLoan: boolean;
  readNewspaper: boolean;
  /** Jobs that answered "No openings" this week; they stay shut until next week. */
  turnedDown: string[];
  /**
   * This player's random stream for the week, started from the week-start state (see
   * `playerRoll`). Absent until the first roll. Kept per player so one player's dice never
   * depend on what another did that week: async players play the same week apart.
   */
  rng?: RngState;
}

export interface ClassicPlayerState {
  /** Hourly wage locked in when hired or given a raise. Not the live listed wage. */
  wage: number;
  jobId: string | null;
  dependability: number;
  experience: number;
  relaxation: number;
  /** Raises taken at the current job; resets when the job changes. */
  raises: number;

  degrees: string[];
  /** Degree id -> lessons taken so far. */
  lessons: Record<string, number>;
  /** Degree ids the enrolment fee has been paid for. */
  enrolled: string[];

  /** Weeks of each clothing category remaining. */
  clothes: Record<ClassicClothingTier, number>;

  /** Weeks of Fresh Food in the apartment. */
  freshFood: number;
  /** Fast Food eaten this week: stops next week's starvation check. */
  ateFastFood: boolean;
  lotteryTickets: number;

  items: string[];
  /** Where each owned item came from: sets its weekly breakage chance. */
  itemSource: Record<string, ItemSource>;

  housing: 'lowcost' | 'security_apts';
  /** Monthly rent locked in at lease time. */
  rent: number;
  /** Week the next rent payment is due (a rent extension moves it, payments push it by 4). */
  rentDueWeek: number;
  rentDebt: number;
  extensionsApproved: number;
  /** Week the rent deadline was pushed to by an extension (0 = none). */
  extensionUntil: number;
  /** Once garnished, extensions are denied for the rest of the game. */
  everGarnished: boolean;

  /** Loan debt lives in PlayerState.loan; this is the rest of the loan bookkeeping. */
  loanDueWeek: number;
  loanDefaults: number;
  hasHadLoan: boolean;
  inDefault: boolean;

  /** Stock id -> units held. */
  stocks: Record<string, number>;

  week: ClassicWeekFlags;
  /** The cards of this week's start-of-week sequence. */
  weekStart: WeekStartEvent[];
}

/** An item sitting in the Pawn Shop. */
export interface PawnedItem {
  itemId: string;
  ownerId: string;
  /** Original purchase price, for the redeem/buy price. */
  basePrice: number;
  pawnedWeek: number;
  source: ItemSource;
}

export interface ClassicGameState {
  /** The one economic index prices, wages and rents all track. */
  index: number;
  /** Per-stock multiplier on its base price (T-Bills stay at 1). */
  stockFactor: Record<string, number>;
  /** This week's front page. */
  headline: string;
  /** The economy event that produced this week's headline, if any. */
  event: 'none' | 'boom' | 'crash_minor' | 'crash_moderate' | 'crash_major';
  pawnShop: PawnedItem[];
}

export function emptyWeekFlags(): ClassicWeekFlags {
  return {
    relaxed: false,
    fastFoodHappiness: false,
    softDrinkHappiness: false,
    freshFoodHappiness: false,
    lotteryHappiness: false,
    ticketsBought: [],
    workSessions: 0,
    brokerOpen: false,
    askedExtension: false,
    paidLoan: false,
    readNewspaper: false,
    turnedDown: [],
  };
}

/**
 * The first state of a player's weekly random stream: a mix of the week-start game stream,
 * the week and the seat, so every player and every week draws different dice.
 */
export function playerStreamSeed(gameRng: RngState, week: number, seat: number): RngState {
  const mixed = (gameRng ^ Math.imul(week + 1, 0x85ebca6b) ^ Math.imul(seat + 1, 0xc2b2ae35)) >>> 0;
  return seedRng(nextFloat(mixed)[0]);
}

/**
 * Roll the acting player's dice for an in-week action. Draws from the player's own weekly
 * stream, never the shared game stream, so the result is the same whether the week is
 * replayed alone (the player's device) or merged with everyone else's (the server).
 */
export function playerRoll<T>(state: GameState, p: PlayerState, roll: (s: RngState) => [RngState, T]): T {
  const c = cp(p);
  const start = c.week.rng ?? playerStreamSeed(state.rng, state.week, Math.max(0, state.playerOrder.indexOf(p.id)));
  const [next, value] = roll(start);
  c.week.rng = next;
  return value;
}

/** The classic half of a player. Throws if the ruleset is not classic — call only behind that check. */
export function cp(p: PlayerState): ClassicPlayerState {
  if (!p.classic) throw new Error('Player has no classic state');
  return p.classic;
}

export function cg(s: GameState): ClassicGameState {
  if (!s.classic) throw new Error('Game has no classic state');
  return s.classic;
}

export function isClassic(s: GameState): boolean {
  return s.config.ruleset === 'classic';
}

export function jobOf(p: PlayerState) {
  const id = p.classic?.jobId;
  return id ? CLASSIC_JOBS[id] ?? null : null;
}

export function stockPrice(s: GameState, stockId: string): number {
  const stock = CLASSIC_STOCKS[stockId];
  if (!stock) return 0;
  if (stockId === 't_bills') return stock.basePrice;
  return Math.max(1, Math.round(stock.basePrice * (cg(s).stockFactor[stockId] ?? 1)));
}

export function stockValue(s: GameState, p: PlayerState): number {
  let total = 0;
  for (const [id, units] of Object.entries(cp(p).stocks)) total += units * stockPrice(s, id);
  return total;
}

/** Cash + bank + stocks, less loan debt. "# Wealth Goal" > "## Liquid Assets". */
export function liquidAssets(s: GameState, p: PlayerState): number {
  return p.cash + p.savings + stockValue(s, p) - p.loan;
}

/** Does the player own clothing at least as good as `tier`, with weeks left? */
export function hasUniform(p: PlayerState, tier: ClassicClothingTier): boolean {
  const need = CLOTHING_TIER_ORDER.indexOf(tier);
  return CLOTHING_TIER_ORDER.some((t, i) => i >= need && (cp(p).clothes[t] ?? 0) > 0);
}

export function degreeCount(p: PlayerState): number {
  return cp(p).degrees.length;
}

export function maxDep(p: PlayerState): number {
  const job = jobOf(p);
  return maxDependability(job?.dependability ?? 0, degreeCount(p));
}

export function maxExp(p: PlayerState): number {
  const job = jobOf(p);
  return maxExperience(job?.experience ?? 0, degreeCount(p));
}

/** Lessons needed for one degree, after the Computer / reference-set Extra Credit discounts. */
export function lessonsNeeded(p: PlayerState): number {
  const c = cp(p);
  let n = LESSONS_PER_DEGREE;
  if (c.items.includes('computer')) n -= 1;
  if (['encyclopedia', 'dictionary', 'atlas'].every((i) => c.items.includes(i))) n -= 1;
  return Math.max(MIN_LESSONS_WITH_EXTRA_CREDIT, n);
}

/** Units of Fresh Food that survive the week. */
export function freshCapacity(p: PlayerState): number {
  const c = cp(p);
  if (!c.items.includes('fridge')) return 0;
  return c.items.includes('freezer') ? FRIDGE_FREEZER_CAPACITY : FRIDGE_CAPACITY;
}

export function itemBreakChance(p: PlayerState, itemId: string): number {
  const src = cp(p).itemSource[itemId] ?? 'zmart';
  return src === 'socket_city' ? 1 / 51 : 1 / 36;
}

export function itemBasePrice(itemId: string, source: ItemSource): number {
  const item = CLASSIC_ITEMS[itemId];
  if (!item) return 0;
  if (source === 'socket_city') return item.socketCityPrice ?? item.zmartPrice ?? 0;
  return item.zmartPrice ?? item.socketCityPrice ?? 0;
}
