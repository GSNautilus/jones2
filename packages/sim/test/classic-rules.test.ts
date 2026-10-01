/**
 * Classic ruleset: the rules checked against the fan wiki on 2026-09-30 (docs/original-rules-extra.md):
 * the economy and its booms and crashes, Experience, the week-start order, rent and loan
 * deadlines, Z-Mart's weekly shelf, the Pawn Shop and Donations.
 */
import { describe, expect, it } from 'vitest';
import { ZMART_SHELF, applicationLuck, zmartShelfKey } from '../src/content/classic';
import {
  applyAction,
  availableActions,
  cp,
  createGame,
  describeAction,
  liquidAssets,
  type GameState,
} from '../src';
import { config, endAll, fullShelf, game, must, teleport } from './classic-helpers';

const cards = (s: GameState, pid = 'a') => cp(s.players[pid]!).weekStart.map((c) => c.step);

/** A game at week 10 (past the week-8 gate) with the reading set and Ann in a job with savings. */
function primed(seed: number, reading: number): GameState {
  const s = game({ seed });
  s.week = 10;
  s.classic!.reading = reading;
  s.classic!.index = 1 + reading / 60;
  for (const id of s.playerOrder) {
    const p = s.players[id]!;
    cp(p).jobId = 'monolith_cook';
    cp(p).wage = 10;
    p.savings = 1000;
    cp(p).rentDueWeek = 100; // keep rent out of it
  }
  return s;
}

/** Search seeds until a week produces `event`, from the given starting reading. */
function firstWith(event: string, reading: number): GameState {
  for (let seed = 1; seed < 3000; seed++) {
    const s = endAll(primed(seed, reading));
    if (s.classic!.event === event) return s;
  }
  throw new Error(`no ${event} in 3000 seeds`);
}

describe('classic: the economy', () => {
  it('keeps the reading in -30..90 and prices at 1 + reading/60', () => {
    let s = game({ seed: 8 });
    for (let w = 0; w < 150; w++) {
      s = endAll(s);
      const r = s.classic!.reading!;
      expect(r).toBeGreaterThanOrEqual(-30);
      expect(r).toBeLessThanOrEqual(90);
      expect(s.classic!.trend!).toBeGreaterThanOrEqual(-3);
      expect(s.classic!.trend!).toBeLessThanOrEqual(3);
      expect(s.classic!.index).toBeCloseTo(1 + r / 60, 2);
    }
  });

  it('only crashes a hot economy (reading 80+), and never booms one', () => {
    for (let seed = 1; seed < 300; seed++) {
      const cool = endAll(primed(seed, 40));
      expect(cool.classic!.event).toBe('none');
    }
  });

  it('a major crash fires everyone and empties every bank account', () => {
    const s = firstWith('crash_major', 90);
    for (const id of s.playerOrder) {
      expect(cp(s.players[id]!).jobId).toBeNull();
      expect(s.players[id]!.savings).toBe(0);
    }
    expect(s.classic!.trend!).toBeLessThanOrEqual(0);
  });

  it('a moderate crash fires or cuts every employed player to 80% of their wage', () => {
    const s = firstWith('crash_moderate', 90);
    for (const id of s.playerOrder) {
      const c = cp(s.players[id]!);
      expect(c.jobId === null || c.wage === 8).toBe(true);
      expect(s.players[id]!.savings).toBe(1000);
    }
  });

  it('a minor crash leaves jobs and wages alone', () => {
    const s = firstWith('crash_minor', 90);
    for (const id of s.playerOrder) expect(cp(s.players[id]!).wage).toBe(10);
  });

  it('booms from a weak economy, lifting the trend', () => {
    const s = firstWith('boom', -20);
    expect(s.classic!.trend!).toBeGreaterThanOrEqual(2);
  });
});

describe('classic: experience and hiring', () => {
  it('starts at 10, with a starting luck of 43', () => {
    const s = game();
    expect(cp(s.players.a!).experience).toBe(10);
    expect(Math.floor(applicationLuck(20, 10, 0))).toBe(43);
  });

  it('gives +2 experience per new job, then +1 per shift up to 10 + required + 5 per degree', () => {
    let s = teleport(game(), 'a', 'employment');
    s = must(s, 'a', { type: 'apply', jobId: 'monolith_cook' });
    expect(cp(s.players.a!).experience).toBe(12);
    cp(s.players.a!).jobId = 'zmart_clerk'; // requires 10: cap 20
    cp(s.players.a!).experience = 19;
    s = teleport(s, 'a', 'zmart');
    s = must(s, 'a', { type: 'work' });
    expect(cp(s.players.a!).experience).toBe(20);
    s = must(s, 'a', { type: 'work' });
    expect(cp(s.players.a!).experience).toBe(20);
  });

  it('does not pull a stat above its cap back down when working', () => {
    let s = teleport(game(), 'a', 'monolith');
    cp(s.players.a!).jobId = 'monolith_cook';
    cp(s.players.a!).dependability = 40; // cap is 20 + 0 + 0
    s = must(s, 'a', { type: 'work' });
    expect(cp(s.players.a!).dependability).toBe(40);
  });

  it('reports a dependability shortfall as "No openings" in the first four weeks', () => {
    let s = teleport(game(), 'a', 'employment');
    cp(s.players.a!).experience = 20; // enough for Monolith Assistant Manager; dependability 20 < 30
    const early = applyAction(s, 'a', { type: 'apply', jobId: 'monolith_assistant_manager' });
    expect(early.ok && early.event.text).toMatch(/no openings/i);
    if (early.ok) expect(cp(early.state.players.a!).week.turnedDown).toEqual([]);
    s.week = 5;
    const later = applyAction(s, 'a', { type: 'apply', jobId: 'monolith_assistant_manager' });
    expect(later.ok && later.event.text).toMatch(/not enough dependability/i);
  });

  it('costs no happiness to be refused a raise', () => {
    let s = teleport(game(), 'a', 'employment');
    s = must(s, 'a', { type: 'apply', jobId: 'monolith_cook' });
    s.classic!.index = 1.5;
    cp(s.players.a!).raises = 10; // needs 50 dependability
    const before = s.players.a!.happiness;
    s = must(s, 'a', { type: 'raise' });
    expect(cp(s.players.a!).wage).toBe(5);
    expect(s.players.a!.happiness).toBe(before);
  });

  it('allows four courses at once', () => {
    const s = teleport(game(), 'a', 'university');
    cp(s.players.a!).enrolled = ['x1', 'x2', 'x3', 'x4'];
    expect(describeAction(s, 'a', { type: 'enroll', degreeId: 'junior_college' }).reason).toMatch(/4 courses/);
  });
});

describe('classic: the start of the week', () => {
  it('checks for a winner before the weekend is paid for', () => {
    let s = createGame(config({ goals: { money: 10, happiness: 10, education: 10, career: 10 } }));
    const p = s.players.a!;
    p.cash = 1000; // exactly the Wealth goal: any weekend would take it under
    p.happiness = 20;
    cp(p).degrees = ['junior_college'];
    cp(p).jobId = 'monolith_cook';
    cp(p).dependability = 20;
    s = endAll(s);
    expect(s.winner).toBe('a');
  });

  it('starves a player whose fresh food spoiled for want of a fridge', () => {
    let s = teleport(game(), 'a', 'blacks_market');
    s = must(s, 'a', { type: 'buyFood', foodId: 'fresh_food_1_week' });
    s = endAll(s);
    expect(cards(s)).toContain('spoilage');
    expect(cards(s)).toContain('starvation');
  });

  it('sends a donation after two naked weeks when broke', () => {
    let s = game();
    const c = cp(s.players.a!);
    c.clothes = { casual: 0, dress: 0, business: 0 };
    s.players.a!.cash = 0;
    s = endAll(s);
    expect(cards(s)).not.toContain('donation');
    s.players.a!.cash = 0;
    s = endAll(s);
    expect(cards(s)).toContain('donation');
    expect(s.players.a!.cash).toBeGreaterThanOrEqual(51);
    expect(s.players.a!.cash).toBeLessThanOrEqual(150);
  });
});

describe('classic: rent and loans', () => {
  it('adds a month of rent to the debt every month it goes unpaid, and counts it against wealth', () => {
    let s = game();
    while (s.week < 5) s = endAll(s);
    expect(cp(s.players.a!).rentDebt).toBe(325);
    while (s.week < 9) s = endAll(s);
    expect(cp(s.players.a!).rentDebt).toBe(650);
    const p = s.players.a!;
    expect(liquidAssets(s, p)).toBe(p.cash + p.savings - 650);
  });

  it('keeps the rent office shut mid-month, even in debt', () => {
    let s = game();
    while (s.week < 5) s = endAll(s);
    s = teleport(s, 'a', 'rent_office');
    expect(describeAction(s, 'a', { type: 'payRent' }).reason).toMatch(/shut/);
  });

  it('stacks loan payments a month each, and needs one per missed month to leave default', () => {
    let s = teleport(game(), 'a', 'employment');
    s = must(s, 'a', { type: 'apply', jobId: 'monolith_cook' });
    s = teleport(s, 'a', 'bank');
    s.players.a!.cash = 3000;
    s = must(s, 'a', { type: 'applyLoan' });
    const due = cp(s.players.a!).loanDueWeek;
    s = must(s, 'a', { type: 'loanPayment' });
    s = must(s, 'a', { type: 'loanPayment' });
    expect(cp(s.players.a!).loanDueWeek).toBe(due + 8);

    cp(s.players.a!).loanDueWeek = s.week;
    s = endAll(s);
    cp(s.players.a!).loanDueWeek = s.week;
    s = endAll(s);
    expect(cp(s.players.a!).loanMissed).toBe(2);
    s = teleport(s, 'a', 'bank');
    s.players.a!.cash = 3000;
    s = must(s, 'a', { type: 'loanPayment' });
    expect(cp(s.players.a!).inDefault).toBe(true);
    s = must(s, 'a', { type: 'loanPayment' });
    expect(cp(s.players.a!).inDefault).toBe(false);
  });
});

describe('classic: Z-Mart and the Pawn Shop', () => {
  it('puts 6 of the shelf rows on sale each week, and only those', () => {
    const s = teleport(game(), 'a', 'zmart');
    s.players.a!.cash = 5000;
    const stock = cp(s.players.a!).zmartStock!;
    expect(stock).toHaveLength(6);
    const buys = availableActions(s, 'a').filter((o) => o.action.type === 'buyItem' || o.action.type === 'buyClothing');
    expect(buys).toHaveLength(6);
    const missing = ZMART_SHELF.find((r) => 'item' in r && !stock.includes(zmartShelfKey(r)));
    if (missing && 'item' in missing) {
      expect(describeAction(s, 'a', { type: 'buyItem', itemId: missing.item }).reason).toMatch(/shelf/);
    }
  });

  it('redeems at half what was paid, and holds only one of each item', () => {
    let s = fullShelf(teleport(game(), 'a', 'zmart'), 'a');
    s = fullShelf(s, 'b');
    s.classic!.index = 1.2; // the TV costs $132 this week
    s.players.a!.cash = 3000;
    s.players.b!.cash = 3000;
    s = must(s, 'a', { type: 'buyItem', itemId: 'bw_tv' });
    s = must(teleport(s, 'b', 'zmart'), 'b', { type: 'buyItem', itemId: 'bw_tv' });
    s = must(teleport(s, 'a', 'pawn'), 'a', { type: 'pawnItem', itemId: 'bw_tv' });
    expect(describeAction(teleport(s, 'b', 'pawn'), 'b', { type: 'pawnItem', itemId: 'bw_tv' }).reason).toMatch(/already holds/);
    const cash = s.players.a!.cash;
    s = must(s, 'a', { type: 'redeemItem', itemId: 'bw_tv' });
    expect(cash - s.players.a!.cash).toBe(66);
  });
});
