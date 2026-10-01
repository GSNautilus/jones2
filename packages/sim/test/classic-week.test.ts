/** Classic ruleset: the start-of-week sequence, rent, loans, stocks, the economy and the goals. */
import { describe, expect, it } from 'vitest';
import {
  applyAction,
  classicGoalValues,
  cp,
  createGame,
  describeAction,
  goalProgress,
  liquidAssets,
  resolveWeek,
  stockPrice,
  DEFAULT_GOALS,
  type Action,
  type GameState,
} from '../src';
import { config, endAll, feed, fullShelf, game, must, teleport } from './classic-helpers';

const cards = (s: GameState, pid = 'a') => cp(s.players[pid]!).weekStart.map((c) => c.step);

describe('classic: the start-of-week sequence', () => {
  it('only plays a weekend on week 1', () => {
    const s = game();
    expect(cards(s)).toEqual(['weekend']);
  });

  it('runs the whole sequence in order from week 2, ticking dependability down 3', () => {
    let s = game();
    s = feed(s, 'a');
    s = endAll(s);
    expect(cards(s)[0]).toBe('weekend');
    expect(cards(s)).toContain('stats');
    expect(cp(s.players.a!).dependability).toBe(17);
  });

  it('starves a player who bought no food, for 20 hours and 2 happiness', () => {
    let s = game();
    s.players.a!.happiness = 10;
    s = endAll(s);
    const p = s.players.a!;
    expect(cards(s)).toContain('starvation');
    expect(p.minutesLeft).toBe(3600 - 20 * 60);
    expect(p.happiness).toBe(8);
  });

  it('breaks appliances at 1/36 a week, but only above $500 cash', () => {
    const run = (cash: number, weeks: number) => {
      let s = game({ seed: 3 });
      s = fullShelf(teleport(s, 'a', 'zmart'), 'a');
      s.players.a!.cash = 5000;
      s = must(s, 'a', { type: 'buyItem', itemId: 'bw_tv' });
      let seen = false;
      for (let i = 0; i < weeks && !seen; i++) {
        s = feed(s, 'a');
        s.players.a!.cash = cash;
        s = endAll(s);
        seen = cards(s).includes('breakdown');
      }
      return seen;
    };
    expect(run(400, 120)).toBe(false); // under the $500 gate, nothing ever breaks
    expect(run(5000, 120)).toBe(true);
  });
});

describe('classic: rent', () => {
  const toWeek4 = (): GameState => {
    let s = game();
    for (let i = 0; i < 3; i++) {
      for (const id of s.playerOrder) s = feed(s, id);
      s = endAll(s);
    }
    return s;
  };

  it('posts a rent notice on week 4 and takes payment at the rent office', () => {
    let s = toWeek4();
    expect(s.week).toBe(4);
    expect(cards(s)).toContain('rent');
    s = teleport(s, 'a', 'rent_office');
    s.players.a!.cash = 1000;
    const cash = s.players.a!.cash;
    s = must(s, 'a', { type: 'payRent' });
    expect(cash - s.players.a!.cash).toBe(325);
    expect(cp(s.players.a!).rentDueWeek).toBe(8);
  });

  it('turns unpaid rent into debt, then garnishes half of every pay packet', () => {
    let s = toWeek4();
    s = feed(s, 'a');
    s = endAll(s);
    expect(cp(s.players.a!).rentDebt).toBe(325);
    // Take the cook job and work: half the wage is garnished plus a $2 fee.
    s = teleport(s, 'a', 'employment');
    s = must(s, 'a', { type: 'apply', jobId: 'monolith_cook' });
    s = teleport(s, 'a', 'monolith');
    const cash = s.players.a!.cash;
    s = must(s, 'a', { type: 'work' });
    expect(s.players.a!.cash - cash).toBe(40 - 20 - 2);
    expect(cp(s.players.a!).rentDebt).toBe(305);
    expect(cp(s.players.a!).everGarnished).toBe(true);
  });

  it('approves the first extension and refuses extensions once garnished', () => {
    let s = toWeek4();
    s = teleport(s, 'a', 'rent_office');
    s = must(s, 'a', { type: 'rentExtension' });
    expect(cp(s.players.a!).extensionsApproved).toBe(1);
    expect(cp(s.players.a!).extensionUntil).toBe(5); // the deadline itself stays on the month end
    expect(cp(s.players.a!).rentDueWeek).toBe(4);
    cp(s.players.a!).everGarnished = true;
    cp(s.players.a!).week.askedExtension = false;
    cp(s.players.a!).rentDueWeek = 4;
    expect(describeAction(s, 'a', { type: 'rentExtension' }).reason).toMatch(/never extend/);
  });

  it('switches apartments for a month of the new rent', () => {
    let s = toWeek4();
    s = teleport(s, 'a', 'rent_office');
    s.players.a!.cash = 2000;
    const cash = s.players.a!.cash;
    const expected = Math.round(475 * s.classic!.index); // rents track the economy index
    s = must(s, 'a', { type: 'rent', housingId: 'security_apts' });
    expect(cash - s.players.a!.cash).toBe(expected);
    expect(cp(s.players.a!).rent).toBe(expected);
    expect(cp(s.players.a!).housing).toBe('security_apts');
    s = feed(s, 'a');
    s = endAll(s);
    expect(s.players.a!.node).toBe('security_apts'); // next week starts at home
  });
});

describe('classic: the bank', () => {
  function employed(): GameState {
    let s = game();
    s = teleport(s, 'a', 'employment');
    s = must(s, 'a', { type: 'apply', jobId: 'monolith_cook' });
    return s;
  }

  it('lends when liquidity beats risk, and refuses the unemployed', () => {
    let s = employed();
    s = teleport(s, 'a', 'bank');
    s.players.a!.cash = 3000; // liquidity = wage 5 + 3 = 8, risk = 5 -> $300
    const cash = s.players.a!.cash;
    s = must(s, 'a', { type: 'applyLoan' });
    expect(s.players.a!.loan).toBe(300);
    expect(s.players.a!.cash - cash).toBe(300);
    cp(s.players.a!).jobId = null;
    expect(describeAction(s, 'a', { type: 'applyLoan' }).reason).toMatch(/unemployed/);
  });

  it('takes $50 payments, $45 off the debt and $5 in interest', () => {
    let s = employed();
    s = teleport(s, 'a', 'bank');
    s.players.a!.cash = 3000;
    s = must(s, 'a', { type: 'applyLoan' });
    const cash = s.players.a!.cash;
    const loan = s.players.a!.loan;
    s = must(s, 'a', { type: 'loanPayment' });
    expect(cash - s.players.a!.cash).toBe(50);
    expect(loan - s.players.a!.loan).toBe(45);
  });

  it('records a default when a month passes with no payment', () => {
    let s = employed();
    s = teleport(s, 'a', 'bank');
    s.players.a!.cash = 3000;
    s = must(s, 'a', { type: 'applyLoan' });
    cp(s.players.a!).loanDueWeek = s.week;
    s = feed(s, 'a');
    s = endAll(s);
    expect(cp(s.players.a!).loanDefaults).toBe(1);
    expect(cp(s.players.a!).inDefault).toBe(true);
  });

  it('buys and sells stocks after seeing the broker, with a 3% fee on T-Bills', () => {
    let s = game();
    s = teleport(s, 'a', 'bank');
    s.players.a!.cash = 3000;
    expect(describeAction(s, 'a', { type: 'buyStock', stockId: 't_bills', units: 1 }).reason).toMatch(/broker/);
    s = must(s, 'a', { type: 'broker' });
    expect(s.players.a!.minutesLeft).toBe(3600 - 120);
    s = must(s, 'a', { type: 'buyStock', stockId: 't_bills', units: 10 });
    expect(s.players.a!.cash).toBe(2000);
    expect(liquidAssets(s, s.players.a!)).toBe(3000);
    const cash = s.players.a!.cash;
    s = must(s, 'a', { type: 'sellStock', stockId: 't_bills', units: 10 });
    expect(s.players.a!.cash - cash).toBe(970);
  });
});

describe('classic: the economy', () => {
  it('holds booms and crashes back until week 8 (the CD-ROM gate)', () => {
    let s = game({ seed: 11 });
    for (let w = 0; w < 6; w++) {
      s = endAll(s);
      expect(s.classic!.event).toBe('none');
    }
    expect(s.week).toBe(7);
  });

  it('moves stock prices every week and keeps them inside the documented band', () => {
    let s = game({ seed: 5 });
    const start = stockPrice(s, 'penny_stocks');
    let moved = false;
    for (let w = 0; w < 20; w++) {
      s = endAll(s);
      const price = stockPrice(s, 'penny_stocks');
      if (price !== start) moved = true;
      expect(price).toBeGreaterThanOrEqual(3);
      expect(price).toBeLessThanOrEqual(18);
    }
    expect(moved).toBe(true);
    expect(stockPrice(s, 't_bills')).toBe(100);
  });

  it('eventually fires a boom or a crash and reports it as the headline', () => {
    let s = game({ seed: 19 });
    let event = 'none';
    for (let w = 0; w < 60 && event === 'none'; w++) {
      s = endAll(s);
      event = s.classic!.event;
    }
    expect(event).not.toBe('none');
    expect(s.classic!.headline.length).toBeGreaterThan(5);
  });
});

describe('classic: goals and winning', () => {
  it('computes the four goals the way the original does', () => {
    const s = game();
    const p = s.players.a!;
    p.cash = 4000;
    cp(p).degrees = ['junior_college', 'trade_school'];
    cp(p).jobId = 'monolith_cook';
    cp(p).dependability = 40;
    p.happiness = 33;
    const v = classicGoalValues(s, p);
    expect(v.money).toBe(40);
    expect(v.education).toBe(19);
    expect(v.career).toBe(50);
    expect(v.happiness).toBe(33);
    cp(p).jobId = null;
    expect(classicGoalValues(s, p).career).toBe(0);
  });

  it('declares a winner at the start of the week once all four goals are met', () => {
    let s = createGame(config({ goals: { money: 10, happiness: 10, education: 10, career: 10 } }));
    const p = s.players.a!;
    p.cash = 2000;
    p.happiness = 50;
    cp(p).degrees = ['junior_college'];
    cp(p).jobId = 'monolith_cook';
    cp(p).dependability = 40;
    expect(goalProgress(s, p).done).toBe(true);
    s = endAll(s);
    expect(s.phase).toBe('finished');
    expect(s.winner).toBe('a');
  });
});

describe('classic: determinism and the other ruleset', () => {
  it('replays the same seed and script to an identical state', () => {
    const script: [string, Action][] = [
      ['a', { type: 'travel', to: 'employment' }],
      ['a', { type: 'apply', jobId: 'monolith_cook' }],
      ['a', { type: 'travel', to: 'monolith' }],
      ['a', { type: 'work' }],
      ['a', { type: 'buyFood', foodId: 'cheeseburger' }],
      ['b', { type: 'travel', to: 'blacks_market' }],
      ['b', { type: 'lottery' }],
      ['a', { type: 'endWeek' }],
      ['b', { type: 'endWeek' }],
    ];
    const run = () => {
      let s = game();
      for (const [pid, a] of script) s = must(s, pid, a);
      return resolveWeek(s).state;
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('turns the Jones 2 systems off', () => {
    const s = game();
    for (const a of [
      { type: 'cook' },
      { type: 'activity', activityId: 'jog' },
      { type: 'clinic' },
      { type: 'buyGroceries' },
      { type: 'buyInsurance' },
      { type: 'buyBusPass' },
      { type: 'offer', housingId: 'house_elm', bid: 9000 },
      { type: 'homeStudy', degreeId: 'junior_college' },
      { type: 'buyNews', sourceId: 'tabloid' },
      { type: 'quit' },
    ] as Action[]) {
      const r = applyAction(s, 'a', a);
      expect(r.ok, a.type).toBe(false);
      if (!r.ok) expect(r.reason).toBe('Not available in the classic ruleset');
    }
  });

  it('does not touch the Jones 2 ruleset', () => {
    const s = createGame({
      mode: 'classic',
      goals: DEFAULT_GOALS,
      seed: 42,
      townId: 'riverton',
      players: [{ id: 'a', name: 'Ann' }],
    });
    expect(s.config.ruleset).toBeUndefined();
    expect(s.classic).toBeUndefined();
    expect(s.players.a!.classic).toBeUndefined();
    expect(s.schedule.length).toBeGreaterThan(0);
    const r = applyAction(s, 'a', { type: 'raise' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Not available/);
  });
});
