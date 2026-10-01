/** Classic ruleset: time, travel, locations and the player actions. */
import { describe, expect, it } from 'vitest';
import { routeHours, travelHourMultiplier, TownGraph, riverton, type Town } from '@jones2/town';
import { applyAction, availableActions, classic, createGame, cp, describeAction, type GameState } from '../src';

const { travelHours } = classic;
const MULT = travelHourMultiplier(riverton as Town);
import { config, endAll, fullShelf, game, must, teleport } from './classic-helpers';

const graph = new TownGraph(riverton as Town);

describe('classic: the 60-hour week', () => {
  it('gives everyone 60 hours and starts them at the depot', () => {
    const s = createGame(config());
    const p = s.players.a!;
    expect(p.minutesBudget).toBe(60 * 60);
    expect(p.minutesLeft).toBe(60 * 60);
    expect(p.node).toBe('bus_depot');
    expect(cp(p).dependability).toBe(20);
    expect(cp(p).clothes.casual).toBe(6);
    expect(cp(p).housing).toBe('lowcost');
  });

  it('charges travel in whole hours but records the route minutes for the replay', () => {
    const s0 = createGame(config());
    const route = graph.bestRoute('bus_depot', 'employment', ['walk'])!;
    const r = applyAction(s0, 'a', { type: 'travel', to: 'employment' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.duration).toBe(route.minutes);
    expect(r.state.players.a!.minutesLeft).toBe(3600 - travelHours(route.minutes, MULT) * 60);
    expect(routeHours(route.minutes)).toBe(3); // the hour ladder: depot -> employment is 3h
    expect(MULT).toBe(2); // Riverton charges twice the ladder
    expect(travelHours(route.minutes, MULT)).toBe(6);
  });

  it('disables an action that does not fit in the hours left', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'travel', to: 'employment' });
    s.players.a!.minutesLeft = 60; // one hour
    const opt = describeAction(s, 'a', { type: 'apply', jobId: 'monolith_cook' });
    expect(opt.enabled).toBe(false);
    expect(opt.reason).toBe('Not enough time');
  });

  it('lets a short work session happen and pays pro rata', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'travel', to: 'employment' });
    s = must(s, 'a', { type: 'apply', jobId: 'monolith_cook' });
    s = must(s, 'a', { type: 'travel', to: 'monolith' });
    s.players.a!.minutesLeft = 120; // two hours left
    const cash = s.players.a!.cash;
    s = must(s, 'a', { type: 'work' });
    expect(s.players.a!.minutesLeft).toBe(0);
    expect(s.players.a!.cash - cash).toBe(Math.round((5 * 8 * 2) / 6));
  });

  it('offers nothing but travel and endWeek at a closed location', () => {
    let s = createGame(config());
    s = teleport(s, 'a', 'pet_store');
    const opts = availableActions(s, 'a');
    expect(opts.filter((o) => o.action.type !== 'travel' && o.action.type !== 'endWeek')).toHaveLength(0);
    expect(describeAction(s, 'a', { type: 'work' }).reason).toMatch(/no job/i);
    expect(describeAction(s, 'a', { type: 'lottery' }).reason).toBe('Closed');
    expect(describeAction(s, 'a', { type: 'payRent' }).reason).toBe('Closed');
  });
});

describe('classic: jobs', () => {
  it('always hires the Monolith cook and pays 8x the wage for a session', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'travel', to: 'employment' });
    const before = s.players.a!.happiness;
    s = must(s, 'a', { type: 'apply', jobId: 'monolith_cook' });
    expect(cp(s.players.a!).jobId).toBe('monolith_cook');
    expect(cp(s.players.a!).wage).toBe(5);
    expect(s.players.a!.happiness).toBe(before + 3);
    s = must(s, 'a', { type: 'travel', to: 'monolith' });
    const cash = s.players.a!.cash;
    s = must(s, 'a', { type: 'work' });
    expect(s.players.a!.cash - cash).toBe(40);
    expect(cp(s.players.a!).dependability).toBe(21);
    // 10 to start, +2 for the new job; the shift adds none, 12 is over the Cook's cap of 10.
    expect(cp(s.players.a!).experience).toBe(12);
  });

  it('refuses a job the player is not qualified for, for -1 happiness', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'travel', to: 'employment' });
    s.players.a!.happiness = 20;
    const r = applyAction(s, 'a', { type: 'apply', jobId: 'bank_broker' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.text).toMatch(/not enough/i);
    expect(r.state.players.a!.happiness).toBe(19);
    expect(cp(r.state.players.a!).jobId).toBeNull();
  });

  it('fires a player whose dependability has fallen 5 below the requirement', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'travel', to: 'employment' });
    s = must(s, 'a', { type: 'apply', jobId: 'monolith_clerk' }); // requires 20 dependability
    if (!cp(s.players.a!).jobId) return; // unlucky "no openings" roll: nothing to test
    s = must(s, 'a', { type: 'travel', to: 'monolith' });
    cp(s.players.a!).dependability = 14;
    const r = applyAction(s, 'a', { type: 'work' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.text).toMatch(/fired/i);
    expect(cp(r.state.players.a!).jobId).toBeNull();
  });

  it('grants a raise when dependability is high enough and the listed wage has risen', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'travel', to: 'employment' });
    s = must(s, 'a', { type: 'apply', jobId: 'monolith_cook' });
    s.classic!.index = 1.5; // the listed wage is now $8
    cp(s.players.a!).dependability = 30;
    const r = applyAction(s, 'a', { type: 'raise' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(cp(r.state.players.a!).wage).toBe(8);
    expect(cp(r.state.players.a!).raises).toBe(1);
  });

  it('needs the job’s uniform to work', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'travel', to: 'employment' });
    cp(s.players.a!).experience = 40;
    cp(s.players.a!).dependability = 40;
    s = must(s, 'a', { type: 'apply', jobId: 'blacks_assistant_manager' }); // dress uniform
    if (!cp(s.players.a!).jobId) return;
    s = must(s, 'a', { type: 'travel', to: 'blacks_market' });
    expect(describeAction(s, 'a', { type: 'work' }).reason).toBe('Needs dress clothes');
    cp(s.players.a!).clothes.dress = 3;
    expect(describeAction(s, 'a', { type: 'work' }).enabled).toBe(true);
  });
});

describe('classic: Hi-Tech U', () => {
  it('turns ten lessons into a degree worth 9 education points', () => {
    let s = createGame(config());
    s = teleport(s, 'a', 'university');
    s.players.a!.cash = 500;
    s = must(s, 'a', { type: 'enroll', degreeId: 'junior_college' });
    for (let i = 0; i < 9; i++) {
      s.players.a!.minutesLeft = 3600;
      s = must(s, 'a', { type: 'class', degreeId: 'junior_college' });
      expect(cp(s.players.a!).degrees).toHaveLength(0);
    }
    s.players.a!.minutesLeft = 3600;
    const happy = s.players.a!.happiness;
    s = must(s, 'a', { type: 'class', degreeId: 'junior_college' });
    expect(cp(s.players.a!).degrees).toEqual(['junior_college']);
    expect(s.players.a!.happiness).toBe(happy + 5);
    expect(cp(s.players.a!).dependability).toBe(25); // +5 graduation bonus
  });

  it('enforces prerequisites', () => {
    let s = createGame(config());
    s = teleport(s, 'a', 'university');
    s.players.a!.cash = 500;
    expect(describeAction(s, 'a', { type: 'enroll', degreeId: 'business_admin' }).reason).toMatch(/Junior College/);
  });
});

describe('classic: menu order matches the original', () => {
  const listed = (s: GameState, loc: string): string[] =>
    availableActions(teleport(s, 'a', loc), 'a')
      .map((o) => o.action)
      .filter((a) => a.type === 'buyItem' || a.type === 'buyClothing' || a.type === 'buyFood')
      .map((a) => (a.type === 'buyItem' ? a.itemId : a.type === 'buyFood' ? a.foodId : `${a.tier} clothes`));

  it('QT Clothing: suit first, casual last', () => {
    expect(listed(game(), 'qt_clothing')).toEqual(['business clothes', 'dress clothes', 'casual clothes']);
  });

  it('Z-Mart: its own appliance order, clothes between the books and the tickets', () => {
    expect(listed(fullShelf(game(), 'a'), 'zmart')).toEqual([
      'fridge', 'stove', 'stereo', 'color_tv', 'bw_tv', 'microwave', 'vcr',
      'encyclopedia', 'dictionary', 'atlas', 'casual clothes', 'dress clothes',
      'baseball_tickets', 'theatre_tickets', 'concert_tickets', 'dog_food', 'eight_track', 'works_of_capote',
    ]);
  });

  it('Socket City: fridge to computer', () => {
    expect(listed(game(), 'socket_city')).toEqual([
      'fridge', 'freezer', 'stove', 'color_tv', 'vcr', 'stereo', 'microwave', 'hot_tub', 'computer',
    ]);
  });

  it('the broker lists Buy and Sell for every stock whether held or not', () => {
    let s = teleport(game(), 'a', 'bank');
    s.players.a!.cash = 10_000;
    s = must(s, 'a', { type: 'broker' });
    const rows = () => availableActions(s, 'a').filter((o) => o.action.type === 'buyStock' || o.action.type === 'sellStock');
    const before = rows().map((o) => `${o.action.type}:${(o.action as { stockId: string }).stockId}`);
    expect(before).toHaveLength(12);
    expect(rows().find((o) => o.action.type === 'sellStock')!.reason).toBe('You hold none');
    s = must(s, 'a', { type: 'buyStock', stockId: 'gold', units: 1 });
    expect(rows().map((o) => `${o.action.type}:${(o.action as { stockId: string }).stockId}`)).toEqual(before);
    const sellGold = rows().find((o) => o.action.type === 'sellStock' && o.action.stockId === 'gold')!;
    expect(sellGold.enabled).toBe(true);
  });
});

describe('classic: shops', () => {
  it('needs a refrigerator to keep fresh food', () => {
    let s = createGame(config());
    s = teleport(s, 'a', 'blacks_market');
    s.players.a!.cash = 2000;
    s = must(s, 'a', { type: 'buyFood', foodId: 'fresh_food_4_weeks' });
    expect(cp(s.players.a!).freshFood).toBe(4);
    s = endAll(s);
    const cards = cp(s.players.a!).weekStart;
    expect(cards.find((c) => c.step === 'spoilage')?.text).toMatch(/no refrigerator/);
    expect(cp(s.players.a!).freshFood).toBe(0);
  });

  it('keeps fresh food when a fridge is owned, eating one week per week', () => {
    let s = createGame(config());
    s = fullShelf(teleport(s, 'a', 'zmart'), 'a');
    s.players.a!.cash = 3000;
    s = must(s, 'a', { type: 'buyItem', itemId: 'fridge' });
    s = teleport(s, 'a', 'blacks_market');
    s = must(s, 'a', { type: 'buyFood', foodId: 'fresh_food_4_weeks' });
    s = endAll(s);
    expect(cp(s.players.a!).weekStart.some((c) => c.step === 'spoilage')).toBe(false);
    expect(cp(s.players.a!).freshFood).toBe(3);
  });

  it('sells clothes by the week and ticks them down', () => {
    let s = createGame(config());
    s = teleport(s, 'a', 'qt_clothing');
    s.players.a!.cash = 1000;
    s = must(s, 'a', { type: 'buyClothing', tier: 'dress', store: 'qt_clothing' });
    expect(cp(s.players.a!).clothes.dress).toBe(13);
    s = endAll(s);
    expect(cp(s.players.a!).clothes.dress).toBe(12);
    expect(cp(s.players.a!).clothes.casual).toBe(5);
  });

  it('pawns an item for 40% and lets the owner redeem it', () => {
    let s = createGame(config());
    s = fullShelf(teleport(s, 'a', 'zmart'), 'a');
    s.players.a!.cash = 3000;
    s = must(s, 'a', { type: 'buyItem', itemId: 'bw_tv' }); // $110 at Z-Mart
    s = teleport(s, 'a', 'pawn');
    s.players.a!.happiness = 10; // happiness is floored at 0, so give it room to fall
    const cash = s.players.a!.cash;
    const happy = s.players.a!.happiness;
    s = must(s, 'a', { type: 'pawnItem', itemId: 'bw_tv' });
    expect(s.players.a!.cash - cash).toBe(44);
    expect(s.players.a!.happiness).toBe(happy - 1);
    expect(s.classic!.pawnShop).toHaveLength(1);
    const back = s.players.a!.cash;
    s = must(s, 'a', { type: 'redeemItem', itemId: 'bw_tv' });
    expect(back - s.players.a!.cash).toBe(55);
    expect(cp(s.players.a!).items).toContain('bw_tv');
  });

  it('buys lottery tickets and draws them at the next week start', () => {
    let s = createGame(config());
    s = teleport(s, 'a', 'blacks_market');
    s.players.a!.cash = 2000;
    for (let i = 0; i < 20; i++) s = must(s, 'a', { type: 'lottery' });
    expect(cp(s.players.a!).lotteryTickets).toBe(200);
    s = endAll(s);
    expect(cp(s.players.a!).lotteryTickets).toBe(0);
    expect(cp(s.players.a!).weekStart.some((c) => c.step === 'lottery')).toBe(true);
  });

  it('charges an hour for the newspaper and prints the headline', () => {
    let s = createGame(config());
    s = teleport(s, 'a', 'blacks_market');
    const left = s.players.a!.minutesLeft;
    const r = applyAction(s, 'a', { type: 'newspaper' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.players.a!.minutesLeft).toBe(left - 60);
    expect(r.event.text).toContain(s.classic!.headline);
  });
});

describe('classic: the original board (townId "classic")', () => {
  it('starts everyone at Low-Cost Housing and charges a ring hop one hour', () => {
    const s0 = createGame(config({ townId: 'classic' }));
    expect(s0.players.a!.node).toBe('lowcost');
    const r = applyAction(s0, 'a', { type: 'travel', to: 'pawn' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.players.a!.minutesLeft).toBe(3600 - 60);
    expect(r.event.duration).toBeLessThanOrEqual(60);
  });

  it('the far side of the ring is five hours and a lap about ten', () => {
    const s0 = createGame(config({ townId: 'classic' }));
    const far = describeAction(s0, 'a', { type: 'travel', to: 'employment' });
    expect(far.minutes).toBe(5 * 60);
    const opts = availableActions(s0, 'a').filter((o) => o.action.type === 'travel');
    expect(opts).toHaveLength(12); // every other classic location, nothing closed
    const worst = Math.max(...opts.map((o) => o.minutes));
    expect(worst).toBe(5 * 60);
  });

  it('sends a player home to their apartment at the start of the next week', () => {
    let s = createGame(config({ townId: 'classic' }));
    s = must(s, 'a', { type: 'travel', to: 'bank' });
    s = endAll(s);
    expect(s.players.a!.node).toBe('lowcost');
  });
});
