import { describe, expect, it } from 'vitest';
import {
  DAYS_PER_WEEK,
  DAY_MINUTES,
  dayIndex,
  formatHM,
  formatTimeOfDay,
  hourAngle,
  minuteAngle,
  minuteOfDay,
  previewArc,
  readClock,
  ringFraction,
  zoneFor,
} from '../../src/hud/clockMath';

const WEEK = DAY_MINUTES * DAYS_PER_WEEK; // 3600 minutes = 60 hours

describe('week shape', () => {
  it('is 60 hours of 5 twelve-hour days', () => {
    expect(DAY_MINUTES).toBe(720);
    expect(WEEK).toBe(3600);
  });
});

describe('ringFraction', () => {
  it('is 1 at the start of the week and 0 when spent', () => {
    expect(ringFraction(WEEK, WEEK)).toBe(1);
    expect(ringFraction(0, WEEK)).toBe(0);
    expect(ringFraction(WEEK / 4, WEEK)).toBeCloseTo(0.25);
  });

  it('clamps out-of-range input and survives a zero budget', () => {
    expect(ringFraction(WEEK * 2, WEEK)).toBe(1);
    expect(ringFraction(-10, WEEK)).toBe(0);
    expect(ringFraction(10, 0)).toBe(0);
  });
});

describe('dayIndex / minuteOfDay', () => {
  it('rolls over every 12 hours and stops at the last day', () => {
    expect(dayIndex(0)).toBe(1);
    expect(dayIndex(DAY_MINUTES - 1)).toBe(1);
    expect(dayIndex(DAY_MINUTES)).toBe(2);
    expect(dayIndex(DAY_MINUTES * 4 + 30)).toBe(5);
    expect(dayIndex(WEEK + 500)).toBe(DAYS_PER_WEEK);
  });

  it('reports minutes into the current day', () => {
    expect(minuteOfDay(0)).toBe(0);
    expect(minuteOfDay(DAY_MINUTES + 90)).toBe(90);
    // A fully spent week reads as the end of the last day, not as day 1 again.
    expect(minuteOfDay(WEEK)).toBe(DAY_MINUTES);
  });
});

describe('hand angles', () => {
  it('puts 08:00 at 240 degrees and sweeps once per game day', () => {
    expect(hourAngle(0)).toBeCloseTo(240); // 8 o'clock
    expect(hourAngle(4 * 60)).toBeCloseTo(0); // noon, straight up
    expect(hourAngle(DAY_MINUTES)).toBeCloseTo(240); // 20:00, back where it started
  });

  it('moves the minute hand once per hour', () => {
    expect(minuteAngle(0)).toBe(0);
    expect(minuteAngle(15)).toBeCloseTo(90);
    expect(minuteAngle(30)).toBeCloseTo(180);
    expect(minuteAngle(60)).toBe(0);
  });
});

describe('zones', () => {
  it('goes green -> amber -> red as the ring drains', () => {
    expect(zoneFor(1)).toBe('green');
    expect(zoneFor(0.5)).toBe('green');
    expect(zoneFor(0.49)).toBe('amber');
    expect(zoneFor(0.2)).toBe('amber');
    expect(zoneFor(0.19)).toBe('red');
    expect(zoneFor(0)).toBe('red');
  });
});

describe('readClock', () => {
  it('reads an untouched week', () => {
    const r = readClock(WEEK, WEEK);
    expect(r.day).toBe(1);
    expect(r.spent).toBe(0);
    expect(r.hour24).toBe(8);
    expect(r.minute).toBe(0);
    expect(r.ringFraction).toBe(1);
    expect(r.zone).toBe('green');
    expect(formatTimeOfDay(r)).toBe('08:00');
  });

  it('reads a week with 9.5 hours spent', () => {
    const r = readClock(WEEK - 570, WEEK);
    expect(r.day).toBe(1);
    expect(r.hour24).toBe(17);
    expect(r.minute).toBe(30);
    expect(r.hourAngle).toBeCloseTo(((17 % 12) + 30 / 60) * 30);
    expect(r.minuteAngle).toBeCloseTo(180);
  });

  it('reads day 3 morning', () => {
    const r = readClock(WEEK - (DAY_MINUTES * 2 + 60), WEEK);
    expect(r.day).toBe(3);
    expect(formatTimeOfDay(r)).toBe('09:00');
  });

  it('clamps a negative or over-full balance', () => {
    expect(readClock(-5, WEEK).left).toBe(0);
    expect(readClock(WEEK + 100, WEEK).left).toBe(WEEK);
  });

  it('works with a reduced budget (illness, health)', () => {
    const budget = 3000;
    const r = readClock(1500, budget);
    expect(r.ringFraction).toBeCloseTo(0.5);
    expect(r.day).toBe(dayIndex(1500));
  });
});

describe('previewArc', () => {
  it('spans the minutes the action would take, ending at the current ring edge', () => {
    const arc = previewArc(WEEK / 2, WEEK, 360);
    expect(arc).not.toBeNull();
    expect(arc!.to).toBeCloseTo(0.5);
    expect(arc!.from).toBeCloseTo(0.4);
    expect(arc!.clipped).toBe(false);
  });

  it('flags a preview that costs more time than is left', () => {
    const arc = previewArc(60, WEEK, 600);
    expect(arc!.from).toBe(0);
    expect(arc!.clipped).toBe(true);
  });

  it('is null when there is nothing to show', () => {
    expect(previewArc(WEEK, WEEK, 0)).toBeNull();
    expect(previewArc(0, WEEK, 60)).toBeNull();
    expect(previewArc(WEEK, 0, 60)).toBeNull();
  });
});

describe('formatHM', () => {
  it('formats the digital readout', () => {
    expect(formatHM(3276)).toBe('54h 36m');
    expect(formatHM(0)).toBe('0h 00m');
    expect(formatHM(-5)).toBe('0h 00m');
    expect(formatHM(59.6)).toBe('1h 00m');
  });
});
