/**
 * The two reference screens: GOALS (the original's F6) and STATISTICS. Both are
 * `PanelModel`s, so they are drawn and hit-tested by the same window machinery
 * as the location window and the start-of-week cards.
 */
import {
  classic,
  classicGoalValues,
  classicJobOf,
  cp,
  goalProgress,
  liquidAssets,
  stockValue,
  type GameState,
  type PlayerState,
} from '@jones2/sim';
import type { PanelModel, PanelRow } from './layout';
import { tokenNumber } from './tokens';

const GOAL_KEYS = ['money', 'happiness', 'education', 'career'] as const;
const GOAL_NAMES: Record<(typeof GOAL_KEYS)[number], string> = {
  money: 'WEALTH',
  happiness: 'HAPPINESS',
  education: 'EDUCATION',
  career: 'CAREER',
};

function round(n: number): string {
  return String(Math.round(n));
}

function money(n: number): string {
  const v = Math.round(n);
  return v < 0 ? `-$${Math.abs(v)}` : `$${v}`;
}

/** One bar per goal per player, with the value against the target. */
export function goalsModel(state: GameState): PanelModel {
  const rows: PanelRow[] = [];
  state.playerOrder.forEach((id, seat) => {
    const p = state.players[id]!;
    const progress = goalProgress(state, p);
    const values = classicGoalValues(state, p);
    rows.push({
      key: `${id}-head`,
      text: `${tokenNumber(seat)}. ${p.name}`,
      value: progress.done ? 'WINNER' : `${Math.round((progress.total / 4) * 100)}%`,
      header: true,
    });
    for (const k of GOAL_KEYS) {
      rows.push({
        key: `${id}-${k}`,
        text: `  ${GOAL_NAMES[k]}`,
        value: `${round(values[k])}/${round(state.config.goals[k])}`,
        bar: Math.max(0, Math.min(1, progress[k])),
      });
    }
  });
  return {
    title: 'GOALS',
    bubble: 'ALL FOUR GOALS MET AND THE GAME IS YOURS.',
    rows,
    buttons: [{ key: 'done', label: 'DONE' }],
  };
}

function clothesLine(c: ReturnType<typeof cp>): string {
  const parts = (['casual', 'dress', 'business'] as const)
    .filter((t) => (c.clothes[t] ?? 0) > 0)
    .map((t) => `${t} ${c.clothes[t]}w`);
  return parts.length ? parts.join(', ') : 'none';
}

function degreeNames(c: ReturnType<typeof cp>): string {
  if (c.degrees.length === 0) return 'none';
  return c.degrees
    .map((id) => classic.CLASSIC_DEGREES[id as classic.ClassicDegreeId]?.name ?? id)
    .join(', ');
}

function itemNames(c: ReturnType<typeof cp>): string {
  if (c.items.length === 0) return 'none';
  return c.items.map((id) => classic.ALL_CLASSIC_ITEMS[id]?.name ?? id).join(', ');
}

/** Everything the player owns, earns and is, on one screen. */
export function statsModel(state: GameState, p: PlayerState): PanelModel {
  const c = cp(p);
  const job = classicJobOf(p);
  const stocks = stockValue(state, p);
  const rows: PanelRow[] = [
    { key: 'h-money', text: 'MONEY', header: true },
    { key: 'cash', text: 'Cash', value: money(p.cash) },
    { key: 'savings', text: 'Bank savings', value: money(p.savings) },
    { key: 'stocks', text: 'Stocks', value: money(stocks) },
    { key: 'loan', text: 'Loan owed', value: money(p.loan) },
    { key: 'net', text: 'Liquid assets', value: money(liquidAssets(state, p)) },

    { key: 'h-work', text: 'WORK', header: true },
    { key: 'job', text: 'Job', value: job ? job.title : 'unemployed' },
    { key: 'wage', text: 'Wage', value: job ? `${money(c.wage)}/h` : '-' },
    { key: 'dep', text: 'Dependability', value: round(c.dependability) },
    { key: 'exp', text: 'Experience', value: round(c.experience) },
    { key: 'relax', text: 'Relaxation', value: round(c.relaxation) },
    { key: 'happy', text: 'Happiness', value: round(p.happiness) },

    { key: 'h-life', text: 'LIFE', header: true },
    { key: 'home', text: 'Home', value: classic.CLASSIC_HOUSING[c.housing]?.name ?? c.housing },
    {
      key: 'rent',
      text: 'Rent',
      value: c.rentDebt > 0 ? `${money(c.rentDebt)} owed` : `${money(c.rent)} due wk ${c.rentDueWeek}`,
    },
    { key: 'food', text: 'Fresh food', value: `${c.freshFood} weeks` },
    { key: 'clothes', text: 'Clothes', value: clothesLine(c) },
    { key: 'degrees', text: 'Degrees', value: degreeNames(c) },
    { key: 'items', text: 'Items', value: itemNames(c) },
  ];
  return {
    title: `${p.name.toUpperCase()} - STATISTICS`,
    rows,
    buttons: [{ key: 'done', label: 'DONE' }],
  };
}
