import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveMap, type NamesFile } from '../../src/audio/map';
import { cardSound } from '../../src/classic/cards';

// The original game's audio is not in the repo (assets/README.md); these checks run where it is.
const path = resolve(__dirname, '../../../../assets/sierra/audio/names.json');
const names = (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { overrides: {} }) as NamesFile;

describe.skipIf(!existsSync(path))('the shipped names.json', () => {
  const map = resolveMap(names);

  it('puts exactly the random pieces in the rotation, not the stingers', () => {
    expect(map.music).toEqual([5, 25, 35, 36, 37, 38, 39, 40]);
  });

  it('pins the moments the game uses', () => {
    expect(map.sfx.cash).toEqual([23]);
    expect(map.sfx.hired).toEqual([45]);
    expect(map.sfx.refused).toEqual([44]);
    expect(map.sfx.cannot).toEqual([44]);
    expect(map.sfx.timesUp).toEqual([29]);
    expect(map.sfx.rentDue).toEqual([27]);
    expect(map.sfx.starving).toEqual([20]);
    expect(map.sfx.graduate).toEqual([42]);
    expect(map.sfx.university).toEqual([41]);
    expect(map.sfx.startTurn).toEqual([9]);
    expect(map.sfx.theme).toEqual([6]);
    expect(map.sfx.newGame).toEqual([10]);
    expect(map.sfx.economyBad).toEqual([32]);
    expect(map.sfx.economyGood).toEqual([34]);
  });

  it('leaves nothing named unmatched', () => {
    expect(map.unmatched).toEqual([]);
  });
});

describe('cardSound', () => {
  it('opens the week with the start-of-turn music and picks by step after that', () => {
    expect(cardSound({ step: 'weekend', text: 'x', index: 0 })).toBe('startTurn');
    expect(cardSound({ step: 'starvation', text: 'x', index: 2 })).toBe('starving');
    expect(cardSound({ step: 'rent', text: 'x', index: 5 })).toBe('rentDue');
    expect(cardSound({ step: 'consumables', text: 'Your casual clothes are worn out.', index: 6 })).toBe('clothes');
    expect(cardSound({ step: 'consumables', text: 'You ate a week of food.', index: 6 })).toBeNull();
    expect(cardSound({ step: 'news', text: 'STOCK MARKET CRASH!', index: 7 })).toBe('economyBad');
    expect(cardSound({ step: 'news', text: 'ECONOMIC BOOM CONTINUES', index: 7 })).toBe('economyGood');
    expect(cardSound({ step: 'news', text: 'Typesetters union agreement', index: 7 })).toBeNull();
  });
});
