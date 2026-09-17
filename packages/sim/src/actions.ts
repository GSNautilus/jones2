import type { NodeId, TransportMode } from '@jones2/town';
import * as C from './content/config';
import { ACHIEVEMENTS } from './content/achievements';
import { ACTIVITIES, ACTIVITY_LIST } from './content/activities';
import { DEGREES, DEGREE_LIST } from './content/degrees';
import { FOODS, FOOD_LIST, GROCERY } from './content/food';
import { HOUSING, HOUSING_LIST } from './content/housing';
import { ITEMS, ITEM_LIST } from './content/items';
import { JOBS, JOB_LIST } from './content/jobs';
import { LOCATIONS } from './content/locations';
import { NEWS_LIST, NEWS_SOURCES } from './content/news';
import {
  applyDelta,
  canStudy,
  degreeComplete,
  diminish,
  effectiveClothingTier,
  foodPrice,
  getGraph,
  groceryCapacity,
  hasAmenity,
  homeOf,
  itemPrice,
  jobEligibility,
  jobOf,
  locationOf,
  storePrice,
  transportModes,
  tuitionFor,
} from './helpers';
import {
  applyAction as classicApplyAction,
  availableActions as classicAvailableActions,
  describeAction as classicDescribeAction,
} from './classic/actions';
import { chance } from './rng';
import type { Action, ActionError, ActionOption, ActionResult, Delta, GameState, PlayerEvent, PlayerState } from './types';

interface Spec {
  label: string;
  minutes: number;
  cost: number;
  /** Returns a reason the action is unavailable, or null. Location/time/money checks are shared. */
  check: () => string | null;
  /** Mutates p (and state) and returns the event text, deltas, and travel path. */
  run: () => { text: string; deltas: Delta[]; path?: NodeId[] };
}

function d(stat: Delta['stat'], amount: number, note?: string): Delta {
  return note ? { stat, amount, note } : { stat, amount };
}

/** Build the spec for an action in the current context, or an error string. */
function spec(state: GameState, p: PlayerState, a: Action): Spec | string {
  const loc = locationOf(state, p);
  const here = (feature: string) => (loc?.features as string[] | undefined)?.includes(feature) ?? false;
  const graph = getGraph(state.config.townId);
  const home = homeOf(p);
  const atHome = home !== null && p.node === home.startNode;

  switch (a.type) {
    case 'travel': {
      if (!graph.hasNode(a.to)) return 'Unknown destination';
      const modes = a.mode ? [a.mode] : transportModes(p);
      if (a.mode && !transportModes(p).includes(a.mode)) return `You cannot travel by ${a.mode}`;
      const route = graph.bestRoute(p.node, a.to, modes);
      if (!route) return 'No route';
      const name = graph.node(a.to).name ?? a.to;
      return {
        label: `Go to ${name}`,
        minutes: route.minutes,
        cost: 0,
        check: () => (a.to === p.node ? 'Already here' : null),
        run: () => {
          p.node = a.to;
          if (!p.visited.includes(a.to)) p.visited.push(a.to);
          return { text: `Travelled to ${name} by ${route.mode}`, deltas: [], path: route.path };
        },
      };
    }

    case 'work': {
      const job = jobOf(p);
      if (!job) return 'You have no job';
      const hours = job.shiftMinutes / 60;
      const pay = Math.round(job.wage * hours * state.economy.wageIndex);
      return {
        label: `Work a shift as ${job.title} ($${pay})`,
        minutes: job.shiftMinutes,
        cost: 0,
        check: () => {
          if (loc?.id !== job.employer) return `Your job is at ${LOCATIONS[job.employer]!.name}`;
          if (p.job!.shiftsThisWeek >= C.MAX_SHIFTS_PER_WEEK) return 'No more shifts this week';
          return null;
        },
        run: () => {
          p.job!.shiftsThisWeek++;
          p.week.workedMinutes += job.shiftMinutes;
          p.clothing.condition = Math.max(0, p.clothing.condition + C.CLOTHING_WORK_WEAR);
          const deltas = [
            applyDelta(p, d('cash', pay, 'wages')),
            applyDelta(p, d('happiness', job.happiness, 'work')),
          ];
          if (job.health) deltas.push(applyDelta(p, d('health', job.health, 'work')));
          return { text: `Worked a shift as ${job.title}`, deltas };
        },
      };
    }

    case 'apply': {
      const job = JOBS[a.jobId];
      if (!job) return 'No such job';
      return {
        label: `Apply: ${job.title} at ${LOCATIONS[job.employer]!.name} ($${job.wage}/h)`,
        minutes: C.INTERVIEW_MINUTES,
        cost: 0,
        check: () => {
          if (!here('employment') && loc?.id !== job.employer) return 'Apply at the Employment Office or the employer';
          return jobEligibility(state, p, job);
        },
        run: () => {
          p.applications.push({ jobId: job.id, minute: p.minutesBudget - p.minutesLeft });
          return { text: `Applied for ${job.title} at ${LOCATIONS[job.employer]!.name}`, deltas: [] };
        },
      };
    }

    case 'quit': {
      const job = jobOf(p);
      if (!job) return 'You have no job';
      return {
        label: `Quit your job as ${job.title}`,
        minutes: 0,
        cost: 0,
        check: () => null,
        run: () => {
          const holders = state.jobHolders[job.id] ?? [];
          state.jobHolders[job.id] = holders.filter((id) => id !== p.id);
          p.job = null;
          return { text: `Quit ${job.title}`, deltas: [applyDelta(p, d('happiness', C.QUIT_HAPPINESS, 'quit'))] };
        },
      };
    }

    case 'class':
    case 'homeStudy': {
      const deg = DEGREES[a.degreeId];
      if (!deg) return 'No such degree';
      const homeStudy = a.type === 'homeStudy';
      let minutes = deg.classMinutes;
      let tuition = tuitionFor(p, deg.tuition);
      if (homeStudy) {
        minutes = Math.round(minutes * C.HOME_STUDY_FACTOR * (hasAmenity(p, 'office') ? C.OFFICE_STUDY_FACTOR : 1));
        tuition = Math.round(tuition * C.HOME_STUDY_TUITION_FACTOR);
      }
      const have = p.credits[deg.id] ?? 0;
      return {
        label: `${homeStudy ? 'Study at home' : 'Take a class'}: ${deg.name} (${have}/${deg.classes})`,
        minutes,
        cost: tuition,
        check: () => {
          if (homeStudy) {
            if (!atHome) return 'Study at home';
            if (!p.items.includes('computer')) return 'Needs a home computer';
          } else if (!here('university')) return 'Classes are at the university';
          return canStudy(p, deg.id);
        },
        run: () => {
          p.credits[deg.id] = have + 1;
          p.week.classes++;
          const deltas = [applyDelta(p, d('cash', -tuition, 'tuition')), d('credits', 1, deg.name)];
          let text = `${homeStudy ? 'Studied' : 'Attended class in'} ${deg.name}`;
          if (p.credits[deg.id]! >= deg.classes && !degreeComplete(p, deg.id)) {
            p.degrees.push(deg.id);
            text += ` and completed the degree!`;
            deltas.push(applyDelta(p, d('happiness', 5, 'graduated')));
          }
          return { text, deltas };
        },
      };
    }

    case 'buyItem': {
      const item = ITEMS[a.itemId];
      if (!item) return 'No such item';
      const price = itemPrice(state, p, item);
      return {
        label: `Buy ${item.name} ($${price})`,
        minutes: C.SHOP_MINUTES,
        cost: price,
        check: () => {
          if (loc?.id !== item.store) return `Sold at ${LOCATIONS[item.store]!.name}`;
          if (p.items.includes(item.id)) return 'You already own one';
          return null;
        },
        run: () => {
          p.items.push(item.id);
          p.week.shopping++;
          const deltas = [applyDelta(p, d('cash', -price, item.name))];
          if (item.comfort > 0) deltas.push(applyDelta(p, d('happiness', Math.min(4, item.comfort) * diminish(p.week.shopping - 1), 'new purchase')));
          return { text: `Bought a ${item.name}`, deltas };
        },
      };
    }

    case 'pawnItem': {
      const item = ITEMS[a.itemId];
      if (!item) return 'No such item';
      const value = Math.round(item.price * item.pawnFactor);
      return {
        label: `Pawn ${item.name} (+$${value})`,
        minutes: C.SHOP_MINUTES,
        cost: 0,
        check: () => {
          if (!here('pawn')) return 'Pawn shop only';
          if (!p.items.includes(item.id)) return "You don't own one";
          return null;
        },
        run: () => {
          p.items = p.items.filter((i) => i !== item.id);
          return { text: `Pawned the ${item.name}`, deltas: [applyDelta(p, d('cash', value, 'pawn'))] };
        },
      };
    }

    case 'buyFood': {
      const food = FOODS[a.foodId];
      if (!food) return 'No such food';
      const price = foodPrice(state, p, food.price, food.location);
      return {
        label: `Eat: ${food.name} ($${price})`,
        minutes: food.minutes,
        cost: price,
        check: () => (loc?.id !== food.location ? `Served at ${LOCATIONS[food.location]!.name}` : null),
        run: () => {
          p.week.meals++;
          return {
            text: `Ate ${food.name}`,
            deltas: [
              applyDelta(p, d('cash', -price, food.name)),
              applyDelta(p, d('health', food.health, 'meal')),
              applyDelta(p, d('happiness', food.happiness, 'meal')),
            ],
          };
        },
      };
    }

    case 'buyGroceries': {
      const price = storePrice(state, GROCERY.price, 'blacks_market');
      const cap = groceryCapacity(p);
      return {
        label: `Buy groceries ($${price}, holding ${p.groceries}/${cap})`,
        minutes: GROCERY.shopMinutes,
        cost: price,
        check: () => {
          if (!here('grocery')) return "Black's Market only";
          if (p.groceries >= cap) return 'No room to store more';
          return null;
        },
        run: () => {
          p.groceries++;
          return { text: 'Bought groceries', deltas: [applyDelta(p, d('cash', -price, 'groceries'))] };
        },
      };
    }

    case 'cook': {
      const minutes = p.items.includes('microwave') ? C.COOK_MINUTES_MICROWAVE : C.COOK_MINUTES;
      return {
        label: `Cook a meal (${p.groceries} groceries left)`,
        minutes,
        cost: 0,
        check: () => {
          if (!atHome) return 'Cook at home';
          if (!hasAmenity(p, 'kitchen')) return 'Your home has no kitchen';
          if (p.groceries <= 0) return 'No groceries';
          return null;
        },
        run: () => {
          p.groceries--;
          p.week.meals++;
          return {
            text: 'Cooked a meal at home',
            deltas: [applyDelta(p, d('health', GROCERY.health, 'home cooking')), applyDelta(p, d('happiness', GROCERY.happiness, 'home cooking'))],
          };
        },
      };
    }

    case 'activity': {
      const act = ACTIVITIES[a.activityId];
      if (!act) return 'No such activity';
      const price = storePrice(state, act.price, act.location);
      const n = act.kind === 'exercise' ? p.week.exerciseActs : p.week.leisureActs;
      const mult = diminish(n);
      return {
        label: `${act.name}${price ? ` ($${price})` : ''}`,
        minutes: act.minutes,
        cost: price,
        check: () => (loc?.id !== act.location ? `At ${LOCATIONS[act.location]!.name}` : null),
        run: () => {
          if (act.kind === 'exercise') p.week.exerciseActs++;
          else p.week.leisureActs++;
          const deltas: Delta[] = [];
          if (price) deltas.push(applyDelta(p, d('cash', -price, act.name)));
          deltas.push(applyDelta(p, d('health', act.health * mult, act.name)));
          deltas.push(applyDelta(p, d('happiness', act.happiness * mult, act.name)));
          return { text: act.name, deltas };
        },
      };
    }

    case 'relax': {
      const hours = Math.max(1, Math.floor(a.minutes / 60));
      const bonus = p.items.includes('bed') ? 1.25 : 1;
      return {
        label: `Relax at home for ${hours}h`,
        minutes: hours * 60,
        cost: 0,
        check: () => {
          if (!atHome) return 'Relax at home';
          if (p.week.leisureActs >= C.RELAX_MAX_HOURS_PER_WEEK + 10) return 'Enough relaxing';
          return null;
        },
        run: () => {
          let gain = 0;
          for (let i = 0; i < hours; i++) gain += C.RELAX_HAPPINESS_PER_HOUR * bonus * diminish(Math.max(0, p.week.leisureActs - 2));
          p.week.leisureActs++;
          return { text: `Relaxed at home for ${hours}h`, deltas: [applyDelta(p, d('happiness', gain, 'relaxing'))] };
        },
      };
    }

    case 'buyClothes': {
      const tier = a.tier;
      const base = C.CLOTHING_PRICES[tier];
      if (base === undefined || tier < 1) return 'No such clothing tier';
      const price = storePrice(state, base, 'qt_clothing');
      const names = ['rags', 'casual', 'business', 'executive'];
      return {
        label: `Buy ${names[tier]} clothes ($${price})`,
        minutes: C.CLOTHES_MINUTES,
        cost: price,
        check: () => (here('clothing') ? null : 'QT Clothing only'),
        run: () => {
          p.clothing = { tier, condition: 100 };
          return { text: `Bought ${names[tier]} clothes`, deltas: [applyDelta(p, d('cash', -price, 'clothes'))] };
        },
      };
    }

    case 'rent': {
      const h = HOUSING[a.housingId];
      if (!h || h.kind !== 'rent') return 'Not for rent';
      const rent = Math.round(h.weekly * state.economy.rentIndex);
      return {
        label: `Rent at ${h.name} ($${rent}/week)`,
        minutes: 30,
        cost: rent,
        check: () => {
          if (loc?.id !== h.location) return `Rent at ${h.name}`;
          if (p.home === h.id) return 'You already live here';
          return null;
        },
        run: () => {
          p.home = h.id;
          return { text: `Moved into ${h.name}`, deltas: [applyDelta(p, d('cash', -rent, 'first week rent'))] };
        },
      };
    }

    case 'offer': {
      const h = HOUSING[a.housingId];
      if (!h || h.kind !== 'own') return 'Not for sale';
      return {
        label: `Make an offer on ${h.name} (asking $${h.price})`,
        minutes: 60,
        cost: 0,
        check: () => {
          if (loc?.id !== h.location) return `Make offers at ${h.name}`;
          if (state.propertyOwners[h.id]) return 'Already sold';
          if (a.bid < h.price) return `Minimum offer is $${h.price}`;
          if (p.cash + p.savings < a.bid) return 'You cannot cover that offer';
          if (p.offers.some((o) => o.housingId === h.id)) return 'Offer already lodged';
          return null;
        },
        run: () => {
          p.offers.push({ housingId: h.id, bid: a.bid, minute: p.minutesBudget - p.minutesLeft });
          return { text: `Offered $${a.bid} for ${h.name}`, deltas: [] };
        },
      };
    }

    case 'bank': {
      const amt = Math.round(a.amount);
      const labels = { deposit: 'Deposit', withdraw: 'Withdraw', borrow: 'Borrow', repay: 'Repay' };
      return {
        label: `${labels[a.op]} $${amt}`,
        minutes: C.BANK_MINUTES,
        cost: 0,
        check: () => {
          if (!here('bank')) return 'Bank only';
          if (amt <= 0) return 'Amount must be positive';
          if (a.op === 'deposit' && amt > p.cash) return 'Not enough cash';
          if (a.op === 'withdraw' && amt > p.savings) return 'Not enough savings';
          if (a.op === 'borrow' && p.loan + amt > C.LOAN_LIMIT) return `Loan limit is $${C.LOAN_LIMIT}`;
          if (a.op === 'repay' && (amt > p.loan || amt > p.cash)) return 'Cannot repay that much';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          if (a.op === 'deposit') deltas.push(applyDelta(p, d('cash', -amt)), applyDelta(p, d('savings', amt)));
          if (a.op === 'withdraw') deltas.push(applyDelta(p, d('savings', -amt)), applyDelta(p, d('cash', amt)));
          if (a.op === 'borrow') deltas.push(applyDelta(p, d('loan', amt)), applyDelta(p, d('cash', amt)));
          if (a.op === 'repay') deltas.push(applyDelta(p, d('cash', -amt)), applyDelta(p, d('loan', -amt)));
          return { text: `${labels[a.op]} $${amt}`, deltas };
        },
      };
    }

    case 'buyNews': {
      const src = NEWS_SOURCES[a.sourceId];
      if (!src || src.via !== 'newsstand') return 'Not sold here';
      return {
        label: `Buy ${src.name} ($${src.price})`,
        minutes: src.minutes,
        cost: src.price,
        check: () => (here('newsstand') ? null : 'Newsstand only'),
        run: () => {
          const added = addForecasts(state, p, src.id);
          return {
            text: `Read ${src.name}: ${added.length ? added.join('; ') : 'nothing new'}`,
            deltas: [applyDelta(p, d('cash', -src.price, src.name))],
          };
        },
      };
    }

    case 'buyBusPass':
      return {
        label: `Buy a bus pass ($${C.BUS_PASS_PRICE}, ${C.BUS_PASS_WEEKS} weeks)`,
        minutes: 10,
        cost: C.BUS_PASS_PRICE,
        check: () => (here('start') ? null : 'Bus Depot only'),
        run: () => {
          p.busPassWeeks += C.BUS_PASS_WEEKS;
          return { text: 'Bought a bus pass', deltas: [applyDelta(p, d('cash', -C.BUS_PASS_PRICE, 'bus pass'))] };
        },
      };

    case 'buyInsurance':
      return {
        label: `Buy contents insurance ($${C.INSURANCE_PRICE}, ${C.INSURANCE_WEEKS} weeks)`,
        minutes: C.BANK_MINUTES,
        cost: C.INSURANCE_PRICE,
        check: () => (here('bank') ? null : 'Bank only'),
        run: () => {
          p.insuranceWeeks += C.INSURANCE_WEEKS;
          return { text: 'Bought insurance', deltas: [applyDelta(p, d('cash', -C.INSURANCE_PRICE, 'insurance'))] };
        },
      };

    case 'clinic':
      return {
        label: `See the doctor ($${C.CLINIC_PRICE}, +${C.CLINIC_HEALTH} health)`,
        minutes: C.CLINIC_MINUTES,
        cost: C.CLINIC_PRICE,
        check: () => (here('clinic') ? null : 'Clinic only'),
        run: () => {
          p.sick = false;
          return {
            text: 'Saw the doctor',
            deltas: [applyDelta(p, d('cash', -C.CLINIC_PRICE, 'clinic')), applyDelta(p, d('health', C.CLINIC_HEALTH, 'treatment'))],
          };
        },
      };

    case 'lottery':
      return {
        label: `Buy a lottery ticket ($${C.LOTTERY_TICKET})`,
        minutes: 5,
        cost: C.LOTTERY_TICKET,
        check: () => (here('lottery') ? null : 'Not sold here'),
        run: () => {
          let won: boolean;
          [state.rng, won] = chance(state.rng, C.LOTTERY_ODDS);
          const deltas = [applyDelta(p, d('cash', -C.LOTTERY_TICKET, 'ticket'))];
          if (won) deltas.push(applyDelta(p, d('cash', C.LOTTERY_PRIZE, 'JACKPOT')), applyDelta(p, d('happiness', 10, 'jackpot')));
          return { text: won ? 'WON THE LOTTERY!' : 'Bought a losing lottery ticket', deltas };
        },
      };

    case 'endWeek':
      return {
        label: 'End the week',
        minutes: 0,
        cost: 0,
        check: () => null,
        run: () => ({ text: 'Ended the week', deltas: [] }),
      };

    default:
      // Classic-ruleset actions; see src/classic/actions.ts.
      return 'Not available in this ruleset';
  }
}

/** Reveal scheduled events through a news source. Returns headlines added. */
export function addForecasts(state: GameState, p: PlayerState, sourceId: string): string[] {
  const src = NEWS_SOURCES[sourceId]!;
  const added: string[] = [];
  for (const ev of state.schedule) {
    if (ev.week <= state.week || ev.week > state.week + src.horizon) continue;
    if (!ev.categories.some((c) => src.categories.includes(c))) continue;
    if (p.journal.some((f) => f.eventId === ev.id && f.source === src.id)) continue;
    let week = ev.week;
    let ok: boolean;
    [state.rng, ok] = chance(state.rng, src.reliability);
    if (!ok) {
      let flip: boolean;
      [state.rng, flip] = chance(state.rng, 0.5);
      week = Math.max(state.week + 1, ev.week + (flip ? 1 : -1));
    }
    p.journal.push({ eventId: ev.id, week, headline: ev.headline, source: src.id, expiresWeek: week });
    added.push(`${ev.headline} (week ${week})`);
  }
  return added;
}

function checkClaims(state: GameState, p: PlayerState): void {
  for (const a of ACHIEVEMENTS) {
    if (state.achievementsTaken[a.id]) continue;
    if (p.claims.some((c) => c.id === a.id)) continue;
    if (a.check(p, state)) p.claims.push({ id: a.id, minute: p.minutesBudget - p.minutesLeft });
  }
}

/** Evaluate one action for the UI. */
export function describeAction(state: GameState, playerId: string, action: Action): ActionOption {
  if (state.config.ruleset === 'classic') return classicDescribeAction(state, playerId, action);
  const p = state.players[playerId];
  if (!p) return { action, label: '?', minutes: 0, cost: 0, enabled: false, reason: 'Unknown player' };
  const s = spec(state, p, action);
  if (typeof s === 'string') return { action, label: s, minutes: 0, cost: 0, enabled: false, reason: s };
  let reason = p.weekDone ? 'Week is over' : s.check();
  if (!reason && s.minutes > p.minutesLeft) reason = 'Not enough time';
  if (!reason && s.cost > p.cash) reason = 'Not enough cash';
  return reason ? { action, label: s.label, minutes: s.minutes, cost: s.cost, enabled: false, reason } : { action, label: s.label, minutes: s.minutes, cost: s.cost, enabled: true };
}

/** Everything a player could try here and now, including disabled options with reasons. */
export function availableActions(state: GameState, playerId: string): ActionOption[] {
  if (state.config.ruleset === 'classic') return classicAvailableActions(state, playerId);
  const p = state.players[playerId];
  if (!p) return [];
  const loc = locationOf(state, p);
  const f = (feature: string) => (loc?.features as string[] | undefined)?.includes(feature) ?? false;
  const graph = getGraph(state.config.townId);
  const home = homeOf(p);
  const atHome = home !== null && p.node === home.startNode;
  const actions: Action[] = [];

  if (p.job) actions.push({ type: 'work' });
  if (f('employment')) for (const j of JOB_LIST) actions.push({ type: 'apply', jobId: j.id });
  else if (loc) for (const j of JOB_LIST) if (j.employer === loc.id) actions.push({ type: 'apply', jobId: j.id });
  if (f('university')) for (const dg of DEGREE_LIST) actions.push({ type: 'class', degreeId: dg.id });
  if (atHome && p.items.includes('computer')) for (const dg of DEGREE_LIST) actions.push({ type: 'homeStudy', degreeId: dg.id });
  if (loc) for (const it of ITEM_LIST) if (it.store === loc.id) actions.push({ type: 'buyItem', itemId: it.id });
  if (f('pawn')) for (const id of p.items) actions.push({ type: 'pawnItem', itemId: id });
  if (loc) for (const fd of FOOD_LIST) if (fd.location === loc.id) actions.push({ type: 'buyFood', foodId: fd.id });
  if (f('grocery')) actions.push({ type: 'buyGroceries' });
  if (atHome) actions.push({ type: 'cook' }, { type: 'relax', minutes: 60 }, { type: 'relax', minutes: 180 });
  if (loc) for (const ac of ACTIVITY_LIST) if (ac.location === loc.id) actions.push({ type: 'activity', activityId: ac.id });
  if (f('clothing')) for (const t of [1, 2, 3]) actions.push({ type: 'buyClothes', tier: t });
  if (loc) for (const h of HOUSING_LIST) if (h.location === loc.id) actions.push(h.kind === 'rent' ? { type: 'rent', housingId: h.id } : { type: 'offer', housingId: h.id, bid: h.price });
  if (f('bank')) {
    actions.push({ type: 'bank', op: 'deposit', amount: Math.floor(p.cash) }, { type: 'bank', op: 'withdraw', amount: Math.floor(p.savings) });
    actions.push({ type: 'bank', op: 'borrow', amount: 500 }, { type: 'bank', op: 'repay', amount: Math.min(Math.floor(p.loan), Math.floor(p.cash)) });
    actions.push({ type: 'buyInsurance' });
  }
  if (f('newsstand')) for (const n of NEWS_LIST) if (n.via === 'newsstand') actions.push({ type: 'buyNews', sourceId: n.id });
  if (f('start')) actions.push({ type: 'buyBusPass' });
  if (f('clinic')) actions.push({ type: 'clinic' });
  if (f('lottery')) actions.push({ type: 'lottery' });
  if (p.job) actions.push({ type: 'quit' });
  for (const n of graph.town.nodes) if (n.location && n.id !== p.node) actions.push({ type: 'travel', to: n.id });
  actions.push({ type: 'endWeek' });

  return actions.map((a) => describeAction(state, playerId, a));
}

/**
 * Apply an action for a player. Returns a new state; the input is not mutated.
 */
export function applyAction(state: GameState, playerId: string, action: Action): ActionResult | ActionError {
  if (state.config.ruleset === 'classic') return classicApplyAction(state, playerId, action);
  if (state.phase !== 'playing') return { ok: false, reason: 'Game is over' };
  const cur = state.players[playerId];
  if (!cur) return { ok: false, reason: 'Unknown player' };
  if (cur.weekDone) return { ok: false, reason: 'Week is over' };
  // Copy only what an action may touch: the acting player deeply, the shared
  // tables shallowly. History and other players are shared by reference.
  const next: GameState = {
    ...state,
    players: { ...state.players, [playerId]: structuredClone(cur) },
    jobHolders: { ...state.jobHolders },
    achievementsTaken: { ...state.achievementsTaken },
  };
  const p = next.players[playerId]!;

  const s = spec(next, p, action);
  if (typeof s === 'string') return { ok: false, reason: s };
  const reason = s.check();
  if (reason) return { ok: false, reason };
  if (s.minutes > p.minutesLeft) return { ok: false, reason: 'Not enough time' };
  if (s.cost > p.cash) return { ok: false, reason: 'Not enough cash' };

  const minute = p.minutesBudget - p.minutesLeft;
  p.minutesLeft -= s.minutes;
  const out = s.run();
  if (action.type === 'endWeek') p.weekDone = true;
  checkClaims(next, p);
  const event: PlayerEvent = { minute, duration: s.minutes, action, node: p.node, deltas: out.deltas, text: out.text };
  if (out.path) event.path = out.path;
  p.log.push(event);
  return { ok: true, state: next, event };
}

export { effectiveClothingTier, transportModes };
export type { TransportMode };
