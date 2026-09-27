/**
 * The Edge Function's HTTP layer, kept out of the Deno entry so Node can test
 * it: browser preflight, who is calling, and the answer as JSON. The entry
 * (supabase/functions/submit-turn/index.ts) only wires in the database and
 * the environment.
 */
import type { Db } from './db';
import { submitTurn } from './submit';

export interface EdgeDeps {
  db: Db;
  /** The user id a session token belongs to, or null if the token is not valid. */
  whoIs: (token: string) => Promise<string | null>;
}

/** The site is public and auth is a bearer token (no cookies), so any origin may call. */
export const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export async function handle(req: Request, deps: EdgeDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'POST only' });

  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('Authorization') ?? '')?.[1]?.trim();
  if (!token) return json(401, { error: 'Sign in first' });
  let userId: string | null;
  try {
    userId = await deps.whoIs(token);
  } catch {
    return json(503, { error: 'Could not check the sign-in; try again' });
  }
  if (!userId) return json(401, { error: 'Sign in first' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Expected a JSON body' });
  }
  try {
    const r = await submitTurn(deps.db, userId, body);
    return json(r.status, r.body);
  } catch (e) {
    console.error('submit-turn failed', e);
    return json(500, { error: 'The server failed to take the turn; try again' });
  }
}

/**
 * Ask Supabase Auth who a session token belongs to: authoritative (it knows
 * about signed-out and deleted users), one request per submitted week.
 */
export function authLookup(projectUrl: string, apiKey: string, fetcher: typeof fetch = fetch): (token: string) => Promise<string | null> {
  return async (token) => {
    const res = await fetcher(`${projectUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) throw new Error(`auth lookup ${res.status}`);
    const user = (await res.json()) as { id?: unknown };
    return typeof user.id === 'string' ? user.id : null;
  };
}

/**
 * An API key the Auth endpoint accepts, from the Edge Function environment:
 * the default publishable key if the project has new keys, else the legacy
 * anon key.
 */
export function publishableKey(env: { get(name: string): string | undefined }): string {
  const keys = env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (keys) {
    try {
      const dict = JSON.parse(keys) as Record<string, string>;
      const key = dict.default ?? Object.values(dict)[0];
      if (key) return key;
    } catch {
      /* fall through */
    }
  }
  const anon = env.get('SUPABASE_ANON_KEY');
  if (anon) return anon;
  throw new Error('No publishable or anon key in the environment');
}
