/**
 * The migrations' access rules, run for real on Postgres (PGlite) with a
 * stand-in for Supabase's roles and auth. Each test acts as a session the way
 * the API would and checks what it can and cannot see or do.
 */
import { createHash, randomUUID } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MIGRATIONS, supabaseDb, type Who } from './supabase-stub';

const hash = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

const ANN = randomUUID();
const BOB = randomUUID();
const EVE = randomUUID(); // signed in anonymously, never invited
const HOST: Who = { role: 'service_role' };
const ann: Who = { role: 'authenticated', uid: ANN };
const bob: Who = { role: 'authenticated', uid: BOB };
const eve: Who = { role: 'authenticated', uid: EVE };
const nobody: Who = { role: 'anon' };

let t: Awaited<ReturnType<typeof supabaseDb>>;
let game: string;
let other: string;

/** Expect a statement to be refused by Postgres (privilege, policy or raised error). */
async function refused(p: Promise<unknown>, message?: RegExp) {
  await expect(p).rejects.toThrow(message ?? /./);
}

beforeAll(async () => {
  t = await supabaseDb();
  for (const id of [ANN, BOB, EVE]) await t.db.query('insert into auth.users (id) values ($1)', [id]);
});

// Every case starts from the same seed and is rolled back after.
afterEach(async () => {
  await t.rollback();
});

beforeEach(async () => {
  await t.begin();
  const g = await t.as<{ id: string }>(HOST, `insert into games (name, config) values ('Family', '{"seed":1}') returning id`);
  game = g[0]!.id;
  const o = await t.as<{ id: string }>(HOST, `insert into games (name, config) values ('Other family', '{"seed":2}') returning id`);
  other = o[0]!.id;
  await t.as(HOST, `insert into seats (game_id, player_id, name, token_hash) values ($1, 'p1', 'Ann', $2), ($1, 'p2', 'Bob', $3), ($4, 'p1', 'Zed', $5)`, [
    game,
    hash('ann-token'),
    hash('bob-token'),
    other,
    hash('zed-token'),
  ]);
  await t.as(HOST, `insert into snapshots (game_id, week, state) values ($1, 1, '{"week":1}'), ($2, 1, '{"week":1}')`, [game, other]);
  await t.as(HOST, `insert into storage.objects (bucket_id, name) values ('sierra', 'audio/voice/line_010.ogg')`);
});

describe('before an invite is redeemed', () => {
  it('a signed-out visitor can read nothing', async () => {
    await refused(t.as(nobody, 'select * from games'), /permission denied/);
    await refused(t.as(nobody, 'select * from snapshots'), /permission denied/);
    await refused(t.as(nobody, 'select redeem_seat($1)', ['ann-token']), /permission denied/);
    expect(await t.as(nobody, `select * from storage.objects where bucket_id = 'sierra'`)).toEqual([]);
  });

  it('an anonymous session sees no games, no snapshots and none of the original files', async () => {
    expect(await t.as(eve, 'select * from games')).toEqual([]);
    expect(await t.as(eve, 'select * from snapshots')).toEqual([]);
    expect(await t.as(eve, 'select game_id, player_id, name from seats')).toEqual([]);
    expect(await t.as(eve, `select * from storage.objects where bucket_id = 'sierra'`)).toEqual([]);
    expect(await t.as(eve, 'select has_seat() as ok')).toEqual([{ ok: false }]);
  });

  it('a made-up token is refused', async () => {
    await refused(t.as(eve, 'select * from redeem_seat($1)', ['guess']), /unknown invite/);
  });
});

describe('redeeming an invite', () => {
  it('binds the seat and opens the game and the bucket to that session', async () => {
    expect(await t.as(ann, 'select * from redeem_seat($1)', ['ann-token'])).toEqual([{ game_id: game, player_id: 'p1' }]);
    expect((await t.as(ann, 'select id from games')).map((r) => r.id)).toEqual([game]);
    expect(await t.as(ann, 'select week from snapshots')).toEqual([{ week: 1 }]);
    expect(await t.as(ann, 'select player_id, name from seats order by player_id')).toEqual([
      { player_id: 'p1', name: 'Ann' },
      { player_id: 'p2', name: 'Bob' },
    ]);
    expect(await t.as(ann, 'select * from my_seats()')).toEqual([{ game_id: game, player_id: 'p1', name: 'Ann' }]);
    expect(await t.as(ann, `select name from storage.objects where bucket_id = 'sierra'`)).toEqual([{ name: 'audio/voice/line_010.ogg' }]);
  });

  it("is the player's key: every device that opens the link joins the seat, as often as it likes", async () => {
    await t.as(ann, 'select * from redeem_seat($1)', ['ann-token']);
    // Ann's phone (eve's session stands in for a second device of Ann's)
    expect(await t.as(eve, 'select * from redeem_seat($1)', ['ann-token'])).toEqual([{ game_id: game, player_id: 'p1' }]);
    expect((await t.as(eve, 'select id from games')).map((r) => r.id)).toEqual([game]);
    expect(await t.as(eve, 'select player_id from my_seats()')).toEqual([{ player_id: 'p1' }]);
    expect(await t.as(eve, `select name from storage.objects where bucket_id = 'sierra'`)).toHaveLength(1);
    // and again, later, on the first device
    expect(await t.as(ann, 'select * from redeem_seat($1)', ['ann-token'])).toHaveLength(1);
    expect(await t.as(HOST, `select count(*)::int as n from seat_devices where player_id = 'p1'`)).toEqual([{ n: 2 }]);
  });

  it('lets either device play the seat', async () => {
    await t.as(ann, 'select * from redeem_seat($1)', ['ann-token']);
    await t.as(eve, 'select * from redeem_seat($1)', ['ann-token']);
    await t.as(ann, `select save_draft($1, 1, 'p1', '[{"type":"work"}]'::jsonb)`, [game]);
    await t.as(eve, `select save_draft($1, 1, 'p1', '[]'::jsonb)`, [game]);
    expect(await t.as<{ n: number }>(ann, `select jsonb_array_length(actions) as n from turns where player_id = 'p1'`)).toEqual([{ n: 0 }]);
  });

  it('never shows token hashes or who holds a seat', async () => {
    await t.as(ann, 'select * from redeem_seat($1)', ['ann-token']);
    await refused(t.as(ann, 'select token_hash from seats'), /permission denied/);
    await refused(t.as(ann, 'select * from seat_devices'), /permission denied/);
    await refused(t.as(ann, 'select * from seats'), /permission denied/);
  });

  it('shows nothing of other games', async () => {
    await t.as(ann, 'select * from redeem_seat($1)', ['ann-token']);
    expect(await t.as(ann, 'select * from games where id = $1', [other])).toEqual([]);
    expect(await t.as(ann, 'select * from snapshots where game_id = $1', [other])).toEqual([]);
    expect(await t.as(ann, 'select name from seats where game_id = $1', [other])).toEqual([]);
  });

  it('lets one device hold two seats (a family sharing a tablet)', async () => {
    await t.as(ann, 'select * from redeem_seat($1)', ['ann-token']);
    await t.as(ann, 'select * from redeem_seat($1)', ['bob-token']);
    expect((await t.as(ann, 'select player_id from my_seats() order by 1')).map((r) => r.player_id)).toEqual(['p1', 'p2']);
  });

  it('the host re-issuing a seat signs every device out and retires the old link', async () => {
    await t.as(ann, 'select * from redeem_seat($1)', ['ann-token']);
    await t.as(bob, 'select * from redeem_seat($1)', ['ann-token']); // a second device on Ann's link
    // what tools/host reissue-seat does
    await t.as(HOST, `update seats set claimed_at = null, token_hash = $1 where game_id = $2 and player_id = 'p1'`, [hash('ann-new'), game]);
    await t.as(HOST, `delete from seat_devices where game_id = $1 and player_id = 'p1'`, [game]);
    expect(await t.as(ann, 'select * from games')).toEqual([]);
    expect(await t.as(bob, 'select * from games')).toEqual([]);
    expect(await t.as(ann, `select * from storage.objects where bucket_id = 'sierra'`)).toEqual([]);
    await refused(t.as(ann, 'select * from redeem_seat($1)', ['ann-token']), /unknown invite/);
    expect(await t.as(eve, 'select * from redeem_seat($1)', ['ann-new'])).toHaveLength(1);
  });

  it('the host cannot be locked out: the secret key reads everything', async () => {
    expect(await t.as(HOST, 'select count(*)::int as n from seats')).toEqual([{ n: 3 }]);
  });
});

describe('turns', () => {
  beforeEach(async () => {
    await t.as(ann, 'select * from redeem_seat($1)', ['ann-token']);
    await t.as(bob, 'select * from redeem_seat($1)', ['bob-token']);
  });

  const start = (who: Who, pid: string, week = 1) =>
    t.as(who, `insert into turns (game_id, week, player_id, actions) values ($1, $2, $3, '[{"type":"work"}]')`, [game, week, pid]);

  it('a player starts and edits their own turn in the open week', async () => {
    await start(ann, 'p1');
    await t.as(ann, `update turns set actions = '[{"type":"work"},{"type":"work"}]' where game_id = $1 and player_id = 'p1'`, [game]);
    const rows = await t.as<{ actions: unknown[] }>(ann, `select actions from turns where player_id = 'p1'`);
    expect(rows[0]!.actions).toHaveLength(2);
  });

  it('cannot write anyone else’s turn', async () => {
    await refused(start(ann, 'p2'), /row-level security/);
    await start(bob, 'p2');
    await t.as(ann, `update turns set actions = '[]' where player_id = 'p2'`);
    const rows = await t.as<{ actions: unknown[] }>(bob, `select actions from turns where player_id = 'p2'`);
    expect(rows[0]!.actions).toHaveLength(1);
  });

  it('cannot play a week that is not open', async () => {
    await t.as(HOST, `insert into snapshots (game_id, week, state) values ($1, 2, '{}')`, [game]);
    await refused(start(ann, 'p1', 2), /row-level security/);
  });

  it('cannot submit, or edit once the Edge Function has submitted', async () => {
    await start(ann, 'p1');
    await refused(t.as(ann, `update turns set submitted_at = now() where player_id = 'p1'`), /permission denied/);
    await t.as(HOST, `update turns set submitted_at = now() where game_id = $1 and player_id = 'p1'`, [game]);
    await t.as(ann, `update turns set actions = '[]' where player_id = 'p1'`);
    const rows = await t.as<{ actions: unknown[] }>(ann, `select actions from turns where player_id = 'p1'`);
    expect(rows[0]!.actions).toHaveLength(1);
  });

  it('cannot delete a turn', async () => {
    await start(ann, 'p1');
    await refused(t.as(ann, `delete from turns where player_id = 'p1'`), /permission denied/);
  });

  it('sees a rival’s turn only once the week has resolved', async () => {
    await start(ann, 'p1');
    await start(bob, 'p2');
    expect((await t.as(ann, 'select player_id from turns')).map((r) => r.player_id)).toEqual(['p1']);
    await t.as(HOST, `insert into snapshots (game_id, week, state) values ($1, 2, '{}')`, [game]);
    await t.as(HOST, 'update games set week = 2 where id = $1', [game]);
    expect((await t.as(ann, 'select player_id from turns order by 1')).map((r) => r.player_id)).toEqual(['p1', 'p2']);
  });

  it('an uninvited session sees no turns at all', async () => {
    await start(ann, 'p1');
    await t.as(HOST, `insert into snapshots (game_id, week, state) values ($1, 2, '{}')`, [game]);
    await t.as(HOST, 'update games set week = 2 where id = $1', [game]);
    expect(await t.as(eve, 'select * from turns')).toEqual([]);
  });
});

describe('the week snapshot', () => {
  it('exists once per week, so two resolutions racing for the same week cannot both land', async () => {
    await t.as(HOST, `insert into snapshots (game_id, week, state) values ($1, 2, '{}')`, [game]);
    await refused(t.as(HOST, `insert into snapshots (game_id, week, state) values ($1, 2, '{}')`, [game]), /duplicate key/);
  });

  it('players cannot write snapshots or games', async () => {
    await t.as(ann, 'select * from redeem_seat($1)', ['ann-token']);
    await refused(t.as(ann, `insert into snapshots (game_id, week, state) values ($1, 2, '{}')`, [game]), /permission denied/);
    await refused(t.as(ann, 'update games set week = 9 where id = $1', [game]), /permission denied/);
  });
});

describe('the sierra bucket', () => {
  it('is private', async () => {
    expect(await t.as(HOST, `select public from storage.buckets where id = 'sierra'`)).toEqual([{ public: false }]);
  });

  it('a seat opens only the sierra bucket, not others', async () => {
    await t.as(HOST, `insert into storage.buckets (id, name) values ('other', 'other')`);
    await t.as(HOST, `insert into storage.objects (bucket_id, name) values ('other', 'secret.txt')`);
    await t.as(ann, 'select * from redeem_seat($1)', ['ann-token']);
    expect((await t.as(ann, 'select bucket_id from storage.objects')).map((r) => r.bucket_id)).toEqual(['sierra']);
  });
});

describe('save_draft', () => {
  beforeEach(async () => {
    await t.as(ann, 'select * from redeem_seat($1)', ['ann-token']);
  });
  const save = (who: Who, pid: string, week = 1, draft = '[{"type":"work"}]') =>
    t.as(who, 'select save_draft($1, $2, $3, $4::jsonb)', [game, week, pid, draft]);

  it('saves and then replaces the player’s own draft', async () => {
    await save(ann, 'p1');
    await save(ann, 'p1', 1, '[{"type":"work"},{"type":"endWeek"}]');
    const rows = await t.as<{ n: number }>(ann, `select jsonb_array_length(actions) as n from turns where player_id = 'p1'`);
    expect(rows).toEqual([{ n: 2 }]);
  });

  it('refuses another seat, another week, and something that is not a list', async () => {
    await refused(save(ann, 'p2'), /not yours/);
    await refused(save(eve, 'p1'), /not yours/);
    await refused(save(ann, 'p1', 2), /not open/);
    await refused(save(ann, 'p1', 1, '{"type":"work"}'), /list of actions/);
  });

  it('never overwrites a submitted turn', async () => {
    await save(ann, 'p1');
    await t.as(HOST, `update turns set submitted_at = now() where game_id = $1 and player_id = 'p1'`, [game]);
    await save(ann, 'p1', 1, '[]');
    expect(await t.as<{ n: number }>(ann, `select jsonb_array_length(actions) as n from turns where player_id = 'p1'`)).toEqual([{ n: 1 }]);
  });

  it('is not open to signed-out visitors', async () => {
    await refused(t.as(nobody, 'select save_draft($1, 1, $2, $3::jsonb)', [game, 'p1', '[]']), /permission denied/);
  });
});

describe('week_status', () => {
  it('says who has handed in the open week, without the actions', async () => {
    await t.as(ann, 'select * from redeem_seat($1)', ['ann-token']);
    await t.as(HOST, `insert into turns (game_id, week, player_id, actions, submitted_at) values ($1, 1, 'p2', '[{"type":"endWeek"}]', now())`, [game]);
    expect(await t.as(ann, 'select * from week_status($1)', [game])).toEqual([
      { player_id: 'p1', name: 'Ann', submitted: false },
      { player_id: 'p2', name: 'Bob', submitted: true },
    ]);
  });

  it('says nothing to someone without a seat in that game', async () => {
    expect(await t.as(eve, 'select * from week_status($1)', [game])).toEqual([]);
  });
});

describe('ping', () => {
  it('answers anyone, signed in or not', async () => {
    expect(await t.as(nobody, 'select ping() as p')).toEqual([{ p: 'pong' }]);
    expect(await t.as(eve, 'select ping() as p')).toEqual([{ p: 'pong' }]);
  });
});

describe('moving to permanent links (migration 20261001000000)', () => {
  it('keeps every device that already held a seat', async () => {
    const old = await supabaseDb({ stopBefore: '20261001000000' });
    await old.db.query('insert into auth.users (id) values ($1)', [ANN]);
    const g = await old.db.query<{ id: string }>(`insert into games (name, config) values ('Old', '{}') returning id`);
    const id = g.rows[0]!.id;
    await old.db.query(
      `insert into seats (game_id, player_id, name, token_hash, user_id) values ($1, 'p0', 'Ann', repeat('a', 64), $2), ($1, 'p1', 'Bob', repeat('b', 64), null)`,
      [id, ANN],
    );
    await old.db.exec(readFileSync(join(MIGRATIONS, '20261001000000_permanent_links.sql'), 'utf8'));
    expect((await old.db.query('select game_id, player_id, user_id from seat_devices')).rows).toEqual([{ game_id: id, player_id: 'p0', user_id: ANN }]);
    expect(await old.as({ role: 'authenticated', uid: ANN }, 'select player_id from my_seats()')).toEqual([{ player_id: 'p0' }]);
  });
});
