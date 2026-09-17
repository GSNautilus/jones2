/**
 * Pure clock maths for the HUD. No DOM, no React — everything the big clock
 * needs to turn "minutes left this week" into hand angles, a ring fraction and
 * a day index lives here so it can be unit tested.
 *
 * A week is 60 hours = 5 game days of 12 hours (08:00 → 20:00), matching the
 * sim (`HOURS_PER_WEEK`) and the replay's clock (`src/replay/ReplayView.tsx`).
 * Log entries carry `minute = minutesBudget - minutesLeft`, i.e. minutes spent,
 * so the HUD uses the same convention.
 */

/** Minutes in one game day. */
export const DAY_MINUTES = 12 * 60;
/** Days in one game week. */
export const DAYS_PER_WEEK = 5;
/** Wall-clock hour a game day starts at. */
export const DAY_START_HOUR = 8;
/** Hours on the clock face. */
export const FACE_HOURS = 12;

/** Ring colour zones, by fraction of the week's budget still left. */
export const AMBER_BELOW = 0.5;
export const RED_BELOW = 0.2;

export type ClockZone = 'green' | 'amber' | 'red';

export interface ClockReading {
  /** Minutes still available this week (clamped to 0..budget). */
  left: number;
  /** Minutes already spent this week. */
  spent: number;
  /** Minutes the week started with. */
  budget: number;
  /** 1-based day of the week, 1..DAYS_PER_WEEK. */
  day: number;
  /** Minutes into the current day, 0..DAY_MINUTES-1. */
  minuteOfDay: number;
  /** Wall-clock hour on a 24h scale (8..20). */
  hour24: number;
  /** Wall-clock minute within the hour. */
  minute: number;
  /** Degrees clockwise from 12 o'clock. */
  hourAngle: number;
  minuteAngle: number;
  /** 1 = week untouched, 0 = no time left. */
  ringFraction: number;
  zone: ClockZone;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Fraction of the week's budget still unspent, 0..1. A zero budget reads as empty. */
export function ringFraction(minutesLeft: number, minutesBudget: number): number {
  if (!(minutesBudget > 0)) return 0;
  return clamp(minutesLeft / minutesBudget, 0, 1);
}

/** 1-based day index for a number of minutes spent. Never past the last day. */
export function dayIndex(minutesSpent: number): number {
  const d = Math.floor(Math.max(0, minutesSpent) / DAY_MINUTES) + 1;
  return clamp(d, 1, DAYS_PER_WEEK);
}

/** Minutes into the current day for a number of minutes spent. */
export function minuteOfDay(minutesSpent: number): number {
  const spent = Math.max(0, minutesSpent);
  if (spent >= DAY_MINUTES * DAYS_PER_WEEK) return DAY_MINUTES; // end of the last day
  return spent % DAY_MINUTES;
}

/** Hour-hand angle in degrees clockwise from 12, sweeping once per game day. */
export function hourAngle(minutesIntoDay: number): number {
  const hours = DAY_START_HOUR + minutesIntoDay / 60;
  return ((hours % FACE_HOURS) / FACE_HOURS) * 360;
}

/** Minute-hand angle in degrees clockwise from 12. */
export function minuteAngle(minutesIntoDay: number): number {
  return ((minutesIntoDay % 60) / 60) * 360;
}

export function zoneFor(fraction: number): ClockZone {
  if (fraction < RED_BELOW) return 'red';
  if (fraction < AMBER_BELOW) return 'amber';
  return 'green';
}

/** Everything the clock needs, from the two numbers the sim exposes. */
export function readClock(minutesLeft: number, minutesBudget: number): ClockReading {
  const budget = Math.max(0, minutesBudget);
  const left = clamp(minutesLeft, 0, budget);
  const spent = budget - left;
  const mod = minuteOfDay(spent);
  const total = DAY_START_HOUR * 60 + mod;
  const fraction = ringFraction(left, budget);
  return {
    left,
    spent,
    budget,
    day: dayIndex(spent),
    minuteOfDay: mod,
    hour24: Math.floor(total / 60),
    minute: Math.round(total % 60),
    hourAngle: hourAngle(mod),
    minuteAngle: minuteAngle(mod),
    ringFraction: fraction,
    zone: zoneFor(fraction),
  };
}

/**
 * The slice of the ring an action would eat: from the fraction that would be
 * left afterwards up to the fraction left now. `null` when there is nothing to
 * preview. `clipped` marks a preview that costs more than is left.
 */
export interface PreviewArc {
  from: number;
  to: number;
  clipped: boolean;
}

export function previewArc(minutesLeft: number, minutesBudget: number, previewMinutes: number): PreviewArc | null {
  if (!(minutesBudget > 0) || !(previewMinutes > 0)) return null;
  const to = ringFraction(minutesLeft, minutesBudget);
  if (to <= 0) return null;
  const after = minutesLeft - previewMinutes;
  const from = ringFraction(after, minutesBudget);
  return { from, to, clipped: after < 0 };
}

/**
 * PIE FILL (PLAN §4). The original's clock fills clockwise as the week is
 * spent, so the time LEFT is the unfilled remainder of the face. This is the
 * complement of `ringFraction`, kept as its own function because the ring
 * drain (which the Jones 2 screen still reads) means the opposite.
 */
export function pieFraction(minutesLeft: number, minutesBudget: number): number {
  if (!(minutesBudget > 0)) return 1;
  return 1 - ringFraction(minutesLeft, minutesBudget);
}

/** Degrees clockwise from 12 that the filled pie sweeps. */
export function pieSweep(minutesLeft: number, minutesBudget: number): number {
  return pieFraction(minutesLeft, minutesBudget) * 360;
}

/**
 * The wedge an action would ADD to the filled pie: it starts where the fill
 * currently ends and runs clockwise by the action's cost. `clipped` marks a
 * cost that does not fit in what is left, and the wedge is cut at 12 o'clock.
 */
export function previewWedge(minutesLeft: number, minutesBudget: number, previewMinutes: number): PreviewArc | null {
  if (!(minutesBudget > 0) || !(previewMinutes > 0)) return null;
  const from = pieFraction(minutesLeft, minutesBudget);
  if (from >= 1) return null;
  const spent = minutesBudget - Math.max(0, Math.min(minutesLeft, minutesBudget));
  const after = (spent + previewMinutes) / minutesBudget;
  return { from, to: Math.min(1, after), clipped: after > 1 };
}

/** "54h 36m" — the digital readout's body (the caller adds "left" / the arrow). */
export function formatHM(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

/** "08:30" for the small time-of-day plate. */
export function formatTimeOfDay(r: ClockReading): string {
  return `${String(r.hour24).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`;
}
