import { describe, expect, it } from 'vitest';
import {
  applyAction,
  availableActions,
  createGame,
  CLASSIC_DEFAULT_GOALS,
  type GameConfig,
  type GameState,
} from '@jones2/sim';
import { BUTTON_ACTIONS, buildLocationWindow, locationPanel, splitLabel, toRow } from '../../src/classic/menu';

function config(seed = 11): GameConfig {
  return {
    ruleset: 'classic',
    mode: 'classic',
    goals: { ...CLASSIC_DEFAULT_GOALS },
    seed,
    townId: 'riverton',
    players: [{ id: 'p0', name: 'Ann' }],
  };
}

/** Walk the player to a location node, spending whatever the trip costs. */
function goTo(state: GameState, node: string): GameState {
  const r = applyAction(state, 'p0', { type: 'travel', to: node });
  if (!r.ok) throw new Error(`${node}: ${r.reason}`);
  return r.state;
}

describe('splitLabel', () => {
  it('lifts the price out of the sim s label', () => {
    expect(splitLabel('Buy Burger ($1)')).toEqual({ text: 'Buy Burger', money: '$1', note: '' });
  });

  it('keeps the rest of the parenthetical as a note', () => {
    expect(splitLabel('Buy casual clothes ($73, 6 weeks)')).toEqual({
      text: 'Buy casual clothes',
      money: '$73',
      note: '6 weeks',
    });
  });

  it('handles a payout and a wage', () => {
    expect(splitLabel('Pawn Television (+$32)').money).toBe('+$32');
    expect(splitLabel('Apply: Cook at Monolith Burgers ($4/h)').money).toBe('$4/h');
  });

  it('leaves a parenthetical with no price alone', () => {
    expect(splitLabel('Take a lesson: Junior College (2/10)')).toEqual({
      text: 'Take a lesson: Junior College',
      money: '',
      note: '2/10',
    });
    expect(splitLabel('See the broker')).toEqual({ text: 'See the broker', money: '', note: '' });
  });
});

describe('toRow', () => {
  it('carries price, hours, enabled and reason across from the action option', () => {
    const row = toRow({
      action: { type: 'work' },
      label: 'Work a session as Cook ($48)',
      minutes: 360,
      cost: 0,
      enabled: false,
      reason: 'Not enough time',
    });
    expect(row).toMatchObject({ text: 'Work a session as Cook', price: '$48', hours: '6h', enabled: false });
    expect(row.reason).toBe('Not enough time');
  });

  it('prices from the option when the label has no money in it', () => {
    const row = toRow({
      action: { type: 'broker' },
      label: 'See the broker',
      minutes: 120,
      cost: 25,
      enabled: true,
    });
    expect(row.price).toBe('$25');
    expect(row.hours).toBe('2h');
  });

  it('leaves free, instant actions blank on both sides', () => {
    const row = toRow({ action: { type: 'endWeek' }, label: 'End the week', minutes: 0, cost: 0, enabled: true });
    expect(row.price).toBe('');
    expect(row.hours).toBe('');
  });
});

describe('the location window', () => {
  it('is built from availableActions, minus travel and End Week', () => {
    const state = goTo(createGame(config()), 'monolith');
    const w = buildLocationWindow(state, 'p0', 'monolith');
    const all = availableActions(state, 'p0');

    expect(w.title).toBe('MONOLITH BURGERS');
    expect(w.portrait).toBe('monolith');
    expect(w.greeting).toMatch(/monolith/i);

    const shown = new Set([...w.rows.map((r) => r.action?.type), ...w.buttons.map((b) => b.action?.type)]);
    expect(shown.has('travel')).toBe(false);
    expect(shown.has('endWeek')).toBe(false);

    // Every non-travel action reaches the window exactly once.
    const expected = all.filter((o) => o.action.type !== 'travel' && o.action.type !== 'endWeek').length;
    const actual = w.rows.length + w.buttons.filter((b) => b.action).length;
    expect(actual).toBe(expected);
  });

  it('prices the menu from the sim, in hours and dollars', () => {
    const state = goTo(createGame(config()), 'monolith');
    const w = buildLocationWindow(state, 'p0', 'monolith');
    const burger = w.rows.find((r) => r.text.toLowerCase().includes('burger'));
    expect(burger).toBeDefined();
    expect(burger!.price).toMatch(/^\$\d/);
    expect(burger!.hours).toBe('');
    expect(burger!.enabled).toBe(true);
  });

  it('ends with DONE, which is not an action', () => {
    const state = goTo(createGame(config()), 'pawn');
    const w = buildLocationWindow(state, 'p0', 'pawn');
    const done = w.buttons[w.buttons.length - 1]!;
    expect(done.label).toBe('DONE');
    expect(done.action).toBeNull();
    expect(done.enabled).toBe(true);
  });

  it('turns the verbs into buttons and the priced things into rows', () => {
    const state = goTo(createGame(config()), 'bank');
    const w = buildLocationWindow(state, 'p0', 'bank');
    const labels = w.buttons.map((b) => b.label);
    expect(labels).toContain('BROKER');
    expect(labels).toContain('LOAN');
    expect(w.rows.some((r) => r.action?.type === 'bank')).toBe(true);
    for (const spec of BUTTON_ACTIONS) {
      expect(w.rows.some((r) => r.action?.type === spec.type)).toBe(false);
    }
  });

  it('greys a disabled row and keeps the sim s reason for the hover', () => {
    // Broke, so the starter courses are listed but every enrolment is refused.
    const state = goTo(createGame(config()), 'university');
    state.players.p0!.cash = 0;
    const w = buildLocationWindow(state, 'p0', 'university');
    const blocked = w.rows.filter((r) => !r.enabled);
    expect(blocked.length).toBeGreaterThan(0);
    for (const r of blocked) expect(r.reason).toBeTruthy();
  });

  it('never moves a row: the order is the same broke or rich', () => {
    for (const loc of ['monolith', 'zmart', 'qt_clothing', 'socket_city', 'university', 'blacks_market']) {
      const state = goTo(createGame(config()), loc);
      state.players.p0!.cash = 0;
      const broke = buildLocationWindow(state, 'p0', loc).rows.map((r) => r.key);
      state.players.p0!.cash = 100_000;
      const rich = buildLocationWindow(state, 'p0', loc).rows.map((r) => r.key);
      state.players.p0!.cash = 100;
      const some = buildLocationWindow(state, 'p0', loc);
      expect(rich, loc).toEqual(broke);
      expect(some.rows.map((r) => r.key), loc).toEqual(broke);
      // With $100 some rows are affordable and some not, and they stay interleaved.
      if (loc === 'monolith') expect(some.rows.map((r) => r.enabled)).toContain(false);
    }
  });

  it('lists Monolith Burgers in the original s order', () => {
    const w = buildLocationWindow(goTo(createGame(config()), 'monolith'), 'p0', 'monolith');
    expect(w.rows.map((r) => r.action?.type === 'buyFood' && r.action.foodId)).toEqual([
      'hamburgers',
      'cheeseburger',
      'astro_chicken',
      'fries',
      'shakes',
      'colas',
    ]);
  });

  it('lists the Employment Office by business, then the jobs of the one picked', () => {
    const state = goTo(createGame(config()), 'employment');
    const top = buildLocationWindow(state, 'p0', 'employment');
    expect(top.rows.length).toBeGreaterThan(3);
    for (const r of top.rows) {
      expect(r.action).toBeNull();
      expect(r.group).toBeTruthy();
      expect(r.note).toMatch(/jobs?$/);
    }
    expect(top.buttons.some((b) => b.key === 'back')).toBe(false);

    const business = top.rows[0]!.group!;
    const inside = buildLocationWindow(state, 'p0', 'employment', { group: business });
    expect(inside.title).toBe(business.toUpperCase());
    expect(inside.rows.length).toBeGreaterThan(0);
    for (const r of inside.rows) expect(r.action?.type).toBe('apply');
    expect(inside.buttons[0]!.key).toBe('back');

    const jobsListed = top.rows.reduce((n, r) => n + Number(/^(\d+)/.exec(r.note)?.[1] ?? 0), 0);
    const applications = availableActions(state, 'p0').filter((o) => o.action.type === 'apply').length;
    expect(jobsListed).toBe(applications);
  });

  it('shows only the courses open to the player at the university', () => {
    const state = goTo(createGame(config()), 'university');
    const w = buildLocationWindow(state, 'p0', 'university');
    const enrol = w.rows.filter((r) => r.action?.type === 'enroll');
    const lessons = w.rows.filter((r) => r.action?.type === 'class');
    // Nothing enrolled yet: no lessons offered, and only the starter degrees.
    expect(lessons).toHaveLength(0);
    expect(enrol.length).toBeGreaterThan(0);
    for (const r of enrol) expect(r.reason ?? '').not.toMatch(/^Requires/);
  });

  it('lets an outcome replace the greeting in the bubble', () => {
    const state = goTo(createGame(config()), 'employment');
    const w = buildLocationWindow(state, 'p0', 'employment', { say: 'Hired as Cook at $6/h.' });
    expect(w.greeting).toBe('Hired as Cook at $6/h.');
    const plain = buildLocationWindow(state, 'p0', 'employment', {});
    expect(plain.greeting).not.toBe('Hired as Cook at $6/h.');
  });

  it('offers WORK only where the player is employed', () => {
    const start = goTo(createGame(config()), 'monolith');
    expect(buildLocationWindow(start, 'p0', 'monolith').buttons.map((b) => b.label)).not.toContain('WORK');
  });

  it('offers RELAX at home', () => {
    const state = goTo(createGame(config()), 'lowcost');
    expect(state.players.p0!.node).toBe('lowcost');
    expect(buildLocationWindow(state, 'p0', 'lowcost').buttons.map((b) => b.label)).toContain('RELAX');
  });

  it('converts to the painter s model without losing anything', () => {
    const state = goTo(createGame(config()), 'zmart');
    const w = buildLocationWindow(state, 'p0', 'zmart');
    const panel = locationPanel(w);
    expect(panel.title).toBe(w.title);
    expect(panel.portrait).toBe('zmart');
    expect(panel.bubble).toBe(w.greeting);
    expect(panel.rows).toHaveLength(w.rows.length);
    expect(panel.buttons).toHaveLength(w.buttons.length);
    expect(panel.rows[0]!.value).toBe(w.rows[0]!.price);
  });
});
