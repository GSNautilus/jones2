/**
 * The labelled voice file itself: every line is used once, the greeting
 * lists are as long as the wiki's, and nothing is left unresolved.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classic } from '@jones2/sim';
import type { VoicesFile } from '../../src/audio/voices';

// The original game's audio is not in the repo (assets/README.md); these checks run where it is.
const dir = join(__dirname, '../../../../assets/sierra/audio');
const present = existsSync(join(dir, 'voices.json'));
const read = (name: string, empty: unknown): unknown => (present ? JSON.parse(readFileSync(join(dir, name), 'utf8')) : empty);
const file = read('voices.json', { greetings: {}, quotes: {}, cards: {}, unresolved: [] }) as VoicesFile;
const manifest = read('manifest.json', []);

function allLines(v: VoicesFile): number[] {
  const out: number[] = [];
  for (const lines of Object.values(v.greetings)) out.push(...lines);
  for (const groups of Object.values(v.quotes)) for (const lines of Object.values(groups)) out.push(...lines);
  for (const cards of Object.values(v.cards)) out.push(...cards.map((c) => c.line));
  return out;
}

describe.skipIf(!present)('voices.json', () => {
  it('uses each of the 533 lines exactly once and leaves none unresolved', () => {
    const lines = allLines(file);
    expect(lines.length + file.unresolved.length).toBe(533);
    expect(new Set(lines).size).toBe(lines.length);
    expect(file.unresolved).toEqual([]);
    void manifest;
  });

  it("gives every location as many greeting lines as the wiki has greetings", () => {
    for (const loc of classic.CLASSIC_LOCATION_LIST) {
      const lines = file.greetings[loc.id] ?? [];
      expect({ loc: loc.id, n: lines.length }).toEqual({ loc: loc.id, n: loc.greetings.length });
    }
  });

  it('has a spoken line for every wiki quote group it covers, in the same count', () => {
    for (const loc of classic.CLASSIC_LOCATION_LIST) {
      for (const [group, quotes] of Object.entries(loc.quotes ?? {})) {
        expect({ loc: loc.id, group, n: file.quotes[loc.id]?.[group]?.length }).toEqual({ loc: loc.id, group, n: quotes.length });
      }
    }
  });

  it('keeps each greeting list a contiguous run of numbers, as the CD stores them', () => {
    for (const [loc, lines] of Object.entries(file.greetings)) {
      for (let i = 1; i < lines.length; i++) expect({ loc, at: i, step: lines[i]! - lines[i - 1]! }).toEqual({ loc, at: i, step: 1 });
    }
  });
});
