/**
 * Where the original game's audio comes from. The files are Sierra's, so they
 * never ship with the site: in development they sit in a gitignored folder
 * served by Vite, and in play they live in a private Supabase Storage bucket
 * that only seated players can read (DESIGN decision log 2026-09-22).
 *
 * The player never builds a URL itself. It asks an `AssetLoader` for a path
 * such as `audio/voice/line_010.ogg` and gets back something an audio element
 * can play:
 *  - `stream` mode (local): the path itself, or an object URL once warmed.
 *    Nothing changes from a plain static site.
 *  - whole-file mode (Supabase): the file is downloaded once, kept in the
 *    browser's Cache API across visits, and played from an object URL. An
 *    audio element cannot send the auth header a private bucket needs, so a
 *    download it must be.
 */

/** Something that can hand over an asset's bytes. Rejects when it cannot. */
export interface AssetSource {
  /** `path` is relative, e.g. `audio/ogg/sound_005.ogg`. */
  blob(path: string): Promise<Blob>;
  /** Parse a small JSON asset. Never persisted: these change on re-upload. */
  json<T>(path: string): Promise<T>;
}

/** The files beside the page (Vite's public folder, or a gitignored copy of it). */
export function localSource(base = ''): AssetSource {
  const get = async (path: string, init?: RequestInit): Promise<Response> => {
    const res = await fetch(base + path, init);
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res;
  };
  return {
    blob: async (path) => (await get(path)).blob(),
    json: async <T>(path: string) => (await (await get(path, { cache: 'no-cache' })).json()) as T,
  };
}

/** The slice of a supabase-js client this module uses, so it needs no dependency and fakes easily. */
export interface StorageClient {
  storage: {
    from(bucket: string): {
      download(path: string): Promise<{ data: Blob | null; error: { message: string } | null }>;
    };
  };
}

/** The private bucket. Reads succeed only for a session bound to a seat. */
export const SIERRA_BUCKET = 'sierra';

export function supabaseSource(client: StorageClient, bucket = SIERRA_BUCKET): AssetSource {
  const blob = async (path: string): Promise<Blob> => {
    const { data, error } = await client.storage.from(bucket).download(path);
    if (error || !data) throw new Error(`${path}: ${error?.message ?? 'no data'}`);
    return data;
  };
  return {
    blob,
    json: async <T>(path: string) => JSON.parse(await (await blob(path)).text()) as T,
  };
}

/** The slice of the Cache API used here (`caches.open(...)`'s result). */
export interface CacheLike {
  match(key: string): Promise<Response | undefined>;
  put(key: string, res: Response): Promise<void>;
}

/** Bump when the bucket's files change in place, so every browser fetches afresh. */
export const CACHE_NAME = 'jones2-sierra-v1';
/** Cache API keys must be absolute http(s) URLs; this host is never contacted. */
const CACHE_ORIGIN = 'https://sierra.cache.invalid/';

/** The browser's persistent cache, or null where there is none (tests, non-secure pages). */
export async function openBrowserCache(name = CACHE_NAME): Promise<CacheLike | null> {
  try {
    if (typeof caches === 'undefined') return null;
    return await caches.open(name);
  } catch {
    return null;
  }
}

export interface LoaderOptions {
  /** Unwarmed paths are playable as they are (a same-origin static server). */
  stream: boolean;
  /** Where whole files persist between visits. Omitted: memory only. */
  cache?: Promise<CacheLike | null> | CacheLike | null;
  /** Turns bytes into a playable URL. Defaults to `URL.createObjectURL`. */
  objectUrl?: (b: Blob) => string;
}

export class AssetLoader {
  readonly stream: boolean;
  private readonly urls = new Map<string, string>();
  private readonly pending = new Map<string, Promise<string>>();
  private readonly cache: Promise<CacheLike | null>;
  private readonly objectUrl: ((b: Blob) => string) | null;

  constructor(
    private readonly source: AssetSource,
    opts: LoaderOptions,
  ) {
    this.stream = opts.stream;
    this.cache = Promise.resolve(opts.cache ?? null);
    this.objectUrl =
      opts.objectUrl ?? (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? (b) => URL.createObjectURL(b) : null);
  }

  /** A playable URL right now, or undefined when the file still has to be fetched. */
  peek(path: string): string | undefined {
    return this.urls.get(path) ?? (this.stream ? path : undefined);
  }

  /** Whether `path` is already in memory (not merely streamable). */
  has(path: string): boolean {
    return this.urls.has(path);
  }

  /** A playable URL, fetching the whole file first if need be. */
  url(path: string): Promise<string> {
    const now = this.urls.get(path);
    if (now) return Promise.resolve(now);
    if (this.stream) return Promise.resolve(path);
    return this.warm(path);
  }

  /**
   * Bring `path` into memory as an object URL: from the persistent cache when
   * it is there, else from the source (and then into the cache). Concurrent
   * calls share one download.
   */
  warm(path: string): Promise<string> {
    const now = this.urls.get(path);
    if (now) return Promise.resolve(now);
    const inFlight = this.pending.get(path);
    if (inFlight) return inFlight;
    const job = this.fetchWhole(path).finally(() => this.pending.delete(path));
    this.pending.set(path, job);
    return job;
  }

  /** Warm many paths, a few at a time, in order. Failures are skipped. Returns how many are now in memory. */
  async warmAll(paths: readonly string[], parallel = 4): Promise<number> {
    const queue = paths.filter((p, i) => !this.urls.has(p) && paths.indexOf(p) === i);
    const worker = async () => {
      for (let p = queue.shift(); p !== undefined; p = queue.shift()) {
        await this.warm(p).catch(() => undefined);
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, parallel) }, worker));
    return paths.filter((p) => this.urls.has(p)).length;
  }

  json<T>(path: string): Promise<T> {
    return this.source.json<T>(path);
  }

  private async fetchWhole(path: string): Promise<string> {
    if (!this.objectUrl) throw new Error('no object URLs here');
    const key = CACHE_ORIGIN + path;
    const cache = await this.cache.catch(() => null);
    let blob: Blob | undefined;
    try {
      blob = await (await cache?.match(key))?.blob();
    } catch {
      blob = undefined;
    }
    if (!blob) {
      blob = await this.source.blob(path);
      try {
        await cache?.put(key, new Response(blob));
      } catch {
        // quota or private mode: memory still works
      }
    }
    const url = this.objectUrl(blob);
    this.urls.set(path, url);
    return url;
  }
}

/** Development and tests: files beside the page, streamed, no persistent cache. */
export function localAssets(base = ''): AssetLoader {
  return new AssetLoader(localSource(base), { stream: true });
}

/** Play: the private bucket, whole files, kept in the browser between visits. */
export function supabaseAssets(client: StorageClient, bucket = SIERRA_BUCKET): AssetLoader {
  return new AssetLoader(supabaseSource(client, bucket), { stream: false, cache: openBrowserCache() });
}
