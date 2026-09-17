import { GOAL_MAX, GOAL_MIN } from '../content/classic';
import type { GoalTargets } from '../types';
import { DEFAULT_GOALS } from './config';

/** Classic goals are 10..100 points each; the original's default is 50 across the board. */
export const CLASSIC_DEFAULT_GOALS: GoalTargets = { ...DEFAULT_GOALS };

/** Clamp a set of classic goal targets into the legal 10..100 range. */
export function clampGoals(g: GoalTargets): GoalTargets {
  const c = (v: number) => Math.min(GOAL_MAX, Math.max(GOAL_MIN, Math.round(v)));
  return { money: c(g.money), happiness: c(g.happiness), education: c(g.education), career: c(g.career) };
}
