/**
 * The little the server needs from Postgres: run statements inside one
 * transaction. The Edge Function adapts postgres.js to this; the tests adapt
 * PGlite, so the same SQL runs in both.
 */
export type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

export interface Db {
  transaction<T>(work: (q: Query) => Promise<T>): Promise<T>;
}

/** The slice of a postgres.js `sql` object used (npm:postgres in the Edge Function). */
export interface PostgresJs {
  begin<T>(work: (tx: { unsafe(text: string, params?: unknown[]): Promise<unknown> }) => Promise<T>): Promise<T>;
}

export function postgresJsDb(sql: PostgresJs): Db {
  return {
    transaction: (work) =>
      sql.begin((tx) => work(async <T,>(text: string, params: unknown[] = []) => (await tx.unsafe(text, params)) as unknown as T[])),
  };
}
