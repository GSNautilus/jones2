/**
 * Game state store for the hot-seat harness. Plain React state (no external
 * libs), persisted to localStorage. Port of apps/debug-client's load/save
 * plumbing, extended with weekStarts (needed by the replay) and a fixed
 * per-player colour palette.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  allPlayersDone,
  applyAction,
  createGame,
  resolveWeek,
  type Action,
  type GameConfig,
  type GameState,
  type PlayerId,
  type WeekReport,
} from '@jones2/sim';
import type { NodeId } from '@jones2/town';

const STORAGE = 'jones2-client-state';

/** Fixed 6-colour palette; players are assigned a colour by their index in playerOrder. */
export const PLAYER_COLORS = ['#e4572e', '#2f6fed', '#2a9d8f', '#f4a300', '#8e44ad', '#c9184a'];

export function colorForIndex(i: number): string {
  return PLAYER_COLORS[i % PLAYER_COLORS.length]!;
}

interface Persisted {
  state: GameState;
  weekStarts: Record<PlayerId, NodeId>;
  lastReport: WeekReport | null;
}

/**
 * Bump when the persisted shape changes so a game saved by an older build is
 * dropped instead of crashing the screen that reads it.
 */
const STORE_VERSION = 2;

function load(): Persisted | null {
  try {
    if (new URLSearchParams(location.search).has('new')) {
      // `/?new` always starts at setup, whatever is saved.
      localStorage.removeItem(STORAGE);
      return null;
    }
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted & { version?: number };
    if (parsed.version !== STORE_VERSION || !parsed.state?.config) {
      localStorage.removeItem(STORAGE);
      return null;
    }
    // Games on the extended-design rules are no longer offered (DESIGN decision log
    // 2026-10-02); one saved from before would reopen in the placeholder screen.
    if (parsed.state.config.ruleset !== 'classic') {
      localStorage.removeItem(STORAGE);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function save(p: Persisted | null): void {
  try {
    if (p) localStorage.setItem(STORAGE, JSON.stringify({ version: STORE_VERSION, ...p }));
    else localStorage.removeItem(STORAGE);
  } catch {
    /* ignore */
  }
}

/** Snapshot of where every player stands right now, for the replay's `starts`. */
function captureStarts(state: GameState): Record<PlayerId, NodeId> {
  const starts: Record<PlayerId, NodeId> = {};
  for (const id of state.playerOrder) starts[id] = state.players[id]!.node;
  return starts;
}

export interface GameStore {
  state: GameState | null;
  setState: (s: GameState) => void;
  currentPid: PlayerId | null;
  setCurrentPid: (id: PlayerId | null) => void;
  error: string | null;
  /** Start a new game from a config (built by SetupScreen). */
  start: (config: GameConfig) => void;
  /** Apply an action for the current player. */
  act: (action: Action) => void;
  /** Resolve the week once every player is done. */
  resolve: () => void;
  /** Abandon the current game and return to setup. */
  reset: () => void;
  lastReport: WeekReport | null;
  /** Where each player stood at the start of the week currently in progress. */
  weekStarts: Record<PlayerId, NodeId>;
  /** Colour assigned to each player, derived from their index in playerOrder. */
  playerColors: Record<PlayerId, string>;
}

export function useGameStore(): GameStore {
  const initial = load();
  const [state, setStateRaw] = useState<GameState | null>(initial?.state ?? null);
  const [currentPid, setCurrentPid] = useState<PlayerId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<WeekReport | null>(initial?.lastReport ?? null);
  const [weekStarts, setWeekStarts] = useState<Record<PlayerId, NodeId>>(
    initial?.weekStarts ?? (initial?.state ? captureStarts(initial.state) : {}),
  );

  useEffect(() => {
    save(state ? { state, weekStarts, lastReport } : null);
  }, [state, weekStarts, lastReport]);

  // Auto-advance to the next player who hasn't ended their week.
  useEffect(() => {
    if (!state) return;
    if (!currentPid || state.players[currentPid]?.weekDone) {
      const next = state.playerOrder.find((id) => !state.players[id]!.weekDone) ?? null;
      setCurrentPid(next);
    }
  }, [state, currentPid]);

  const setState = useCallback((s: GameState) => setStateRaw(s), []);

  const start = useCallback((config: GameConfig) => {
    const s = createGame(config);
    setStateRaw(s);
    setWeekStarts(captureStarts(s));
    setLastReport(null);
    setCurrentPid(null);
    setError(null);
  }, []);

  const act = useCallback(
    (action: Action) => {
      if (!state || !currentPid) return;
      const r = applyAction(state, currentPid, action);
      if (!r.ok) {
        setError(r.reason);
        return;
      }
      setError(null);
      setStateRaw(r.state);
    },
    [state, currentPid],
  );

  const resolve = useCallback(() => {
    if (!state) return;
    if (!allPlayersDone(state)) return;
    const r = resolveWeek(state);
    setLastReport(r.report);
    setStateRaw(r.state);
    setCurrentPid(null);
    setError(null);
    if (r.state.phase === 'playing') setWeekStarts(captureStarts(r.state));
  }, [state]);

  const reset = useCallback(() => {
    save(null);
    setStateRaw(null);
    setCurrentPid(null);
    setError(null);
    setLastReport(null);
    setWeekStarts({});
  }, []);

  const playerColors: Record<PlayerId, string> = {};
  if (state) state.playerOrder.forEach((id, i) => (playerColors[id] = colorForIndex(i)));

  return {
    state,
    setState,
    currentPid,
    setCurrentPid,
    error,
    start,
    act,
    resolve,
    reset,
    lastReport,
    weekStarts,
    playerColors,
  };
}
