/**
 * What an asset upload has to do: pure, so it is testable without a network.
 * Paths are bucket paths with forward slashes, `audio/voice/line_010.ogg`,
 * the same paths the client's asset loader asks for.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface FileInfo {
  path: string;
  size: number;
}

export interface UploadPlan {
  upload: FileInfo[];
  /** Already in the bucket at the same size. */
  same: FileInfo[];
  /** In the bucket but no longer on disk. Removed only with --prune. */
  stale: string[];
}

const TYPES: Record<string, string> = {
  '.ogg': 'audio/ogg',
  '.json': 'application/json',
  '.mid': 'audio/midi',
  '.wav': 'audio/wav',
};

export function contentTypeFor(path: string): string {
  const dot = path.lastIndexOf('.');
  return (dot >= 0 && TYPES[path.slice(dot).toLowerCase()]) || 'application/octet-stream';
}

/**
 * Every file under `root`, as bucket paths under `prefix`. Dot-files are
 * skipped (a stray `.gitignore` is not an asset).
 */
export function localFiles(root: string, prefix: string): FileInfo[] {
  const out: FileInfo[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith('.')) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else out.push({ path: `${prefix}/${relative(root, full).split(sep).join('/')}`, size: st.size });
    }
  };
  walk(root);
  return out;
}

/**
 * Upload what is new or changed in size, and every JSON file (the label files
 * change content without changing size). `force` uploads everything.
 */
export function planUpload(local: readonly FileInfo[], remote: ReadonlyMap<string, number>, force = false): UploadPlan {
  const plan: UploadPlan = { upload: [], same: [], stale: [] };
  const here = new Set<string>();
  for (const f of local) {
    here.add(f.path);
    const size = remote.get(f.path);
    if (force || size === undefined || size !== f.size || f.path.endsWith('.json')) plan.upload.push(f);
    else plan.same.push(f);
  }
  for (const path of [...remote.keys()].sort()) if (!here.has(path)) plan.stale.push(path);
  return plan;
}

/** Run `work` over `items`, `limit` at a time. */
export async function pool<T>(items: readonly T[], limit: number, work: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const worker = async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await work(item);
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, worker));
}

/** A Supabase project URL, or an explanation of what is wrong with it. */
export function checkProjectUrl(url: string | undefined): string | null {
  if (!url) return 'SUPABASE_URL is not set.';
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(url)) return `SUPABASE_URL should look like https://abcdefghijklmnopqrst.supabase.co (got ${url}).`;
  return null;
}

/** A secret (server-side) key, or an explanation. The publishable key cannot upload. */
export function checkSecretKey(key: string | undefined): string | null {
  if (!key) return 'SUPABASE_SECRET_KEY is not set.';
  if (key.startsWith('sb_publishable_')) return 'That is the publishable key. Uploading needs the secret key (sb_secret_...).';
  return null;
}
