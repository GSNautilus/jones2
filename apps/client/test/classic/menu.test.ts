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

    const shown = new Set([...w.rows.map((r) => r.action.type), ...w.buttons.map((b) => b.action?.type)]);
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
    expect(w.rows.some((r) => r.action.type === 'bank')).toBe(true);
    for (const spec of BUTTON_ACTIONS) {
      expect(w.rows.some((r) => r.action.type === spec.type)).toBe(false);
    }
  });

  it('greys a disabled row and keeps the sim s reason for the hover', () => {
    // Nowhere near a university degree, so lessons and enrolments are refused.
    const state = goTo(createGame(config()), 'university');
    const w = buildLocationWindow(state, 'p0', 'university');
    const blocked = w.rows.filter((r) => !r.enabled);
    expect(blocked.length).toBeGreaterThan(0);
    for (const r of blocked) expect(r.reason).toBeTruthy();
    // Enabled rows come first so the affordable things are at the top.
    const firstDisabled = w.rows.findIndex((r) => !r.enabled);
    expect(w.rows.slice(0, firstDisabled).every((r) => r.enabled)).toBe(true);
  });

  it('keeps the sim s order when asked not to sort', () => {
    const state = goTo(createGame(config()), 'university');
    const sorted = buildLocationWindow(state, 'p0', 'university');
    const raw = buildLocationWindow(state, 'p0', 'university', { sort: false });
    expect(raw.rows.length).toBe(sorted.rows.length);
    expect(raw.rows.map((r) => r.key).sort()).toEqual(sorted.rows.map((r) => r.key).sort());
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
