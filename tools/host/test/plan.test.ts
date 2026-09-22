import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { checkProjectUrl, checkSecretKey, contentTypeFor, localFiles, planUpload, pool } from '../src/plan';

describe('localFiles', () => {
  const root = mkdtempSync(join(tmpdir(), 'jones2-plan-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'voice'));
  writeFileSync(join(root, 'names.json'), '{}');
  writeFileSync(join(root, 'voice', 'line_010.ogg'), 'abcd');
  writeFileSync(join(root, '.gitignore'), 'x');

  it('lists every file as a bucket path with forward slashes, skipping dot-files', () => {
    expect(localFiles(root, 'audio')).toEqual([
      { path: 'audio/names.json', size: 2 },
      { path: 'audio/voice/line_010.ogg', size: 4 },
    ]);
  });
});

describe('planUpload', () => {
  const local = [
    { path: 'audio/names.json', size: 10 },
    { path: 'audio/ogg/sound_005.ogg', size: 100 },
    { path: 'audio/voice/line_010.ogg', size: 50 },
  ];

  it('uploads everything into an empty bucket', () => {
    expect(planUpload(local, new Map()).upload).toHaveLength(3);
  });

  it('skips files already there at the same size, but always re-sends JSON', () => {
    const remote = new Map([
      ['audio/names.json', 10],
      ['audio/ogg/sound_005.ogg', 100],
      ['audio/voice/line_010.ogg', 49],
    ]);
    const p = planUpload(local, remote);
    expect(p.upload.map((f) => f.path)).toEqual(['audio/names.json', 'audio/voice/line_010.ogg']);
    expect(p.same.map((f) => f.path)).toEqual(['audio/ogg/sound_005.ogg']);
  });

  it('reports bucket files no longer on disk', () => {
    expect(planUpload(local, new Map([['audio/voice/line_999.ogg', 5]])).stale).toEqual(['audio/voice/line_999.ogg']);
  });

  it('--force re-sends everything', () => {
    const remote = new Map(local.map((f) => [f.path, f.size] as const));
    expect(planUpload(local, remote, true).upload).toHaveLength(3);
  });
});

describe('checks', () => {
  it('knows the content types the client plays', () => {
    expect(contentTypeFor('audio/voice/line_010.ogg')).toBe('audio/ogg');
    expect(contentTypeFor('audio/names.json')).toBe('application/json');
    expect(contentTypeFor('audio/x.bin')).toBe('application/octet-stream');
  });

  it('wants a real project URL', () => {
    expect(checkProjectUrl(undefined)).toMatch(/not set/);
    expect(checkProjectUrl('https://abcdefghijklmnopqrst.supabase.co')).toBeNull();
    expect(checkProjectUrl('https://supabase.com/dashboard/project/abcdefghijklmnopqrst')).toMatch(/should look like/);
  });

  it('wants the secret key, not the publishable one', () => {
    expect(checkSecretKey(undefined)).toMatch(/not set/);
    expect(checkSecretKey('sb_publishable_abc')).toMatch(/publishable/);
    expect(checkSecretKey('sb_secret_abc')).toBeNull();
  });
});

describe('pool', () => {
  it('runs everything, never more than the limit at once', async () => {
    let running = 0;
    let peak = 0;
    const seen: number[] = [];
    await pool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      seen.push(n);
      running--;
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(peak).toBe(3);
  });
});
