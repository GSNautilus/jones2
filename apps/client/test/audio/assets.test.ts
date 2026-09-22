import { describe, expect, it } from 'vitest';
import { AssetLoader, supabaseSource, type AssetSource, type CacheLike, type StorageClient } from '../../src/audio/assets';

/** A source that counts downloads and can be told to fail. */
function counting(fail = new Set<string>()) {
  const calls: string[] = [];
  const source: AssetSource = {
    blob: async (path) => {
      calls.push(path);
      if (fail.has(path)) throw new Error('403');
      return new Blob([path]);
    },
    json: async <T>() => ({ ok: true }) as T,
  };
  return { source, calls };
}

/** An in-memory stand-in for the Cache API. */
function memoryCache() {
  const store = new Map<string, Blob>();
  const cache: CacheLike = {
    match: async (k) => (store.has(k) ? new Response(store.get(k)!) : undefined),
    put: async (k, res) => {
      store.set(k, await res.blob());
    },
  };
  return { cache, store };
}

let n = 0;
const objectUrl = (b: Blob) => `blob:${++n}:${b.size}`;

describe('AssetLoader', () => {
  it('stream mode plays paths as they are and never downloads on demand', async () => {
    const { source, calls } = counting();
    const l = new AssetLoader(source, { stream: true, objectUrl });
    expect(l.peek('audio/a.ogg')).toBe('audio/a.ogg');
    expect(await l.url('audio/a.ogg')).toBe('audio/a.ogg');
    expect(calls).toEqual([]);
  });

  it('stream mode still preloads into memory when asked', async () => {
    const { source, calls } = counting();
    const l = new AssetLoader(source, { stream: true, objectUrl });
    const url = await l.warm('audio/a.ogg');
    expect(url).toMatch(/^blob:/);
    expect(l.peek('audio/a.ogg')).toBe(url);
    expect(calls).toEqual(['audio/a.ogg']);
  });

  it('whole-file mode has nothing to play until the file is down', async () => {
    const { source } = counting();
    const l = new AssetLoader(source, { stream: false, objectUrl });
    expect(l.peek('audio/a.ogg')).toBeUndefined();
    const url = await l.url('audio/a.ogg');
    expect(url).toMatch(/^blob:/);
    expect(l.peek('audio/a.ogg')).toBe(url);
  });

  it('shares one download between concurrent asks', async () => {
    const { source, calls } = counting();
    const l = new AssetLoader(source, { stream: false, objectUrl });
    const [a, b] = await Promise.all([l.url('x.ogg'), l.url('x.ogg')]);
    expect(a).toBe(b);
    expect(calls).toEqual(['x.ogg']);
  });

  it('keeps downloads in the persistent cache, so a new visit fetches nothing', async () => {
    const { cache, store } = memoryCache();
    const first = counting();
    await new AssetLoader(first.source, { stream: false, cache, objectUrl }).url('audio/voice/line_010.ogg');
    expect(first.calls).toHaveLength(1);
    expect(store.size).toBe(1);

    const second = counting();
    const url = await new AssetLoader(second.source, { stream: false, cache, objectUrl }).url('audio/voice/line_010.ogg');
    expect(url).toMatch(/^blob:/);
    expect(second.calls).toEqual([]);
  });

  it('still works when the cache refuses to store (quota, private mode)', async () => {
    const cache: CacheLike = { match: async () => undefined, put: async () => Promise.reject(new Error('quota')) };
    const { source } = counting();
    expect(await new AssetLoader(source, { stream: false, cache, objectUrl }).url('a.ogg')).toMatch(/^blob:/);
  });

  it('warmAll skips failures and duplicates and reports what is in memory', async () => {
    const { source, calls } = counting(new Set(['bad.ogg']));
    const l = new AssetLoader(source, { stream: false, objectUrl });
    const got = await l.warmAll(['a.ogg', 'bad.ogg', 'a.ogg', 'b.ogg'], 2);
    expect(got).toBe(3); // a twice, b; not bad
    expect(calls.filter((c) => c === 'a.ogg')).toHaveLength(1);
    expect(l.has('bad.ogg')).toBe(false);
  });

  it('a failed download rejects and can be retried', async () => {
    const fail = new Set(['a.ogg']);
    const { source, calls } = counting(fail);
    const l = new AssetLoader(source, { stream: false, objectUrl });
    await expect(l.url('a.ogg')).rejects.toThrow();
    fail.clear();
    expect(await l.url('a.ogg')).toMatch(/^blob:/);
    expect(calls).toEqual(['a.ogg', 'a.ogg']);
  });
});

describe('supabaseSource', () => {
  function client(files: Record<string, string>, seen: string[] = []): StorageClient {
    return {
      storage: {
        from: (bucket) => ({
          download: async (path) => {
            seen.push(`${bucket}/${path}`);
            return path in files ? { data: new Blob([files[path]!]), error: null } : { data: null, error: { message: 'Object not found' } };
          },
        }),
      },
    };
  }

  it('downloads from the private sierra bucket', async () => {
    const seen: string[] = [];
    const src = supabaseSource(client({ 'audio/ogg/sound_005.ogg': 'abc' }, seen));
    expect(await (await src.blob('audio/ogg/sound_005.ogg')).text()).toBe('abc');
    expect(seen).toEqual(['sierra/audio/ogg/sound_005.ogg']);
  });

  it('parses JSON assets', async () => {
    const src = supabaseSource(client({ 'audio/names.json': '{"5":"random music"}' }));
    expect(await src.json('audio/names.json')).toEqual({ '5': 'random music' });
  });

  it('turns a refused read (no seat) into a rejection', async () => {
    await expect(supabaseSource(client({})).blob('audio/voice/line_010.ogg')).rejects.toThrow(/not found/);
  });
});
