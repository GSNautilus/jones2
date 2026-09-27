/**
 * Online weeks (DESIGN decision log 2026-09-22 and 6.13). Every player plays the
 * same week alone, on their own device, from the week-start snapshot. The
 * server then:
 *   1. checks each submitted turn by replaying it alone on the snapshot
 *      (`checkTurn`): every action must succeed and the week must be ended;
 *   2. once all turns are in, merges them (`mergeWeek`): every player's actions
 *      are applied to one state in in-week time order, earliest first, seat
 *      order breaking ties. Anything two players both wanted (the one pawned
 *      item, the last pawn shop slot) goes to whoever got there first; the
 *      later action is skipped and the player gets a note;
 *   3. resolves the week as usual (`resolveOnlineWeek`).
 *
 * In-week dice come from each player's own stream (classic/state.ts
 * `playerRoll`), so a player's rolls are the same alone and merged. Only the
 * classic ruleset is supported: the other ruleset still rolls on the shared
 * stream.
 */
import { applyAction, describeAction } from './actions';
import type { Action, GameState, PlayerEvent, PlayerId, ResolutionNote, WeekReport } from './types';
import { resolveWeek } from './week';

/** Upper bound on one turn's actions, so a hostile submission cannot keep the server busy. */
export const MAX_TURN_ACTIONS = 2000;

export type TurnCheck =
  | { ok: true; state: GameState; events: PlayerEvent[] }
  | { ok: false; index: number; reason: string };

/** Replay one player's week alone on the week-start snapshot. */
export function checkTurn(snapshot: GameState, playerId: PlayerId, actions: readonly Action[]): TurnCheck {
  if (snapshot.config.ruleset !== 'classic') return { ok: false, index: 0, reason: 'Online play supports the classic ruleset only' };
  if (snapshot.phase !== 'playing') return { ok: false, index: 0, reason: 'The game is over' };
  if (!snapshot.players[playerId]) return { ok: false, index: 0, reason: 'Unknown player' };
  if (!Array.isArray(actions)) return { ok: false, index: 0, reason: 'Actions must be a list' };
  if (actions.length > MAX_TURN_ACTIONS) return { ok: false, index: MAX_TURN_ACTIONS, reason: 'Too many actions' };
  let state = snapshot;
  const events: PlayerEvent[] = [];
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]!;
    if (!action || typeof action !== 'object' || typeof (action as { type?: unknown }).type !== 'string') {
      return { ok: false, index: i, reason: 'Not an action' };
    }
    const r = applyAction(state, playerId, action);
    if (!r.ok) return { ok: false, index: i, reason: r.reason };
    state = r.state;
    events.push(r.event);
  }
  if (!state.players[playerId]!.weekDone) return { ok: false, index: actions.length, reason: 'The week has not been ended' };
  return { ok: true, state, events };
}

interface Step {
  minute: number;
  seat: number;
  index: number;
  playerId: PlayerId;
  action: Action;
}

/**
 * Apply every player's checked turn to the snapshot in in-week time order.
 * Throws if a player has no turn or a turn does not check: the server checks
 * each turn as it is submitted, so either means a bug, not a player.
 */
export function mergeWeek(snapshot: GameState, turns: Readonly<Record<PlayerId, readonly Action[]>>): { state: GameState; notes: ResolutionNote[] } {
  const steps: Step[] = [];
  snapshot.playerOrder.forEach((playerId, seat) => {
    const actions = turns[playerId];
    if (!actions) throw new Error(`No turn from ${playerId}`);
    const check = checkTurn(snapshot, playerId, actions);
    if (!check.ok) throw new Error(`${playerId}'s turn does not check at action ${check.index}: ${check.reason}`);
    check.events.forEach((e, index) => steps.push({ minute: e.minute, seat, index, playerId, action: e.action }));
  });
  steps.sort((x, y) => x.minute - y.minute || x.seat - y.seat || x.index - y.index);

  let state = snapshot;
  const notes: ResolutionNote[] = [];
  for (const step of steps) {
    const r = applyAction(state, step.playerId, step.action);
    if (r.ok) {
      state = r.state;
      continue;
    }
    const what = describeAction(state, step.playerId, step.action).label;
    notes.push({ player: step.playerId, text: `${what} fell through: ${r.reason}.` });
  }
  // A skipped action never ends a week, but make sure: resolution needs everyone done.
  for (const id of state.playerOrder) {
    if (state.players[id]!.weekDone) continue;
    state = { ...state, players: { ...state.players, [id]: { ...state.players[id]!, weekDone: true } } };
  }
  return { state, notes };
}

/** Merge the week and resolve it. The merge notes lead the week's report. */
export function resolveOnlineWeek(
  snapshot: GameState,
  turns: Readonly<Record<PlayerId, readonly Action[]>>,
): { state: GameState; report: WeekReport } {
  const merged = mergeWeek(snapshot, turns);
  const { state, report } = resolveWeek(merged.state);
  report.notes.unshift(...merged.notes); // the same object sits last in state.history
  return { state, report };
}
