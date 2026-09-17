/**
 * The start-of-week cards. The sim writes `PlayerState.classic.weekStart` in
 * the order the events happened (`classic/turnStart.ts`); the interface shows
 * them one at a time in the centre window, each dismissed with DONE, before the
 * player may act (PLAN §2).
 *
 * Nothing here interprets the events: the step id picks a heading, the sim's
 * own text is the body, and the deltas are listed underneath.
 */
import type { Delta } from '@jones2/sim';

export interface WeekStartLike {
  step: string;
  text: string;
  deltas: Delta[];
}

/** Headings, keyed by the sim's step id. */
export const CARD_TITLES: Record<string, string> = {
  weekend: 'OH WHAT A WEEKEND!',
  lottery: 'THE LOTTERY',
  starvation: 'YOU WENT HUNGRY',
  stats: 'ANOTHER WEEK GOES BY',
  breakdown: 'IT BROKE DOWN',
  spoilage: 'IN THE REFRIGERATOR',
  household: 'LIFE AT HOME',
  rent: 'RENT IS DUE',
  loan: 'THE BANK CALLED',
  consumables: 'WEAR AND TEAR',
  news: 'DAILY NEWS',
};

export const DEFAULT_CARD_TITLE = 'THIS WEEK';

export interface CardRow {
  text: string;
  value: string;
}

export interface WeekCard {
  /** Index in the sequence, 0-based. */
  index: number;
  step: string;
  title: string;
  text: string;
  rows: CardRow[];
}

function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  const s = Number.isInteger(r) ? String(r) : r.toFixed(1);
  return r > 0 ? `+${s}` : s;
}

const MONEY_STATS: ReadonlySet<string> = new Set(['cash', 'savings', 'loan', 'stocks']);

/** "CASH  -45" style lines under a card's text. */
export function deltaRows(deltas: readonly Delta[]): CardRow[] {
  return deltas
    .filter((d) => Math.abs(d.amount) >= 0.05)
    .map((d) => ({
      text: (d.note ? `${d.stat} - ${d.note}` : d.stat).toUpperCase(),
      value: MONEY_STATS.has(d.stat) ? `${d.amount < 0 ? '-' : '+'}$${Math.abs(Math.round(d.amount))}` : signed(d.amount),
    }));
}

/** The deck for one player's week, in the order the sim produced it. */
export function cardsFrom(weekStart: readonly WeekStartLike[] | undefined): WeekCard[] {
  if (!weekStart || weekStart.length === 0) return [];
  return weekStart.map((e, index) => ({
    index,
    step: e.step,
    title: CARD_TITLES[e.step] ?? DEFAULT_CARD_TITLE,
    text: e.text,
    rows: deltaRows(e.deltas ?? []),
  }));
}

/**
 * Which card to show, given how many have been dismissed. Returns null once the
 * deck is done — that is the signal the player may act.
 */
export function currentCard(cards: readonly WeekCard[], dismissed: number): WeekCard | null {
  return cards[dismissed] ?? null;
}

/** A stable key for "this player's cards, this week", so a new week deals again. */
export function deckKey(week: number, playerId: string): string {
  return `${week}:${playerId}`;
}
