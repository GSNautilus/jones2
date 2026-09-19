/**
 * The 60-Hour turn and every action's Hour cost. Source: "# Time" (1-31) for the turn/week/month
 * structure, and each action's own section for its Hour cost (cited per entry below). Travel is
 * deliberately NOT included here — per docs/PLAN.md §0/§1, the map charges travel separately.
 */

import { routeHours } from '@jones2/town';

export const HOURS_PER_TURN = 60;
/** Every 4 Weeks (i.e. every 4th player Turn in a single-player game) is a Month. "# Time" (25-31), "# Month" (397-452). */
export const WEEKS_PER_MONTH = 4;

export interface ClassicActionTime {
  id: string;
  label: string;
  hours: number;
  notes: string;
}

/**
 * CONTRADICTION with docs/PLAN.md §0's summary ("Newspaper 1, small purchases 1, etc."): the
 * per-location sections are explicit that ordinary shop purchases (Z-Mart, QT Clothing, Socket
 * City, Monolith Burgers, Black's Market Fresh Food/Lottery) cost 0 Hours and can even be made
 * after the Turn has ended ("you may purchase items even if the turn has ended while you're in
 * the store" — repeated verbatim per store). The ONLY purchase with an Hour cost is the
 * Newspaper (1 Hour) at Black's Market. Followed the detailed per-location sections over the
 * plan's summary line.
 */
export const CLASSIC_ACTION_TIMES: ClassicActionTime[] = [
  {
    id: 'work',
    label: 'Work a shift',
    hours: 6,
    notes: 'Full session pays wage*8; pays proportionally less if fewer than 6 Hours remain. "## Working"/"## Wages" (1472-1613).',
  },
  { id: 'apply', label: 'Apply for a Job', hours: 4, notes: 'Requires >=1 Hour to start. "## Applying for a Job" (1783-1786).' },
  { id: 'raise', label: 'Ask for a Raise', hours: 4, notes: 'Same cost as Apply, at the Employment Office. "## Asking for a Raise" (1881-1884).' },
  { id: 'enroll', label: 'Enroll in a course (Hi-Tech U)', hours: 0, notes: 'No time cost — can even be done after the Turn ends. "## Enrolling" (2594-2612).' },
  { id: 'lesson', label: 'Take a lesson (Hi-Tech U)', hours: 6, notes: 'Requires >=1 Hour to start; takes the whole lesson even with <6 Hours left, no penalty. "## Studying" (2630-2634).' },
  { id: 'relax', label: 'Relax at your Apartment', hours: 6, notes: '"## Relaxation Action" (4745-4748).' },
  { id: 'loan_apply', label: 'Apply for a Loan (Bank)', hours: 2, notes: 'Requires >=1 Hour to start. "## Applying for a Loan" (5315-5317).' },
  { id: 'loan_payment', label: 'Make a Loan Payment (Bank)', hours: 0, notes: 'Allowed even with the clock run out. "## Loan Payments" (5825-5827).' },
  { id: 'broker_access', label: 'See the Broker (Stock Market)', hours: 2, notes: 'Requires >=1 Hour to start; buying/selling stocks themselves costs no extra time. "## Accessing the Stock Market" (5941-5943).' },
  { id: 'bank_deposit_withdraw', label: 'Deposit / withdraw Cash (Bank)', hours: 0, notes: 'Allowed even with the clock run out. "## Bank Account" (5285-5287).' },
  { id: 'newspaper', label: 'Buy a Newspaper (Black’s Market)', hours: 1, notes: "Requires >=1 Hour to start. \"## Items\" (3978-3980); \"# Newspaper\" > \"## Effect\" (5127-5129)." },
  { id: 'shop_purchase', label: 'Buy an item, food, or clothing (any store)', hours: 0, notes: 'Allowed even after the Turn has ended, at every store except the Newspaper. Repeated verbatim in each store’s "## Opening Hours" section.' },
  { id: 'rent_service', label: 'Pay Rent / Extension / Switch / Reduce (Rent Office)', hours: 0, notes: 'No Hour cost stated anywhere in "# Rent Office" > "## Services" (806-909).' },
  { id: 'pawn_service', label: 'Pawn / Redeem / Buy (Pawn Shop)', hours: 0, notes: 'Allowed even after the Turn has ended. "## Opening Hours" (6068-6072).' },
];

export const CLASSIC_ACTION_TIME_MAP: Record<string, ClassicActionTime> = Object.fromEntries(CLASSIC_ACTION_TIMES.map((a) => [a.id, a]));

// Event-driven time costs (not player actions, but still spend Hours) — cross-referenced from
// food.ts/weekend.ts so this file is the single place summarising ALL Hour costs in the ruleset.
export const STARVATION_HOURS = 20; // food.ts STARVATION_HOUR_PENALTY
export const DOCTOR_VISIT_HOURS = 10; // weekend.ts DOCTOR.hourPenalty

/**
 * Travel: the map's route minutes become whole hours (`routeHours`, rounded up, minimum one),
 * then every trip is charged that many hours TIMES the town's `travelHourMultiplier`
 * (`@jones2/town`'s `travelHourMultiplier(town)`). Riverton sets 2 (decided 2026-09-18: trips
 * cost twice the ladder so the big map matters against the 60-hour week); the classic ring sets
 * 1 so a lap is the original's ten hours. The replay and the walk animation keep the route's
 * real minutes, so only the charge changes.
 */
export function travelHours(routeMinutes: number, hourMultiplier = 1): number {
  return routeHours(routeMinutes) * hourMultiplier;
}
