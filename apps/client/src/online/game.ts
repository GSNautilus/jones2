/**
 * One seat's online game, as a small state machine outside React so it can be
 * tested against a fake server (test/online/game.test.ts).
 *
 *   loading -> recap?  (last week's recap, when this device has not seen it)
 *           -> play    (the open week, rebuilt from the saved draft)
 *           -> waiting (week handed in; others still playing)
 *           -> over    (the game has a winner)
 *   error   (anything that stopped the load; `load()` again to retry)
 *
 * During play every action runs locally on the week's snapshot (other players
 * stand where the week began) and the draft is saved to the server a moment
 * later. Ending the week hands the whole list to the submit-turn function.
 */
import { applyAction, type Action, type GameState, type PlayerId, type WeekReport } from '@jones2/sim';
import type { NodeId } from '@jones2/town';
import type { OpenGame, SubmitAnswer, WeekStatus } from './api';
import { markSeen, replayDraft, seenWeek, wantsRecap } from './week';

export interface OnlineApi {
  ensureSession(): Promise<string>;
  openGame(gameId: string, playerId: PlayerId): Promise<OpenGame>;
  snapshotOf(gameId: string, week: number): Promise<{ state: GameState; report: WeekReport | null }>;
  gameInfo(gameId: string): Promise<{ week: number; status: string }>;
  saveDraft(gameId: string, week: number, playerId: PlayerId, actions: readonly Action[]): Promise<void>;
  submitWeek(gameId: string, week: number, playerId: PlayerId, actions: readonly Action[]): Promise<SubmitAnswer>;
  weekStatus(gameId: string): Promise<WeekStatus[]>;
}

export type Phase = 'loading' | 'error' | 'recap' | 'play' | 'waiting' | 'over';

export interface View {
  phase: Phase;
  /** Why the load failed (phase 'error'). */
  problem: string | null;
  gameName: string;
  /** The week as this player sees it: the snapshot plus their own actions. */
  state: GameState | null;
  /** The report the recap or the game-over screen shows. */
  lastReport: WeekReport | null;
  /** Where everyone stood when the displayed week began, for the recap. */
  weekStarts: Record<PlayerId, NodeId>;
  /** The latest refused action's reason, for the classic screen. */
  error: string | null;
  /** Who has handed in the open week (phase 'waiting'). */
  status: WeekStatus[];
  submitting: boolean;
  /** Why the last hand-in failed; null when it did not. */
  submitError: string | null;
  /** The server refused the week itself (not a network problem): offer to replay it. */
  submitRejected: boolean;
}

export const DRAFT_DELAY_MS = 1500;

function starts(s: GameState): Record<PlayerId, NodeId> {
  const out: Record<PlayerId, NodeId> = {};
  for (const id of s.playerOrder) out[id] = s.players[id]!.node;
  return out;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export class OnlineGame {
  private view: View = {
    phase: 'loading',
    problem: null,
    gameName: '',
    state: null,
    lastReport: null,
    weekStarts: {},
    error: null,
    status: [],
    submitting: false,
    submitError: null,
    submitRejected: false,
  };
  private listeners = new Set<() => void>();
  /** The open week's snapshot and number. */
  private snapshot: GameState | null = null;
  private week = 0;
  private actions: Action[] = [];
  /** The open week, held back while last week's recap plays. */
  private pending: OpenGame | null = null;
  private afterRecap: Phase = 'play';
  private draftTimer: ReturnType<typeof setTimeout> | null = null;
  private draftDirty = false;
  private loads = 0;

  constructor(
    readonly gameId: string,
    readonly playerId: PlayerId,
    private readonly api: OnlineApi,
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null | undefined = undefined,
  ) {}

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getView = (): View => this.view;

  /** The actions played so far this week (for tests and the draft). */
  get played(): readonly Action[] {
    return this.actions;
  }

  private set(patch: Partial<View>): void {
    this.view = { ...this.view, ...patch };
    for (const fn of this.listeners) fn();
  }

  async load(): Promise<void> {
    const ticket = ++this.loads;
    this.set({ phase: 'loading', problem: null, submitError: null, submitRejected: false, error: null });
    try {
      await this.api.ensureSession();
      const g = await this.api.openGame(this.gameId, this.playerId);
      if (ticket !== this.loads) return;
      if (!g.snapshot.players[this.playerId]) throw new Error('That seat is not in this game.');
      this.set({ gameName: g.name });
      if (wantsRecap(g.week, seenWeek(this.gameId, this.playerId, this.storage))) {
        const prev = await this.api.snapshotOf(this.gameId, g.week - 1);
        if (ticket !== this.loads) return;
        this.pending = g;
        this.set({ phase: 'recap', state: prev.state, weekStarts: starts(prev.state), lastReport: g.report });
        return;
      }
      await this.enter(g);
    } catch (e) {
      if (ticket === this.loads) this.set({ phase: 'error', problem: message(e) });
    }
  }

  /** Open week `g`: rebuild the player's week from the draft and pick the phase. */
  private async enter(g: OpenGame, holdPhase = false): Promise<void> {
    this.snapshot = g.snapshot;
    this.week = g.week;
    const r = replayDraft(g.snapshot, this.playerId, g.draft ?? []);
    this.actions = r.actions;
    markSeen(this.gameId, this.playerId, g.week, this.storage);
    const over = g.status === 'finished' || g.snapshot.phase === 'finished';
    const done = r.state.players[this.playerId]!.weekDone;
    const phase: Phase = over ? 'over' : g.submitted || done ? 'waiting' : 'play';
    this.set({ state: r.state, weekStarts: starts(g.snapshot), lastReport: g.report, error: null });
    if (holdPhase) this.afterRecap = phase;
    else this.set({ phase });
    // A week ended but never handed in (the tab closed mid-send): send it now.
    if (!over && done && !g.submitted) await this.submit();
    else if (phase === 'waiting') await this.refresh();
  }

  /** The recap screen's "resolve": move on to the open week, keeping the recap on screen. */
  resolve = (): void => {
    const g = this.pending;
    if (!g) return;
    this.pending = null;
    void this.enter(g, true);
  };

  /** The recap is over: show the open week. */
  finishRecap = (): void => {
    if (this.view.phase === 'recap') this.set({ phase: this.afterRecap });
  };

  act = (action: Action): void => {
    const s = this.view.state;
    if (this.view.phase !== 'play' || !s) return;
    const r = applyAction(s, this.playerId, action);
    if (!r.ok) {
      this.set({ error: r.reason });
      return;
    }
    this.actions = [...this.actions, action];
    this.set({ state: r.state, error: null });
    if (action.type === 'endWeek') {
      this.clearDraftTimer();
      void this.submit();
    } else {
      this.draftDirty = true;
      this.clearDraftTimer();
      this.draftTimer = setTimeout(() => void this.flushDraft(), DRAFT_DELAY_MS);
    }
  };

  /** Save the week in progress now (also called when the page is hidden). */
  flushDraft = async (): Promise<void> => {
    this.clearDraftTimer();
    if (!this.draftDirty || this.view.phase !== 'play') return;
    this.draftDirty = false;
    try {
      await this.api.saveDraft(this.gameId, this.week, this.playerId, this.actions);
    } catch {
      this.draftDirty = true; // try again with the next action
    }
  };

  /** Hand the week in; also the "Try again" button. */
  submit = async (): Promise<void> => {
    this.set({ phase: 'waiting', submitting: true, submitError: null, submitRejected: false });
    const ans = await this.api.submitWeek(this.gameId, this.week, this.playerId, this.actions);
    this.set({ submitting: false });
    if (ans.ok) {
      if (ans.resolved) await this.load();
      else await this.refresh();
      return;
    }
    // Someone else's device or an earlier try already moved things on: start from what the server has.
    if (ans.status === 409) {
      await this.load();
      return;
    }
    this.set({ submitError: ans.error, submitRejected: ans.status === 422 });
  };

  /** Throw the week away and play it again from its start (after the server refused it). */
  restartWeek = async (): Promise<void> => {
    if (!this.snapshot) return;
    this.actions = [];
    this.set({ phase: 'play', state: this.snapshot, submitError: null, submitRejected: false, error: null });
    try {
      await this.api.saveDraft(this.gameId, this.week, this.playerId, []);
    } catch {
      /* the next action saves again */
    }
  };

  /**
   * While waiting: has the week moved on? Who is still playing? Also after a
   * hand-in that never heard back (a phone that slept mid-send): the server
   * may well have the week, and then the page must not sit on the error.
   */
  refresh = async (): Promise<void> => {
    if (this.view.phase !== 'waiting' || this.view.submitting || this.view.submitRejected) return;
    try {
      const info = await this.api.gameInfo(this.gameId);
      if (info.week > this.week || (info.status === 'finished' && this.view.state?.phase !== 'finished')) {
        await this.load();
        return;
      }
      const status = await this.api.weekStatus(this.gameId);
      const mine = status.find((s) => s.player_id === this.playerId);
      this.set(mine?.submitted ? { status, submitError: null } : { status });
    } catch {
      /* try again on the next tick */
    }
  };

  dispose(): void {
    void this.flushDraft();
  }

  private clearDraftTimer(): void {
    if (this.draftTimer) clearTimeout(this.draftTimer);
    this.draftTimer = null;
  }
}
