/**
 * Classic-ruleset balance run: one player per scripted strategy, N games, and a report of when
 * each goal is first met.
 *   npm run balance -- --ruleset classic --games 30 --weeks 60 [--town classic|riverton]
 */
import {
  applyAction,
  classicGoalValues,
  CLASSIC_DEFAULT_GOALS,
  cp,
  createGame,
  resolveWeek,
  type GameState,
  type GoalTargets,
} from '@jones2/sim';
import { CLASSIC_STRATEGIES } from './classic-strategies';

const GOAL_KEYS = ['money', 'happiness', 'education', 'career'] as const;
type GoalKey = (typeof GOAL_KEYS)[number];

export interface ClassicOutcome {
  winner: string | null;
  weeks: number;
  /** strategy -> goal -> the week it was first met (null if never). */
  firstMet: Record<string, Record<GoalKey, number | null>>;
  /** strategy -> week -> the four goal values. */
  byWeek: Record<string, { week: number; values: Record<GoalKey, number> }[]>;
  final: Record<string, { values: Record<GoalKey, number>; job: string | null; degrees: number; cash: number }>;
}

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function playGame(seed: number, maxWeeks: number, goals: GoalTargets, names: string[], townId: string): ClassicOutcome {
  let s: GameState = createGame({
    mode: 'classic',
    ruleset: 'classic',
    goals,
    seed,
    townId,
    players: names.map((n) => ({ id: n, name: n })),
  });
  const rng = mulberry(seed * 7919);
  const firstMet: ClassicOutcome['firstMet'] = {};
  const byWeek: ClassicOutcome['byWeek'] = {};
  for (const n of names) {
    firstMet[n] = { money: null, happiness: null, education: null, career: null };
    byWeek[n] = [];
  }

  const sample = (state: GameState) => {
    for (const n of names) {
      const v = classicGoalValues(state, state.players[n]!);
      byWeek[n]!.push({ week: state.week, values: { ...v } });
      for (const k of GOAL_KEYS) if (firstMet[n]![k] === null && v[k] >= goals[k]) firstMet[n]![k] = state.week;
    }
  };

  while (s.phase === 'playing' && s.week <= maxWeeks) {
    sample(s);
    for (const pid of s.playerOrder) {
      let guard = 0;
      while (!s.players[pid]!.weekDone && guard++ < 300) {
        const action = CLASSIC_STRATEGIES[pid]!(s, pid, rng);
        const r = applyAction(s, pid, action);
        if (!r.ok) {
          const e = applyAction(s, pid, { type: 'endWeek' });
          if (e.ok) s = e.state;
          break;
        }
        s = r.state;
      }
      if (!s.players[pid]!.weekDone) {
        const e = applyAction(s, pid, { type: 'endWeek' });
        if (e.ok) s = e.state;
      }
    }
    s = resolveWeek(s).state;
  }
  sample(s);

  const final: ClassicOutcome['final'] = {};
  for (const n of names) {
    const p = s.players[n]!;
    final[n] = {
      values: classicGoalValues(s, p),
      job: cp(p).jobId,
      degrees: cp(p).degrees.length,
      cash: Math.round(p.cash + p.savings),
    };
  }
  return { winner: s.winner, weeks: s.history.length, firstMet, byWeek, final };
}

export function runClassic(games: number, maxWeeks: number, townId = 'classic'): void {
  const goals = CLASSIC_DEFAULT_GOALS;
  const names = Object.keys(CLASSIC_STRATEGIES);
  const t0 = Date.now();
  const outcomes: ClassicOutcome[] = [];
  for (let g = 0; g < games; g++) outcomes.push(playGame(1000 + g, maxWeeks, goals, names, townId));
  const ms = Date.now() - t0;

  console.log(`\nCLASSIC ruleset: ${games} games, cap ${maxWeeks} weeks, goals ${JSON.stringify(goals)}`);
  console.log(`${ms}ms (${Math.round(ms / games)}ms/game)\n`);

  const wins: Record<string, number> = {};
  for (const o of outcomes) if (o.winner) wins[o.winner] = (wins[o.winner] ?? 0) + 1;
  const finished = outcomes.filter((o) => o.winner);
  console.log(
    `Games won: ${finished.length}/${games}` +
      (finished.length ? `, average week ${Math.round(finished.reduce((s, o) => s + o.weeks, 0) / finished.length)}` : ''),
  );

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const rows = names.map((n) => {
    const row: Record<string, string | number> = { strategy: n, wins: wins[n] ?? 0 };
    for (const k of GOAL_KEYS) {
      row[`${k} (goal ${goals[k]})`] = Math.round(avg(outcomes.map((o) => o.final[n]!.values[k])));
      const met = outcomes.map((o) => o.firstMet[n]![k]).filter((w): w is number => w !== null);
      row[`${k} met`] = met.length ? `wk ${Math.round(avg(met))} (${met.length}/${games})` : '-';
    }
    row['degrees'] = Math.round(avg(outcomes.map((o) => o.final[n]!.degrees)) * 10) / 10;
    return row;
  });
  console.table(rows);

  // Goal progress every ten weeks, averaged over the games.
  const marks = [1, 10, 20, 30, 40, 50, 60].filter((w) => w <= maxWeeks);
  console.log('\nAverage goal values by week');
  const progress = marks.map((w) => {
    const row: Record<string, string | number> = { week: w };
    for (const n of names) {
      const vals = outcomes
        .map((o) => o.byWeek[n]!.find((x) => x.week === w))
        .filter((x): x is { week: number; values: Record<GoalKey, number> } => !!x);
      row[n] = vals.length
        ? GOAL_KEYS.map((k) => `${k[0]}${Math.round(avg(vals.map((v) => v.values[k])))}`).join(' ')
        : '-';
    }
    return row;
  });
  console.table(progress);
  console.log('(m = wealth, h = happiness, e = education, c = career)');
}
