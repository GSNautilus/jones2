/**
 * Classic week resolution. Weeks are simultaneous (PLAN §3), so:
 *   end-of-week bookkeeping per player (rent debt, loan default)
 *   -> economy for everyone (decision 7)
 *   -> advance the week and run each player's start-of-week sequence
 *   -> win check at week start.
 */
import { CLASSIC_HOUSING, RENT_DUE_WEEK_INTERVAL } from '../content/classic';
import type { Delta, GameState, PlayerState, ResolutionNote, WeekReport } from '../types';
import { happy } from './effects';
import { resolveEconomy } from './economy';
import { goalExcess, goalProgress } from './goals';
import { cp } from './state';
import { startWeek } from './turnStart';

/** Rent unpaid at the deadline becomes rent debt; it is then garnished from wages. */
function rentEndOfWeek(state: GameState, p: PlayerState, notes: ResolutionNote[]): void {
  const c = cp(p);
  // No new rent accrues while a debt stands: classic/config.ts RENT_DEBT_PAUSES_ACCRUAL.
  if (c.rentDebt > 0) return;
  if (state.week < c.rentDueWeek) return;
  c.rentDebt = Math.round(c.rent);
  c.extensionUntil = 0;
  notes.push({
    player: p.id,
    text: `You did not pay the rent on ${CLASSIC_HOUSING[c.housing].name}. $${c.rentDebt} will be garnished from your wages.`,
  });
}

/** A month with no loan payment is a default: it never forces repayment, it just raises your risk. */
function loanEndOfWeek(state: GameState, p: PlayerState, notes: ResolutionNote[]): void {
  const c = cp(p);
  if (p.loan <= 0 || c.week.paidLoan) return;
  if (state.week < c.loanDueWeek) return;
  c.loanDefaults++;
  c.inDefault = true;
  c.loanDueWeek = state.week + RENT_DUE_WEEK_INTERVAL;
  const deltas: Delta[] = [];
  happy(p, 'loan_defaulted', deltas);
  notes.push({ player: p.id, text: `You defaulted on your loan (${c.loanDefaults} so far).`, deltas });
}

/**
 * Simultaneous weeks mean several players can meet all four goals at the same week start, so
 * "earliest in the week" cannot separate them. The tie-break is the largest total goal excess,
 * then seating order (classic/config.ts TIEBREAK_BY_GOAL_EXCESS).
 */
function checkWinner(state: GameState, notes: ResolutionNote[]): string | null {
  const finalWeek = state.config.mode === 'fixed' && state.config.weeks !== undefined && state.week >= state.config.weeks;
  const done = state.playerOrder.filter((id) => goalProgress(state, state.players[id]!).done);
  if (state.config.mode === 'fixed') {
    if (!finalWeek) return null;
  } else if (done.length === 0) {
    return null;
  }
  const pool = done.length ? done : state.playerOrder;
  const ranked = [...pool].sort((a, b) => goalExcess(state, state.players[b]!) - goalExcess(state, state.players[a]!));
  const w = ranked[0]!;
  notes.push({ player: null, text: `${state.players[w]!.name} wins!` });
  return w;
}

export function resolveWeek(input: GameState): { state: GameState; report: WeekReport } {
  const { history, ...rest } = input;
  const state: GameState = { ...structuredClone(rest), history: [...history] };
  const notes: ResolutionNote[] = [];
  const logs: Record<string, PlayerState['log']> = {};
  for (const id of state.playerOrder) logs[id] = state.players[id]!.log;

  for (const id of state.playerOrder) {
    const p = state.players[id]!;
    rentEndOfWeek(state, p, notes);
    loanEndOfWeek(state, p, notes);
  }

  const nextWeek = state.week + 1;
  resolveEconomy(state, nextWeek, notes);

  const report: WeekReport = { week: state.week, notes, firedEvents: [], logs, winner: null };

  state.week = nextWeek;
  for (const id of state.playerOrder) startWeek(state, state.players[id]!);

  const winner = checkWinner(state, notes);
  report.winner = winner;
  state.history.push(report);
  if (winner) {
    state.winner = winner;
    state.phase = 'finished';
  }
  return { state, report };
}
