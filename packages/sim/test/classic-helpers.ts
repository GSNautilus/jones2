/** Shared setup for the classic-ruleset tests. Not a test file itself. */
import { CLASSIC_DEFAULT_GOALS, applyAction, createGame, resolveWeek, type Action, type GameConfig, type GameState } from '../src';

export function config(over: Partial<GameConfig> = {}): GameConfig {
  return {
    mode: 'classic',
    ruleset: 'classic',
    goals: CLASSIC_DEFAULT_GOALS,
    seed: 42,
    townId: 'riverton',
    players: [
      { id: 'a', name: 'Ann' },
      { id: 'b', name: 'Bob' },
    ],
    ...over,
  };
}

export function game(over: Partial<GameConfig> = {}): GameState {
  return createGame(config(over));
}

export function must(state: GameState, pid: string, action: Action): GameState {
  const r = applyAction(state, pid, action);
  if (!r.ok) throw new Error(`${pid} ${action.type}: ${r.reason}`);
  return r.state;
}

export function endAll(state: GameState): GameState {
  let s = state;
  for (const id of s.playerOrder) if (!s.players[id]!.weekDone) s = must(s, id, { type: 'endWeek' });
  return resolveWeek(s).state;
}

/** Buy a week of food at Monolith so the next week does not start with starvation. */
export function feed(s: GameState, pid: string): GameState {
  let next = teleport(s, pid, 'monolith');
  next.players[pid]!.cash = Math.max(next.players[pid]!.cash, 500);
  return must(next, pid, { type: 'buyFood', foodId: 'hamburgers' });
}

/** Put all of Z-Mart's shelf on sale for a player this week (it normally rolls 6 rows). */
export function fullShelf(s: GameState, pid: string): GameState {
  s.players[pid]!.classic!.zmartStock = undefined;
  return s;
}

/** Put a player at a node without spending their week. */
export function teleport(s: GameState, pid: string, node: string): GameState {
  return { ...s, players: { ...s.players, [pid]: { ...s.players[pid]!, node } } };
}
