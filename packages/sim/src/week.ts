import * as C from './content/config';
import { ACHIEVEMENT_MAP } from './content/achievements';
import { HOUSING } from './content/housing';
import { ITEMS } from './content/items';
import { JOBS } from './content/jobs';
import { LOCATIONS } from './content/locations';
import { addForecasts } from './actions';
import { emptyCounters } from './game';
import { goalProgress } from './goals';
import { applyDelta, comfortHappiness, getGraph, homeOf, jobOf, savingsRate, weekBudget } from './helpers';
import { chance, pick } from './rng';
import type { Delta, EconomyEffect, GameState, PlayerState, ResolutionNote, WeekReport } from './types';

function d(stat: Delta['stat'], amount: number, note?: string): Delta {
  return note ? { stat, amount, note } : { stat, amount };
}

export function allPlayersDone(state: GameState): boolean {
  return state.playerOrder.every((id) => state.players[id]!.weekDone);
}

/** Take money from cash, then savings, then the loan. Returns false if the loan limit blocks it. */
function charge(p: PlayerState, amount: number, note: string, deltas: Delta[]): boolean {
  let left = amount;
  const fromCash = Math.min(p.cash, left);
  if (fromCash > 0) {
    deltas.push(applyDelta(p, d('cash', -fromCash, note)));
    left -= fromCash;
  }
  const fromSavings = Math.min(p.savings, left);
  if (fromSavings > 0) {
    deltas.push(applyDelta(p, d('savings', -fromSavings, note)));
    left -= fromSavings;
  }
  if (left > 0.005) {
    if (p.loan + left > C.LOAN_LIMIT) return false;
    deltas.push(applyDelta(p, d('loan', left, `${note} (auto-loan)`)));
  }
  return true;
}

function resolveJobs(state: GameState, notes: ResolutionNote[]): void {
  const byJob = new Map<string, { p: PlayerState; minute: number }[]>();
  for (const id of state.playerOrder) {
    const p = state.players[id]!;
    for (const a of p.applications) {
      if (!byJob.has(a.jobId)) byJob.set(a.jobId, []);
      byJob.get(a.jobId)!.push({ p, minute: a.minute });
    }
    p.applications = [];
  }
  for (const [jobId, apps] of byJob) {
    const job = JOBS[jobId]!;
    const holders = state.jobHolders[jobId] ?? [];
    let slots = job.openings - holders.length;
    apps.sort((x, y) => {
      const qx = x.p.degrees.length + (x.p.experience[job.track] ?? 0) / 10;
      const qy = y.p.degrees.length + (y.p.experience[job.track] ?? 0) / 10;
      if (qy !== qx) return qy - qx;
      const ex = x.p.experience[job.track] ?? 0;
      const ey = y.p.experience[job.track] ?? 0;
      if (ey !== ex) return ey - ex;
      return x.minute - y.minute;
    });
    for (const { p } of apps) {
      if (slots <= 0) {
        notes.push({ player: p.id, text: `Your application for ${job.title} was unsuccessful: position filled.` });
        continue;
      }
      slots--;
      const old = jobOf(p);
      if (old) state.jobHolders[old.id] = (state.jobHolders[old.id] ?? []).filter((id) => id !== p.id);
      p.job = { jobId: job.id, weeksHeld: 0, shiftsThisWeek: 0, idleWeeks: 0 };
      state.jobHolders[job.id] = [...(state.jobHolders[job.id] ?? []), p.id];
      const deltas: Delta[] = [];
      if (old && job.rung > old.rung) deltas.push(applyDelta(p, d('happiness', C.PROMOTION_HAPPINESS, 'promotion')));
      notes.push({ player: p.id, text: `You got the job: ${job.title} at ${LOCATIONS[job.employer]!.name}.`, deltas });
    }
  }
}

function resolveProperty(state: GameState, notes: ResolutionNote[]): void {
  const byHouse = new Map<string, { p: PlayerState; bid: number; minute: number }[]>();
  for (const id of state.playerOrder) {
    const p = state.players[id]!;
    for (const o of p.offers) {
      if (!byHouse.has(o.housingId)) byHouse.set(o.housingId, []);
      byHouse.get(o.housingId)!.push({ p, bid: o.bid, minute: o.minute });
    }
    p.offers = [];
  }
  for (const [housingId, offers] of byHouse) {
    const h = HOUSING[housingId]!;
    if (state.propertyOwners[housingId]) continue;
    offers.sort((x, y) => y.bid - x.bid || x.minute - y.minute);
    for (const o of offers) {
      if (o.p.cash + o.p.savings < o.bid) {
        notes.push({ player: o.p.id, text: `Your offer on ${h.name} fell through: you could not cover it.` });
        continue;
      }
      const deltas: Delta[] = [];
      charge(o.p, o.bid, h.name, deltas);
      state.propertyOwners[housingId] = o.p.id;
      o.p.properties.push(housingId);
      o.p.home = housingId;
      deltas.push(applyDelta(o.p, d('happiness', 6, 'new home')));
      notes.push({ player: o.p.id, text: `You bought ${h.name} for $${o.bid}.`, deltas });
      for (const other of offers) if (other !== o) notes.push({ player: other.p.id, text: `You were outbid on ${h.name}.` });
      break;
    }
  }
}

function resolveAchievements(state: GameState, notes: ResolutionNote[]): void {
  const claims = new Map<string, { p: PlayerState; minute: number }[]>();
  for (const id of state.playerOrder) {
    const p = state.players[id]!;
    for (const c of p.claims) {
      if (!claims.has(c.id)) claims.set(c.id, []);
      claims.get(c.id)!.push({ p, minute: c.minute });
    }
    p.claims = [];
  }
  for (const [achId, cs] of claims) {
    if (state.achievementsTaken[achId]) continue;
    cs.sort((x, y) => x.minute - y.minute);
    const { p } = cs[0]!;
    const a = ACHIEVEMENT_MAP[achId]!;
    state.achievementsTaken[achId] = p.id;
    p.achievements.push(achId);
    const deltas: Delta[] = [];
    if (a.reward.cash) deltas.push(applyDelta(p, d('cash', a.reward.cash, a.name)));
    if (a.reward.happiness) deltas.push(applyDelta(p, d('happiness', a.reward.happiness, a.name)));
    if (a.reward.minutes) p.bonusMinutes += a.reward.minutes;
    if (a.reward.item && !p.items.includes(a.reward.item)) p.items.push(a.reward.item);
    notes.push({ player: p.id, text: `Achievement: ${a.name}! ${a.description}`, deltas });
    for (const other of cs.slice(1)) notes.push({ player: other.p.id, text: `${p.name} beat you to ${a.name}.` });
  }
}

function upkeep(state: GameState, p: PlayerState, notes: ResolutionNote[]): void {
  const deltas: Delta[] = [];
  const home = homeOf(p);
  const job = jobOf(p);

  // Housing costs
  if (home) {
    const cost = Math.round(home.weekly * (home.kind === 'rent' ? state.economy.rentIndex : 1));
    if (!charge(p, cost, home.kind === 'rent' ? 'rent' : 'upkeep', deltas)) {
      if (home.kind === 'rent') {
        p.home = null;
        deltas.push(applyDelta(p, d('happiness', -10, 'evicted')));
        notes.push({ player: p.id, text: `You could not pay rent and were evicted from ${home.name}.` });
      }
    }
  } else {
    deltas.push(applyDelta(p, d('happiness', C.NO_HOME_HAPPINESS, 'no home')));
  }

  // Car running costs
  if (p.items.includes('used_car')) charge(p, C.CAR_WEEKLY_COST, 'car costs', deltas);

  // Interest
  if (p.savings > 0) deltas.push(applyDelta(p, d('savings', Math.round(p.savings * savingsRate(state, p)), 'interest')));
  if (p.loan > 0) deltas.push(applyDelta(p, d('loan', Math.round(p.loan * state.economy.loanRate), 'loan interest')));

  // Clothing
  p.clothing.condition = Math.max(0, p.clothing.condition + C.CLOTHING_WEEKLY_WEAR);

  // Food
  const missed = Math.max(0, C.MEALS_REQUIRED - p.week.meals);
  if (missed > 0) {
    deltas.push(applyDelta(p, d('health', C.MISSED_MEAL_HEALTH * missed, `${missed} missed meals`)));
    deltas.push(applyDelta(p, d('happiness', C.MISSED_MEAL_HAPPINESS * missed, 'hungry')));
  }
  deltas.push(applyDelta(p, d('health', C.HEALTH_WEEKLY_DRIFT, 'weekly drift')));

  // Happiness drift
  deltas.push(applyDelta(p, d('happiness', C.HAPPINESS_WEEKLY_DECAY, 'weekly decay')));
  const comfort = comfortHappiness(p);
  if (comfort) deltas.push(applyDelta(p, d('happiness', comfort, 'comfort')));
  deltas.push(applyDelta(p, d('happiness', C.FULFILMENT_BY_RUNG[job?.rung ?? 0]!, 'fulfilment')));
  const over = Math.max(0, p.week.workedMinutes - C.OVERWORK_MINUTES) / 60;
  if (over > 0) deltas.push(applyDelta(p, d('happiness', C.OVERWORK_HAPPINESS_PER_HOUR * over, 'overwork')));
  if (p.loan > 0) deltas.push(applyDelta(p, d('happiness', (C.DEBT_STRESS_PER_1000 * p.loan) / 1000, 'debt')));
  if (p.health < 40) deltas.push(applyDelta(p, d('happiness', C.LOW_HEALTH_STRESS, 'poor health')));

  // Sickness
  p.sick = p.health < C.SICK_THRESHOLD;
  if (p.sick) notes.push({ player: p.id, text: 'You are sick. Next week will be short.' });

  // Job tenure and experience
  if (p.job && job) {
    p.job.weeksHeld++;
    if (p.job.shiftsThisWeek > 0) {
      p.experience[job.track] = (p.experience[job.track] ?? 0) + 1;
      p.job.idleWeeks = 0;
    } else {
      p.job.idleWeeks++;
      if (p.job.idleWeeks >= 2) {
        state.jobHolders[job.id] = (state.jobHolders[job.id] ?? []).filter((id) => id !== p.id);
        p.job = null;
        deltas.push(applyDelta(p, d('happiness', C.LAYOFF_HAPPINESS, 'fired')));
        notes.push({ player: p.id, text: `You were fired from ${job.title} for not showing up.` });
      } else {
        notes.push({ player: p.id, text: `You skipped work this week. One more and you're fired.` });
      }
    }
  }

  // Theft
  const safety = home?.safety ?? 0;
  if (safety < 1 && p.items.length > 0) {
    let robbed: boolean;
    [state.rng, robbed] = chance(state.rng, state.economy.crimeRate * (1 - safety));
    if (robbed) {
      let itemId: string;
      [state.rng, itemId] = pick(state.rng, p.items);
      const item = ITEMS[itemId]!;
      p.items = p.items.filter((i) => i !== itemId);
      if (p.insuranceWeeks > 0) {
        deltas.push(applyDelta(p, d('cash', item.price, 'insurance payout')));
        notes.push({ player: p.id, text: `Your ${item.name} was stolen. Insurance paid out $${item.price}.` });
      } else {
        deltas.push(applyDelta(p, d('happiness', -6, 'robbed')));
        notes.push({ player: p.id, text: `Your ${item.name} was stolen!` });
      }
    }
  }

  if (p.busPassWeeks > 0) p.busPassWeeks--;
  if (p.insuranceWeeks > 0) p.insuranceWeeks--;

  notes.push({ player: p.id, text: 'Weekly upkeep.', deltas });
}

function recomputeEconomy(state: GameState): void {
  const e = { ...C.ECONOMY_DEFAULTS };
  for (const m of state.modifiers) {
    const f = m.effect;
    if (f.kind === 'wage') e.wageIndex += f.delta;
    if (f.kind === 'price') e.priceIndex += f.delta;
    if (f.kind === 'rent') e.rentIndex += f.delta;
    if (f.kind === 'crime') e.crimeRate += f.delta;
  }
  state.economy = e;
}

function applyEffect(state: GameState, effect: EconomyEffect, nextWeek: number, notes: ResolutionNote[]): void {
  switch (effect.kind) {
    case 'wage':
    case 'price':
    case 'rent':
    case 'crime':
      state.modifiers.push({ effect, untilWeek: nextWeek + effect.weeks - 1 });
      break;
    case 'sale':
      state.sales[effect.location] = 1 - effect.discount;
      break;
    case 'layoffs':
      for (const id of state.playerOrder) {
        const p = state.players[id]!;
        const job = jobOf(p);
        if (!job || job.track !== effect.track) continue;
        let safe: boolean;
        [state.rng, safe] = chance(state.rng, job.stability);
        if (safe) continue;
        state.jobHolders[job.id] = (state.jobHolders[job.id] ?? []).filter((x) => x !== p.id);
        p.job = null;
        notes.push({ player: p.id, text: `Layoffs! You lost your job as ${job.title}.`, deltas: [applyDelta(p, d('happiness', C.LAYOFF_HAPPINESS, 'laid off'))] });
      }
      break;
  }
}

function resolveEconomy(state: GameState, nextWeek: number, notes: ResolutionNote[]) {
  state.sales = {};
  state.modifiers = state.modifiers.filter((m) => m.untilWeek >= nextWeek);
  const firing = state.schedule.filter((e) => e.week === nextWeek);
  state.schedule = state.schedule.filter((e) => e.week !== nextWeek);
  for (const ev of firing) {
    notes.push({ player: null, text: `News: ${ev.headline}` });
    applyEffect(state, ev.effect, nextWeek, notes);
  }
  recomputeEconomy(state);
  return firing;
}

function startNextWeek(state: GameState, p: PlayerState): void {
  const graph = getGraph(state.config.townId);
  const home = homeOf(p);
  p.node = home ? home.startNode : graph.town.startNode;
  p.minutesBudget = weekBudget(p);
  p.minutesLeft = p.minutesBudget;
  p.bonusMinutes = 0;
  p.week = emptyCounters();
  p.weekDone = false;
  p.log = [];
  if (p.job) p.job.shiftsThisWeek = 0;
  p.journal = p.journal.filter((f) => f.expiresWeek >= state.week);
  if (p.items.includes('tv')) addForecasts(state, p, 'tv');
}

function checkWinner(state: GameState, notes: ResolutionNote[]): string | null {
  const done = state.playerOrder.filter((id) => goalProgress(state, state.players[id]!).done);
  const finalWeek = state.config.mode === 'fixed' && state.config.weeks !== undefined && state.week >= state.config.weeks;
  if (state.config.mode === 'classic' && done.length === 0 && !finalWeek) return null;
  if (state.config.mode === 'fixed' && !finalWeek) return null;
  const pool = state.config.mode === 'classic' && done.length ? done : state.playerOrder;
  const ranked = [...pool].sort((a, b) => goalProgress(state, state.players[b]!).score - goalProgress(state, state.players[a]!).score);
  const w = ranked[0]!;
  notes.push({ player: null, text: `${state.players[w]!.name} wins!` });
  return w;
}

/**
 * Resolve the week once every player has ended it. Follows DESIGN.md 6.13.
 * Returns a new state; the input is not mutated.
 */
export function resolveWeek(input: GameState, force = false): { state: GameState; report: WeekReport } {
  if (input.phase !== 'playing') throw new Error('Game is over');
  if (!force && !allPlayersDone(input)) throw new Error('Not all players have ended the week');
  // History is append-only and can get large; share the old reports by reference.
  const { history, ...rest } = input;
  const state: GameState = { ...structuredClone(rest), history: [...history] };
  const notes: ResolutionNote[] = [];
  const logs: Record<string, typeof state.players[string]['log']> = {};
  for (const id of state.playerOrder) logs[id] = state.players[id]!.log;

  resolveJobs(state, notes);
  resolveProperty(state, notes);
  resolveAchievements(state, notes);
  for (const id of state.playerOrder) upkeep(state, state.players[id]!, notes);
  const nextWeek = state.week + 1;
  const firedEvents = resolveEconomy(state, nextWeek, notes);
  const winner = checkWinner(state, notes);

  const report: WeekReport = { week: state.week, notes, firedEvents, logs, winner };
  state.history.push(report);

  if (winner) {
    state.winner = winner;
    state.phase = 'finished';
  } else {
    state.week = nextWeek;
    for (const id of state.playerOrder) startNextWeek(state, state.players[id]!);
  }
  return { state, report };
}
