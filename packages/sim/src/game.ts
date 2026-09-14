import * as C from './content/config';
import { generateSchedule } from './content/economy';
import { getGraph, weekBudget } from './helpers';
import { seedRng } from './rng';
import type { GameConfig, GameState, PlayerState, WeekCounters } from './types';

export const DEFAULT_GOALS = { money: 10000, happiness: 80, education: 20, career: 75 };

export function emptyCounters(): WeekCounters {
  return { meals: 0, leisureActs: 0, exerciseActs: 0, shopping: 0, classes: 0, workedMinutes: 0 };
}

function newPlayer(id: string, name: string, startNode: string): PlayerState {
  const p: PlayerState = {
    id,
    name,
    node: startNode,
    home: null,
    properties: [],
    minutesLeft: 0,
    minutesBudget: 0,
    cash: C.START_CASH,
    savings: 0,
    loan: 0,
    happiness: C.START_HAPPINESS,
    health: C.START_HEALTH,
    sick: false,
    clothing: { tier: 1, condition: 60 },
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
    week: emptyCounters(),
    weekDone: false,
    log: [],
  };
  p.minutesBudget = weekBudget(p);
  p.minutesLeft = p.minutesBudget;
  return p;
}

export function createGame(config: GameConfig): GameState {
  const graph = getGraph(config.townId);
  const start = graph.town.startNode;
  const horizon = config.mode === 'fixed' && config.weeks ? config.weeks : 120;
  const [rng, schedule] = generateSchedule(seedRng(config.seed), horizon);
  const players: Record<string, PlayerState> = {};
  for (const ps of config.players) players[ps.id] = newPlayer(ps.id, ps.name, start);
  return {
    config,
    week: 1,
    phase: 'playing',
    rng,
    players,
    playerOrder: config.players.map((p) => p.id),
    economy: { ...C.ECONOMY_DEFAULTS },
    schedule,
    modifiers: [],
    jobHolders: {},
    propertyOwners: {},
    achievementsTaken: {},
    sales: {},
    winner: null,
    history: [],
  };
}
