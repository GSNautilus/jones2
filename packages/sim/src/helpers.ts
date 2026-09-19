import { TOWNS, TownGraph, type LocationId, type TransportMode } from '@jones2/town';
import * as C from './content/config';
import { HOUSING, type Housing, type Amenity } from './content/housing';
import { JOBS, type Job } from './content/jobs';
import { ITEMS, type Item } from './content/items';
import { DEGREES } from './content/degrees';
import { LOCATIONS, type Location } from './content/locations';
import type { Delta, GameState, PlayerState, TrackId } from './types';

const graphs = new Map<string, TownGraph>();

export function getGraph(townId: string): TownGraph {
  let g = graphs.get(townId);
  if (!g) {
    const t = TOWNS[townId];
    if (!t) throw new Error(`Unknown town ${townId}`);
    g = new TownGraph(t);
    graphs.set(townId, g);
  }
  return g;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function locationOf(state: GameState, p: PlayerState): Location | null {
  const node = getGraph(state.config.townId).node(p.node);
  return node.location ? LOCATIONS[node.location] ?? null : null;
}

export function homeOf(p: PlayerState): Housing | null {
  return p.home ? HOUSING[p.home] ?? null : null;
}

export function hasAmenity(p: PlayerState, a: Amenity): boolean {
  return homeOf(p)?.amenities.includes(a) ?? false;
}

export function jobOf(p: PlayerState): Job | null {
  return p.job ? JOBS[p.job.jobId] ?? null : null;
}

export function trackOf(p: PlayerState): TrackId | null {
  return jobOf(p)?.track ?? null;
}

export function transportModes(p: PlayerState): TransportMode[] {
  const modes: TransportMode[] = ['walk'];
  if (p.items.includes('bicycle')) modes.push('bike');
  if (p.busPassWeeks > 0) modes.push('bus');
  if (p.items.includes('used_car')) modes.push('car');
  return modes;
}

export function effectiveClothingTier(p: PlayerState): number {
  return p.clothing.condition < C.CLOTHING_SHABBY ? Math.max(0, p.clothing.tier - 1) : p.clothing.tier;
}

export function groceryCapacity(p: PlayerState): number {
  return p.items.includes('fridge') ? C.GROCERY_CAPACITY_FRIDGE : C.GROCERY_CAPACITY;
}

export function netWorth(p: PlayerState): number {
  return p.cash + p.savings - p.loan;
}

/** Store price after economy index, sales, and track perks. */
export function itemPrice(state: GameState, p: PlayerState, item: Item): number {
  let m = state.economy.priceIndex * (state.sales[item.store] ?? 1);
  const t = trackOf(p);
  if (t === 'trades' && item.category === 'appliance') m *= 0.85;
  if (t === 'tech' && item.category === 'electronics') m *= 0.85;
  return Math.round(item.price * m);
}

export function storePrice(state: GameState, base: number, location: LocationId): number {
  return Math.round(base * state.economy.priceIndex * (state.sales[location] ?? 1));
}

export function foodPrice(state: GameState, p: PlayerState, base: number, location: LocationId): number {
  let m = state.economy.priceIndex;
  const j = jobOf(p);
  if (j && j.track === 'service' && j.employer === location) m *= 0.5;
  return Math.round(base * m);
}

export function tuitionFor(p: PlayerState, base: number): number {
  return Math.round(trackOf(p) === 'academia' ? base * 0.75 : base);
}

export function savingsRate(state: GameState, p: PlayerState): number {
  return state.economy.savingsRate + (trackOf(p) === 'finance' ? 0.005 : 0);
}

export function degreeComplete(p: PlayerState, degreeId: string): boolean {
  return p.degrees.includes(degreeId);
}

export function canStudy(p: PlayerState, degreeId: string): string | null {
  const d = DEGREES[degreeId];
  if (!d) return 'No such degree';
  if (degreeComplete(p, degreeId)) return 'Already completed';
  for (const pre of d.prereqs) if (!degreeComplete(p, pre)) return `Requires ${DEGREES[pre]!.name}`;
  return null;
}

export function jobEligibility(state: GameState, p: PlayerState, job: Job): string | null {
  for (const d of job.degrees) if (!degreeComplete(p, d)) return `Requires ${DEGREES[d]!.name}`;
  if ((p.experience[job.track] ?? 0) < job.experience) return `Requires ${job.experience} weeks in ${job.track}`;
  if (effectiveClothingTier(p) < job.clothing) return `Requires clothing tier ${job.clothing}`;
  if (p.job?.jobId === job.id) return 'You already hold this job';
  if (p.applications.some((a) => a.jobId === job.id)) return 'Already applied this week';
  const holders = state.jobHolders[job.id] ?? [];
  if (holders.length >= job.openings) return 'No openings';
  return null;
}

/** Apply a stat change with clamping. Returns the delta actually applied. */
export function applyDelta(p: PlayerState, d: Delta): Delta {
  switch (d.stat) {
    case 'cash':
      p.cash = round2(p.cash + d.amount);
      break;
    case 'savings':
      p.savings = round2(p.savings + d.amount);
      break;
    case 'loan':
      p.loan = round2(p.loan + d.amount);
      break;
    case 'happiness': {
      const before = p.happiness;
      p.happiness = clamp(round2(p.happiness + d.amount), 0, 100);
      return { ...d, amount: round2(p.happiness - before) };
    }
    case 'health': {
      const before = p.health;
      p.health = clamp(round2(p.health + d.amount), 0, 100);
      return { ...d, amount: round2(p.health - before) };
    }
    default:
      break;
  }
  return d;
}

/** Weekly minute budget from health, sickness, and bonuses. */
export function weekBudget(p: PlayerState): number {
  let m = C.WEEK_MINUTES * (C.HEALTH_BUDGET_FLOOR + (1 - C.HEALTH_BUDGET_FLOOR) * (p.health / 100));
  if (p.sick) m -= C.SICK_PENALTY_MINUTES;
  m += p.bonusMinutes;
  return Math.max(60, Math.round(m));
}

/** Diminishing multiplier for the nth (0-based) repeat of something this week. */
export function diminish(n: number): number {
  return Math.pow(C.DIMINISH, n);
}

export function comfortPoints(p: PlayerState): number {
  let c = homeOf(p)?.comfort ?? 0;
  for (const id of p.items) c += ITEMS[id]?.comfort ?? 0;
  return c;
}

export function comfortHappiness(p: PlayerState): number {
  const c = comfortPoints(p);
  return round2((C.COMFORT_MAX * c) / (c + C.COMFORT_HALF));
}
