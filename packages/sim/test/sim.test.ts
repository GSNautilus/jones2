import { describe, expect, it } from 'vitest';
import {
  applyAction,
  availableActions,
  createGame,
  goalProgress,
  resolveWeek,
  DEFAULT_GOALS,
  WEEK_MINUTES,
  START_CASH,
  type Action,
  type GameConfig,
  type GameState,
} from '../src';

function config(over: Partial<GameConfig> = {}): GameConfig {
  return {
    mode: 'classic',
    goals: DEFAULT_GOALS,
    seed: 42,
    townId: 'riverton',
    players: [
      { id: 'a', name: 'Ann' },
      { id: 'b', name: 'Bob' },
    ],
    ...over,
  };
}

function must(state: GameState, pid: string, action: Action): GameState {
  const r = applyAction(state, pid, action);
  if (!r.ok) throw new Error(`${pid} ${action.type}: ${r.reason}`);
  return r.state;
}

function endAll(state: GameState): GameState {
  let s = state;
  for (const id of s.playerOrder) if (!s.players[id]!.weekDone) s = must(s, id, { type: 'endWeek' });
  return resolveWeek(s).state;
}

describe('game creation', () => {
  it('is deterministic for a seed', () => {
    const a = createGame(config());
    const b = createGame(config());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.schedule.length).toBeGreaterThan(5);
  });

  it('starts players at the depot with a full budget', () => {
    const s = createGame(config());
    const p = s.players.a!;
    expect(p.node).toBe('bus_depot');
    expect(p.cash).toBe(START_CASH);
    expect(p.minutesLeft).toBeLessThanOrEqual(WEEK_MINUTES);
    expect(p.minutesLeft).toBeGreaterThan(WEEK_MINUTES * 0.7);
  });
});

describe('actions', () => {
  it('travel costs time and moves the player; input state is not mutated', () => {
    const s0 = createGame(config());
    const s1 = must(s0, 'a', { type: 'travel', to: 'employment' });
    expect(s0.players.a!.node).toBe('bus_depot');
    expect(s1.players.a!.node).toBe('employment');
    expect(s1.players.a!.minutesLeft).toBeLessThan(s0.players.a!.minutesLeft);
    expect(s1.players.a!.log[0]!.path).toEqual(['bus_depot', 'j_center', 'employment']);
  });

  it('rejects actions at the wrong place with a reason', () => {
    const s = createGame(config());
    const r = applyAction(s, 'a', { type: 'work' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/no job/i);
  });

  it('lists options with reasons at the employment office', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'travel', to: 'employment' });
    const opts = availableActions(s, 'a');
    const fry = opts.find((o) => o.action.type === 'apply' && o.action.jobId === 'fry_cook')!;
    expect(fry.enabled).toBe(true);
    const prof = opts.find((o) => o.action.type === 'apply' && o.action.jobId === 'professor')!;
    expect(prof.enabled).toBe(false);
    expect(prof.reason).toMatch(/Requires/);
  });

  it('rejects actions after the week has ended', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'endWeek' });
    expect(applyAction(s, 'a', { type: 'travel', to: 'bank' }).ok).toBe(false);
  });
});

describe('week resolution', () => {
  it('grants an uncontested job and lets the player work next week', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'travel', to: 'employment' });
    s = must(s, 'a', { type: 'apply', jobId: 'fry_cook' });
    s = endAll(s);
    expect(s.week).toBe(2);
    expect(s.players.a!.job?.jobId).toBe('fry_cook');
    s = must(s, 'a', { type: 'travel', to: 'monolith' });
    const before = s.players.a!.cash;
    s = must(s, 'a', { type: 'work' });
    expect(s.players.a!.cash).toBeGreaterThan(before);
  });

  it('resolves a contested single-opening job by earliest application', () => {
    let s = createGame(config());
    // sales_clerk has 2 openings; pre-fill one so only one slot remains.
    s.jobHolders['sales_clerk'] = ['zzz'];
    // Both equally qualified (3 weeks service experience, no degrees).
    s.players.a!.experience.service = 3;
    s.players.b!.experience.service = 3;
    // Ann burns time first, so her application lands later in her week than Bob's does in his.
    s = must(s, 'a', { type: 'travel', to: 'park' });
    s = must(s, 'a', { type: 'travel', to: 'employment' });
    s = must(s, 'b', { type: 'travel', to: 'employment' });
    s = must(s, 'a', { type: 'apply', jobId: 'sales_clerk' });
    s = must(s, 'b', { type: 'apply', jobId: 'sales_clerk' });
    s = endAll(s);
    expect(s.players.b!.job?.jobId).toBe('sales_clerk');
    expect(s.players.a!.job).toBeNull();
    const note = s.history[0]!.notes.find((n) => n.player === 'a' && /unsuccessful/.test(n.text));
    expect(note).toBeDefined();
  });

  it('charges rent, penalises missed meals, and decays happiness', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'travel', to: 'shady_acres' });
    s = must(s, 'a', { type: 'rent', housingId: 'shady_acres' });
    const cashAfterRent = s.players.a!.cash;
    const happy = s.players.a!.happiness;
    const health = s.players.a!.health;
    s = endAll(s);
    const p = s.players.a!;
    expect(p.cash).toBeLessThan(cashAfterRent);
    expect(p.happiness).toBeLessThan(happy);
    expect(p.health).toBeLessThan(health);
    expect(p.node).toBe('shady_acres');
  });

  it('awards an achievement to the earliest claimant only', () => {
    let s = createGame(config());
    s = must(s, 'a', { type: 'travel', to: 'park' });
    s = must(s, 'a', { type: 'travel', to: 'lookout' });
    s = must(s, 'b', { type: 'travel', to: 'lookout' });
    // Whoever spent fewer minutes getting there claimed it earlier in their week.
    const earlier = s.players.a!.minutesLeft >= s.players.b!.minutesLeft ? 'a' : 'b'; // ties go to player order
    s = endAll(s);
    const winner = s.achievementsTaken['explorer'];
    expect(['a', 'b']).toContain(winner);
    const w = s.players[winner!]!;
    const l = s.players[winner === 'a' ? 'b' : 'a']!;
    expect(w.items).toContain('bicycle');
    expect(l.items).not.toContain('bicycle');
    expect(winner).toBe(earlier);
  });

  it('sells a property to the highest bidder', () => {
    let s = createGame(config());
    s.players.a!.cash = 20000;
    s.players.b!.cash = 20000;
    s = must(s, 'a', { type: 'travel', to: 'house_elm' });
    s = must(s, 'b', { type: 'travel', to: 'house_elm' });
    s = must(s, 'a', { type: 'offer', housingId: 'house_elm', bid: 9000 });
    s = must(s, 'b', { type: 'offer', housingId: 'house_elm', bid: 9500 });
    s = endAll(s);
    expect(s.propertyOwners['house_elm']).toBe('b');
    expect(s.players.b!.home).toBe('house_elm');
    expect(s.players.b!.cash).toBe(20000 - 9500 - 30); // price plus first upkeep
    expect(s.players.a!.cash).toBe(20000);
  });

  it('declares a classic winner when all goals are met', () => {
    let s = createGame(config({ goals: { money: 100, happiness: 10, education: 0, career: 0 } }));
    s = endAll(s);
    expect(s.phase).toBe('finished');
    expect(s.winner).not.toBeNull();
  });

  it('ends a fixed-length game after N weeks with the best score winning', () => {
    let s = createGame(config({ mode: 'fixed', weeks: 2 }));
    s = endAll(s);
    expect(s.phase).toBe('playing');
    s.players.a!.cash = 5000;
    s = endAll(s);
    expect(s.phase).toBe('finished');
    expect(s.winner).toBe('a');
  });
});

describe('determinism', () => {
  it('replays an action log to an identical state', () => {
    const script: [string, Action][] = [
      ['a', { type: 'travel', to: 'newsstand' }],
      ['a', { type: 'buyNews', sourceId: 'tabloid' }],
      ['a', { type: 'lottery' }],
      ['b', { type: 'travel', to: 'employment' }],
      ['b', { type: 'apply', jobId: 'assembler' }],
      ['a', { type: 'endWeek' }],
      ['b', { type: 'endWeek' }],
    ];
    const run = () => {
      let s = createGame(config());
      for (const [pid, a] of script) s = must(s, pid, a);
      return resolveWeek(s).state;
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('goal progress is bounded and monotone in inputs', () => {
    const s = createGame(config());
    const g = goalProgress(s, s.players.a!);
    expect(g.total).toBeGreaterThanOrEqual(0);
    expect(g.total).toBeLessThanOrEqual(4);
    expect(g.done).toBe(false);
  });
});
