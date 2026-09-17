/** Small shared mutators for the classic ruleset: deltas, happiness-table lookups, payments. */
import { CLASSIC_HAPPINESS_MAP } from '../content/classic';
import { applyDelta } from '../helpers';
import type { Delta, PlayerState } from '../types';

export function d(stat: Delta['stat'], amount: number, note?: string): Delta {
  return note ? { stat, amount, note } : { stat, amount };
}

/**
 * Apply one row of the classic happiness table by id. `override` is for the rows whose amount is
 * a range or whose value lives in another table.
 */
export function happy(p: PlayerState, id: string, deltas: Delta[], override?: number): void {
  const entry = CLASSIC_HAPPINESS_MAP[id];
  const amount = override ?? (typeof entry?.amount === 'number' ? entry.amount : 0);
  if (!amount) return;
  deltas.push(applyDelta(p, d('happiness', amount, entry?.label ?? id)));
}

/** Spend cash, floored at zero: start-of-week events never push a player negative. */
export function spend(p: PlayerState, amount: number, note: string, deltas: Delta[]): number {
  const paid = Math.min(p.cash, Math.max(0, Math.round(amount)));
  if (paid > 0) deltas.push(applyDelta(p, d('cash', -paid, note)));
  return paid;
}

/** Pay a price the caller has already checked the player can afford. */
export function pay(p: PlayerState, amount: number, note: string, deltas: Delta[]): void {
  if (amount) deltas.push(applyDelta(p, d('cash', -Math.round(amount), note)));
}

export function earn(p: PlayerState, amount: number, note: string, deltas: Delta[]): void {
  if (amount) deltas.push(applyDelta(p, d('cash', Math.round(amount), note)));
}
