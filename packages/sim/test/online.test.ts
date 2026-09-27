/**
 * Online weeks: each player plays the week alone from the snapshot; the
 * server checks each turn and merges them earliest-first (src/online.ts).
 */
import { describe, expect, it } from 'vitest';
import { checkTurn, cp, mergeWeek, resolveOnlineWeek, type Action, type GameState } from '../src';
import { playerStreamSeed } from '../src/classic/state';
import { game, teleport } from './classic-helpers';

const snapStream = () => game().rng;

const END: Action = { type: 'endWeek' };
const APPLY: Action = { type: 'apply', jobId: 'zmart_manager' };
/** Four applications, four rolls, for jobs these stats qualify for. */
const HUNT: Action[] = ['zmart_manager', 'monolith_manager', 'factory_secretary', 'qt_assistant_manager'].map((jobId) => ({ type: 'apply', jobId }) as Action);

/** Both players qualified for a job that rolls dice, standing at the employment office. */
function jobHunt(): GameState {
  let s = teleport(teleport(game(), 'a', 'employment'), 'b', 'employment');
  for (const id of ['a', 'b']) {
    const c = cp(s.players[id]!);
    c.degrees = ['junior_college'];
    // About 63% odds per application (content/classic/goals.ts applicationLuck): the dice matter.
    c.experience = 40;
    c.dependability = 40;
  }
  return s;
}

/** Both players at the pawn shop with cash, and an old fridge for sale. */
function pawnDay(): GameState {
  const s = teleport(teleport(game(), 'a', 'pawn'), 'b', 'pawn');
  for (const id of ['a', 'b']) {
    s.players[id]!.cash = 5000;
    cp(s.players[id]!).items = [];
  }
  s.classic!.pawnShop = [{ itemId: 'fridge', ownerId: 'nobody', basePrice: 400, pawnedWeek: s.week - 10, source: 'zmart' }];
  return s;
}

const texts = (s: GameState, id: string) => s.players[id]!.log.map((e) => e.text);

describe('checkTurn', () => {
  it('accepts a legal week that is ended', () => {
    const r = checkTurn(game(), 'a', [{ type: 'travel', to: 'monolith' }, END]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.events.map((e) => e.action.type)).toEqual(['travel', 'endWeek']);
  });

  it('names the first illegal action', () => {
    const r = checkTurn(game(), 'a', [{ type: 'travel', to: 'monolith' }, { type: 'work' }, END]);
    expect(r).toMatchObject({ ok: false, index: 1 });
  });

  it('refuses a week that was never ended', () => {
    expect(checkTurn(game(), 'a', [{ type: 'travel', to: 'monolith' }])).toMatchObject({ ok: false, index: 1, reason: 'The week has not been ended' });
  });

  it('refuses junk, strangers, finished games and the other ruleset', () => {
    expect(checkTurn(game(), 'a', [{ nope: 1 } as unknown as Action])).toMatchObject({ ok: false, index: 0, reason: 'Not an action' });
    expect(checkTurn(game(), 'z', [END])).toMatchObject({ ok: false, reason: 'Unknown player' });
    expect(checkTurn({ ...game(), phase: 'finished' }, 'a', [END])).toMatchObject({ ok: false, reason: 'The game is over' });
    const other = game();
    expect(checkTurn({ ...other, config: { ...other.config, ruleset: 'jones2' } }, 'a', [END])).toMatchObject({ ok: false });
  });

  it('refuses a turn too long to replay', () => {
    expect(checkTurn(game(), 'a', Array.from({ length: 5000 }, () => END))).toMatchObject({ ok: false, reason: 'Too many actions' });
  });
});

describe('mergeWeek', () => {
  it("gives each player the same dice alone and merged, even when a rival rolled first", () => {
    const snap = jobHunt();
    const detour: Action[] = [{ type: 'travel', to: 'monolith' }, { type: 'travel', to: 'employment' }];
    const aTurn = [...detour, ...HUNT, END]; // a rolls late in the week
    const alone = checkTurn(snap, 'a', aTurn);
    if (!alone.ok) throw new Error(alone.reason);
    for (const bTurn of [[END], [APPLY, END], [...HUNT, END]]) {
      const { state, notes } = mergeWeek(snap, { a: aTurn, b: bTurn });
      expect(notes).toEqual([]);
      expect(texts(state, 'a')).toEqual(alone.events.map((e) => e.text));
    }
  });

  it('draws different dice for each seat and each week', () => {
    const r = snapStream();
    expect(playerStreamSeed(r, 1, 0)).not.toBe(playerStreamSeed(r, 1, 1));
    expect(playerStreamSeed(r, 1, 0)).not.toBe(playerStreamSeed(r, 2, 0));
    expect(playerStreamSeed(r, 1, 0)).toBe(playerStreamSeed(r, 1, 0));
  });

  it('gives a contested pawn shop item to whoever got there first', () => {
    const snap = pawnDay();
    const buy: Action = { type: 'buyPawned', itemId: 'fridge' };
    const detour: Action[] = [{ type: 'travel', to: 'monolith' }, { type: 'travel', to: 'pawn' }];
    // Both buy it alone: each turn checks.
    expect(checkTurn(snap, 'a', [buy, END]).ok).toBe(true);
    expect(checkTurn(snap, 'b', [...detour, buy, END]).ok).toBe(true);

    const first = mergeWeek(snap, { a: [buy, END], b: [...detour, buy, END] });
    expect(cp(first.state.players.a!).items).toContain('fridge');
    expect(cp(first.state.players.b!).items).not.toContain('fridge');
    expect(first.notes).toHaveLength(1);
    expect(first.notes[0]).toMatchObject({ player: 'b' });
    expect(first.notes[0]!.text).toMatch(/fell through: Not for sale/);
    expect(first.state.players.b!.cash).toBe(5000); // never charged

    const second = mergeWeek(snap, { a: [...detour, buy, END], b: [buy, END] });
    expect(cp(second.state.players.b!).items).toContain('fridge');
    expect(second.notes[0]).toMatchObject({ player: 'a' });
  });

  it('breaks a same-minute tie by seat order', () => {
    const snap = pawnDay();
    const buy: Action = { type: 'buyPawned', itemId: 'fridge' };
    const { state, notes } = mergeWeek(snap, { a: [buy, END], b: [buy, END] });
    expect(cp(state.players.a!).items).toContain('fridge');
    expect(notes.map((n) => n.player)).toEqual(['b']);
  });

  it('leaves every player done, ready to resolve', () => {
    const { state } = mergeWeek(game(), { a: [END], b: [END] });
    expect(state.playerOrder.every((id) => state.players[id]!.weekDone)).toBe(true);
  });

  it('refuses to merge without everyone', () => {
    expect(() => mergeWeek(game(), { a: [END] })).toThrow(/No turn from b/);
  });
});

describe('resolveOnlineWeek', () => {
  it('opens the next week with the merge notes first in the report', () => {
    const snap = pawnDay();
    const buy: Action = { type: 'buyPawned', itemId: 'fridge' };
    const { state, report } = resolveOnlineWeek(snap, { a: [buy, END], b: [buy, END] });
    expect(state.week).toBe(snap.week + 1);
    expect(report.notes[0]!.player).toBe('b');
    expect(state.history.at(-1)!.notes[0]!.text).toMatch(/fell through/);
    expect(report.logs.a!.map((e) => e.action.type)).toEqual(['buyPawned', 'endWeek']);
  });

  it('is deterministic: the same turns give the same next week, byte for byte', () => {
    const snap = jobHunt();
    const turns = { a: [APPLY, END], b: [APPLY, END] };
    expect(JSON.stringify(resolveOnlineWeek(snap, turns).state)).toBe(JSON.stringify(resolveOnlineWeek(snap, turns).state));
  });

  it('does not touch the snapshot it was given', () => {
    const snap = jobHunt();
    const before = JSON.stringify(snap);
    resolveOnlineWeek(snap, { a: [APPLY, END], b: [END] });
    expect(JSON.stringify(snap)).toBe(before);
  });
});
