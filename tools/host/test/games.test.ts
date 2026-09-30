import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createGame } from '@jones2/sim';
import { gameConfig, inviteLink, newToken, parseArgs, parsePlayers, tokenHash } from '../src/games';

describe('parseArgs', () => {
  it('reads --key value pairs and bare flags', () => {
    expect(parseArgs(['--players', 'Ann,Bob', '--force', '--map', 'classic'])).toEqual({ players: 'Ann,Bob', force: 'true', map: 'classic' });
  });
});

describe('parsePlayers', () => {
  it('splits and trims', () => {
    expect(parsePlayers(' Ann, Bob ,Cy')).toEqual(['Ann', 'Bob', 'Cy']);
  });
  it('refuses none, too many, and the same name twice', () => {
    expect(parsePlayers(undefined)).toMatch(/Name the players/);
    expect(parsePlayers(' , ')).toMatch(/at least one/);
    expect(parsePlayers('a,b,c,d,e')).toMatch(/At most 4/);
    expect(parsePlayers('Ann,ann')).toMatch(/same name/);
  });
});

describe('gameConfig', () => {
  it('builds a classic game the sim can start', () => {
    const c = gameConfig(['Ann', 'Bob'], { seed: 5 });
    if (typeof c === 'string') throw new Error(c);
    expect(c).toMatchObject({ ruleset: 'classic', mode: 'classic', townId: 'classic', seed: 5 });
    expect(c.players).toEqual([
      { id: 'p0', name: 'Ann' },
      { id: 'p1', name: 'Bob' },
    ]);
    const s = createGame(c);
    expect(s.playerOrder).toEqual(['p0', 'p1']);
    expect(s.week).toBe(1);
  });
  it('takes the Riverton map and refuses an unknown one', () => {
    expect(gameConfig(['Ann'], { map: 'riverton' })).toMatchObject({ townId: 'riverton' });
    expect(gameConfig(['Ann'], { map: 'mars' })).toMatch(/--map/);
  });
});

describe('invites', () => {
  it('makes long, URL-safe, different tokens', () => {
    const a = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newToken()).not.toBe(a);
  });
  it('hashes the way redeem_seat does (sha256 hex of the UTF-8 token)', () => {
    expect(tokenHash('ann-token')).toBe(createHash('sha256').update('ann-token').digest('hex'));
    expect(tokenHash('x')).toMatch(/^[0-9a-f]{64}$/);
  });
  it('puts the token in the hash, which never reaches a server', () => {
    expect(inviteLink('https://gsnautilus.github.io/jones2/', 'TOK')).toBe('https://gsnautilus.github.io/jones2/#/join/TOK');
    expect(inviteLink('http://localhost:5174', 'TOK')).toBe('http://localhost:5174/#/join/TOK');
  });
});
