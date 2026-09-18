/**
 * Which buildings the classic ruleset opens, and what the clerk says when you
 * walk in. The sim owns both facts; this file is the client's small, testable
 * view of them.
 *
 * The town draws 35 buildings. The classic ruleset uses 13 of them; the Bus
 * Depot is the arrival point; the other 21 are scenery and get a CLOSED board
 * hung on them (PLAN §1 decision 2).
 */
import { classic } from '@jones2/sim';
import type { Town } from '@jones2/town';

/** The 13 location ids the classic ruleset opens. */
export const CLASSIC_LOCATION_IDS: readonly string[] = Object.keys(classic.CLASSIC_LOCATIONS);

const CLASSIC_SET = new Set(CLASSIC_LOCATION_IDS);

/** Is this sim location id one the classic ruleset opens? */
export function isClassicLocation(id: string | null | undefined): boolean {
  return !!id && CLASSIC_SET.has(id);
}

/**
 * The Bus Depot is where everyone arrives (the town's start node). It is not
 * a classic location and offers nothing, but it is not shut either: no CLOSED
 * board, no "Closed" card, just nothing to do.
 */
export function isArrivalLocation(id: string | null | undefined): boolean {
  return id === 'bus_depot';
}

/** A building that exists on the map but is shut in the classic ruleset. */
export function isClosedLocation(id: string | null | undefined): boolean {
  return !!id && !CLASSIC_SET.has(id) && !isArrivalLocation(id);
}

/** Display name for any location id, classic or not. */
export function locationName(id: string): string {
  const c = classic.CLASSIC_LOCATIONS[id as classic.ClassicLocationId];
  return c ? c.name : (id.replace(/_/g, ' ').toUpperCase());
}

/** Every node on the town that carries a shut location, with its location id. */
export function closedNodes(town: Town): { node: string; location: string }[] {
  const out: { node: string; location: string }[] = [];
  for (const n of town.nodes) {
    if (n.location && isClosedLocation(n.location)) out.push({ node: n.id, location: n.location });
  }
  return out;
}

/**
 * The two apartments have no clerk quotes of their own in the wiki (the Rent
 * Office does the talking), so they get a line of their own here.
 */
const FALLBACK_GREETING: Record<string, string> = {
  lowcost: 'Home, such as it is. The chair is disgusting but it is yours.',
  security_apts: 'Home. The doorman almost remembers your name.',
};

/**
 * The clerk's greeting, rotated: `n` is how many times this window has been
 * opened, so a second visit gets the next line rather than the same one.
 */
export function greetingFor(id: string, n: number): string {
  const loc = classic.CLASSIC_LOCATIONS[id as classic.ClassicLocationId];
  const lines = loc?.greetings ?? [];
  if (lines.length === 0) return FALLBACK_GREETING[id] ?? '';
  return lines[greetingIndex(id, n)]!;
}

/** Which of the location's greetings visit `n` shows (the spoken line follows it). */
export function greetingIndex(id: string, n: number): number {
  const loc = classic.CLASSIC_LOCATIONS[id as classic.ClassicLocationId];
  const len = loc?.greetings.length ?? 0;
  if (len === 0) return 0;
  return ((n % len) + len) % len;
}

/** Portrait key for a location (the portrait catalogue is keyed by location id). */
export function portraitFor(id: string): string {
  return id;
}
