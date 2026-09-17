/**
 * The four goals, exactly as the original computes them ("# Goals", content/classic/goals.ts):
 *   Wealth    = Liquid Assets / 100
 *   Happiness = the Happiness stat
 *   Education = 1 + 9 * degrees
 *   Career    = 1.25 * Dependability, or 0 while unemployed
 * Each goal target is 10..100 and comes from GameConfig.goals.
 */
import {
  CAREER_DEPENDABILITY_MULTIPLIER,
  CAREER_UNEMPLOYED_VALUE,
  EDUCATION_BASE,
  EDUCATION_PER_DEGREE,
  LIQUID_ASSETS_PER_POINT,
} from '../content/classic';
import type { GameState, PlayerState } from '../types';
import type { GoalProgress } from '../goals';
import { cp, liquidAssets } from './state';

export interface ClassicGoalValues {
  money: number;
  happiness: number;
  education: number;
  career: number;
}

/** The raw stat behind each goal, before it is compared with the target. */
export function goalValues(state: GameState, p: PlayerState): ClassicGoalValues {
  const c = cp(p);
  return {
    money: liquidAssets(state, p) / LIQUID_ASSETS_PER_POINT,
    happiness: p.happiness,
    education: EDUCATION_BASE + EDUCATION_PER_DEGREE * c.degrees.length,
    career: c.jobId ? CAREER_DEPENDABILITY_MULTIPLIER * c.dependability : CAREER_UNEMPLOYED_VALUE,
  };
}

function ratio(value: number, target: number): number {
  return target <= 0 ? 1 : value / target;
}

export function goalProgress(state: GameState, p: PlayerState): GoalProgress {
  const g = state.config.goals;
  const v = goalValues(state, p);
  const money = ratio(Math.max(0, v.money), g.money);
  const happiness = ratio(v.happiness, g.happiness);
  const education = ratio(v.education, g.education);
  const career = ratio(v.career, g.career);
  const capped = [money, happiness, education, career].map((x) => Math.min(1, x));
  return {
    money,
    happiness,
    education,
    career,
    total: capped.reduce((s, x) => s + x, 0),
    score: money + happiness + education + career,
    done: capped.every((x) => x >= 1),
  };
}

/** Sum of how far past each target the player is: the tie-break for simultaneous winners. */
export function goalExcess(state: GameState, p: PlayerState): number {
  const g = state.config.goals;
  const v = goalValues(state, p);
  return (
    Math.max(0, v.money - g.money) +
    Math.max(0, v.happiness - g.happiness) +
    Math.max(0, v.education - g.education) +
    Math.max(0, v.career - g.career)
  );
}
