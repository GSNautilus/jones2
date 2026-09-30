/**
 * The pure half of the game tools: arguments, invite tokens and links, the
 * game config. Tokens are the only secret an invite carries; the database
 * stores their sha256, never the token.
 */
import { createHash, randomBytes } from 'node:crypto';
import { CLASSIC_DEFAULT_GOALS, type GameConfig } from '@jones2/sim';

export const DEFAULT_SITE = 'https://gsnautilus.github.io/jones2/';
export const MAX_PLAYERS = 4;
export const MAPS = ['classic', 'riverton'] as const;

/** `--key value` pairs; a bare `--flag` is "true". */
export function parseArgs(argv: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      out[a.slice(2)] = next;
      i++;
    } else out[a.slice(2)] = 'true';
  }
  return out;
}

/** "Ann, Bob,Cy" -> names, or why not. */
export function parsePlayers(list: string | undefined): string[] | string {
  if (!list) return 'Name the players: --players "Ann,Bob"';
  const names = list
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length === 0) return 'Name at least one player';
  if (names.length > MAX_PLAYERS) return `At most ${MAX_PLAYERS} players`;
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return 'Two players have the same name';
  if (names.some((n) => n.length > 20)) return 'Keep names to 20 letters';
  return names;
}

export function gameConfig(names: readonly string[], opts: { map?: string; seed?: number } = {}): GameConfig | string {
  const map = opts.map ?? 'classic';
  if (!(MAPS as readonly string[]).includes(map)) return `--map must be one of ${MAPS.join(', ')}`;
  return {
    mode: 'classic',
    ruleset: 'classic',
    goals: { ...CLASSIC_DEFAULT_GOALS },
    seed: opts.seed ?? randomBytes(4).readUInt32BE() % 1_000_000,
    townId: map,
    players: names.map((name, i) => ({ id: `p${i}`, name })),
  };
}

/** 32 random bytes, URL-safe: unguessable, and fine in a link. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function tokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function inviteLink(site: string, token: string): string {
  return `${site.endsWith('/') ? site : `${site}/`}#/join/${token}`;
}
