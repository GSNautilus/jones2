/**
 * The start-of-week sequence. With simultaneous weeks (PLAN §3) it runs at the start of each
 * player's own week, so every player gets the same cards at the same moment.
 *
 * Order (PLAN §3, minus the parts decision 6 dropped):
 *   weekend event -> lottery draw -> starvation (no doctor roll) -> dependability/relaxation tick ->
 *   (no Wild Willy) -> appliance breakdowns -> food spoilage -> household perks ->
 *   rent notice on weeks 4, 8, 12... -> loan notice -> consumables tick -> free newspaper.
 * The win check happens after this, in week.ts.
 *
 * Each step is pushed onto `p.classic.weekStart` as a card the interface can show.
 */
import {
  APPLIANCE_BREAKAGE_MIN_CASH,
  APPLIANCE_BREAK_HAPPINESS,
  CLASSIC_ITEMS,
  DEPENDABILITY_WEEKLY_DECAY,
  DURABLE_WEEKENDS,
  DURABLE_WEEKEND_TRIGGER_CHANCE,
  HOURS_PER_TURN,
  LOTTERY,
  RANDOM_WEEKENDS,
  RELAXATION,
  REPAIR_COST_FRACTION,
  SPOIL_NO_FRIDGE_HAPPINESS,
  SPOIL_OVER_CAPACITY_HAPPINESS,
  STARVATION_HAPPINESS,
  STARVATION_HOUR_PENALTY,
  TICKET_WEEKENDS,
  WEEKEND_CHEAP_MAX_BEFORE_WEEK_8,
  WEEKEND_EXPENSIVE_UNLOCK_WEEK,
  WEEKEND_PRICE_RANGES,
  WEEKLY_CLOTHING_DECAY,
  type WeekendPriceBand,
} from '../content/classic';
import { applyDelta } from '../helpers';
import { chance, nextInt, pick } from '../rng';
import type { Delta, GameState, PlayerState } from '../types';
import { d, happy, spend } from './effects';
import { cg, cp, emptyWeekFlags, freshCapacity, itemBasePrice, itemBreakChance, type WeekStartEvent } from './state';

const MINUTES = 60;

function card(p: PlayerState, step: string, text: string, deltas: Delta[] = []): void {
  const ev: WeekStartEvent = { step, text, deltas };
  cp(p).weekStart.push(ev);
}

// ---------------------------------------------------------------------------
// Weekend
// ---------------------------------------------------------------------------

function bandFor(band: WeekendPriceBand, week: number): WeekendPriceBand {
  return band === 'expensive' && week < WEEKEND_EXPENSIVE_UNLOCK_WEEK ? 'medium' : band;
}

function weekendCost(state: GameState, band: WeekendPriceBand, week: number): number {
  const range = WEEKEND_PRICE_RANGES[bandFor(band, week)];
  let cost: number;
  [state.rng, cost] = nextInt(state.rng, range.min, range.max);
  if (week < WEEKEND_EXPENSIVE_UNLOCK_WEEK) cost = Math.min(cost, WEEKEND_CHEAP_MAX_BEFORE_WEEK_8);
  return cost;
}

function weekend(state: GameState, p: PlayerState): void {
  const c = cp(p);
  const deltas: Delta[] = [];

  // Tickets first, in the documented priority order; using one consumes it.
  const ticket = TICKET_WEEKENDS.find((t) => c.items.includes(t.ticket));
  if (ticket) {
    c.items = c.items.filter((i) => i !== ticket.ticket);
    spend(p, weekendCost(state, ticket.band, state.week), 'weekend', deltas);
    card(p, 'weekend', ticket.text, deltas);
    return;
  }

  // Each owned durable has a chance to supply the weekend.
  for (const dw of DURABLE_WEEKENDS) {
    if (!c.items.includes(dw.itemId)) continue;
    let hit: boolean;
    [state.rng, hit] = chance(state.rng, DURABLE_WEEKEND_TRIGGER_CHANCE);
    if (!hit) continue;
    spend(p, weekendCost(state, dw.band, state.week), 'weekend', deltas);
    card(p, 'weekend', dw.text, deltas);
    return;
  }

  let w: (typeof RANDOM_WEEKENDS)[number];
  [state.rng, w] = pick(state.rng, RANDOM_WEEKENDS);
  spend(p, weekendCost(state, w.band, state.week), 'weekend', deltas);
  if (w.happinessBonus) {
    let bonus: number;
    [state.rng, bonus] = nextInt(state.rng, w.happinessBonus[0], w.happinessBonus[1]);
    happy(p, 'weekend_senior_bus', deltas, bonus);
  }
  card(p, 'weekend', w.text, deltas);
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function lottery(state: GameState, p: PlayerState): void {
  const c = cp(p);
  if (c.lotteryTickets <= 0) return;
  const tickets = c.lotteryTickets;
  c.lotteryTickets = 0;
  let roll: number;
  [state.rng, roll] = nextInt(state.rng, 0, LOTTERY.rollMax);
  if (roll >= tickets) {
    card(p, 'lottery', `Your ${tickets} lottery tickets were losers.`);
    return;
  }
  const deltas: Delta[] = [];
  let prize: number;
  let happinessId: string;
  if (roll <= tickets / LOTTERY.jackpotDivisor) {
    prize = LOTTERY.prizes.jackpot;
    happinessId = 'lottery_jackpot';
  } else if (roll <= tickets / LOTTERY.mediumDivisor) {
    prize = LOTTERY.prizes.medium;
    happinessId = 'lottery_small_or_medium';
  } else {
    prize = LOTTERY.prizes.small;
    happinessId = 'lottery_small_or_medium';
  }
  deltas.push(applyDelta(p, d('cash', prize, 'lottery win')));
  happy(p, happinessId, deltas);
  card(p, 'lottery', `You won $${prize} in the lottery!`, deltas);
}

/** No food bought last week and no fresh food: -20 hours, -2 happiness. No doctor (decision 6). */
function starvation(p: PlayerState): void {
  const c = cp(p);
  const starving = !c.ateFastFood && c.freshFood <= 0;
  c.ateFastFood = false;
  if (!starving) return;
  const deltas: Delta[] = [];
  p.minutesLeft = Math.max(0, p.minutesLeft - STARVATION_HOUR_PENALTY * MINUTES);
  happy(p, 'starvation', deltas, STARVATION_HAPPINESS);
  card(p, 'starvation', `You went hungry last week. You lose ${STARVATION_HOUR_PENALTY} hours.`, deltas);
}

/** Dependability slips every week; relaxation too, unless there is a hot tub. */
function statsTick(p: PlayerState): void {
  const c = cp(p);
  const deltas: Delta[] = [];
  if (c.dependability > 0) {
    const before = c.dependability;
    c.dependability = Math.max(0, c.dependability - DEPENDABILITY_WEEKLY_DECAY);
    deltas.push(d('dependability', c.dependability - before, 'weekly'));
  }
  if (!c.items.includes('hot_tub')) {
    const before = c.relaxation;
    c.relaxation = Math.max(RELAXATION.min, c.relaxation - RELAXATION.weeklyDecay);
    if (c.relaxation !== before) deltas.push(d('relaxation', c.relaxation - before, 'weekly'));
  }
  if (deltas.length) card(p, 'stats', 'Another week goes by.', deltas);
}

function breakdowns(state: GameState, p: PlayerState): void {
  const c = cp(p);
  if (p.cash <= APPLIANCE_BREAKAGE_MIN_CASH) return;
  for (const id of [...c.items]) {
    const item = CLASSIC_ITEMS[id];
    if (!item || item.category !== 'appliance') continue;
    let broke: boolean;
    [state.rng, broke] = chance(state.rng, itemBreakChance(p, id));
    if (!broke) continue;
    const base = itemBasePrice(id, c.itemSource[id] ?? 'zmart');
    let pct: number;
    [state.rng, pct] = nextInt(state.rng, Math.round(REPAIR_COST_FRACTION.min * 100), Math.round(REPAIR_COST_FRACTION.max * 100));
    const deltas: Delta[] = [];
    spend(p, (base * pct) / 100, 'repairs', deltas);
    happy(p, 'appliance_broken', deltas, APPLIANCE_BREAK_HAPPINESS);
    card(p, 'breakdown', `Your ${item.name} broke down and needed repairs.`, deltas);
  }
}

function spoilage(p: PlayerState): void {
  const c = cp(p);
  if (c.freshFood <= 0) return;
  const cap = freshCapacity(p);
  if (cap === 0) {
    const lost = c.freshFood;
    c.freshFood = 0;
    const deltas: Delta[] = [];
    happy(p, 'all_food_spoiled', deltas, SPOIL_NO_FRIDGE_HAPPINESS);
    card(p, 'spoilage', `All ${lost} weeks of fresh food spoiled: you have no refrigerator.`, deltas);
    return;
  }
  if (c.freshFood > cap) {
    const lost = c.freshFood - cap;
    c.freshFood = cap;
    const deltas: Delta[] = [];
    happy(p, 'some_food_spoiled', deltas, SPOIL_OVER_CAPACITY_HAPPINESS);
    card(p, 'spoilage', `${lost} weeks of fresh food spoiled: no room to keep it cold.`, deltas);
  }
}

/** Stove or microwave comfort, and the computer's occasional payday. */
function household(state: GameState, p: PlayerState): void {
  const c = cp(p);
  const deltas: Delta[] = [];
  if (c.items.includes('stove') || c.items.includes('microwave')) {
    happy(p, 'own_microwave_or_stove', deltas);
  }
  if (c.items.includes('computer')) {
    let paid: boolean;
    [state.rng, paid] = chance(state.rng, 1 / 7);
    if (paid) {
      let amount: number;
      [state.rng, amount] = nextInt(state.rng, 20, 100);
      deltas.push(applyDelta(p, d('cash', amount, 'computer work')));
      happy(p, 'computer_income', deltas);
    }
  }
  if (deltas.length) card(p, 'household', 'Life at home.', deltas);
}

function rentNotice(p: PlayerState, week: number): void {
  const c = cp(p);
  if (c.rentDebt > 0) {
    card(p, 'rent', `You owe $${Math.round(c.rentDebt)} in back rent. Half of every pay packet is garnished.`);
    return;
  }
  if (week < c.rentDueWeek) return;
  card(p, 'rent', `Rent of $${Math.round(c.rent)} is due at the Rent Office this week.`);
}

function loanNotice(p: PlayerState, week: number): void {
  const c = cp(p);
  if (p.loan <= 0) return;
  if (c.loanDueWeek > week) return;
  const deltas: Delta[] = [];
  if (c.inDefault) happy(p, 'loan_defaulted', deltas);
  card(
    p,
    'loan',
    c.inDefault
      ? `You are delinquent on your $${Math.round(p.loan)} loan. Make a payment this week.`
      : `Your loan payment on $${Math.round(p.loan)} is payable this week.`,
    deltas,
  );
}

/** Clothes wear out, a week of fresh food is eaten, unused tickets are dropped. */
function consumables(p: PlayerState): void {
  const c = cp(p);
  const notes: string[] = [];
  for (const tier of ['casual', 'dress', 'business'] as const) {
    if (c.clothes[tier] > 0) {
      c.clothes[tier] = Math.max(0, c.clothes[tier] - WEEKLY_CLOTHING_DECAY);
      if (c.clothes[tier] === 0) notes.push(`your ${tier} clothes wore out`);
    }
  }
  if (c.freshFood > 0) c.freshFood -= 1;
  if (notes.length) card(p, 'consumables', `This week ${notes.join(' and ')}.`);
}

function newspaper(state: GameState, p: PlayerState): void {
  const c = cg(state);
  if (c.event === 'none') return;
  cp(p).week.readNewspaper = true;
  card(p, 'news', `DAILY NEWS: ${c.headline}`);
}

// ---------------------------------------------------------------------------

/**
 * Reset the week and run the start-of-week sequence for one player. On week 1 (`first`) only the
 * weekend happens: nothing has been consumed yet, so the ticks, notices and checks would all be
 * spurious and would dock a brand-new player 3 dependability before they have played a turn.
 */
export function startWeek(state: GameState, p: PlayerState, first = false): void {
  const c = cp(p);
  p.node = c.housing;
  p.minutesBudget = HOURS_PER_TURN * MINUTES;
  p.minutesLeft = p.minutesBudget;
  p.weekDone = false;
  p.log = [];
  p.applications = [];
  c.week = emptyWeekFlags();
  c.weekStart = [];

  weekend(state, p);
  if (first) return;
  lottery(state, p);
  starvation(p);
  statsTick(p);
  // Wild Willy: not implemented (PLAN §3 decision 6).
  breakdowns(state, p);
  spoilage(p);
  household(state, p);
  rentNotice(p, state.week);
  loanNotice(p, state.week);
  consumables(p);
  newspaper(state, p);
}
