/**
 * Everything the client asks Supabase. The URL and publishable key are
 * public by design (they ship in every copy of the site); the access rules in
 * supabase/migrations are what protect the data. Sessions are anonymous and
 * kept in this browser's storage; redeeming an invite is what gives one a seat.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Action, GameState, PlayerId, WeekReport } from '@jones2/sim';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? 'https://adqanptxzjlxoiwhvvvk.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_18EYuISjhr_S2X06LDyRiA_0JIpi13q';

let client: SupabaseClient | null = null;
export function supa(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

/** A failure a person can read, with what to do about it where there is something. */
export class OnlineError extends Error {}

function human(message: string): string {
  if (/anonymous sign-ins are disabled|anonymous_provider_disabled/i.test(message)) return 'Online play is not switched on for this game server yet (anonymous sign-ins are off).';
  if (/fetch|network|Failed to fetch/i.test(message)) return 'Could not reach the game server. Check the connection and try again.';
  return message;
}

/** The signed-in user id, or null. Never signs in. */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supa().auth.getSession();
  return data.session?.user.id ?? null;
}

/** The signed-in user id, signing in anonymously first if this browser has no session. */
export async function ensureSession(): Promise<string> {
  const existing = await currentUserId();
  if (existing) return existing;
  const { data, error } = await supa().auth.signInAnonymously();
  if (error || !data.user) throw new OnlineError(human(error?.message ?? 'Could not sign in'));
  return data.user.id;
}

async function accessToken(): Promise<string> {
  const { data } = await supa().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new OnlineError('This browser is not signed in to the game. Open your invite link again.');
  return token;
}

export async function redeem(token: string): Promise<{ gameId: string; playerId: PlayerId }> {
  const { data, error } = await supa().rpc('redeem_seat', { token });
  if (error) {
    if (/already been used/i.test(error.message)) throw new OnlineError('This invite has already been used on another device. Ask the host for a new link.');
    if (/unknown invite/i.test(error.message)) throw new OnlineError('This invite link is not valid. It may have been replaced by a newer one; ask the host.');
    throw new OnlineError(human(error.message));
  }
  const row = (data as { game_id: string; player_id: string }[] | null)?.[0];
  if (!row) throw new OnlineError('The invite did not name a seat.');
  return { gameId: row.game_id, playerId: row.player_id };
}

export interface SeatSummary {
  gameId: string;
  playerId: PlayerId;
  name: string;
  gameName: string;
  week: number;
  status: string;
}

/** The seats this browser holds, with their games. Empty when signed out. */
export async function mySeats(): Promise<SeatSummary[]> {
  if (!(await currentUserId())) return [];
  const { data: seats, error } = await supa().rpc('my_seats');
  if (error) throw new OnlineError(human(error.message));
  const list = (seats ?? []) as { game_id: string; player_id: string; name: string }[];
  if (list.length === 0) return [];
  const { data: games, error: e2 } = await supa().from('games').select('id, name, week, status').in('id', [...new Set(list.map((s) => s.game_id))]);
  if (e2) throw new OnlineError(human(e2.message));
  const byId = new Map(((games ?? []) as { id: string; name: string; week: number; status: string }[]).map((g) => [g.id, g]));
  return list.map((s) => {
    const g = byId.get(s.game_id);
    return { gameId: s.game_id, playerId: s.player_id, name: s.name, gameName: g?.name ?? 'Game', week: g?.week ?? 1, status: g?.status ?? 'active' };
  });
}

export interface OpenGame {
  id: string;
  name: string;
  week: number;
  status: string;
  /** The open week's starting state (the final state once the game is over). */
  snapshot: GameState;
  /** The report of the week that produced `snapshot`; null in week 1. */
  report: WeekReport | null;
  /** This seat's saved actions for the open week, if any. */
  draft: Action[] | null;
  submitted: boolean;
}

export async function gameInfo(gameId: string): Promise<{ id: string; name: string; week: number; status: string }> {
  const { data, error } = await supa().from('games').select('id, name, week, status').eq('id', gameId).maybeSingle();
  if (error) throw new OnlineError(human(error.message));
  if (!data) throw new OnlineError('This browser has no seat in that game. Open your invite link on this device, or ask the host for a new one.');
  return data as { id: string; name: string; week: number; status: string };
}

export async function snapshotOf(gameId: string, week: number): Promise<{ state: GameState; report: WeekReport | null }> {
  const { data, error } = await supa().from('snapshots').select('state, report').eq('game_id', gameId).eq('week', week).maybeSingle();
  if (error) throw new OnlineError(human(error.message));
  if (!data) throw new OnlineError(`Week ${week} of this game is missing.`);
  return data as { state: GameState; report: WeekReport | null };
}

export async function openGame(gameId: string, playerId: PlayerId): Promise<OpenGame> {
  const g = await gameInfo(gameId);
  const [snap, turn] = await Promise.all([
    snapshotOf(gameId, g.week),
    supa().from('turns').select('actions, submitted_at').eq('game_id', gameId).eq('week', g.week).eq('player_id', playerId).maybeSingle(),
  ]);
  if (turn.error) throw new OnlineError(human(turn.error.message));
  const t = turn.data as { actions: Action[]; submitted_at: string | null } | null;
  return { ...g, snapshot: snap.state, report: snap.report, draft: t?.actions ?? null, submitted: !!t?.submitted_at };
}

export async function saveDraft(gameId: string, week: number, playerId: PlayerId, actions: readonly Action[]): Promise<void> {
  const { error } = await supa().rpc('save_draft', { g: gameId, w: week, pid: playerId, draft: actions });
  if (error) throw new OnlineError(human(error.message));
}

export interface WeekStatus {
  player_id: PlayerId;
  name: string;
  submitted: boolean;
}

export async function weekStatus(gameId: string): Promise<WeekStatus[]> {
  const { data, error } = await supa().rpc('week_status', { g: gameId });
  if (error) throw new OnlineError(human(error.message));
  return (data ?? []) as WeekStatus[];
}

export type SubmitAnswer =
  | { ok: true; resolved: boolean; week: number; finished: boolean }
  | { ok: false; status: number; error: string; index?: number };

/** Hand the week to the submit-turn function. Network failures come back as status 0. */
export async function submitWeek(gameId: string, week: number, playerId: PlayerId, actions: readonly Action[]): Promise<SubmitAnswer> {
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/submit-turn`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, week, playerId, actions }),
    });
  } catch (e) {
    if (e instanceof OnlineError) return { ok: false, status: 401, error: e.message };
    return { ok: false, status: 0, error: 'Could not reach the game server. Your week is saved; try again.' };
  }
  let body: { accepted?: boolean; resolved?: boolean; week?: number; finished?: boolean; error?: string; index?: number } = {};
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  if (res.ok && body.accepted) return { ok: true, resolved: !!body.resolved, week: body.week ?? week, finished: !!body.finished };
  return { ok: false, status: res.status, error: body.error ?? `The server answered ${res.status}`, index: body.index };
}
