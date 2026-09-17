/**
 * The classic ruleset's public action surface. Costs are whole hours (content/classic/time.ts);
 * travel is charged with `routeHours` from @jones2/town while the event keeps the route's real
 * minutes for the replay. The specs themselves live in actions-job / actions-shop / actions-money.
 */
import {
  CLASSIC_CLOTHES,
  CLASSIC_DEGREE_LIST,
  CLASSIC_FOOD_LIST,
  CLASSIC_ITEM_LIST,
  CLASSIC_JOB_LIST,
  CLASSIC_STOCK_LIST,
  RELAXATION,
} from '../content/classic';
import { getGraph } from '../helpers';
import type { Action, ActionError, ActionOption, ActionResult, GameState, PlayerEvent, PlayerState } from '../types';
import { MINUTES, context, locationAt, type Spec } from './context';
import { jobSpec } from './actions-job';
import { shopSpec } from './actions-shop';
import { moneySpec } from './actions-money';
import { cg, cp, jobOf } from './state';

export { listedWage, locationAt, rentOfficeOpen } from './context';
export type { Spec } from './context';

/** Build the spec for one action here and now, or the reason it makes no sense. */
export function spec(state: GameState, p: PlayerState, a: Action): Spec | string {
  const cx = context(state, p);
  return jobSpec(cx, a) ?? shopSpec(cx, a) ?? moneySpec(cx, a) ?? 'Not available in the classic ruleset';
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

function charged(s: Spec, p: PlayerState): number {
  const full = s.hours * MINUTES;
  return s.partial ? Math.min(full, Math.max(0, p.minutesLeft)) : full;
}

export function describeAction(state: GameState, playerId: string, action: Action): ActionOption {
  const p = state.players[playerId];
  if (!p) return { action, label: '?', minutes: 0, cost: 0, enabled: false, reason: 'Unknown player' };
  const s = spec(state, p, action);
  if (typeof s === 'string') return { action, label: s, minutes: 0, cost: 0, enabled: false, reason: s };
  const minutes = charged(s, p);
  let reason = p.weekDone ? 'Week is over' : s.check();
  if (!reason) {
    if (s.partial && s.hours > 0 && p.minutesLeft < MINUTES) reason = 'Not enough time';
    else if (!s.partial && minutes > p.minutesLeft) reason = 'Not enough time';
  }
  if (!reason && s.cost > p.cash) reason = 'Not enough cash';
  const opt: ActionOption = { action, label: s.label, minutes, cost: s.cost, enabled: !reason };
  if (reason) opt.reason = reason;
  return opt;
}

export function availableActions(state: GameState, playerId: string): ActionOption[] {
  const p = state.players[playerId];
  if (!p) return [];
  const c = cp(p);
  const loc = locationAt(state, p);
  const graph = getGraph(state.config.townId);
  const actions: Action[] = [];

  const job = jobOf(p);
  if (job && loc === job.employer) actions.push({ type: 'work' });

  if (loc === 'employment') {
    if (job) actions.push({ type: 'raise' });
    for (const j of CLASSIC_JOB_LIST) actions.push({ type: 'apply', jobId: j.id });
  }
  if (loc === 'university') {
    for (const deg of CLASSIC_DEGREE_LIST) {
      if (c.enrolled.includes(deg.id)) actions.push({ type: 'class', degreeId: deg.id });
      else if (!c.degrees.includes(deg.id)) actions.push({ type: 'enroll', degreeId: deg.id });
    }
  }
  if (loc === 'socket_city' || loc === 'zmart') {
    for (const item of CLASSIC_ITEM_LIST) {
      const sold = loc === 'socket_city' ? item.socketCityPrice : item.zmartPrice;
      if (sold) actions.push({ type: 'buyItem', itemId: item.id });
    }
  }
  if (loc === 'qt_clothing' || loc === 'zmart') {
    for (const o of CLASSIC_CLOTHES) if (o.store === loc) actions.push({ type: 'buyClothing', tier: o.tier, store: o.store });
  }
  if (loc === 'monolith' || loc === 'blacks_market') {
    for (const f of CLASSIC_FOOD_LIST) {
      const where = f.category === 'fresh_food' ? 'blacks_market' : 'monolith';
      if (where === loc) actions.push({ type: 'buyFood', foodId: f.id });
    }
  }
  if (loc === 'blacks_market') actions.push({ type: 'lottery' }, { type: 'newspaper' });
  if (loc === 'bank') {
    actions.push({ type: 'bank', op: 'deposit', amount: Math.floor(p.cash) });
    actions.push({ type: 'bank', op: 'withdraw', amount: Math.floor(p.savings) });
    actions.push({ type: 'applyLoan' }, { type: 'loanPayment' }, { type: 'broker' });
    if (c.week.brokerOpen) {
      for (const s of CLASSIC_STOCK_LIST) {
        actions.push({ type: 'buyStock', stockId: s.id, units: 1 });
        if ((c.stocks[s.id] ?? 0) > 0) actions.push({ type: 'sellStock', stockId: s.id, units: c.stocks[s.id]! });
      }
    }
  }
  if (loc === 'pawn') {
    for (const id of c.items) actions.push({ type: 'pawnItem', itemId: id });
    for (const entry of cg(state).pawnShop) {
      if (entry.ownerId === p.id) actions.push({ type: 'redeemItem', itemId: entry.itemId });
      else actions.push({ type: 'buyPawned', itemId: entry.itemId });
    }
  }
  if (loc === 'rent_office') {
    actions.push({ type: 'payRent' }, { type: 'rentExtension' });
    actions.push({ type: 'rent', housingId: c.housing === 'lowcost' ? 'security_apts' : 'lowcost' });
  }
  if (p.node === c.housing) actions.push({ type: 'relax', minutes: RELAXATION.relaxHours * MINUTES });

  for (const n of graph.town.nodes) if (n.location && n.id !== p.node) actions.push({ type: 'travel', to: n.id });
  actions.push({ type: 'endWeek' });

  return actions.map((a) => describeAction(state, playerId, a));
}

export function applyAction(state: GameState, playerId: string, action: Action): ActionResult | ActionError {
  if (state.phase !== 'playing') return { ok: false, reason: 'Game is over' };
  const cur = state.players[playerId];
  if (!cur) return { ok: false, reason: 'Unknown player' };
  if (cur.weekDone) return { ok: false, reason: 'Week is over' };
  const next: GameState = {
    ...state,
    players: { ...state.players, [playerId]: structuredClone(cur) },
    jobHolders: { ...state.jobHolders },
    classic: structuredClone(state.classic!),
  };
  const p = next.players[playerId]!;

  const s = spec(next, p, action);
  if (typeof s === 'string') return { ok: false, reason: s };
  const reason = s.check();
  if (reason) return { ok: false, reason };
  const minutes = charged(s, p);
  if (s.partial && s.hours > 0 && p.minutesLeft < MINUTES) return { ok: false, reason: 'Not enough time' };
  if (!s.partial && minutes > p.minutesLeft) return { ok: false, reason: 'Not enough time' };
  if (s.cost > p.cash) return { ok: false, reason: 'Not enough cash' };

  const minute = p.minutesBudget - p.minutesLeft;
  p.minutesLeft -= minutes;
  const out = s.run();
  if (action.type === 'endWeek') p.weekDone = true;
  const event: PlayerEvent = {
    minute,
    duration: s.duration ?? minutes,
    action,
    node: p.node,
    deltas: out.deltas,
    text: out.text,
  };
  if (out.path) event.path = out.path;
  p.log.push(event);
  return { ok: true, state: next, event };
}
