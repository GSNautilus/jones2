import { describe, expect, it } from 'vitest';
import type { Db } from '../src/db';
import { authLookup, handle, publishableKey } from '../src/edge';

/** A database that must not be reached. */
const noDb: Db = {
  transaction: () => {
    throw new Error('should not reach the database');
  },
};

const post = (body: unknown, token: string | null = 'tok') =>
  new Request('https://x.supabase.co/functions/v1/submit-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('handle', () => {
  it('answers the browser preflight with CORS headers', async () => {
    const r = await handle(new Request('https://x', { method: 'OPTIONS' }), { db: noDb, whoIs: async () => null });
    expect(r.status).toBe(200);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(r.headers.get('Access-Control-Allow-Headers')).toMatch(/authorization/);
  });

  it('wants POST', async () => {
    expect((await handle(new Request('https://x'), { db: noDb, whoIs: async () => 'u' })).status).toBe(405);
  });

  it('wants a valid sign-in before reading anything', async () => {
    expect((await handle(post({}, null), { db: noDb, whoIs: async () => 'u' })).status).toBe(401);
    expect((await handle(post({}), { db: noDb, whoIs: async () => null })).status).toBe(401);
  });

  it('says so when the sign-in check itself fails', async () => {
    const r = await handle(post({}), { db: noDb, whoIs: async () => { throw new Error('down'); } });
    expect(r.status).toBe(503);
  });

  it('refuses a body that is not JSON, and a malformed request, without touching the database', async () => {
    expect((await handle(post('{nope'), { db: noDb, whoIs: async () => 'u' })).status).toBe(400);
    const r = await handle(post({ gameId: 'x' }), { db: noDb, whoIs: async () => 'u' });
    expect(r.status).toBe(400);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('turns a server fault into a 500 with CORS headers, so the browser can read it', async () => {
    const broken: Db = { transaction: async () => Promise.reject(new Error('db down')) };
    const body = { gameId: '00000000-0000-4000-8000-000000000000', week: 1, playerId: 'a', actions: [] };
    const r = await handle(post(body), { db: broken, whoIs: async () => 'u' });
    expect(r.status).toBe(500);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('authLookup', () => {
  const fake = (status: number, body: unknown) => {
    const seen: { url: string; headers: Headers }[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      seen.push({ url, headers: new Headers(init?.headers) });
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof fetch;
    return { f, seen };
  };

  it('asks Supabase Auth with the key and the token', async () => {
    const { f, seen } = fake(200, { id: 'user-1' });
    expect(await authLookup('https://p.supabase.co/', 'sb_publishable_k', f)('tok')).toBe('user-1');
    expect(seen[0]!.url).toBe('https://p.supabase.co/auth/v1/user');
    expect(seen[0]!.headers.get('apikey')).toBe('sb_publishable_k');
    expect(seen[0]!.headers.get('Authorization')).toBe('Bearer tok');
  });

  it('a rejected token is nobody; an outage is an error', async () => {
    expect(await authLookup('https://p.supabase.co', 'k', fake(401, {}).f)('bad')).toBeNull();
    await expect(authLookup('https://p.supabase.co', 'k', fake(500, {}).f)('tok')).rejects.toThrow();
  });
});

describe('publishableKey', () => {
  const env = (vars: Record<string, string>) => ({ get: (k: string) => vars[k] });
  it('prefers the default new publishable key, then any, then the legacy anon key', () => {
    expect(publishableKey(env({ SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_a","x":"b"}' }))).toBe('sb_publishable_a');
    expect(publishableKey(env({ SUPABASE_PUBLISHABLE_KEYS: '{"web":"sb_publishable_w"}' }))).toBe('sb_publishable_w');
    expect(publishableKey(env({ SUPABASE_ANON_KEY: 'eyJ' }))).toBe('eyJ');
    expect(() => publishableKey(env({}))).toThrow();
  });
});
