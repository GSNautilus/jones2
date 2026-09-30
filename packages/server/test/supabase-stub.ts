/**
 * Just enough of Supabase for the migrations to run on PGlite (Postgres in
 * WebAssembly, in process, no Docker): the three API roles, auth.uid() read
 * from the request claims the way PostgREST sets them, auth.users, the
 * storage tables with row level security on, and Supabase's default grants
 * on new public objects (everything to anon and authenticated), which the
 * migrations must take back themselves.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select on storage.objects, storage.buckets to anon, authenticated;
grant all on storage.objects, storage.buckets to service_role;
`;

export const MIGRATIONS = join(__dirname, '../../../supabase/migrations');

export type Who = { role: 'anon' } | { role: 'authenticated'; uid: string } | { role: 'service_role' };

/** `stopBefore`: apply migrations only up to (not including) the one whose name starts with it. */
export async function supabaseDb(opts: { stopBefore?: string } = {}): Promise<{
  db: PGlite;
  /** Run `sql` as `who`, the way a request through the API would. */
  as: <T = Record<string, unknown>>(who: Who, sql: string, params?: unknown[]) => Promise<T[]>;
  /** Open a transaction the next rollback() throws away. */
  begin: () => Promise<void>;
  rollback: () => Promise<void>;
}> {
  const db = new PGlite();
  await db.exec(STUB);
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    if (opts.stopBefore && f >= opts.stopBefore) break;
    await db.exec(readFileSync(join(MIGRATIONS, f), 'utf8'));
  }
  let inTx = false;
  const begin = async () => {
    await db.exec('begin');
    inTx = true;
  };
  const rollback = async () => {
    await db.exec('rollback');
    inTx = false;
  };
  // Each call runs in a savepoint when a transaction is open (the tests roll
  // each case back), so a refused statement does not poison the rest.
  const as = async <T,>(who: Who, sql: string, params: unknown[] = []): Promise<T[]> => {
    const uid = who.role === 'authenticated' ? who.uid : '';
    const tx = inTx;
    if (tx) await db.exec('savepoint q');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
    await db.exec(`set role ${who.role}`);
    try {
      const rows = (await db.query<T>(sql, params)).rows;
      await db.exec('reset role');
      if (tx) await db.exec('release savepoint q');
      return rows;
    } catch (e) {
      if (tx) await db.exec('rollback to savepoint q');
      await db.exec('reset role');
      if (tx) await db.exec('release savepoint q');
      throw e;
    }
  };
  return { db, as, begin, rollback };
}
