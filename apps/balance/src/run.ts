/**
 * Headless balance runner.
 *   npm run balance -- --games 50 --weeks 60 --mode classic
 * Plays N games with one player per strategy and reports outcomes.
 */
import { applyAction, createGame, goalProgress, resolveWeek, totalCredits, careerScore, netWorth, DEFAULT_GOALS, type GameState } from '@jones2/sim';
import { STRATEGIES } from './strategies';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : def;
}

const GAMES = Number(arg('games', '30'));
const MAX_WEEKS = Number(arg('weeks', '80'));
const MODE = arg('mode', 'classic') as 'classic' | 'fixed';
const NAMES = Object.keys(STRATEGIES);

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

interface Outcome {
  winner: string | null;
  weeks: number;
  final: Record<string, { money: number; happiness: number; education: number; career: number; health: number; progress: number }>;
}

function playGame(seed: number): Outcome {
  let s: GameState = createGame({
    mode: MODE,
    weeks: MODE === 'fixed' ? MAX_WEEKS : undefined,
    goals: DEFAULT_GOALS,
    seed,
    townId: 'riverton',
    players: NAMES.map((n) => ({ id: n, name: n })),
  });
  const rng = mulberry(seed * 7919);
  while (s.phase === 'playing' && s.week <= MAX_WEEKS) {
    for (const pid of s.playerOrder) {
      let guard = 0;
      while (!s.players[pid]!.weekDone && guard++ < 200) {
        const action = STRATEGIES[pid]!(s, pid, rng);
        const r = applyAction(s, pid, action);
        if (!r.ok) {
          // Strategy proposed something invalid; end the week rather than loop.
          const e = applyAction(s, pid, { type: 'endWeek' });
          if (e.ok) s = e.state;
          break;
        }
        s = r.state;
      }
      if (!s.players[pid]!.weekDone) s = (applyAction(s, pid, { type: 'endWeek' }) as { state: GameState }).state;
    }
    s = resolveWeek(s).state;
  }
  const final: Outcome['final'] = {};
  for (const pid of s.playerOrder) {
    const p = s.players[pid]!;
    final[pid] = {
      money: netWorth(p),
      happiness: p.happiness,
      education: totalCredits(p),
      career: careerScore(p),
      health: p.health,
      progress: goalProgress(s, p).total,
    };
  }
  return { winner: s.winner, weeks: s.history.length, final };
}

const outcomes: Outcome[] = [];
const t0 = Date.now();
for (let g = 0; g < GAMES; g++) outcomes.push(playGame(1000 + g));
const ms = Date.now() - t0;

console.log(`\n${GAMES} games, mode=${MODE}, cap=${MAX_WEEKS} weeks, ${ms}ms (${Math.round(ms / GAMES)}ms/game)\n`);
const wins: Record<string, number> = {};
for (const o of outcomes) if (o.winner) wins[o.winner] = (wins[o.winner] ?? 0) + 1;
const finished = outcomes.filter((o) => o.winner);
const avgWeeks = finished.length ? Math.round(finished.reduce((s, o) => s + o.weeks, 0) / finished.length) : 0;
console.log(`Finished: ${finished.length}/${GAMES}, avg weeks to finish: ${avgWeeks}\n`);

const rows = NAMES.map((n) => {
  const avg = (k: keyof Outcome['final'][string]) => outcomes.reduce((s, o) => s + o.final[n]![k], 0) / outcomes.length;
  return {
    strategy: n,
    wins: wins[n] ?? 0,
    money: Math.round(avg('money')),
    happiness: Math.round(avg('happiness')),
    education: Math.round(avg('education')),
    career: Math.round(avg('career')),
    health: Math.round(avg('health')),
    progress: avg('progress').toFixed(2),
  };
});
console.table(rows);
