/** The secret-key Supabase client every host tool starts with. Exits with a plain message if the environment is wrong. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkProjectUrl, checkSecretKey } from './plan';

export function adminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  const problem = checkProjectUrl(url) ?? checkSecretKey(key);
  if (problem) {
    console.error(`${problem}\nSet both in this PowerShell window first; see docs/SUPABASE.md.`);
    process.exit(1);
  }
  return createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Turn a Supabase error into a message a person can act on. */
export function explain(what: string, message: string): string {
  if (/invalid api key/i.test(message)) return `${what}: this project does not recognise that secret key (see docs/SUPABASE.md).`;
  if (/fetch failed|ENOTFOUND/i.test(message)) return `${what}: could not reach the project. Is it paused in the dashboard?`;
  return `${what}: ${message}`;
}
