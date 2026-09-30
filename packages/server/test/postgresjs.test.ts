/**
 * The Edge Function talks to Postgres through postgres.js (npm:postgres), not
 * PGlite's own API. Serve PGlite over a real socket and run submissions
 * through postgres.js, so the driver's parameter typing and result parsing are
 * what the tests see. The game is seeded the way the host's new-game does it.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CLASSIC_DEFAULT_GOALS, availableActions, createGame, type Action, type GameConfig } from '@jones2/sim';
import { postgresJsDb, type Db } from '../src/db';
import { submitTurn } from '../src/submit';
import { supabaseDb } from './supabase-stub';

const ANN = randomUUID();
const BOB = randomUUID();
const PORT = 55000 + Math.floor(Math.random() * 5000);

let t: Awaited<ReturnType<typeof supabaseDb>>;
let server: PGLiteSocketServer;
let sql: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  t = await supabaseDb();
  for (const id of [ANN, BOB]) await t.db.query('insert into auth.users (id) values ($1)', [id]);
  server = new PGLiteSocketServer({ db: t.db, port: PORT, host: '127.0.0.1' });
  await server.start();
  sql = postgres(`postgres://postgres@127.0.0.1:${PORT}/postgres`, { prepare: false, max: 1, onnotice: () => undefined });
  db = postgresJsDb(sql as unknown as Parameters<typeof postgresJsDb>[0]);
});

afterAll(async () => {
  await sql?.end({ timeout: 1 });
  await server?.stop();
});

/** A game as new-game makes it: classic rules on the classic map, players p0.. */
async function seed(): Promise<string> {
  const config: GameConfig = {
    mode: 'classic',
    ruleset: 'classic',
    goals: { ...CLASSIC_DEFAULT_GOALS },
    seed: 634466,
    townId: 'classic',
    players: [
      { id: 'p0', name: 'Test A' },
      { id: 'p1', name: 'Test B' },
    ],
  };
  const state = createGame(config);
  const g = await t.db.query<{ id: string }>('insert into games (name, config) values ($1, $2::jsonb) returning id', ['Test', JSON.stringify(config)]);
  const id = g.rows[0]!.id;
  await t.db.query(
    `insert into seats (game_id, player_id, name, token_hash) values ($1, 'p0', 'Test A', $2), ($1, 'p1', 'Test B', $3)`,
    [id, randomBytes(32).toString('hex'), randomBytes(32).toString('hex')],
  );
  await t.db.query(`insert into seat_devices (game_id, player_id, user_id) values ($1, 'p0', $2), ($1, 'p1', $3)`, [id, ANN, BOB]);
  await t.db.query('insert into snapshots (game_id, week, state) values ($1, 1, $2::jsonb)', [id, JSON.stringify({ ...state, history: [] })]);
  return id;
}

/** A plausible week: walk somewhere the classic map offers, then end it. */
function aWeek(gameState = createGame({ mode: 'classic', ruleset: 'classic', goals: CLASSIC_DEFAULT_GOALS, seed: 634466, townId: 'classic', players: [{ id: 'p0', name: 'A' }, { id: 'p1', name: 'B' }] }), pid = 'p0'): Action[] {
  const travel = availableActions(gameState, pid).find((o) => o.action.type === 'travel' && o.enabled);
  return travel ? [travel.action, { type: 'endWeek' }] : [{ type: 'endWeek' }];
}

describe('submissions through postgres.js', () => {
  it('takes both weeks and resolves, on the classic map', async () => {
    const gameId = await seed();
    const a = await submitTurn(db, ANN, { gameId, week: 1, playerId: 'p0', actions: aWeek() });
    expect(a).toMatchObject({ status: 200, body: { resolved: false } });
    const b = await submitTurn(db, BOB, { gameId, week: 1, playerId: 'p1', actions: aWeek(undefined, 'p1') });
    expect(b).toMatchObject({ status: 200, body: { resolved: true, week: 2 } });
    const snap = await t.db.query<{ n: number }>('select count(*)::int as n from snapshots where game_id = $1', [gameId]);
    expect(snap.rows[0]!.n).toBe(2);
  });

  it('refuses a stranger and an unknown game the same way PGlite does', async () => {
    const gameId = await seed();
    expect(await submitTurn(db, randomUUID(), { gameId, week: 1, playerId: 'p0', actions: [] })).toMatchObject({ status: 403 });
    expect(await submitTurn(db, ANN, { gameId: randomUUID(), week: 1, playerId: 'p0', actions: [] })).toMatchObject({ status: 404 });
  });
});
