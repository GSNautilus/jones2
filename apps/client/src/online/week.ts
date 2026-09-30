/**
 * The pure half of the online week: rebuild a player's week from the
 * snapshot and their saved actions, and remember per device which week's
 * recap has been watched.
 */
import { applyAction, type Action, type GameState, type PlayerId } from '@jones2/sim';

/**
 * Apply a saved draft to the week's snapshot. A draft saved by an older build
 * can stop replaying; keep the part that still works rather than lose the week.
 */
export function replayDraft(snapshot: GameState, playerId: PlayerId, draft: readonly Action[]): { state: GameState; actions: Action[]; dropped: number } {
  let state = snapshot;
  const actions: Action[] = [];
  for (const a of draft) {
    const r = applyAction(state, playerId, a);
    if (!r.ok) break;
    state = r.state;
    actions.push(a);
  }
  return { state, actions, dropped: draft.length - actions.length };
}

const SEEN = 'jones2-online-seen';

/** The last week this device has watched the start of, for this seat; null if never opened here. */
export function seenWeek(gameId: string, playerId: PlayerId, storage: Pick<Storage, 'getItem'> | null = safeStorage()): number | null {
  try {
    const all = JSON.parse(storage?.getItem(SEEN) ?? '{}') as Record<string, number>;
    return all[`${gameId}/${playerId}`] ?? null;
  } catch {
    return null;
  }
}

export function markSeen(gameId: string, playerId: PlayerId, week: number, storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage()): void {
  try {
    const all = JSON.parse(storage?.getItem(SEEN) ?? '{}') as Record<string, number>;
    all[`${gameId}/${playerId}`] = week;
    storage?.setItem(SEEN, JSON.stringify(all));
  } catch {
    /* private mode: the recap just shows again */
  }
}

/**
 * Should opening the game show last week's recap first? Only when this device
 * has seen an earlier week of this game; a first visit starts at the open week.
 */
export function wantsRecap(openWeek: number, seen: number | null): boolean {
  return seen !== null && openWeek > seen && openWeek > 1;
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
