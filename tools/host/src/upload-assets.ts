/**
 * Upload the original game's audio (assets/sierra/audio) into the private
 * `sierra` bucket, under the same paths the client asks for (audio/...).
 * Skips files already there at the same size; always re-sends the JSON label
 * files. Refuses to run if the bucket is public.
 *
 * PowerShell, from the repo root:
 *   $env:SUPABASE_URL="https://<project-ref>.supabase.co"
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..."
 *   npm run upload-assets -w @jones2/host              # add -- --dry-run to only report
 *
 * Flags: --dry-run (report only), --force (re-send everything), --prune
 * (delete bucket files that are no longer on disk).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkProjectUrl, checkSecretKey, contentTypeFor, localFiles, planUpload, pool } from './plan';

const BUCKET = 'sierra';
const PREFIX = 'audio';
const ROOT = fileURLToPath(new URL('../../../assets/sierra/audio', import.meta.url));

/** Every file under `prefix` in the bucket with its size, following folders. */
async function remoteFiles(client: SupabaseClient, prefix: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const folders = [prefix];
  for (let dir = folders.shift(); dir !== undefined; dir = folders.shift()) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.storage.from(BUCKET).list(dir, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw new Error(`listing ${dir}: ${error.message}`);
      for (const item of data ?? []) {
        const path = `${dir}/${item.name}`;
        if (item.id === null) folders.push(path);
        else out.set(path, Number((item.metadata as { size?: number } | null)?.size ?? -1));
      }
      if (!data || data.length < 1000) break;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const dry = args.has('--dry-run');
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  const problem = checkProjectUrl(url) ?? checkSecretKey(key) ?? (existsSync(ROOT) ? null : `${ROOT} is missing. See assets/README.md.`);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }

  const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  // The database says plainly when it does not know a key; Storage only says
  // "Invalid Compact JWS". Ask the database first. This also proves the
  // migrations ran (the secret key can read every table).
  const probe = await client.from('games').select('id').limit(1);
  if (probe.error) {
    const m = probe.error.message;
    if (/invalid api key/i.test(m)) {
      console.error(
        `This project does not recognise that secret key.\n` +
          `  - Is it from the jones2 project, not your other one? Check the project name at the top of the dashboard.\n` +
          `  - Copy it with the copy button on Project Settings > API Keys > Secret keys, not by selecting the text\n` +
          `    (the page shows it masked with dots until revealed).\n` +
          `  - It should start with sb_secret_ and have no spaces or dots in it.`,
      );
    } else if (/fetch failed|ENOTFOUND|ECONNREFUSED/i.test(m)) {
      console.error(`Could not reach ${url} (${m}). Check the URL, and whether the project is paused in the dashboard.`);
    } else if (/games/i.test(m)) {
      console.error(`The games table is missing (${m}). Apply the migrations first: npx supabase db push`);
    } else {
      console.error(`The database refused the key: ${m}`);
    }
    process.exit(1);
  }
  const { data: bucket, error } = await client.storage.getBucket(BUCKET);
  if (error && /fetch failed|ENOTFOUND|ECONNREFUSED/i.test(error.message)) {
    console.error(`Could not reach ${url} (${error.message}). Check the URL, and whether the project is paused in the dashboard.`);
    process.exit(1);
  }
  if (error || !bucket) {
    console.error(`No '${BUCKET}' bucket (${error?.message ?? 'not found'}). Apply the migrations first: npx supabase db push`);
    process.exit(1);
  }
  if (bucket.public) {
    console.error(`The '${BUCKET}' bucket is PUBLIC. Refusing to upload the original game's files into it. Make it private in the dashboard, or re-run the migrations.`);
    process.exit(1);
  }

  const local = localFiles(ROOT, PREFIX);
  const plan = planUpload(local, await remoteFiles(client, PREFIX), args.has('--force'));
  const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
  const bytes = plan.upload.reduce((s, f) => s + f.size, 0);
  console.log(`${local.length} files on disk: ${plan.upload.length} to upload (${mb(bytes)} MB), ${plan.same.length} already there, ${plan.stale.length} stale in the bucket.`);
  if (dry) {
    for (const f of plan.upload.slice(0, 20)) console.log(`  would upload ${f.path}`);
    if (plan.upload.length > 20) console.log(`  ... and ${plan.upload.length - 20} more`);
    for (const p of plan.stale) console.log(`  stale ${p}`);
    return;
  }

  let done = 0;
  const failed: string[] = [];
  await pool(plan.upload, 6, async (f) => {
    const body = readFileSync(join(ROOT, f.path.slice(PREFIX.length + 1)));
    for (let attempt = 1; ; attempt++) {
      const { error: e } = await client.storage.from(BUCKET).upload(f.path, body, { contentType: contentTypeFor(f.path), upsert: true, cacheControl: '3600' });
      if (!e) break;
      if (attempt === 3) {
        failed.push(`${f.path}: ${e.message}`);
        return;
      }
    }
    done++;
    if (done % 50 === 0 || done === plan.upload.length) console.log(`  ${done}/${plan.upload.length}`);
  });

  if (args.has('--prune') && plan.stale.length) {
    const { error: e } = await client.storage.from(BUCKET).remove(plan.stale);
    console.log(e ? `Prune failed: ${e.message}` : `Removed ${plan.stale.length} stale files.`);
  }
  if (failed.length) {
    console.error(`${failed.length} uploads failed:\n  ${failed.join('\n  ')}`);
    process.exit(1);
  }
  console.log('Done.');
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
