/**
 * The classic economy: one index that prices, wages and rents track, stock prices that wander
 * around it, and the boom/crash events. Per PLAN §3 decision 7 these resolve at week end, for
 * everyone at once, and the new headline is the one players read next week.
 */
import {
  BOOM_STOCK_HAPPINESS,
  CRASH_BOOM_MIN_WEEK_CD_ROM,
  CRASH_JOB_LOSS_HAPPINESS,
  CRASH_RENT_MIN_FRACTION,
  CRASH_STOCK_PENALTY,
  CRASH_WAGE_CUT_HAPPINESS,
  CLASSIC_HAPPINESS_MAP,
  CLASSIC_STOCK_LIST,
  RANDOM_HEADLINES,
  SPECIFIC_HEADLINES,
  STOCK_HAPPINESS_THRESHOLD,
  STOCK_PRICE_RANGE,
} from '../content/classic';
import { clamp } from '../helpers';
import { chance, nextFloat, pick } from '../rng';
import type { Delta, GameState, PlayerState, ResolutionNote } from '../types';
import * as K from './config';
import { cg, cp, jobOf, stockValue } from './state';

export type Severity = 'minor' | 'moderate' | 'major';

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

/** Initial economy: index 1, every stock at its base price, a random front page. */
export function initEconomy(state: GameState): void {
  const factor: Record<string, number> = {};
  for (const s of CLASSIC_STOCK_LIST) factor[s.id] = 1;
  let headline: string;
  [state.rng, headline] = pick(state.rng, RANDOM_HEADLINES);
  state.classic = { index: K.ECONOMY_START, stockFactor: factor, headline, event: 'none', pawnShop: [] };
  syncIndices(state);
}

/** Prices, wages and rents all follow the one index. A crash floors rents at half baseline. */
export function syncIndices(state: GameState): void {
  const c = cg(state);
  state.economy = {
    ...state.economy,
    priceIndex: c.index,
    wageIndex: c.index,
    rentIndex: Math.max(CRASH_RENT_MIN_FRACTION, c.index),
    savingsRate: 0, // "no interest is accrued for money kept in a Bank Account"
    loanRate: 0, // classic loans charge a flat $5 fee per payment instead of interest
    crimeRate: 0, // Wild Willy is not implemented (PLAN §3 decision 6)
  };
}

function rollSeverity(state: GameState): Severity {
  let f: number;
  [state.rng, f] = nextFloat(state.rng);
  let acc = 0;
  for (const row of K.CRASH_SEVERITY_WEIGHTS) {
    acc += row.weight;
    if (f < acc) return row.severity;
  }
  return 'minor';
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

/**
 * Resolve the economy for the coming week. Returns the notes to put in the week report.
 * Booms and crashes are gated to week 8+ (the CD-ROM rule the content tables chose).
 */
export function resolveEconomy(state: GameState, nextWeek: number, notes: ResolutionNote[]): void {
  const c = cg(state);
  const gated = nextWeek >= CRASH_BOOM_MIN_WEEK_CD_ROM;

  let boom = false;
  let crash: Severity | null = null;
  if (gated) {
    let hit: boolean;
    [state.rng, hit] = chance(state.rng, K.CRASH_CHANCE);
    if (hit) crash = rollSeverity(state);
    else [state.rng, boom] = chance(state.rng, K.BOOM_CHANCE);
  }

  // Index: a bounded random walk, shoved by the event.
  let f: number;
  [state.rng, f] = nextFloat(state.rng);
  let index = c.index + (f * 2 - 1) * K.ECONOMY_DRIFT;
  if (boom) index += K.BOOM_INDEX_DELTA;
  if (crash) index += K.CRASH_INDEX_DELTA[crash];
  c.index = Math.round(clamp(index, K.ECONOMY_MIN, K.ECONOMY_MAX) * 1000) / 1000;
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
      const job = jobOf(p);
      if (job) {
        let lost: boolean;
        [state.rng, lost] = chance(state.rng, K.CRASH_JOB_LOSS_CHANCE[crash]);
        if (lost) {
          cp(p).jobId = null;
          cp(p).raises = 0;
          cp(p).wage = 0;
          state.jobHolders[job.id] = (state.jobHolders[job.id] ?? []).filter((x) => x !== id);
          happy(p, 'crash_job_loss', deltas, CRASH_JOB_LOSS_HAPPINESS);
          notes.push({ player: id, text: `The crash cost you your job as ${job.title}.`, deltas: [] });
        } else {
          let cut: boolean;
          [state.rng, cut] = chance(state.rng, K.CRASH_WAGE_CUT_CHANCE[crash]);
          if (cut) {
            const c2 = cp(p);
            const before = c2.wage;
            c2.wage = Math.max(1, Math.round(before * (1 - K.CRASH_WAGE_CUT_FRACTION)));
            happy(p, 'crash_wage_cut', deltas, CRASH_WAGE_CUT_HAPPINESS);
            notes.push({ player: id, text: `Your wage was cut from $${before} to $${c2.wage}.`, deltas: [] });
          }
        }
      }
      notes.push({ player: id, text: `The market crashed (${crash}).`, deltas });
    }
  }
}
