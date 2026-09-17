import { describe, expect, it } from 'vitest';
import { MAX_WALK_MS, MIN_WALK_MS, planWalk, walkDuration, walkPose } from '../../src/classic/walk';

const POS: Record<string, { x: number; y: number }> = {
  a: { x: 0, y: 0 },
  b: { x: 100, y: 0 },
  c: { x: 100, y: 300 },
};
const pos = (id: string) => POS[id]!;

describe('walkDuration', () => {
  it('scales with trip minutes and clamps at both ends', () => {
    expect(walkDuration(1)).toBe(MIN_WALK_MS);
    expect(walkDuration(60)).toBeGreaterThan(MIN_WALK_MS);
    expect(walkDuration(60)).toBeLessThan(MAX_WALK_MS);
    expect(walkDuration(10_000)).toBe(MAX_WALK_MS);
    expect(walkDuration(120)).toBeGreaterThan(walkDuration(60));
  });
});

describe('planWalk', () => {
  it('splits the walk into legs proportional to their length', () => {
    const plan = planWalk(['a', 'b', 'c'], pos, 60);
    expect(plan.legs).toHaveLength(2);
    expect(plan.legs[0]).toMatchObject({ from: 'a', to: 'b', start: 0 });
    expect(plan.legs[0]!.end).toBeCloseTo(0.25);
    expect(plan.legs[1]).toMatchObject({ from: 'b', to: 'c', end: 1 });
    expect(plan.legs[1]!.start).toBeCloseTo(0.25);
  });

  it('yields no legs for a path shorter than two nodes', () => {
    expect(planWalk(['a'], pos, 30)).toEqual({ legs: [], durationMs: 0 });
    expect(planWalk([], pos, 30).legs).toHaveLength(0);
  });
});

describe('walkPose', () => {
  const plan = planWalk(['a', 'b', 'c'], pos, 60);

  it('is between the first pair at the start and the second pair later', () => {
    const early = walkPose(plan, plan.durationMs * 0.1);
    expect(early).toMatchObject({ kind: 'between', from: 'a', to: 'b', mode: 'walk' });
    const late = walkPose(plan, plan.durationMs * 0.6);
    expect(late).toMatchObject({ kind: 'between', from: 'b', to: 'c' });
    if (late && late.kind === 'between') {
      expect(late.t).toBeGreaterThan(0.4);
      expect(late.t).toBeLessThan(0.5);
    }
  });

  it('stands at the destination once the time is up', () => {
    expect(walkPose(plan, plan.durationMs)).toEqual({ kind: 'at', node: 'c' });
    expect(walkPose(plan, plan.durationMs * 5)).toEqual({ kind: 'at', node: 'c' });
  });

  it('returns null for an empty plan', () => {
    expect(walkPose({ legs: [], durationMs: 0 }, 100)).toBeNull();
  });
});
