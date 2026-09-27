/**
 * Turn submission against the real migrations on PGlite, with a real classic
 * game from the sim. PGlite runs as a superuser, like the Edge Function's
 * database connection, so row level security does not apply here (it is
 * tested in schema.test.ts).
 */
import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CLASSIC_DEFAULT_GOALS, createGame, resolveOnlineWeek, type Action, type GameState } from '@jones2/sim';
import type { Db } from '../src/db';
import { storable, submitTurn } from '../src/submit';
import { supabaseDb } from './supabase-stub';

const ANN = randomUUID();
const BOB = randomUUID();
const EVE = randomUUID();
const END: Action = { type: 'endWeek' };
const WALK: Action[] = [{ type: 'travel', to: 'monolith' }, END];

let t: Awaited<ReturnType<typeof supabaseDb>>;
let db: Db;
let game: string;
let week1: GameState;

beforeAll(async () => {
  t = await supabaseDb();
  for (const id of [ANN, BOB, EVE]) await t.db.query('insert into auth.users (id) values ($1)', [id]);
  db = {
    transaction: (work) => t.db.transaction((tx) => work(async <T,>(text: string, params: unknown[] = []) => (await tx.query<T>(text, params)).rows)),
  };
});

beforeEach(async () => {
  await t.db.exec('truncate public.games cascade');
  week1 = createGame({
    mode: 'classic',
    ruleset: 'classic',
    goals: CLASSIC_DEFAULT_GOALS,
    seed: 7,
    townId: 'riverton',
    players: [
      { id: 'a', name: 'Ann' },
      { id: 'b', name: 'Bob' },
    ],
  });
  const g = await t.db.query<{ id: string }>(`insert into games (name, config) values ('Family', $1::jsonb) returning id`, [JSON.stringify(week1.config)]);
  game = g.rows[0]!.id;
  await t.db.query(`insert into seats (game_id, player_id, name, token_hash, user_id) values ($1, 'a', 'Ann', repeat('a', 64), $2), ($1, 'b', 'Bob', repeat('b', 64), $3)`, [game, ANN, BOB]);
  await t.db.query('insert into snapshots (game_id, week, state) values ($1, 1, $2::jsonb)', [game, JSON.stringify(storable(week1))]);
});

const submit = (user: string, playerId: string, actions: Action[], over: Record<string, unknown> = {}) =>
  submitTurn(db, user, { gameId: game, week: 1, playerId, actions, ...over });

const row = async <T,>(sql: string, params: unknown[] = []) => (await t.db.query<T>(sql, params)).rows[0];

describe('submitting a week', () => {
  it('takes the first turn and waits for the rest', async () => {
    const r = await submit(ANN, 'a', WALK);
    expect(r).toEqual({ status: 200, body: { accepted: true, resolved: false, week: 1, finished: false } });
    const turn = await row<{ submitted: boolean; n: number }>(
      `select submitted_at is not null as submitted, jsonb_array_length(actions) as n from turns where game_id = $1 and player_id = 'a'`,
      [game],
    );
    expect(turn).toEqual({ submitted: true, n: 2 });
    expect(await row('select week from games where id = $1', [game])).toEqual({ week: 1 });
  });

  it('resolves the week when the last turn lands, exactly as the sim would', async () => {
    const aTurn: Action[] = [{ type: 'travel', to: 'monolith' }, END];
    const bTurn: Action[] = [{ type: 'travel', to: 'employment' }, END];
    await submit(ANN, 'a', aTurn);
    const r = await submit(BOB, 'b', bTurn);
    expect(r).toEqual({ status: 200, body: { accepted: true, resolved: true, week: 2, finished: false } });
    expect(await row('select week, status from games where id = $1', [game])).toEqual({ week: 2, status: 'active' });

    const next = await row<{ state: GameState; report: { week: number } }>('select state, report from snapshots where game_id = $1 and week = 2', [game]);
    const expected = resolveOnlineWeek(storable(week1), { a: aTurn, b: bTurn });
    expect(next!.state).toEqual(JSON.parse(JSON.stringify(storable(expected.state))));
    expect(next!.state.history).toEqual([]);
    expect(next!.report.week).toBe(1);
  });

  it('lets a player keep a draft and then submit over it', async () => {
    await t.db.query(`insert into turns (game_id, week, player_id, actions) values ($1, 1, 'a', '[{"type":"work"}]')`, [game]);
    expect((await submit(ANN, 'a', WALK)).status).toBe(200);
  });
});

describe('refusals', () => {
  it('a malformed request', async () => {
    expect((await submitTurn(db, ANN, null)).status).toBe(400);
    expect((await submitTurn(db, ANN, { gameId: 'x', week: 1, playerId: 'a', actions: [] })).status).toBe(400);
    expect((await submit(ANN, 'a', WALK, { week: 0 })).status).toBe(400);
    expect((await submit(ANN, 'a', WALK, { actions: 'no' })).status).toBe(400);
  });

  it('an unknown game', async () => {
    expect((await submit(ANN, 'a', WALK, { gameId: randomUUID() })).status).toBe(404);
  });

  it("someone else's seat, or no seat at all", async () => {
    expect(await submit(ANN, 'b', WALK)).toMatchObject({ status: 403 });
    expect(await submit(EVE, 'a', WALK)).toMatchObject({ status: 403 });
  });

  it('an illegal turn, naming the action, and nothing is stored', async () => {
    const r = await submit(ANN, 'a', [{ type: 'travel', to: 'monolith' }, { type: 'work' }, END]);
    expect(r).toMatchObject({ status: 422, body: { index: 1 } });
    expect(await row('select count(*)::int as n from turns where game_id = $1', [game])).toEqual({ n: 0 });
  });

  it('a week that is not open', async () => {
    expect(await submit(ANN, 'a', WALK, { week: 2 })).toMatchObject({ status: 409 });
  });

  it('a second, different submission', async () => {
    await submit(ANN, 'a', WALK);
    expect(await submit(ANN, 'a', [END])).toMatchObject({ status: 409, body: { error: 'This week is already submitted' } });
  });

  it('a finished game', async () => {
    await t.db.query(`update games set status = 'finished' where id = $1`, [game]);
    expect(await submit(ANN, 'a', WALK)).toMatchObject({ status: 409, body: { error: 'The game is over' } });
  });
});

describe('retries and races', () => {
  it('a retry of the same turn is accepted again (the first answer was lost)', async () => {
    await submit(ANN, 'a', WALK);
    expect(await submit(ANN, 'a', WALK)).toMatchObject({ status: 200, body: { resolved: false } });
  });

  it('a retry after the week resolved says so', async () => {
    await submit(ANN, 'a', WALK);
    await submit(BOB, 'b', WALK);
    expect(await submit(BOB, 'b', WALK)).toEqual({ status: 200, body: { accepted: true, resolved: true, week: 2, finished: false } });
    expect(await row('select count(*)::int as n from snapshots where game_id = $1', [game])).toEqual({ n: 2 });
  });

  it('two last turns at once resolve the week once', async () => {
    await t.db.query(
      `insert into seats (game_id, player_id, name, token_hash, user_id) values ($1, 'c', 'Cy', repeat('c', 64), $2)`,
      [game, EVE],
    );
    // A third seat that the sim does not know would never check; give the game three players instead.
    const three = createGame({ ...week1.config, players: [...week1.config.players, { id: 'c', name: 'Cy' }] });
    await t.db.query('update snapshots set state = $2::jsonb where game_id = $1 and week = 1', [game, JSON.stringify(storable(three))]);
    await submit(ANN, 'a', WALK);
    const [b, c] = await Promise.all([submit(BOB, 'b', WALK), submit(EVE, 'c', WALK)]);
    expect([b.status, c.status]).toEqual([200, 200]);
    expect([b, c].filter((r) => r.status === 200 && r.body.resolved)).toHaveLength(1);
    expect(await row('select week from games where id = $1', [game])).toEqual({ week: 2 });
    expect(await row('select count(*)::int as n from snapshots where game_id = $1 and week = 2', [game])).toEqual({ n: 1 });
  });
});
