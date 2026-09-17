/**
 * Scripted strategies for the classic ruleset. Deliberately simple: they exist to expose
 * dominant lines, not to play well.
 */
import { routeHours } from '@jones2/town';
import {
  availableActions,
  classic,
  cp,
  describeAction,
  getGraph,
  hasUniform,
  listedWage,
  type Action,
  type GameState,
  type PlayerState,
} from '@jones2/sim';

export type Strategy = (state: GameState, pid: string, rng: () => number) => Action;

const END: Action = { type: 'endWeek' };
const HOUR = 60;

function enabledAt(s: GameState, pid: string, node: string, action: Action): boolean {
  const p = s.players[pid]!;
  if (p.node === node) return describeAction(s, pid, action).enabled;
  const route = getGraph(s.config.townId).bestRoute(p.node, node, ['walk']);
  if (!route) return false;
  const minutesLeft = p.minutesLeft - routeHours(route.minutes) * HOUR;
  if (minutesLeft < 0) return false;
  const hypothetical: GameState = { ...s, players: { ...s.players, [pid]: { ...p, node, minutesLeft } } };
  return describeAction(hypothetical, pid, action).enabled;
}

/** Travel to `node` if needed, else do the action. Null when it cannot be reached or afforded. */
function doAt(s: GameState, pid: string, node: string, action: Action): Action | null {
  if (!enabledAt(s, pid, node, action)) return null;
  return s.players[pid]!.node === node ? action : { type: 'travel', to: node };
}

function first(...cands: (Action | null)[]): Action {
  return cands.find((a) => a !== null) ?? END;
}

// --- building blocks -------------------------------------------------------

/** Never start a week hungry: fresh food if there is a fridge, else a burger. */
function eat(s: GameState, pid: string): Action | null {
  const c = cp(s.players[pid]!);
  if (c.ateFastFood || c.freshFood > 0) return null;
  if (c.items.includes('fridge')) {
    const bulk = doAt(s, pid, 'blacks_market', { type: 'buyFood', foodId: 'fresh_food_4_weeks' });
    if (bulk) return bulk;
  }
  return (
    doAt(s, pid, 'monolith', { type: 'buyFood', foodId: 'hamburgers' }) ??
    doAt(s, pid, 'blacks_market', { type: 'buyFood', foodId: 'fresh_food_1_week' })
  );
}

function rent(s: GameState, pid: string): Action | null {
  const p = s.players[pid]!;
  const c = cp(p);
  if (c.rentDebt <= 0 && s.week < c.rentDueWeek) return null;
  return doAt(s, pid, 'rent_office', { type: 'payRent' });
}

function qualifies(s: GameState, p: PlayerState, job: (typeof classic.CLASSIC_JOB_LIST)[number]): boolean {
  const c = cp(p);
  if (job.alwaysHired) return true;
  const dep = job.dependability === classic.DEPENDABILITY_TEN_IS_ZERO ? 0 : job.dependability;
  return c.experience >= job.experience && c.dependability >= dep && job.degrees.every((d) => c.degrees.includes(d));
}

function uniformPrice(s: GameState, tier: 'casual' | 'dress' | 'business'): number {
  const option = classic.CLASSIC_CLOTHES.find((o) => o.tier === tier && o.store === 'qt_clothing')!;
  return Math.round(option.price * s.economy.priceIndex);
}

/**
 * The best-paying job the player qualifies for, if it beats the current one by 15%. A job whose
 * uniform the player neither owns nor can afford is skipped: taking it would mean never working.
 */
function betterJob(s: GameState, pid: string, employers?: string[]) {
  const p = s.players[pid]!;
  const c = cp(p);
  return classic.CLASSIC_JOB_LIST.filter((j) => (!employers || employers.includes(j.employer)) && qualifies(s, p, j))
    .filter((j) => hasUniform(p, j.uniform) || p.cash >= uniformPrice(s, j.uniform))
    .filter((j) => j.id !== c.jobId && listedWage(s, j.id) > c.wage * 1.15)
    .sort((x, y) => listedWage(s, y.id) - listedWage(s, x.id))[0];
}

function findJob(s: GameState, pid: string, employers?: string[]): Action | null {
  const job = betterJob(s, pid, employers);
  if (!job) return null;
  return doAt(s, pid, 'employment', { type: 'apply', jobId: job.id });
}

/**
 * Keep a working wardrobe. Clothes are consumables: run the last week out with no cash and you
 * can never work again, so restock two weeks early and always keep something casual.
 */
function uniform(s: GameState, pid: string): Action | null {
  const p = s.players[pid]!;
  const c = cp(p);
  const need = c.jobId ? classic.CLASSIC_JOBS[c.jobId]!.uniform : 'casual';
  const weeks = classic.CLOTHING_TIER_ORDER.filter((t) => classic.CLOTHING_TIER_ORDER.indexOf(t) >= classic.CLOTHING_TIER_ORDER.indexOf(need)).reduce(
    (m, t) => Math.max(m, c.clothes[t]),
    0,
  );
  if (weeks > 2) return null;
  return (
    doAt(s, pid, 'qt_clothing', { type: 'buyClothing', tier: need, store: 'qt_clothing' }) ??
    doAt(s, pid, 'zmart', { type: 'buyClothing', tier: need === 'business' ? 'dress' : need, store: 'zmart' })
  );
}

function work(s: GameState, pid: string, maxSessions = 10): Action | null {
  const p = s.players[pid]!;
  const c = cp(p);
  if (!c.jobId || c.week.workSessions >= maxSessions) return null;
  const job = classic.CLASSIC_JOBS[c.jobId]!;
  if (p.minutesLeft < 6 * HOUR) return null;
  return doAt(s, pid, job.employer, { type: 'work' });
}

function raise(s: GameState, pid: string): Action | null {
  const c = cp(s.players[pid]!);
  if (!c.jobId) return null;
  if (listedWage(s, c.jobId) <= c.wage) return null;
  return doAt(s, pid, 'employment', { type: 'raise' });
}

/** Work through the degree tree in the order the job ladder wants it. */
const DEGREE_ORDER = ['junior_college', 'business_admin', 'trade_school', 'pre_engineering', 'engineering', 'academic', 'electronics'];

function study(s: GameState, pid: string): Action | null {
  const c = cp(s.players[pid]!);
  const open = c.enrolled[0];
  if (open) {
    const lesson = doAt(s, pid, 'university', { type: 'class', degreeId: open });
    if (lesson) return lesson;
  }
  const next = DEGREE_ORDER.find((id) => {
    if (c.degrees.includes(id) || c.enrolled.includes(id)) return false;
    const deg = classic.CLASSIC_DEGREE_LIST.find((x) => x.id === id)!;
    return !deg.prereq || c.degrees.includes(deg.prereq);
  });
  if (!next) return null;
  return doAt(s, pid, 'university', { type: 'enroll', degreeId: next });
}

function bank(s: GameState, pid: string, keep = 400): Action | null {
  const p = s.players[pid]!;
  if (p.cash < keep + 500) return null;
  return doAt(s, pid, 'bank', { type: 'bank', op: 'deposit', amount: Math.floor(p.cash - keep) });
}

/** Buy happiness: the cheap repeatable sources first, then appliances. */
const HAPPY_BUYS: { node: string; action: Action }[] = [
  { node: 'zmart', action: { type: 'buyItem', itemId: 'theatre_tickets' } },
  { node: 'zmart', action: { type: 'buyItem', itemId: 'concert_tickets' } },
  { node: 'zmart', action: { type: 'buyItem', itemId: 'baseball_tickets' } },
  { node: 'qt_clothing', action: { type: 'buyClothing', tier: 'business', store: 'qt_clothing' } },
  { node: 'socket_city', action: { type: 'buyItem', itemId: 'microwave' } },
  { node: 'socket_city', action: { type: 'buyItem', itemId: 'stereo' } },
  { node: 'socket_city', action: { type: 'buyItem', itemId: 'color_tv' } },
  { node: 'socket_city', action: { type: 'buyItem', itemId: 'vcr' } },
  { node: 'socket_city', action: { type: 'buyItem', itemId: 'hot_tub' } },
  { node: 'socket_city', action: { type: 'buyItem', itemId: 'computer' } },
];

function buyHappiness(s: GameState, pid: string, floor = 300): Action | null {
  const p = s.players[pid]!;
  if (p.cash < floor) return null;
  for (const buy of HAPPY_BUYS) {
    const a = doAt(s, pid, buy.node, buy.action);
    if (a) return a;
  }
  return null;
}

function relax(s: GameState, pid: string): Action | null {
  const c = cp(s.players[pid]!);
  if (c.week.relaxed) return null;
  return doAt(s, pid, c.housing, { type: 'relax', minutes: 6 * HOUR });
}

// --- the strategies --------------------------------------------------------

/** Factory grinder: takes the best job on offer, never studies, works every hour. */
export const grinder: Strategy = (s, pid) =>
  first(eat(s, pid), rent(s, pid), uniform(s, pid), findJob(s, pid), raise(s, pid), work(s, pid), bank(s, pid));

/**
 * Student: degrees first (they are cheap in money and dear in hours), then cash in the
 * qualifications for a good job and spend some of the wage on happiness.
 */
export const student: Strategy = (s, pid) => {
  const p = s.players[pid]!;
  const c = cp(p);
  const poor = p.cash < 400;
  const studying = s.week <= 12 && c.degrees.length < 6;
  return first(
    eat(s, pid),
    rent(s, pid),
    uniform(s, pid),
    poor ? work(s, pid, 4) : null,
    studying ? study(s, pid) : null,
    findJob(s, pid),
    raise(s, pid),
    work(s, pid, 6),
    study(s, pid),
    p.cash > 1500 ? buyHappiness(s, pid, 1500) : null,
    work(s, pid),
    bank(s, pid),
  );
};

/** Shopper: works, then spends the money on happiness. */
export const shopper: Strategy = (s, pid) =>
  first(
    eat(s, pid),
    rent(s, pid),
    uniform(s, pid),
    findJob(s, pid),
    raise(s, pid),
    work(s, pid, 6),
    relax(s, pid),
    buyHappiness(s, pid),
    work(s, pid),
  );

/** Uniformly random enabled action, with food and rent kept safe so it does not spiral. */
export const random: Strategy = (s, pid, rng) => {
  const p = s.players[pid]!;
  const safety = first(eat(s, pid), rent(s, pid));
  if (safety !== END && rng() < 0.5) return safety;
  const opts = availableActions(s, pid).filter((o) => o.enabled && o.action.type !== 'endWeek');
  if (!opts.length || p.minutesLeft < HOUR || p.log.length > 60) return END;
  return opts[Math.floor(rng() * opts.length)]!.action;
};

export const CLASSIC_STRATEGIES: Record<string, Strategy> = { grinder, student, shopper, random };
