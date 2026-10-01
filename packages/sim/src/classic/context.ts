/**
 * Shared context for the classic action specs: where the player is standing, what things cost
 * this week, and the small lookups every spec module needs. Splitting the specs across
 * actions-job / actions-shop / actions-money keeps each file short.
 */
import type { NodeId } from '@jones2/town';
import {
  CLASSIC_DEGREE_LIST,
  CLASSIC_JOBS,
  DEPENDABILITY_TEN_IS_ZERO,
  isOpenLocation,
  locationInfo,
  type ClassicDegree,
  type OpenLocationId,
} from '../content/classic';
import { getGraph } from '../helpers';
import type { Delta, GameState, PlayerState } from '../types';
import { cg, cp, type ClassicPlayerState, type ItemSource } from './state';

export const MINUTES = 60;

export interface Spec {
  label: string;
  /** Heading the option is listed under (see `ActionOption.group`). */
  group?: string;
  /** True when the option should be left off the menu (see `ActionOption.hidden`). */
  hidden?: () => boolean;
  /** Hours charged to the 60-hour week. */
  hours: number;
  cost: number;
  /** Needs 1 hour to start and charges whatever is left, up to `hours`. */
  partial?: boolean;
  /** Minutes recorded on the event (the route's real minutes for travel). */
  duration?: number;
  check: () => string | null;
  run: () => { text: string; deltas: Delta[]; path?: NodeId[]; vehicle?: string; pet?: string };
}

/**
 * The open building the player is standing at, or null (a junction, or a closed building). The
 * 13 classic buildings are always open; an expansion's only in a game that has it.
 */
export function locationAt(state: GameState, p: PlayerState): OpenLocationId | null {
  const id = getGraph(state.config.townId).node(p.node).location;
  return isOpenLocation(id, state.config.expansions) ? id : null;
}

/** Standing at one of the buildings this game keeps shut. */
export function isClosed(state: GameState, p: PlayerState): boolean {
  const node = getGraph(state.config.townId).node(p.node);
  return !!node.location && !isOpenLocation(node.location, state.config.expansions);
}

/** Shop, rent and tuition prices all track the economy index. */
export function priceOf(state: GameState, base: number): number {
  return Math.max(1, Math.round(base * cg(state).index));
}

/** The wage the Employment Office advertises for a job this week. */
export function listedWage(state: GameState, jobId: string): number {
  const job = CLASSIC_JOBS[jobId];
  return job ? Math.max(1, Math.round(job.wage * cg(state).index)) : 0;
}

/** A job's effective dependability requirement (a listed 10 means 0 to hire). */
export function requiredDep(jobDependability: number): number {
  return jobDependability === DEPENDABILITY_TEN_IS_ZERO ? 0 : jobDependability;
}

/** The end of the month following `week` (rent and loans fall due on weeks 4, 8, 12...). */
export function monthAfter(week: number): number {
  return week + 4 - (week % 4);
}

/** The end of the month `week` falls in (the week itself when it is a month end). */
export function monthEnd(week: number): number {
  return week % 4 === 0 ? week : monthAfter(week);
}

/**
 * The Rent Office trades on the last week of the month and, for one player, while their rent
 * extension runs. (Working there opens the door every week but not the counter.)
 */
export function rentOfficeOpen(state: GameState, p: PlayerState): boolean {
  return state.week % 4 === 0 || cp(p).extensionUntil >= state.week;
}

/** The happiness table prices the same item differently by store; most specific id first. */
export function happinessIdForItem(itemId: string, store: ItemSource): string[] {
  const suffix = store === 'socket_city' ? 'socket' : 'zmart';
  return [`buy_${itemId}_${suffix}`, `buy_${itemId}`];
}

export const DEGREE_BY_ID: Record<string, ClassicDegree | undefined> = Object.fromEntries(
  CLASSIC_DEGREE_LIST.map((x) => [x.id, x]),
);

export const FRESH_WEEKS: Record<string, number> = { fresh_food_1_week: 1, fresh_food_2_weeks: 2, fresh_food_4_weeks: 4 };

/** Everything a spec needs about the here and now. */
export interface Ctx {
  state: GameState;
  p: PlayerState;
  c: ClassicPlayerState;
  loc: OpenLocationId | null;
  graph: ReturnType<typeof getGraph>;
  /** null if the player is standing at `id`, else the reason they are not. */
  at: (id: OpenLocationId) => string | null;
}

export function context(state: GameState, p: PlayerState): Ctx {
  const loc = locationAt(state, p);
  return {
    state,
    p,
    c: cp(p),
    loc,
    graph: getGraph(state.config.townId),
    at: (id) => (loc === id ? null : isClosed(state, p) ? 'Closed' : `${locationInfo(id)?.name ?? id} only`),
  };
}
