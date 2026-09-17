/**
 * The hover tooltip that follows the cursor over the map (PLAN §4): the
 * building's name and what the trip costs in whole hours, or why it cannot be
 * made this week.
 */

export interface TravelHint {
  /** Location name as the player knows it. */
  name: string;
  /** Whole hours the trip would cost (`routeHours`). */
  hours: number;
  /** Whole hours left in the player's week. */
  hoursLeft: number;
  enabled: boolean;
  /** The sim's reason when the action is disabled. */
  reason?: string;
  /** Shut in the classic ruleset: never travelled to. */
  closed?: boolean;
  /** The player is already standing here. */
  here?: boolean;
}

export const NOT_ENOUGH_TIME = 'Not enough time';

/** "Bank · 2h", or the reason it cannot be done. */
export function travelTooltip(h: TravelHint): string {
  if (h.closed) return `${h.name} · Closed`;
  if (h.here) return `${h.name} · You are here`;
  if (h.enabled) return `${h.name} · ${h.hours}h`;
  if (!h.reason || h.reason === NOT_ENOUGH_TIME) {
    return `${h.name} · Not enough time: ${h.hours}h, ${h.hoursLeft}h left`;
  }
  return `${h.name} · ${h.reason}`;
}

/** Whole hours left, rounded down, from the sim's minutes. */
export function hoursLeft(minutesLeft: number): number {
  return Math.max(0, Math.floor(minutesLeft / 60));
}

/** Whole hours an action costs, from the sim's minutes (always at least 1 if it costs anything). */
export function hoursOf(minutes: number): number {
  return minutes <= 0 ? 0 : Math.max(1, Math.round(minutes / 60));
}
