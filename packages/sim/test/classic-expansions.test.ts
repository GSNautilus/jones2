/**
 * Expansions (DESIGN decision log 2026-09-30): Wheels & Whiskers opens Honest Al's Autos and the
 * Pet Store on Riverton. Vehicles cut travel hours and occasionally need a repair bill; pets give
 * happiness on purchase and +1 a week while owned.
 */
import { describe, expect, it } from 'vitest';
import { EXPANSION_ITEMS, expansionsFor, rideHours } from '../src/content/classic';
import { applyAction, availableActions, bestPet, bestVehicle, cp, describeAction, getGraph, type GameState } from '../src';
import { endAll, game, must, teleport } from './classic-helpers';

const WW = { expansions: ['wheels_whiskers'] };

function at(s: GameState, node: string, cash = 20000): GameState {
  const next = teleport(s, 'a', node);
  next.players.a!.cash = cash;
  return next;
}

function buy(s: GameState, store: string, itemId: string): GameState {
  return must(at(s, store, Math.max(s.players.a!.cash, 20000)), 'a', { type: 'buyItem', itemId });
}

const shelf = (s: GameState) =>
  availableActions(s, 'a')
    .filter((o) => o.action.type === 'buyItem')
    .map((o) => (o.action as { itemId: string }).itemId);

describe('expansions: which buildings open', () => {
  it('keeps Honest Al\'s and the Pet Store shut without the expansion', () => {
    const s = at(game(), 'auto');
    expect(shelf(s)).toEqual([]);
    const r = applyAction(s, 'a', { type: 'buyItem', itemId: 'skateboard' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('Closed');
  });

  it('opens them with Wheels & Whiskers, shelves in price order', () => {
    expect(shelf(at(game(WW), 'auto'))).toEqual(['skateboard', 'bicycle', 'used_car', 'sports_car']);
    expect(shelf(at(game(WW), 'pet_store'))).toEqual(['goldfish', 'cat', 'dog', 'clownfish', 'owl', 'dragon']);
  });

  it('sells each good only at its own store', () => {
    const r = applyAction(at(game(WW), 'pet_store'), 'a', { type: 'buyItem', itemId: 'bicycle' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("Honest Al's Autos only");
  });

  it('is offered on Riverton only, and refused elsewhere', () => {
    expect(expansionsFor('riverton').map((x) => x.id)).toEqual(['wheels_whiskers']);
    expect(expansionsFor('classic')).toEqual([]);
    expect(() => game({ townId: 'classic', ...WW })).toThrow(/Jones 2 map/);
    expect(() => game({ expansions: ['nope'] })).toThrow(/Unknown expansion/);
  });
});

describe('expansions: vehicles', () => {
  it('turns walking hours into riding hours (whole hours, half up, at least 1)', () => {
    const bands = [60, 120, 180, 240];
    const table = (f: number) => bands.map((m) => rideHours(m, 2, f));
    expect(table(EXPANSION_ITEMS.skateboard!.travelFactor!)).toEqual([2, 3, 5, 6]);
    expect(table(EXPANSION_ITEMS.bicycle!.travelFactor!)).toEqual([1, 3, 4, 5]);
    expect(table(EXPANSION_ITEMS.used_car!.travelFactor!)).toEqual([1, 2, 3, 4]);
    expect(table(EXPANSION_ITEMS.sports_car!.travelFactor!)).toEqual([1, 2, 2, 3]);
  });

  it('charges the ride and records the vehicle on the trip', () => {
    let s = buy(game(WW), 'auto', 'used_car');
    const route = getGraph('riverton').bestRoute('auto', 'university', ['walk'])!;
    const opt = describeAction(s, 'a', { type: 'travel', to: 'university' });
    expect(opt.minutes).toBe(rideHours(route.minutes, 2, 0.5) * 60);
    const r = applyAction(s, 'a', { type: 'travel', to: 'university' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.vehicle).toBe('used_car');
    expect(r.event.text).toMatch(/^Drove to /);
    s = r.state;
    expect(s.players.a!.node).toBe('university');
  });

  it('rides the fastest vehicle owned', () => {
    let s = buy(game(WW), 'auto', 'sports_car');
    s = buy(s, 'auto', 'skateboard');
    expect(bestVehicle(s.players.a!)?.id).toBe('sports_car');
  });

  it('can be pawned; a repair is a bill with no happiness lost', () => {
    let s = buy(game(WW), 'auto', 'bicycle');
    s = at(s, 'pawn', s.players.a!.cash);
    const pawn = availableActions(s, 'a').filter((o) => o.action.type === 'pawnItem');
    expect(pawn.map((o) => (o.action as { itemId: string }).itemId)).toEqual(['bicycle']);

    // Find a seed where the sports car breaks down within a few weeks.
    for (let seed = 1; seed < 400; seed++) {
      let g = buy(game({ ...WW, seed }), 'auto', 'sports_car');
      const paid = cp(g.players.a!).itemPaid!.sports_car!;
      for (let w = 0; w < 6; w++) {
        g.players.a!.cash = 50000;
        g = endAll(g);
        const card = cp(g.players.a!).weekStart.find((c) => c.step === 'breakdown' && c.text.includes('Sports Car'));
        if (!card) continue;
        expect(card.deltas.some((d) => d.stat === 'happiness')).toBe(false);
        const bill = -card.deltas.find((d) => d.stat === 'cash')!.amount;
        expect(bill).toBeGreaterThanOrEqual(Math.round(paid * 0.05));
        expect(bill).toBeLessThanOrEqual(Math.round(paid * 0.25));
        expect(cp(g.players.a!).items).toContain('sports_car');
        return;
      }
    }
    throw new Error('no sports car breakdown found');
  });
});

describe('expansions: pets', () => {
  it('gives happiness on purchase', () => {
    const s = game(WW);
    const before = s.players.a!.happiness;
    const after = buy(s, 'pet_store', 'dragon');
    expect(after.players.a!.happiness - before).toBe(5);
  });

  it('gives +1 a week however many pets', () => {
    let s = buy(game(WW), 'pet_store', 'cat');
    s = buy(s, 'pet_store', 'dog');
    s = endAll(s);
    const cards = cp(s.players.a!).weekStart.filter((c) => c.deltas.some((d) => d.note === 'own_pet'));
    expect(cards).toHaveLength(1);
    expect(cards[0]!.deltas.find((d) => d.note === 'own_pet')!.amount).toBe(1);
  });

  it('shows the dearest pet, the latest bought on a tie', () => {
    let s = buy(game(WW), 'pet_store', 'clownfish');
    s = buy(s, 'pet_store', 'goldfish');
    expect(bestPet(s.players.a!)?.id).toBe('clownfish');
    s = buy(s, 'pet_store', 'owl');
    expect(bestPet(s.players.a!)?.id).toBe('owl');
    const t = buy(buy(game(WW), 'pet_store', 'owl'), 'pet_store', 'clownfish');
    expect(bestPet(t.players.a!)?.id).toBe('clownfish');
  });

  it('follows on every trip and is refused by the pawn shop', () => {
    let s = buy(game(WW), 'pet_store', 'dog');
    const r = applyAction(s, 'a', { type: 'travel', to: 'bank' });
    expect(r.ok && r.event.pet).toBe('dog');
    expect(r.ok && r.event.vehicle).toBeUndefined();
    s = at(s, 'pawn', 1000);
    expect(availableActions(s, 'a').some((o) => o.action.type === 'pawnItem')).toBe(false);
    const p = applyAction(s, 'a', { type: 'pawnItem', itemId: 'dog' });
    expect(p.ok).toBe(false);
  });
});
