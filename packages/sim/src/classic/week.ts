/**
 * Classic week resolution. Weeks are simultaneous (PLAN §3), so:
 *   end-of-week bookkeeping per player (rent debt, loan default)
 *   -> economy for everyone (decision 7)
 *   -> advance the week; each player's week opens (stove/microwave comfort)
 *   -> win check, before the weekend, as the original's turn start ("Turn" page)
 *   -> the rest of each player's start-of-week sequence (not run once someone has won).
 */
import { CLASSIC_HOUSING, RENT_DUE_WEEK_INTERVAL } from '../content/classic';
import type { GameState, PlayerState, ResolutionNote, WeekReport } from '../types';
import { monthAfter } from './context';
import { resolveEconomy } from './economy';
import { goalExcess, goalProgress } from './goals';
import { cp } from './state';
import { continueWeek, openWeek } from './turnStart';

/**
 * Rent unpaid at the deadline (and not covered by an extension running into next week) is added
 * to the rent debt, every month it goes unpaid ("Garnishment" > "Forced Payments"); the debt is
 * then garnished from wages. The deadline moves on to the next month end either way.
 */
function rentEndOfWeek(state: GameState, p: PlayerState, notes: ResolutionNote[]): void {
  const c = cp(p);
  if (state.week < c.rentDueWeek) return;
  if (c.extensionUntil > state.week) return;
  const month = Math.round(c.rent);
  c.rentDebt = Math.round((c.rentDebt + month) * 100) / 100;
  c.rentDueWeek = monthAfter(state.week);
  c.extensionUntil = 0;
  notes.push({
    player: p.id,
    text: `You did not pay the rent on ${CLASSIC_HOUSING[c.housing].name}. You now owe $${Math.round(c.rentDebt)}, garnished from your wages.`,
  });
}

/**
 * A month with no loan payment is a default: it never forces repayment, it raises your risk and
 * keeps you in default until each missed month is made up. The -1 Happiness comes with the
 * delinquency notice at the next month end (turnStart), once a month.
 */
function loanEndOfWeek(state: GameState, p: PlayerState, notes: ResolutionNote[]): void {
  const c = cp(p);
  if (p.loan <= 0) return;
  if (state.week < c.loanDueWeek) return;
  c.loanDefaults++;
  c.loanMissed = (c.loanMissed ?? 0) + 1;
  c.inDefault = true;
  c.loanDueWeek += RENT_DUE_WEEK_INTERVAL;
  if (c.loanDueWeek <= state.week) c.loanDueWeek = monthAfter(state.week);
  notes.push({ player: p.id, text: `You defaulted on your loan (${c.loanDefaults} so far).` });
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
  for (const id of state.playerOrder) openWeek(state, state.players[id]!);

  const winner = checkWinner(state, notes);
  if (!winner) for (const id of state.playerOrder) continueWeek(state, state.players[id]!);
  report.winner = winner;
  state.history.push(report);
  if (winner) {
    state.winner = winner;
    state.phase = 'finished';
  }
  return { state, report };
}
