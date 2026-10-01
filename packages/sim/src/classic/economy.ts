/**
 * The classic economy: a hidden trend and reading (content/classic/economy.ts) that every price,
 * listed wage and new rent follows, stock prices that wander around it, and the boom/crash
 * events. Per PLAN §3 decision 7 these resolve at week end, for everyone at once, and the new
 * headline is the one players read next week. Crash happiness hits every player (decided
 * 2026-09-30), where the original hit only the player whose turn it was.
 */
import {
  BOOM_MAX_READING,
  BOOM_PRICE_RISE,
  BOOM_STOCK_HAPPINESS,
  CRASH_BOOM_MIN_WEEK_CD_ROM,
  CRASH_FIRE_CHANCE,
  CRASH_JOB_LOSS_HAPPINESS,
  CRASH_MIN_READING,
  CRASH_PAY_CUT_TO,
  CRASH_PRICE_DROP,
  CRASH_SEVERITIES,
  CRASH_STOCK_PENALTY,
  CRASH_WAGE_CUT_HAPPINESS,
  CLASSIC_HAPPINESS_MAP,
  CLASSIC_STOCK_LIST,
  ECONOMY_READING_PER_PRICE_POINT,
  ECONOMY_READING_RANGE,
  ECONOMY_TREND_RANGE,
  EVENT_TREND_SHIFT,
  MAJOR_CRASH_WIPES_BANK,
  RANDOM_HEADLINES,
  SPECIFIC_HEADLINES,
  STOCK_HAPPINESS_THRESHOLD,
  STOCK_PRICE_RANGE,
  economyEventChancePerTurn,
  economyMultiplier,
} from '../content/classic';
import { applyDelta, clamp } from '../helpers';
import { chance, nextFloat, pick } from '../rng';
import type { Delta, GameState, PlayerState, ResolutionNote } from '../types';
import * as K from './config';
import { cg, cp, jobOf, stockValue } from './state';

export type Severity = (typeof CRASH_SEVERITIES)[number];

function d(stat: Delta['stat'], amount: number, note?: string): Delta {
  return note ? { stat, amount, note } : { stat, amount };
}

function happy(p: PlayerState, id: string, deltas: Delta[], amountOverride?: number): void {
  const entry = CLASSIC_HAPPINESS_MAP[id];
  const raw = amountOverride ?? (typeof entry?.amount === 'number' ? entry.amount : 0);
  if (!raw) return;
  p.happiness = Math.round((p.happiness + raw) * 100) / 100;
  deltas.push(d('happiness', raw, entry?.label ?? id));
}

/** Initial economy: neutral (reading 0, trend 0), every stock at its base price, a random front page. */
export function initEconomy(state: GameState): void {
  const factor: Record<string, number> = {};
  for (const s of CLASSIC_STOCK_LIST) factor[s.id] = 1;
  let headline: string;
  [state.rng, headline] = pick(state.rng, RANDOM_HEADLINES);
  state.classic = { index: 1, reading: 0, trend: 0, stockFactor: factor, headline, event: 'none', pawnShop: [] };
  syncIndices(state);
}

/** Prices, listed wages and new rents all follow the one multiplier (`index`). */
export function syncIndices(state: GameState): void {
  const c = cg(state);
  state.economy = {
    ...state.economy,
    priceIndex: c.index,
    wageIndex: c.index,
    rentIndex: c.index,
    savingsRate: 0, // "no interest is accrued for money kept in a Bank Account"
    loanRate: 0, // classic loans charge a flat $5 fee per payment instead of interest
    crimeRate: 0, // Wild Willy is not implemented (PLAN §3 decision 6)
  };
}

/** Saves from before the reading existed carry only the multiplier: recover the reading from it. */
function readingOf(state: GameState): number {
  const c = cg(state);
  return c.reading ?? (c.index - 1) * ECONOMY_READING_PER_PRICE_POINT;
}

/**
 * One week of trend: each step up or down is rolled separately, and the further the reading
 * sits from neutral the likelier a step back toward it (classic/config.ts, all GUESS).
 */
function stepTrend(state: GameState, trend: number, reading: number): number {
  const out = (x: number, span: number) => Math.min(1, Math.max(0, x) / span) * K.TREND_RECOVERY_CHANCE;
  const pUp = K.TREND_STEP_CHANCE + out(-reading, -ECONOMY_READING_RANGE.min);
  const pDown = K.TREND_STEP_CHANCE + out(reading, ECONOMY_READING_RANGE.max);
  let f: number;
  [state.rng, f] = nextFloat(state.rng);
  const step = f < pUp ? 1 : f < pUp + pDown ? -1 : 0;
  return clamp(trend + step, ECONOMY_TREND_RANGE.min, ECONOMY_TREND_RANGE.max);
}

function moveStocks(state: GameState, boom: boolean, crash: Severity | null): void {
  const c = cg(state);
  for (const s of CLASSIC_STOCK_LIST) {
    if (s.id === 't_bills') continue;
    let f: number;
    [state.rng, f] = nextFloat(state.rng);
    const drift = (f * 2 - 1) * K.STOCK_VOLATILITY;
    const pull = (c.index - (c.stockFactor[s.id] ?? 1)) * K.STOCK_ECONOMY_PULL;
    let next = (c.stockFactor[s.id] ?? 1) * (1 + drift) + pull;
    if (boom) next *= K.STOCK_BOOM_FACTOR;
    if (crash) next *= K.STOCK_CRASH_FACTOR[crash];
    c.stockFactor[s.id] = clamp(next, STOCK_PRICE_RANGE.min, STOCK_PRICE_RANGE.max);
  }
}

/** Fire or cut the pay of one player in a crash; returns the notes' text. */
function crashJob(state: GameState, id: string, crash: Severity, deltas: Delta[]): string | null {
  const p = state.players[id]!;
  const job = jobOf(p);
  if (!job || crash === 'minor') return null;
  let fired: boolean;
  [state.rng, fired] = chance(state.rng, CRASH_FIRE_CHANCE[crash]);
  const c = cp(p);
  if (fired) {
    c.jobId = null;
    c.raises = 0;
    c.wage = 0;
    state.jobHolders[job.id] = (state.jobHolders[job.id] ?? []).filter((x) => x !== id);
    happy(p, 'crash_job_loss', deltas, CRASH_JOB_LOSS_HAPPINESS);
    return `The crash cost you your job as ${job.title}.`;
  }
  const before = c.wage;
  c.wage = Math.max(1, Math.floor(before * CRASH_PAY_CUT_TO));
  happy(p, 'crash_wage_cut', deltas, CRASH_WAGE_CUT_HAPPINESS);
  return `Your wage was cut from $${before} to $${c.wage}.`;
}

/**
 * Resolve the economy for the coming week and put its notes in the week report:
 *   the event roll (week 8+, against last week's reading) -> the trend (a boom or crash shoves
 *   it 3) -> the reading follows the trend -> the event's own price shock -> stocks -> headline.
 */
export function resolveEconomy(state: GameState, nextWeek: number, notes: ResolutionNote[]): void {
  const c = cg(state);
  let reading = readingOf(state);
  let trend = c.trend ?? 0;

  // One roll per turn in the original; a week here is every player's turn at once.
  const turns = Math.max(1, state.playerOrder.length);
  const perWeek = 1 - (1 - economyEventChancePerTurn(turns)) ** turns;
  let boom = false;
  let crash: Severity | null = null;
  if (nextWeek >= CRASH_BOOM_MIN_WEEK_CD_ROM) {
    let hit = false;
    if (reading >= CRASH_MIN_READING) [state.rng, hit] = chance(state.rng, perWeek);
    if (hit) [state.rng, crash] = pick(state.rng, CRASH_SEVERITIES);
    else if (reading <= BOOM_MAX_READING) [state.rng, boom] = chance(state.rng, perWeek);
  }

  trend = stepTrend(state, trend, reading);
  if (boom) trend = Math.min(ECONOMY_TREND_RANGE.max, trend + EVENT_TREND_SHIFT);
  if (crash) trend = Math.max(ECONOMY_TREND_RANGE.min, trend - EVENT_TREND_SHIFT);

  let f: number;
  [state.rng, f] = nextFloat(state.rng);
  reading += trend * K.READING_PER_TREND + (f * 2 - 1) * K.READING_NOISE;
  let mult = economyMultiplier(clamp(reading, ECONOMY_READING_RANGE.min, ECONOMY_READING_RANGE.max));
  if (boom) mult *= 1 + BOOM_PRICE_RISE;
  if (crash) mult *= 1 - CRASH_PRICE_DROP[crash];
  reading = clamp((mult - 1) * ECONOMY_READING_PER_PRICE_POINT, ECONOMY_READING_RANGE.min, ECONOMY_READING_RANGE.max);

  c.reading = Math.round(reading * 100) / 100;
  c.trend = trend;
  c.index = Math.round(economyMultiplier(c.reading) * 1000) / 1000;
  syncIndices(state);

  moveStocks(state, boom, crash);

  c.event = boom ? 'boom' : crash ? (`crash_${crash}` as const) : 'none';
  if (c.event === 'none') {
    let headline: string;
    [state.rng, headline] = pick(state.rng, RANDOM_HEADLINES);
    c.headline = headline;
  } else {
    c.headline = SPECIFIC_HEADLINES[c.event];
  }

  if (boom) {
    notes.push({ player: null, text: `Economic boom! ${c.headline}` });
    for (const id of state.playerOrder) {
      const p = state.players[id]!;
      if (stockValue(state, p) < STOCK_HAPPINESS_THRESHOLD) continue;
      const deltas: Delta[] = [];
      happy(p, 'economic_boom', deltas, BOOM_STOCK_HAPPINESS);
      notes.push({ player: id, text: 'Your stock portfolio soared in the boom.', deltas });
    }
  }

  if (crash) {
    notes.push({ player: null, text: `Market crash (${crash})! ${c.headline}` });
    for (const id of state.playerOrder) {
      const p = state.players[id]!;
      const deltas: Delta[] = [];
      happy(p, `crash_${crash}`, deltas);
      if (stockValue(state, p) >= STOCK_HAPPINESS_THRESHOLD) {
        happy(p, `crash_${crash}`, deltas, CRASH_STOCK_PENALTY[crash]);
      }
      const jobNote = crashJob(state, id, crash, deltas);
      if (jobNote) notes.push({ player: id, text: jobNote, deltas: [] });
      if (crash === 'major' && MAJOR_CRASH_WIPES_BANK && p.savings > 0) {
        const lost = p.savings;
        deltas.push(applyDelta(p, d('savings', -lost, 'bank failure')));
        notes.push({ player: id, text: `The bank failed: your $${Math.round(lost)} of savings is gone.`, deltas: [] });
      }
      notes.push({ player: id, text: `The market crashed (${crash}).`, deltas });
    }
  }
}
