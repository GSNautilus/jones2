/**
 * Implements the CONTRACT in `types.ts`: turns a week's per-player event
 * logs into a `ReplayTimeline` the map and React controls can query cheaply
 * every animation frame.
 *
 * Internals (not exported): for each player we build a flat, time-ordered
 * list of segments covering [0, totalMinutes] with no gaps:
 *  - 'idle'   — no event running; figure holds its last node, caption ''.
 *  - 'held'   — a non-travel event; figure holds `event.node`, caption text.
 *  - 'travel' — a travel event; figure moves along `event.path` at constant
 *               speed by cumulative geometric distance.
 * `at(minute)` binary-searches each player's segment start times (O(log n))
 * and computes the pose/caption from the matched segment in O(path length).
 */
import type { NodeId, TownGraph, TransportMode } from '@jones2/town';
import type { PlayerEvent, PlayerId } from '@jones2/sim';
import type { FigurePose } from '../map/api';
import type {
  BuildTimeline,
  ReplayFrame,
  ReplayMarker,
  ReplayTimeline,
  TimelineInput,
} from './types';

const MODES: TransportMode[] = ['walk', 'bike', 'bus', 'car'];

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function resolveMode(event: PlayerEvent): TransportMode {
  if (event.action.type === 'travel' && event.action.mode) return event.action.mode;
  const m = /by (\w+)\s*$/.exec(event.text);
  const parsed = m?.[1];
  if (parsed && (MODES as string[]).includes(parsed)) return parsed as TransportMode;
  return 'walk';
}

function dist(graph: TownGraph, a: NodeId, b: NodeId): number {
  const na = graph.node(a);
  const nb = graph.node(b);
  return Math.hypot(na.x - nb.x, na.y - nb.y);
}

/** Cumulative geometric distance along a path. cum[0] = 0, cum[i] = distance from path[0] to path[i]. */
function cumulativeDistances(graph: TownGraph, path: NodeId[]): number[] {
  const cum = [0];
  for (let i = 1; i < path.length; i++) {
    cum.push(cum[i - 1]! + dist(graph, path[i - 1]!, path[i]!));
  }
  return cum;
}

type Segment =
  | { start: number; end: number; kind: 'idle'; node: NodeId }
  | { start: number; end: number; kind: 'held'; node: NodeId; text: string }
  | {
      start: number;
      end: number;
      kind: 'travel';
      path: NodeId[];
      cum: number[];
      total: number;
      mode: TransportMode;
      text: string;
      destination: NodeId;
    };

interface PlayerTimeline {
  starts: number[];
  segments: Segment[];
}

function buildPlayerTimeline(
  graph: TownGraph,
  startNode: NodeId,
  events: PlayerEvent[],
  totalMinutes: number,
): PlayerTimeline {
  const sorted = [...events].sort((a, b) => a.minute - b.minute);
  const segments: Segment[] = [];
  let cursor = 0;
  let node = startNode;

  for (const event of sorted) {
    if (event.minute > cursor) {
      segments.push({ start: cursor, end: event.minute, kind: 'idle', node });
      cursor = event.minute;
    }
    if (event.duration <= 0) {
      // Zero-duration events (endWeek, quit, ...) only contribute a marker.
      continue;
    }
    const end = event.minute + event.duration;
    if (event.action.type === 'travel' && event.path && event.path.length >= 2) {
      const cum = cumulativeDistances(graph, event.path);
      segments.push({
        start: event.minute,
        end,
        kind: 'travel',
        path: event.path,
        cum,
        total: cum[cum.length - 1]!,
        mode: resolveMode(event),
        text: event.text,
        destination: event.node,
      });
      node = event.node;
    } else {
      segments.push({ start: event.minute, end, kind: 'held', node: event.node, text: event.text });
      node = event.node;
    }
    cursor = end;
  }

  // Always trail with an idle segment, even a zero-width one at `cursor ===
  // totalMinutes`: this guarantees a query for exactly the last instant (or
  // one past a player's own last event) lands on 'idle' (empty caption)
  // rather than re-matching the previous held/travel segment by its start.
  segments.push({ start: cursor, end: totalMinutes, kind: 'idle', node });

  return { starts: segments.map((s) => s.start), segments };
}

/** Rightmost segment whose start is <= minute. */
function findSegmentIndex(starts: number[], minute: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid]! <= minute) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

function poseAndCaption(segment: Segment, minute: number): { pose: FigurePose; caption: string } {
  if (segment.kind === 'idle') {
    return { pose: { kind: 'at', node: segment.node }, caption: '' };
  }
  if (segment.kind === 'held') {
    return { pose: { kind: 'at', node: segment.node }, caption: segment.text };
  }
  // travel
  const duration = segment.end - segment.start;
  const f = duration > 0 ? clamp((minute - segment.start) / duration, 0, 1) : 1;
  if (segment.total <= 0 || f <= 0) {
    return { pose: { kind: 'at', node: segment.path[0]! }, caption: segment.text };
  }
  if (f >= 1) {
    return { pose: { kind: 'at', node: segment.destination }, caption: segment.text };
  }
  const target = f * segment.total;
  const { cum, path } = segment;
  let i = 0;
  while (i < path.length - 2 && cum[i + 1]! < target) i++;
  const segStart = cum[i]!;
  const segLen = cum[i + 1]! - segStart;
  const t = segLen > 0 ? clamp((target - segStart) / segLen, 0, 1) : 0;
  return {
    pose: { kind: 'between', from: path[i]!, to: path[i + 1]!, t, mode: segment.mode },
    caption: segment.text,
  };
}

export const buildTimeline: BuildTimeline = (input: TimelineInput): ReplayTimeline => {
  const { graph, logs, starts } = input;
  const playerIds: PlayerId[] = Object.keys(starts);

  let totalMinutes = 1;
  for (const id of playerIds) {
    for (const event of logs[id] ?? []) {
      totalMinutes = Math.max(totalMinutes, event.minute + event.duration);
    }
  }

  const playerTimelines: Record<PlayerId, PlayerTimeline> = {};
  for (const id of playerIds) {
    playerTimelines[id] = buildPlayerTimeline(graph, starts[id]!, logs[id] ?? [], totalMinutes);
  }

  const markers: ReplayMarker[] = [];
  for (const id of playerIds) {
    for (const event of logs[id] ?? []) {
      markers.push({ playerId: id, minute: event.minute, text: event.text });
    }
  }
  markers.sort((a, b) => a.minute - b.minute);

  function at(minute: number): ReplayFrame {
    const m = clamp(minute, 0, totalMinutes);
    const poses: Record<PlayerId, FigurePose> = {};
    const captions: Record<PlayerId, string> = {};
    for (const id of playerIds) {
      const pt = playerTimelines[id]!;
      const idx = findSegmentIndex(pt.starts, m);
      const { pose, caption } = poseAndCaption(pt.segments[idx]!, m);
      poses[id] = pose;
      captions[id] = caption;
    }
    return { minute: m, poses, captions };
  }

  return { totalMinutes, at, markers };
};
