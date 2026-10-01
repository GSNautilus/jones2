/** Building a classic game: the classic player and the week-1 start-of-week sequence. */
import { DEPENDABILITY_START, EXPERIENCE_START, CLASSIC_HOUSING, RELAXATION, STARTING_CASUAL_WEEKS, STARTING_HOUSING, expansionProblem } from '../content/classic';
import { getGraph } from '../helpers';
import { seedRng } from '../rng';
import type { GameConfig, GameState, PlayerState } from '../types';
import * as K from './config';
import { initEconomy } from './economy';
import { emptyWeekFlags, type ClassicPlayerState } from './state';
import { startWeek } from './turnStart';

export function newClassicPlayerState(): ClassicPlayerState {
  return {
    wage: 0,
    jobId: null,
    dependability: DEPENDABILITY_START,
    experience: EXPERIENCE_START,
    relaxation: RELAXATION.start,
    raises: 0,
    degrees: [],
    lessons: {},
    enrolled: [],
    clothes: { casual: STARTING_CASUAL_WEEKS, dress: 0, business: 0 },
    freshFood: 0,
    ateFastFood: false,
    lotteryTickets: 0,
    items: [],
    itemSource: {},
    housing: STARTING_HOUSING as 'lowcost',
    rent: CLASSIC_HOUSING.lowcost.baseRent,
    // "paid for through the end of the month": the first payment falls due on week 4.
    rentDueWeek: 4,
    rentDebt: 0,
    extensionsApproved: 0,
    extensionUntil: 0,
    everGarnished: false,
    loanDueWeek: 0,
    loanDefaults: 0,
    hasHadLoan: false,
    inDefault: false,
    stocks: {},
    week: emptyWeekFlags(),
    weekStart: [],
  };
}

function newPlayer(id: string, name: string, startNode: string): PlayerState {
  return {
    id,
    name,
    node: startNode,
    home: null,
    properties: [],
    minutesLeft: 0,
    minutesBudget: 0,
    cash: K.START_CASH,
    savings: 0,
    loan: 0,
    happiness: K.START_HAPPINESS,
    // Jones 2 systems that classic does not use keep neutral values.
    health: 100,
    sick: false,
    clothing: { tier: 1, condition: 100 },
    credits: {},
    degrees: [],
    job: null,
    experience: { service: 0, trades: 0, tech: 0, finance: 0, academia: 0 },
    items: [],
    groceries: 0,
    bonusMinutes: 0,
    busPassWeeks: 0,
    insuranceWeeks: 0,
    journal: [],
    applications: [],
    offers: [],
    claims: [],
    achievements: [],
    visited: [startNode],
    week: { meals: 0, leisureActs: 0, exerciseActs: 0, shopping: 0, classes: 0, workedMinutes: 0 },
    weekDone: false,
    log: [],
    classic: newClassicPlayerState(),
  };
}

export function createClassicGame(config: GameConfig): GameState {
  const problem = expansionProblem(config.townId, config.expansions);
  if (problem) throw new Error(problem);
  const graph = getGraph(config.townId);
  const start = graph.town.startNode;
  const players: Record<string, PlayerState> = {};
  for (const ps of config.players) players[ps.id] = newPlayer(ps.id, ps.name, start);
  const state: GameState = {
    config: { ...config, ruleset: 'classic' },
    week: 1,
    phase: 'playing',
    rng: seedRng(config.seed),
    players,
    playerOrder: config.players.map((p) => p.id),
    economy: { priceIndex: 1, wageIndex: 1, rentIndex: 1, savingsRate: 0, loanRate: 0, crimeRate: 0 },
    schedule: [],
    modifiers: [],
    jobHolders: {},
    propertyOwners: {},
    achievementsTaken: {},
    sales: {},
    winner: null,
    history: [],
  };
  initEconomy(state);
  for (const id of state.playerOrder) {
    const p = state.players[id]!;
    startWeek(state, p, true);
    // The map puts everyone at the Bus Depot on week 1 (PLAN §1); later weeks start at home.
    p.node = start;
    p.visited = [start];
  }
  return state;
}
