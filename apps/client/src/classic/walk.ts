/**
 * A walk: how a player's token moves along a route over real time, so a trip
 * is seen rather than teleported. Pure, so the timing is testable.
 *
 * The walk lasts a time proportional to the trip's game minutes, clamped so a
 * next-door hop still reads as movement and a cross-town trek does not bore.
 * Each leg gets a share of that time proportional to its straight-line
 * length, and the renderer interpolates along the drawn road curve between
 * the leg's endpoints.
 */
import type { FigurePose } from '../map/api';

export interface Pt {
  x: number;
  y: number;
}

export interface WalkLeg {
  from: string;
  to: string;
  /** Fraction of the walk at which this leg starts, 0..1. */
  start: number;
  /** Fraction of the walk at which this leg ends, 0..1. */
  end: number;
}

export interface WalkPlan {
  legs: WalkLeg[];
  /** Real milliseconds the whole walk takes. */
  durationMs: number;
}

/** Real milliseconds per game minute of travel, before clamping. */
export const MS_PER_MINUTE = 22;
export const MIN_WALK_MS = 700;
export const MAX_WALK_MS = 4000;

export function walkDuration(minutes: number): number {
  return Math.max(MIN_WALK_MS, Math.min(MAX_WALK_MS, Math.round(minutes * MS_PER_MINUTE)));
}

/**
 * Plan a walk along `path` (node ids), with `pos` giving each node's position.
 * A path of fewer than two nodes yields no legs and a zero duration.
 */
export function planWalk(path: readonly string[], pos: (id: string) => Pt, minutes: number): WalkPlan {
  if (path.length < 2) return { legs: [], durationMs: 0 };
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const a = pos(path[i - 1]!);
    const b = pos(path[i]!);
    const len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    lengths.push(len);
    total += len;
  }
  const legs: WalkLeg[] = [];
  let acc = 0;
  for (let i = 0; i < lengths.length; i++) {
    const start = acc / total;
    acc += lengths[i]!;
    legs.push({ from: path[i]!, to: path[i + 1]!, start, end: i === lengths.length - 1 ? 1 : acc / total });
  }
  return { legs, durationMs: walkDuration(minutes) };
}

/** Where the walker is at `elapsedMs` into the plan. Past the end, standing at the destination. */
export function walkPose(plan: WalkPlan, elapsedMs: number): FigurePose | null {
  if (plan.legs.length === 0) return null;
  const last = plan.legs[plan.legs.length - 1]!;
  if (plan.durationMs <= 0 || elapsedMs >= plan.durationMs) return { kind: 'at', node: last.to };
  const f = Math.max(0, elapsedMs / plan.durationMs);
  for (const leg of plan.legs) {
    if (f < leg.end) {
      const span = leg.end - leg.start || 1;
      return { kind: 'between', from: leg.from, to: leg.to, t: Math.min(1, Math.max(0, (f - leg.start) / span)), mode: 'walk' };
    }
  }
  return { kind: 'at', node: last.to };
}
