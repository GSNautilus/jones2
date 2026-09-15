/**
 * CONTRACT: the week replay timeline. Pure data built from the sim's event
 * logs; the map consumes it through FigurePose. Implemented in
 * `src/replay/timeline.ts` as `buildTimeline()`.
 *
 * Rules
 * - Minute 0 is the start of the week. Each player's log has events with
 *   `minute` (start) and `duration`. A travel event has a `path`; the figure
 *   moves along it at constant speed over the event's duration. Any other
 *   event keeps the figure at `event.node` for its duration and shows the
 *   event's `text` as the caption.
 * - Players have different budgets, so after a player's last event they stay
 *   at their final node with an empty caption.
 * - `totalMinutes` is the largest (minute + duration) across all players.
 */
import type { NodeId, Town, TownGraph } from '@jones2/town';
import type { PlayerEvent, PlayerId } from '@jones2/sim';
import type { FigurePose } from '../map/api';

export interface ReplayFrame {
  minute: number;
  poses: Record<PlayerId, FigurePose>;
  /** What each player is doing right now, for the focus readout. Empty string when idle. */
  captions: Record<PlayerId, string>;
}

export interface ReplayMarker {
  playerId: PlayerId;
  minute: number;
  text: string;
}

export interface ReplayTimeline {
  totalMinutes: number;
  /** Frame at a given minute. Clamped to [0, totalMinutes]. */
  at(minute: number): ReplayFrame;
  /** Every event as a marker, sorted by minute, for the scrub bar. */
  markers: ReplayMarker[];
}

export interface TimelineInput {
  town: Town;
  graph: TownGraph;
  /** Per player, the events of the week being replayed. */
  logs: Record<PlayerId, PlayerEvent[]>;
  /** Where each player started the week. */
  starts: Record<PlayerId, NodeId>;
}

export type BuildTimeline = (input: TimelineInput) => ReplayTimeline;
