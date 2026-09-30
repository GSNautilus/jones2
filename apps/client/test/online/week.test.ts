import { describe, expect, it } from 'vitest';
import { CLASSIC_DEFAULT_GOALS, createGame, type Action } from '@jones2/sim';
import { gameHash, parseRoute } from '../../src/online/route';
import { markSeen, replayDraft, seenWeek, wantsRecap } from '../../src/online/week';

const GAME = '0b3c1f2a-1234-4abc-9def-0123456789ab';

describe('parseRoute', () => {
  it('reads an invite', () => {
    expect(parseRoute('#/join/abcdefghijklmnopqrstuvwxyz_-0123456789ABCDEFG')).toEqual({ kind: 'join', token: 'abcdefghijklmnopqrstuvwxyz_-0123456789ABCDEFG' });
  });
  it('reads a game seat, and round-trips gameHash', () => {
    expect(parseRoute(gameHash(GAME, 'p1'))).toEqual({ kind: 'game', gameId: GAME, playerId: 'p1' });
  });
  it('treats anything else as the local game', () => {
    for (const h of ['', '#', '#/', '#/join/short', '#/game/not-a-uuid/p1', `#/game/${GAME}`, '#/editor']) expect(parseRoute(h)).toEqual({ kind: 'local' });
  });
});

describe('replayDraft', () => {
  const snap = createGame({
    mode: 'classic',
    ruleset: 'classic',
    goals: CLASSIC_DEFAULT_GOALS,
    seed: 3,
    townId: 'riverton',
    players: [
      { id: 'p0', name: 'Ann' },
      { id: 'p1', name: 'Bob' },
    ],
  });

  it('rebuilds the week from the saved actions', () => {
    const draft: Action[] = [{ type: 'travel', to: 'monolith' }, { type: 'travel', to: 'bank' }];
    const r = replayDraft(snap, 'p0', draft);
    expect(r.dropped).toBe(0);
    expect(r.state.players.p0!.node).toBe('bank');
    expect(r.state.players.p0!.log).toHaveLength(2);
    expect(r.state.players.p1!.node).toBe(snap.players.p1!.node);
  });

  it('keeps what still replays and drops the rest', () => {
    const draft: Action[] = [{ type: 'travel', to: 'monolith' }, { type: 'work' }, { type: 'travel', to: 'bank' }];
    const r = replayDraft(snap, 'p0', draft);
    expect(r.actions).toEqual([{ type: 'travel', to: 'monolith' }]);
    expect(r.dropped).toBe(2);
  });
});

describe('recap bookkeeping', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it('remembers the last week watched, per seat', () => {
    const s = mem();
    expect(seenWeek(GAME, 'p0', s)).toBeNull();
    markSeen(GAME, 'p0', 3, s);
    expect(seenWeek(GAME, 'p0', s)).toBe(3);
    expect(seenWeek(GAME, 'p1', s)).toBeNull();
  });

  it('shows a recap only for a week this device has not watched begin', () => {
    expect(wantsRecap(1, null)).toBe(false);
    expect(wantsRecap(4, null)).toBe(false); // first visit on this device
    expect(wantsRecap(4, 4)).toBe(false);
    expect(wantsRecap(5, 4)).toBe(true);
  });
});
