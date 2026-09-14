import { jobOf, netWorth } from './helpers';
import type { GameState, PlayerState } from './types';

export interface GoalProgress {
  money: number;
  happiness: number;
  education: number;
  career: number;
  /** Sum of the four, each capped at 1. */
  total: number;
  /** Uncapped sum, used for fixed-length scoring. */
  score: number;
  done: boolean;
}

export function totalCredits(p: PlayerState): number {
  return Object.values(p.credits).reduce((s, c) => s + c, 0);
}

export function careerScore(p: PlayerState): number {
  return jobOf(p)?.prestige ?? 0;
}

/** Ratio toward a target; a target of zero or less counts as already met. */
function ratio(value: number, target: number): number {
  return target <= 0 ? 1 : value / target;
}

export function goalProgress(state: GameState, p: PlayerState): GoalProgress {
  const g = state.config.goals;
  const money = ratio(Math.max(0, netWorth(p)), g.money);
  const happiness = ratio(p.happiness, g.happiness);
  const education = ratio(totalCredits(p), g.education);
  const career = ratio(careerScore(p), g.career);
  const capped = [money, happiness, education, career].map((v) => Math.min(1, v));
  const total = capped.reduce((s, v) => s + v, 0);
  return {
    money,
    happiness,
    education,
    career,
    total,
    score: money + happiness + education + career,
    done: capped.every((v) => v >= 1),
  };
}
