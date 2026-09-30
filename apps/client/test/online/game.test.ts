/**
 * One seat's online game against an in-memory server that accepts and
 * resolves weeks the way the submit-turn function does (checkTurn, then
 * resolveOnlineWeek once every seat is in).
 */
import { describe, expect, it, vi } from 'vitest';
import { CLASSIC_DEFAULT_GOALS, checkTurn, createGame, resolveOnlineWeek, type Action, type GameState, type WeekReport } from '@jones2/sim';
import type { SubmitAnswer } from '../../src/online/api';
import { OnlineGame, type OnlineApi } from '../../src/online/game';

const GAME = '0b3c1f2a-1234-4abc-9def-0123456789ab';
const END: Action = { type: 'endWeek' };
const WALK: Action = { type: 'travel', to: 'monolith' };

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

function server() {
  const first = createGame({
    mode: 'classic',
    ruleset: 'classic',
    goals: CLASSIC_DEFAULT_GOALS,
    seed: 11,
    townId: 'riverton',
    players: [
      { id: 'p0', name: 'Ann' },
      { id: 'p1', name: 'Bob' },
    ],
  });
  const game = { id: GAME, name: 'Family', week: 1, status: 'active' };
  const snapshots = new Map<number, { state: GameState; report: WeekReport | null }>([[1, { state: first, report: null }]]);
  const turns = new Map<string, { actions: Action[]; submitted: boolean }>();
  const key = (w: number, pid: string) => `${w}/${pid}`;
  let offline = false;

  const submit = async (w: number, pid: string, actions: readonly Action[]): Promise<SubmitAnswer> => {
    if (offline) return { ok: false, status: 0, error: 'Could not reach the game server.' };
    if (turns.get(key(w, pid))?.submitted) return { ok: false, status: 409, error: 'This week is already submitted' };
    if (w !== game.week) return { ok: false, status: 409, error: 'not the open week' };
    const snap = snapshots.get(w)!.state;
    const c = checkTurn(snap, pid, actions);
    if (!c.ok) return { ok: false, status: 422, error: c.reason, index: c.index };
    turns.set(key(w, pid), { actions: [...actions], submitted: true });
    const all = snap.playerOrder.every((id) => turns.get(key(w, id))?.submitted);
    if (!all) return { ok: true, resolved: false, week: w, finished: false };
    const t = Object.fromEntries(snap.playerOrder.map((id) => [id, turns.get(key(w, id))!.actions]));
    const { state, report } = resolveOnlineWeek(snap, t);
    snapshots.set(state.week, { state: { ...state, history: [] }, report });
    game.week = state.week;
    if (state.phase === 'finished') game.status = 'finished';
    return { ok: true, resolved: true, week: state.week, finished: state.phase === 'finished' };
  };

  const api: OnlineApi = {
    ensureSession: async () => 'user',
    openGame: async (_g, pid) => {
      const s = snapshots.get(game.week)!;
      const t = turns.get(key(game.week, pid));
      return { ...game, snapshot: s.state, report: s.report, draft: t?.actions ?? null, submitted: !!t?.submitted };
    },
    snapshotOf: async (_g, w) => snapshots.get(w)!,
    gameInfo: async () => ({ week: game.week, status: game.status }),
    saveDraft: async (_g, w, pid, actions) => {
      if (!turns.get(key(w, pid))?.submitted) turns.set(key(w, pid), { actions: [...actions], submitted: false });
    },
    submitWeek: (_g, w, pid, actions) => submit(w, pid, actions),
    weekStatus: async () =>
      snapshots.get(game.week)!.state.playerOrder.map((id, i) => ({ player_id: id, name: ['Ann', 'Bob'][i]!, submitted: !!turns.get(key(game.week, id))?.submitted })),
  };
  return {
    api,
    game,
    turns,
    snapshots,
    /** Another device hands in a week. */
    other: (pid: string, actions: Action[]) => submit(game.week, pid, actions),
    goOffline: (v: boolean) => void (offline = v),
  };
}

const seat = (srv: ReturnType<typeof server>, storage = memory(), pid = 'p0') => new OnlineGame(GAME, pid, srv.api, storage);

describe('opening a game', () => {
  it('starts in play at the open week on a first visit', async () => {
    const srv = server();
    const g = seat(srv);
    await g.load();
    expect(g.getView()).toMatchObject({ phase: 'play', gameName: 'Family', error: null });
    expect(g.getView().state!.week).toBe(1);
  });

  it('picks up a saved draft', async () => {
    const srv = server();
    srv.turns.set('1/p0', { actions: [WALK], submitted: false });
    const g = seat(srv);
    await g.load();
    expect(g.getView().state!.players.p0!.node).toBe('monolith');
    expect(g.played).toEqual([WALK]);
  });

  it('says what went wrong, and loads again when asked', async () => {
    const srv = server();
    const g = new OnlineGame(GAME, 'p9', srv.api, memory());
    await g.load();
    expect(g.getView()).toMatchObject({ phase: 'error' });
    expect(g.getView().problem).toMatch(/not in this game/);
  });
});

describe('playing the week', () => {
  it('runs actions locally and saves the draft', async () => {
    const srv = server();
    const g = seat(srv);
    await g.load();
    g.act(WALK);
    expect(g.getView().state!.players.p0!.node).toBe('monolith');
    await g.flushDraft();
    expect(srv.turns.get('1/p0')).toEqual({ actions: [WALK], submitted: false });
  });

  it('shows a refused action and changes nothing', async () => {
    const srv = server();
    const g = seat(srv);
    await g.load();
    const before = g.getView().state;
    g.act({ type: 'work' });
    expect(g.getView().error).toBeTruthy();
    expect(g.getView().state).toBe(before);
    expect(g.played).toEqual([]);
  });

  it('hands the week in at END TURN and waits for the others', async () => {
    const srv = server();
    const g = seat(srv);
    await g.load();
    g.act(WALK);
    g.act(END);
    await vi.waitFor(() => expect(g.getView().status).toHaveLength(2));
    expect(g.getView()).toMatchObject({ phase: 'waiting', submitting: false, submitError: null });
    expect(g.getView().status.map((s) => s.submitted)).toEqual([true, false]);
    expect(srv.turns.get('1/p0')!.submitted).toBe(true);
  });
});

describe('when everyone is in', () => {
  it('notices the new week, plays the recap, then opens the week', async () => {
    const srv = server();
    const g = seat(srv);
    await g.load();
    g.act(WALK);
    g.act(END);
    await vi.waitFor(() => expect(g.getView().phase).toBe('waiting'));
    await srv.other('p1', [END]);
    await g.refresh();
    await vi.waitFor(() => expect(g.getView().phase).toBe('recap'));
    // The recap starts from last week, with last week's report.
    expect(g.getView().state!.week).toBe(1);
    expect(g.getView().lastReport!.week).toBe(1);
    expect(g.getView().weekStarts.p0).toBe(srv.snapshots.get(1)!.state.players.p0!.node);
    g.resolve();
    await vi.waitFor(() => expect(g.getView().state!.week).toBe(2));
    expect(g.getView().phase).toBe('recap'); // still on the recap screen
    g.finishRecap();
    expect(g.getView().phase).toBe('play');
  });

  it('the last player in goes straight to the recap', async () => {
    const srv = server();
    await srv.other('p1', [END]);
    const g = seat(srv);
    await g.load();
    g.act(END);
    await vi.waitFor(() => expect(g.getView().phase).toBe('recap'));
  });

  it('a device that never saw the week begin gets no recap', async () => {
    const srv = server();
    await srv.other('p0', [END]);
    await srv.other('p1', [END]);
    const g = seat(srv);
    await g.load();
    expect(g.getView().phase).toBe('play');
    expect(g.getView().state!.week).toBe(2);
  });
});

describe('when handing in fails', () => {
  it('keeps the week and tries again', async () => {
    const srv = server();
    const g = seat(srv);
    await g.load();
    srv.goOffline(true);
    g.act(END);
    await vi.waitFor(() => expect(g.getView().submitError).toMatch(/reach/));
    expect(g.getView().submitRejected).toBe(false);
    srv.goOffline(false);
    await g.submit();
    expect(g.getView().submitError).toBeNull();
    expect(srv.turns.get('1/p0')!.submitted).toBe(true);
  });

  it('offers to replay a week the server refuses', async () => {
    const srv = server();
    const g = seat(srv);
    await g.load();
    // The server's rules differ from this build's (an old tab after a redeploy, say).
    const real = srv.api.submitWeek;
    srv.api.submitWeek = async () => ({ ok: false, status: 422, error: 'Not enough time', index: 0 });
    g.act(END);
    await vi.waitFor(() => expect(g.getView().submitRejected).toBe(true));
    srv.api.submitWeek = real;
    await g.restartWeek();
    expect(g.getView()).toMatchObject({ phase: 'play', submitError: null });
    expect(g.played).toEqual([]);
    expect(srv.turns.get('1/p0')).toEqual({ actions: [], submitted: false });
  });

  it('sends a week that was ended but never handed in (the tab closed mid-send)', async () => {
    const srv = server();
    srv.turns.set('1/p0', { actions: [WALK, END], submitted: false });
    const g = seat(srv);
    await g.load();
    await vi.waitFor(() => expect(srv.turns.get('1/p0')!.submitted).toBe(true));
    expect(g.getView().phase).toBe('waiting');
  });

  it('a second device that already handed in just reloads', async () => {
    const srv = server();
    const g = seat(srv);
    await g.load();
    await srv.other('p0', [WALK, END]); // the same seat, from another tab
    g.act(END);
    await vi.waitFor(() => expect(g.getView()).toMatchObject({ phase: 'waiting', submitError: null }));
    expect(srv.turns.get('1/p0')!.actions).toEqual([WALK, END]);
  });
});
