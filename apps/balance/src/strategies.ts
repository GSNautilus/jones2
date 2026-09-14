/**
 * Scripted strategies for the balance runner. Each is a function from
 * (state, playerId, rng) to the next action. They are deliberately simple:
 * the point is to find degenerate strategies, not to play well.
 */
import {
  availableActions,
  describeAction,
  getGraph,
  jobEligibility,
  jobOf,
  JOB_LIST,
  DEGREES,
  MEALS_REQUIRED,
  MAX_SHIFTS_PER_WEEK,
  type Action,
  type GameState,
  type PlayerState,
} from '@jones2/sim';

export type Strategy = (state: GameState, pid: string, rng: () => number) => Action;

/** Would `action` be enabled if the player were standing at `node`? */
function enabledAt(state: GameState, pid: string, node: string, action: Action): boolean {
  const p = state.players[pid]!;
  if (p.node === node) return describeAction(state, pid, action).enabled;
  const graph = getGraph(state.config.townId);
  const route = graph.bestRoute(p.node, node, ['walk', ...(p.items.includes('bicycle') ? ['bike' as const] : []), ...(p.items.includes('used_car') ? ['car' as const] : [])]);
  if (!route) return false;
  const minutesLeft = p.minutesLeft - route.minutes;
  if (minutesLeft <= 0) return false;
  // describeAction only reads, so shallow copies are enough for a what-if.
  const hypothetical: GameState = { ...state, players: { ...state.players, [pid]: { ...p, node, minutesLeft } } };
  return describeAction(hypothetical, pid, action).enabled;
}

/** Go do `action` at `node`: travel if needed, else perform. Null if impossible. */
function doAt(state: GameState, pid: string, node: string, action: Action): Action | null {
  const p = state.players[pid]!;
  if (!enabledAt(state, pid, node, action)) return null;
  return p.node === node ? action : { type: 'travel', to: node };
}

function nodeOf(state: GameState, locationId: string): string {
  return getGraph(state.config.townId).nodeForLocation(locationId)!.id;
}

function bestEligibleJob(state: GameState, p: PlayerState, tracks?: string[]) {
  const current = jobOf(p);
  return JOB_LIST.filter((j) => (!tracks || tracks.includes(j.track)) && jobEligibility(state, p, j) === null)
    .filter((j) => !current || j.wage > current.wage * 1.15)
    .sort((a, b) => b.wage - a.wage)[0];
}

const END: Action = { type: 'endWeek' };

function housing(state: GameState, pid: string): Action | null {
  const p = state.players[pid]!;
  if (p.home) return null;
  const pick = p.cash > 400 ? 'lowcost' : 'shady_acres';
  return doAt(state, pid, nodeOf(state, pick), { type: 'rent', housingId: pick });
}

function eat(state: GameState, pid: string, healthy: boolean): Action | null {
  const p = state.players[pid]!;
  if (p.week.meals >= MEALS_REQUIRED) return null;
  if (p.groceries > 0 && p.home) {
    const a = doAt(state, pid, nodeOf(state, p.home), { type: 'cook' });
    if (a) return a;
  }
  if (healthy) {
    const a = doAt(state, pid, nodeOf(state, 'cafe'), { type: 'buyFood', foodId: 'salad_bar' });
    if (a) return a;
  }
  return doAt(state, pid, nodeOf(state, 'monolith'), { type: 'buyFood', foodId: 'burger' });
}

function findJob(state: GameState, pid: string, tracks?: string[]): Action | null {
  const p = state.players[pid]!;
  if (p.applications.length) return null;
  const job = bestEligibleJob(state, p, tracks);
  if (!job) return null;
  return doAt(state, pid, nodeOf(state, 'employment'), { type: 'apply', jobId: job.id });
}

function work(state: GameState, pid: string, maxShifts = MAX_SHIFTS_PER_WEEK): Action | null {
  const p = state.players[pid]!;
  const job = jobOf(p);
  if (!job || p.job!.shiftsThisWeek >= maxShifts) return null;
  return doAt(state, pid, nodeOf(state, job.employer), { type: 'work' });
}

function bank(state: GameState, pid: string, keep = 150): Action | null {
  const p = state.players[pid]!;
  if (p.cash < keep + 200) return null;
  return doAt(state, pid, nodeOf(state, 'bank'), { type: 'bank', op: 'deposit', amount: Math.floor(p.cash - keep) });
}

function clothes(state: GameState, pid: string): Action | null {
  const p = state.players[pid]!;
  if (p.clothing.condition >= 45) return null;
  const tier = Math.max(1, p.clothing.tier);
  return doAt(state, pid, nodeOf(state, 'qt_clothing'), { type: 'buyClothes', tier });
}

function study(state: GameState, pid: string, sequence: string[]): Action | null {
  const p = state.players[pid]!;
  // Preferred sequence first, then any other degree whose prerequisites are met.
  const next =
    sequence.find((d) => !p.degrees.includes(d)) ??
    Object.values(DEGREES).find((d) => !p.degrees.includes(d.id) && d.prereqs.every((q) => p.degrees.includes(q)))?.id;
  if (!next) return null;
  if (p.cash < DEGREES[next]!.tuition + 60) return null;
  return doAt(state, pid, nodeOf(state, 'university'), { type: 'class', degreeId: next });
}

function leisure(state: GameState, pid: string, max = 1): Action | null {
  const p = state.players[pid]!;
  if (p.week.leisureActs >= max) return null;
  return doAt(state, pid, nodeOf(state, 'park'), { type: 'activity', activityId: 'stroll' });
}

function exercise(state: GameState, pid: string, max = 1): Action | null {
  const p = state.players[pid]!;
  if (p.week.exerciseActs >= max) return null;
  return doAt(state, pid, nodeOf(state, 'park'), { type: 'activity', activityId: 'jog' });
}

function first(...cands: (Action | null)[]): Action {
  return cands.find((a) => a !== null) ?? END;
}

/** Work every shift, eat burgers, bank everything. */
export const grinder: Strategy = (s, pid) =>
  first(housing(s, pid), eat(s, pid, false), findJob(s, pid), work(s, pid), clothes(s, pid), bank(s, pid));

/** Study academia first, work only to fund it. */
export const scholar: Strategy = (s, pid) =>
  first(
    housing(s, pid),
    eat(s, pid, false),
    study(s, pid, ['liberal_arts', 'masters', 'doctorate']),
    findJob(s, pid, ['academia', 'service']),
    work(s, pid, s.players[pid]!.cash < 250 ? MAX_SHIFTS_PER_WEEK : 3),
    clothes(s, pid),
    bank(s, pid),
  );

/** Tech track: electronics -> CS, work moderately, keep healthy, some leisure. */
export const balanced: Strategy = (s, pid) =>
  first(
    housing(s, pid),
    eat(s, pid, true),
    exercise(s, pid),
    findJob(s, pid, ['tech', 'service']),
    work(s, pid, 3),
    study(s, pid, ['electronics', 'computer_science', 'engineering']),
    leisure(s, pid),
    work(s, pid, 4),
    clothes(s, pid),
    bank(s, pid),
  );

/** Uniformly random enabled action; ends the week when little time is left. */
export const random: Strategy = (s, pid, rng) => {
  const p = s.players[pid]!;
  const opts = availableActions(s, pid).filter((o) => o.enabled && o.action.type !== 'endWeek');
  if (!opts.length || p.minutesLeft < 90 || p.log.length > 40) return END;
  return opts[Math.floor(rng() * opts.length)]!.action;
};

export const STRATEGIES: Record<string, Strategy> = { grinder, scholar, balanced, random };
