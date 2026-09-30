/** The secret-key Supabase client every host tool starts with. Exits with a plain message if the environment is wrong. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkProjectUrl, checkSecretKey } from './plan';

export function projectUrl(): string {
  return (process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
}

export function adminClient(): SupabaseClient {
  const url = projectUrl();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  const problem = checkProjectUrl(url) ?? checkSecretKey(key);
  if (problem) {
    console.error(`${problem}\nSet both in this PowerShell window first; see docs/SUPABASE.md.`);
    process.exit(1);
  }
  return createClient(url, key!, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Why a request never got an answer, in words: Node hides the reason in `error.cause`. */
export function networkReason(e: unknown): string {
  const cause = (e as { cause?: { code?: string; message?: string } } | null)?.cause;
  const code = cause?.code ?? '';
  if (code === 'ENOTFOUND') return 'that address does not exist; check the 20-letter project ref in SUPABASE_URL';
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET') return 'the connection was refused or dropped; try again';
  if (/TIMEOUT/i.test(code)) return 'the connection timed out; check the internet connection and try again';
  if (/CERT|SSL|TLS/i.test(code)) return `a secure-connection problem (${code}); a proxy or antivirus may be intercepting it`;
  return cause?.message ?? (e instanceof Error ? e.message : String(e));
}

/**
 * Before anything else: can this machine reach the project at all? Any HTTP
 * answer counts, even an error page; only a request that never got an answer fails.
 */
export async function checkReachable(url: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    await fetcher(`${url}/rest/v1/`, { method: 'GET', signal: AbortSignal.timeout(20_000) });
    return null;
  } catch (e) {
    return `Could not reach ${url}: ${networkReason(e)}. If the address is right, check that the project is not paused in the dashboard.`;
  }
}

/** Turn a Supabase error into a message a person can act on. */
export function explain(what: string, message: string): string {
  if (/invalid api key/i.test(message)) return `${what}: this project does not recognise that secret key (see docs/SUPABASE.md).`;
  if (/fetch failed|ENOTFOUND/i.test(message)) return `${what}: the request to ${projectUrl()} failed on the way (${message}). Try again.`;
  return `${what}: ${message}`;
}
