import { describe, expect, it } from 'vitest';
import { TownGraph, riverton, type Town } from '@jones2/town';
import type { PlayerEvent } from '@jones2/sim';
import { buildTimeline } from '../../src/replay/timeline';

const TOWN = riverton as Town;
const GRAPH = new TownGraph(TOWN);

// Real riverton nodes/edges: the depot's driveway meets the mill road at
// a_bus_depot (5 min), and the next node west along the road is j_elm (6 min).
const aEvents: PlayerEvent[] = [
  {
    minute: 0,
    duration: 30,
    action: { type: 'travel', to: 'j_elm', mode: 'walk' },
    node: 'j_elm',
    path: ['bus_depot', 'a_bus_depot', 'j_elm'],
    deltas: [],
    text: 'Travelled to j_elm by walk',
  },
  {
    minute: 30,
    duration: 60,
    action: { type: 'work' },
    node: 'j_elm',
    deltas: [],
    text: 'Worked a shift as Fry Cook',
  },
  {
    minute: 90,
    duration: 0,
    action: { type: 'endWeek' },
    node: 'j_elm',
    deltas: [],
    text: 'Ended the week',
  },
];

const bEvents: PlayerEvent[] = [
  {
    minute: 0,
    duration: 10,
    action: { type: 'travel', to: 'a_bus_depot', mode: 'walk' },
    node: 'a_bus_depot',
    path: ['bus_depot', 'a_bus_depot'],
    deltas: [],
    text: 'Travelled to j_center by walk',
  },
];

function buildTestTimeline() {
  return buildTimeline({
    town: TOWN,
    graph: GRAPH,
    logs: { a: aEvents, b: bEvents },
    starts: { a: 'bus_depot', b: 'bus_depot' },
  });
}

describe('buildTimeline', () => {
  it('computes totalMinutes as the max end across players', () => {
    const timeline = buildTestTimeline();
    expect(timeline.totalMinutes).toBe(90);
  });

  it('places the figure at the start node at minute 0', () => {
    const timeline = buildTestTimeline();
    const frame = timeline.at(0);
    expect(frame.poses.a).toEqual({ kind: 'at', node: 'bus_depot' });
  });

  it('is between the right segment part-way through a travel event', () => {
    const timeline = buildTestTimeline();
    // The legs cost 5 and 6 minutes, so the 30-minute trip passes a_bus_depot
    // near minute 14; sample past it to be unambiguously on the second leg.
    const frame = timeline.at(20);
    const pose = frame.poses.a!;
    expect(pose.kind).toBe('between');
    if (pose.kind === 'between') {
      expect(pose.from).toBe('a_bus_depot');
      expect(pose.to).toBe('j_elm');
      expect(pose.t).toBeGreaterThan(0);
      expect(pose.t).toBeLessThan(1);
      expect(pose.mode).toBe('walk');
    }
  });

  it('is at the destination exactly at the end of travel', () => {
    const timeline = buildTestTimeline();
    const frame = timeline.at(30);
    expect(frame.poses.a).toEqual({ kind: 'at', node: 'j_elm' });
  });

  it('shows the event text as caption during a held (non-travel) event', () => {
    const timeline = buildTestTimeline();
    const frame = timeline.at(60); // within the 30..90 work event
    expect(frame.captions.a).toBe('Worked a shift as Fry Cook');
    expect(frame.poses.a).toEqual({ kind: 'at', node: 'j_elm' });
  });

  it('ends at the final node with an empty caption, including at the zero-duration endWeek marker', () => {
    const timeline = buildTestTimeline();
    const atEnd = timeline.at(90);
    expect(atEnd.poses.a).toEqual({ kind: 'at', node: 'j_elm' });
    expect(atEnd.captions.a).toBe('');

    const pastEnd = timeline.at(500);
    expect(pastEnd.minute).toBe(90);
    expect(pastEnd.poses.a).toEqual({ kind: 'at', node: 'j_elm' });
    expect(pastEnd.captions.a).toBe('');
  });

  it('keeps a player idle at their last node once their own log runs out', () => {
    const timeline = buildTestTimeline();
    const frame = timeline.at(80); // b has nothing running after minute 10
    expect(frame.poses.b).toEqual({ kind: 'at', node: 'a_bus_depot' });
    expect(frame.captions.b).toBe('');
  });

  it('produces one marker per event, sorted by minute and stable by player order on ties', () => {
    const timeline = buildTestTimeline();
    expect(timeline.markers).toHaveLength(4);
    expect(timeline.markers.map((m) => [m.playerId, m.minute])).toEqual([
      ['a', 0],
      ['b', 0],
      ['a', 30],
      ['a', 90],
    ]);
  });

  it('clamps at() below 0 and above totalMinutes', () => {
    const timeline = buildTestTimeline();
    const below = timeline.at(-50);
    const zero = timeline.at(0);
    expect(below.minute).toBe(0);
    expect(below.poses.a).toEqual(zero.poses.a);

    const above = timeline.at(1000);
    const total = timeline.at(90);
    expect(above.minute).toBe(90);
    expect(above.poses.a).toEqual(total.poses.a);
  });
});
