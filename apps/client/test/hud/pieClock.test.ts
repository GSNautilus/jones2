/**
 * The clock now FILLS like a pie as the week is spent (PLAN §4). The old drain
 * ring maths is still there and still tested in `clockMath.test.ts`, because the
 * Jones 2 screen reads the same numbers the other way round.
 */
import { describe, expect, it } from 'vitest';
import { DAYS_PER_WEEK, DAY_MINUTES, pieFraction, pieSweep, previewWedge, ringFraction } from '../../src/hud/clockMath';

const WEEK = DAY_MINUTES * DAYS_PER_WEEK; // 3600 minutes = 60 hours

describe('pieFraction', () => {
  it('is 0 at the start of the week and 1 when it is spent', () => {
    expect(pieFraction(WEEK, WEEK)).toBe(0);
    expect(pieFraction(0, WEEK)).toBe(1);
    expect(pieFraction(WEEK / 4, WEEK)).toBeCloseTo(0.75);
  });

  it('is exactly the complement of the drain ring', () => {
    for (const left of [0, 137, 1800, 3599, WEEK]) {
      expect(pieFraction(left, WEEK) + ringFraction(left, WEEK)).toBeCloseTo(1);
    }
  });

  it('clamps out-of-range input and reads a zero budget as full', () => {
    expect(pieFraction(WEEK * 2, WEEK)).toBe(0);
    expect(pieFraction(-10, WEEK)).toBe(1);
    expect(pieFraction(10, 0)).toBe(1);
  });

  it('sweeps clockwise in degrees', () => {
    expect(pieSweep(WEEK, WEEK)).toBe(0);
    expect(pieSweep(WEEK / 2, WEEK)).toBeCloseTo(180);
    expect(pieSweep(0, WEEK)).toBe(360);
  });
});

describe('previewWedge', () => {
  it('starts where the fill ends and runs on by the cost', () => {
    const w = previewWedge(WEEK, WEEK, 6 * 60)!;
    expect(w.from).toBe(0);
    expect(w.to).toBeCloseTo(0.1);
    expect(w.clipped).toBe(false);
  });

  it('follows the fill as the week is spent', () => {
    const left = WEEK - 12 * 60;
    const w = previewWedge(left, WEEK, 6 * 60)!;
    expect(w.from).toBeCloseTo(0.2);
    expect(w.to).toBeCloseTo(0.3);
  });

  it('is clipped at 12 o clock when the action does not fit', () => {
    const w = previewWedge(60, WEEK, 6 * 60)!;
    expect(w.to).toBe(1);
    expect(w.clipped).toBe(true);
  });

  it('is nothing to show for a free action, a spent week or no budget', () => {
    expect(previewWedge(WEEK, WEEK, 0)).toBeNull();
    expect(previewWedge(0, WEEK, 60)).toBeNull();
    expect(previewWedge(WEEK, 0, 60)).toBeNull();
  });
});
