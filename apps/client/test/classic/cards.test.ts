import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  CLASSIC_DEFAULT_GOALS,
  resolveWeek,
  type GameConfig,
  type GameState,
} from '@jones2/sim';
import { CARD_TITLES, cardsFrom, currentCard, deckKey, deltaRows } from '../../src/classic/cards';

function config(seed = 7): GameConfig {
  return {
    ruleset: 'classic',
    mode: 'classic',
    goals: { ...CLASSIC_DEFAULT_GOALS },
    seed,
    townId: 'riverton',
    players: [
      { id: 'p0', name: 'Ann' },
      { id: 'p1', name: 'Bob' },
    ],
  };
}

/** Play a whole week away so the next week deals a full hand of cards. */
function nextWeek(state: GameState): GameState {
  let s = state;
  for (const id of s.playerOrder) {
    const r = applyAction(s, id, { type: 'endWeek' });
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
  }
  return resolveWeek(s).state;
}

describe('the start-of-week deck', () => {
  it('is empty when the sim produced nothing', () => {
    expect(cardsFrom(undefined)).toEqual([]);
    expect(cardsFrom([])).toEqual([]);
  });

  it('keeps the sim s order and gives each step a heading', () => {
    const deck = cardsFrom([
      { step: 'weekend', text: 'You went bowling.', deltas: [{ stat: 'cash', amount: -20 }] },
      { step: 'rent', text: 'Rent is due.', deltas: [] },
      { step: 'news', text: 'DAILY NEWS: boom', deltas: [] },
    ]);
    expect(deck.map((c) => c.step)).toEqual(['weekend', 'rent', 'news']);
    expect(deck.map((c) => c.index)).toEqual([0, 1, 2]);
    expect(deck[0]!.title).toBe(CARD_TITLES.weekend);
    expect(deck[0]!.rows).toEqual([{ text: 'CASH', value: '-$20' }]);
  });

  it('falls back to a generic heading for a step it does not know', () => {
    expect(cardsFrom([{ step: 'wibble', text: 'x', deltas: [] }])[0]!.title).toBe('THIS WEEK');
  });

  it('is dealt one card at a time and then lets the player act', () => {
    const deck = cardsFrom([
      { step: 'weekend', text: 'a', deltas: [] },
      { step: 'rent', text: 'b', deltas: [] },
    ]);
    expect(currentCard(deck, 0)!.step).toBe('weekend');
    expect(currentCard(deck, 1)!.step).toBe('rent');
    expect(currentCard(deck, 2)).toBeNull();
  });

  it('re-deals for a new week or a new player', () => {
    expect(deckKey(3, 'p0')).toBe('3:p0');
    expect(deckKey(3, 'p0')).not.toBe(deckKey(4, 'p0'));
    expect(deckKey(3, 'p0')).not.toBe(deckKey(3, 'p1'));
  });
});

describe('delta lines', () => {
  it('shows money with a sign and a dollar, and stats plain', () => {
    expect(deltaRows([{ stat: 'cash', amount: -45.4, note: 'weekend' }])).toEqual([
      { text: 'CASH - WEEKEND', value: '-$45' },
    ]);
    expect(deltaRows([{ stat: 'happiness', amount: 2 }])).toEqual([{ text: 'HAPPINESS', value: '+2' }]);
    expect(deltaRows([{ stat: 'dependability', amount: -3 }])).toEqual([{ text: 'DEPENDABILITY', value: '-3' }]);
  });

  it('drops noise below a tenth of a point', () => {
    expect(deltaRows([{ stat: 'cash', amount: 0.01 }])).toEqual([]);
  });
});

describe('against a real classic game', () => {
  it('week 1 deals only the weekend, and later weeks deal more', () => {
    const first = createGame(config());
    const week1 = cardsFrom(first.players.p0!.classic!.weekStart);
    expect(week1).toHaveLength(1);
    expect(week1[0]!.step).toBe('weekend');
    expect(week1[0]!.title).toBe('OH WHAT A WEEKEND!');

    const week2 = cardsFrom(nextWeek(first).players.p0!.classic!.weekStart);
    expect(week2.length).toBeGreaterThan(1);
    expect(week2[0]!.step).toBe('weekend');
    for (const c of week2) expect(c.title.length).toBeGreaterThan(0);
  });
});
