/**
 * Hosting from the site: the host link makes a device a host device, and only
 * host devices can create games or see and replace player links.
 */
import { createHash, randomUUID } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CLASSIC_DEFAULT_GOALS, createGame, type GameConfig } from '@jones2/sim';
import { supabaseDb, type Who } from './supabase-stub';

const hash = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

const LAPTOP = randomUUID();
const PHONE = randomUUID();
const KID = randomUUID();
const HOST: Who = { role: 'service_role' };
const laptop: Who = { role: 'authenticated', uid: LAPTOP };
const phone: Who = { role: 'authenticated', uid: PHONE };
const kid: Who = { role: 'authenticated', uid: KID };
const nobody: Who = { role: 'anon' };

let t: Awaited<ReturnType<typeof supabaseDb>>;

const refused = (p: Promise<unknown>, m: RegExp) => expect(p).rejects.toThrow(m);

function setup(names = ['Ann', 'Bob']) {
  const config: GameConfig = {
    mode: 'classic',
    ruleset: 'classic',
    goals: { ...CLASSIC_DEFAULT_GOALS },
    seed: 5,
    townId: 'classic',
    players: names.map((name, i) => ({ id: `p${i}`, name })),
  };
  const state = createGame(config);
  // The client sends the state's own config, so the two match exactly.
  return { config: state.config, state };
}

const create = (who: Who, name = 'Family', s = setup()) =>
  t.as<{ game_id: string; player_id: string; name: string; token: string }>(who, 'select * from host_create_game($1, $2::text::jsonb, $3::text::jsonb)', [
    name,
    JSON.stringify(s.config),
    JSON.stringify(s.state),
  ]);

beforeAll(async () => {
  t = await supabaseDb();
  for (const id of [LAPTOP, PHONE, KID]) await t.db.query('insert into auth.users (id) values ($1)', [id]);
});
afterEach(async () => {
  await t.rollback();
});
beforeEach(async () => {
  await t.begin();
  // what `npm run host-link` does
  await t.as(HOST, 'insert into host_keys (token_hash) values ($1)', [hash('host-key')]);
});

describe('the host link', () => {
  it('makes every device that opens it a host device', async () => {
    expect(await t.as(laptop, 'select is_host() as h')).toEqual([{ h: false }]);
    await t.as(laptop, 'select redeem_host($1)', ['host-key']);
    await t.as(phone, 'select redeem_host($1)', ['host-key']);
    expect(await t.as(laptop, 'select is_host() as h')).toEqual([{ h: true }]);
    expect(await t.as(phone, 'select is_host() as h')).toEqual([{ h: true }]);
    expect(await t.as(kid, 'select is_host() as h')).toEqual([{ h: false }]);
  });

  it('refuses a wrong link and signed-out visitors', async () => {
    await refused(t.as(kid, 'select redeem_host($1)', ['guess']), /unknown host link/);
    await refused(t.as(nobody, 'select redeem_host($1)', ['host-key']), /permission denied/);
  });

  it('a new host link signs every host device out', async () => {
    await t.as(laptop, 'select redeem_host($1)', ['host-key']);
    await t.as(HOST, 'delete from host_devices');
    await t.as(HOST, 'delete from host_keys');
    await t.as(HOST, 'insert into host_keys (token_hash) values ($1)', [hash('host-key-2')]);
    expect(await t.as(laptop, 'select is_host() as h')).toEqual([{ h: false }]);
    await refused(t.as(laptop, 'select redeem_host($1)', ['host-key']), /unknown host link/);
  });

  it('host tables are not readable by anyone on the site', async () => {
    await t.as(laptop, 'select redeem_host($1)', ['host-key']);
    await refused(t.as(laptop, 'select * from host_keys'), /permission denied/);
    await refused(t.as(laptop, 'select * from host_devices'), /permission denied/);
  });
});

describe('creating a game from the site', () => {
  beforeEach(async () => {
    await t.as(laptop, 'select redeem_host($1)', ['host-key']);
  });

  it('makes the game, its seats and week 1, and returns one URL-safe link per player', async () => {
    const seats = await create(laptop, 'Family');
    expect(seats.map((s) => [s.player_id, s.name])).toEqual([
      ['p0', 'Ann'],
      ['p1', 'Bob'],
    ]);
    for (const s of seats) expect(s.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(seats[0]!.token).not.toBe(seats[1]!.token);
    const g = seats[0]!.game_id;
    expect(await t.as(HOST, 'select name, week, status from games where id = $1', [g])).toEqual([{ name: 'Family', week: 1, status: 'active' }]);
    expect(await t.as(HOST, `select jsonb_array_length(state->'history') as h, (state->>'week')::int as w from snapshots where game_id = $1`, [g])).toEqual([{ h: 0, w: 1 }]);
    // the links work like any player link
    expect(await t.as(kid, 'select * from redeem_seat($1)', [seats[1]!.token])).toEqual([{ game_id: g, player_id: 'p1' }]);
  });

  it('refuses anyone who is not a host', async () => {
    await refused(create(kid), /only the host/);
    await refused(create(nobody), /permission denied/);
  });

  it('refuses the other ruleset, too many players, and a state that is not this game', async () => {
    const other = setup();
    await refused(create(laptop, 'x', { config: { ...other.config, ruleset: 'jones2' }, state: other.state }), /classic rules/);
    await refused(create(laptop, 'x', setup(['a', 'b', 'c', 'd', 'e'])), /one to four/);
    const mismatch = setup();
    await refused(create(laptop, 'x', { config: { ...mismatch.config, seed: 999 }, state: mismatch.state }), /does not match/);
  });

  it('never shows links to players', async () => {
    const seats = await create(laptop);
    await t.as(kid, 'select * from redeem_seat($1)', [seats[0]!.token]);
    await refused(t.as(kid, 'select link from seats'), /permission denied/);
    await refused(t.as(kid, 'select * from host_seats($1)', [seats[0]!.game_id]), /only the host/);
    await refused(t.as(kid, 'select * from host_games()'), /only the host/);
  });
});

describe('managing games from the site', () => {
  let game: string;
  let seats: { player_id: string; token: string }[];
  beforeEach(async () => {
    await t.as(laptop, 'select redeem_host($1)', ['host-key']);
    await t.as(phone, 'select redeem_host($1)', ['host-key']);
    const made = await create(laptop);
    game = made[0]!.game_id;
    seats = made;
  });

  it('lists the games and, per seat, the link, its devices and the hand-in', async () => {
    expect((await t.as(phone, 'select game_id, name, week from host_games()')).map((r) => r.game_id)).toContain(game);
    await t.as(kid, 'select * from redeem_seat($1)', [seats[0]!.token]);
    await t.as(HOST, `insert into turns (game_id, week, player_id, actions, submitted_at) values ($1, 1, 'p0', '[{"type":"endWeek"}]', now())`, [game]);
    expect(await t.as(phone, 'select player_id, token, devices, submitted from host_seats($1)', [game])).toEqual([
      { player_id: 'p0', token: seats[0]!.token, devices: 1, submitted: true },
      { player_id: 'p1', token: seats[1]!.token, devices: 0, submitted: false },
    ]);
  });

  it('replaces a link: the old one stops working and its devices are signed out', async () => {
    await t.as(kid, 'select * from redeem_seat($1)', [seats[0]!.token]);
    const rows = await t.as<{ t: string }>(laptop, `select host_replace_link($1, 'p0') as t`, [game]);
    const fresh = rows[0]!.t;
    expect(fresh).not.toBe(seats[0]!.token);
    expect(await t.as(kid, 'select * from games')).toEqual([]);
    await refused(t.as(kid, 'select * from redeem_seat($1)', [seats[0]!.token]), /unknown invite/);
    expect(await t.as(kid, 'select * from redeem_seat($1)', [fresh])).toHaveLength(1);
    await refused(t.as(kid, `select host_replace_link($1, 'p1')`, [game]), /only the host/);
  });

  it('deletes a game with everything in it, for the host only', async () => {
    await t.as(kid, 'select * from redeem_seat($1)', [seats[0]!.token]);
    await refused(t.as(kid, 'select host_delete_game($1)', [game]), /only the host/);
    await t.as(laptop, 'select host_delete_game($1)', [game]);
    expect(await t.as(HOST, 'select count(*)::int as n from seats where game_id = $1', [game])).toEqual([{ n: 0 }]);
    expect(await t.as(HOST, 'select count(*)::int as n from seat_devices where game_id = $1', [game])).toEqual([{ n: 0 }]);
    expect(await t.as(HOST, 'select count(*)::int as n from snapshots where game_id = $1', [game])).toEqual([{ n: 0 }]);
  });
});
