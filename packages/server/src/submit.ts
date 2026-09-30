/**
 * Submit a player's week (DESIGN decision log 2026-09-22). All in one
 * transaction that locks the game row, so submissions to one game queue up
 * and exactly one of them, the last, resolves the week:
 *
 *   caller holds the seat -> the week is the open one -> the turn replays
 *   cleanly on the week's snapshot (sim checkTurn) -> save it as submitted ->
 *   if every seat has now submitted: merge and resolve (sim resolveOnlineWeek),
 *   store the next snapshot, open the next week.
 *
 * Snapshots are stored without `history` (nothing reads it; it would make
 * storage grow with the square of the game's length). Each snapshot row keeps
 * the report of the week that produced it instead.
 */
import { checkTurn, resolveOnlineWeek, type Action, type GameState } from '@jones2/sim';
import type { Db } from './db';

export interface SubmitRequest {
  gameId: string;
  week: number;
  playerId: string;
  actions: Action[];
}

export type SubmitResult =
  | { status: 200; body: { accepted: true; resolved: boolean; week: number; finished: boolean } }
  | { status: 400 | 403 | 404 | 409 | 422; body: { error: string; index?: number } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The request, or why it is malformed. */
export function parseSubmit(body: unknown): SubmitRequest | string {
  if (!body || typeof body !== 'object') return 'Expected a JSON object';
  const b = body as Record<string, unknown>;
  if (typeof b.gameId !== 'string' || !UUID.test(b.gameId)) return 'gameId must be a game id';
  if (typeof b.week !== 'number' || !Number.isInteger(b.week) || b.week < 1) return 'week must be a week number';
  if (typeof b.playerId !== 'string' || b.playerId.length === 0 || b.playerId.length > 64) return 'playerId must be a player id';
  if (!Array.isArray(b.actions)) return 'actions must be a list';
  return { gameId: b.gameId, week: b.week, playerId: b.playerId, actions: b.actions as Action[] };
}

const fail = (status: 400 | 403 | 404 | 409 | 422, error: string, index?: number): SubmitResult => ({
  status,
  body: index === undefined ? { error } : { error, index },
});

/** Drop the history before storing a snapshot. */
export function storable(state: GameState): GameState {
  return { ...state, history: [] };
}

export async function submitTurn(db: Db, userId: string, body: unknown): Promise<SubmitResult> {
  const req = parseSubmit(body);
  if (typeof req === 'string') return fail(400, req);

  return db.transaction(async (q) => {
    const games = await q<{ week: number; status: string }>('select week, status from public.games where id = $1 for update', [req.gameId]);
    const game = games[0];
    if (!game) return fail(404, 'No such game');

    const seat = await q('select 1 from public.seat_devices where game_id = $1 and player_id = $2 and user_id = $3', [req.gameId, req.playerId, userId]);
    if (seat.length === 0) return fail(403, 'That seat is not yours');

    const previous = await q<{ same: boolean; submitted: boolean }>(
      `select actions = $4::text::jsonb as same, submitted_at is not null as submitted
         from public.turns where game_id = $1 and week = $2 and player_id = $3`,
      [req.gameId, req.week, req.playerId, JSON.stringify(req.actions)],
    );
    if (previous[0]?.submitted) {
      // A retry after a lost response is fine; a different week is not.
      if (previous[0].same) return { status: 200, body: { accepted: true, resolved: game.week > req.week, week: game.week, finished: game.status === 'finished' } };
      return fail(409, 'This week is already submitted');
    }
    if (game.status === 'finished') return fail(409, 'The game is over');
    if (req.week !== game.week) return fail(409, `Week ${req.week} is not the open week (${game.week})`);

    const snaps = await q<{ state: GameState }>('select state from public.snapshots where game_id = $1 and week = $2', [req.gameId, req.week]);
    const snapshot = snaps[0]?.state;
    if (!snapshot) return fail(409, 'The week has no snapshot');

    const check = checkTurn(snapshot, req.playerId, req.actions);
    if (!check.ok) return fail(422, check.reason, check.index);

    await q(
      `insert into public.turns (game_id, week, player_id, actions, submitted_at)
       values ($1, $2, $3, $4::text::jsonb, now())
       on conflict (game_id, week, player_id) do update set actions = excluded.actions, submitted_at = excluded.submitted_at`,
      [req.gameId, req.week, req.playerId, JSON.stringify(req.actions)],
    );

    const waiting = await q<{ n: number }>(
      `select count(*)::int as n from public.seats s
        where s.game_id = $1
          and not exists (select 1 from public.turns t
                           where t.game_id = s.game_id and t.player_id = s.player_id
                             and t.week = $2 and t.submitted_at is not null)`,
      [req.gameId, req.week],
    );
    if (waiting[0]!.n > 0) return { status: 200, body: { accepted: true, resolved: false, week: game.week, finished: false } };

    const rows = await q<{ player_id: string; actions: Action[] }>('select player_id, actions from public.turns where game_id = $1 and week = $2', [req.gameId, req.week]);
    const turns = Object.fromEntries(rows.map((r) => [r.player_id, r.actions]));
    const { state, report } = resolveOnlineWeek(snapshot, turns);
    const finished = state.phase === 'finished';
    await q('insert into public.snapshots (game_id, week, state, report) values ($1, $2, $3::text::jsonb, $4::text::jsonb)', [
      req.gameId,
      state.week,
      JSON.stringify(storable(state)),
      JSON.stringify(report),
    ]);
    await q(`update public.games set week = $2, status = case when $3 then 'finished' else status end where id = $1`, [req.gameId, state.week, finished]);
    return { status: 200, body: { accepted: true, resolved: true, week: state.week, finished } };
  });
}
