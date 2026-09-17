/**
 * Shared types and tuning constants for the Riverton generator.
 *
 * The canvas is 1920x1152 town units (1 unit = 1 native pixel). Travel rates
 * are pixels of arc length per walking minute; the classic ruleset then
 * charges whole hours (`routeHours`), so the hour ladder in
 * `test/scheme.test.ts` is tuned by moving streets and by these rates.
 */
import type { Pt } from '../geom';
import type { RoadKind } from '../../src/types';

export const W = 1920;
export const H = 1152;
export const MARGIN = 16;

/** Half the drawn width of each road kind, in pixels (matches the renderer). */
export const HALF: Record<RoadKind, number> = { highway: 10, street: 7, busline: 7, path: 4 };

/** Pixels of arc length per minute on foot. The hour ladder lives on these. */
export const PER_MINUTE: Record<RoadKind, number> = { street: 5.25, busline: 5.25, path: 4, highway: 7 };

/** Kerb-to-facade gap: an anchor starts at half the road width plus this. */
export const SETBACK = 12;
/** Longest stretch of street without a node; longer runs get waypoint nodes. */
export const MAX_GAP = 150;

/**
 * A driveway is the walk from the kerb to the door, not a journey. It is
 * clamped to this many minutes so how far a sprite had to be pushed off the
 * road never leaks into the hour ladder.
 */
export const DRIVEWAY_MINUTES: [number, number] = [2, 5];

/** Where a street attaches to another: an arc position, a kerb, a stub length. */
export interface Attach {
  street: string;
  /** Arc length along the other street, or a point on it (nearest arc position). */
  s: number | Pt;
  side: -1 | 1;
  /** How far the perpendicular departure runs before the street bends away. */
  stub?: number;
  /** Junction node id. */
  id: string;
}

/** A named node planted on a street at a fixed arc position. */
export interface Mark {
  id: string;
  s: number | Pt;
}

export interface StreetSpec {
  id: string;
  kind: RoadKind;
  /** Free waypoints, in order. Attachment points are spliced on either end. */
  pts?: Pt[];
  start?: Attach;
  end?: Attach;
  marks?: Mark[];
}

export interface Street {
  id: string;
  kind: RoadKind;
  spec: StreetSpec;
  poly: Pt[];
  cum: number[];
  len: number;
}

export interface LocSpec {
  id: string;
  name: string;
  street: string;
  /** Arc-length address along the street. Ignored when `at` names a junction. */
  s?: number;
  /** Attach straight to an existing named node instead of minting an address. */
  at?: string;
  /**
   * Where along the street the placement search starts, relative to the
   * address. Used to spread the four buildings that share the centre
   * crossroads over its four corners instead of letting them pile up.
   */
  nudge?: number;
  side: -1 | 1;
  pixel: { kind: string; params?: Record<string, string | number | boolean> };
}

/** A river or lake authored as a curve with a width, like a street. */
export interface WaterSpec {
  id: string;
  points: Pt[];
  width: number;
}
