/**
 * Demo week: plays a small scripted week through the sim and replays it.
 * `App.tsx` wires this into the `?replay` mode; not our concern here.
 */
import { useEffect, useMemo } from 'react';
import { TownGraph, riverton, type NodeId, type Town } from '@jones2/town';
import { applyAction, createGame, DEFAULT_GOALS, resolveWeek, type Action, type GameState, type PlayerId } from '@jones2/sim';
import type { TownScene } from '../map/api';
import { ReplayView } from './ReplayView';

export interface ReplayDemoProps {
  scene: TownScene;
}

const TOWN = riverton as Town;

const PLAYER_SETUP: { id: PlayerId; name: string; color: string }[] = [
  { id: 'ann', name: 'Ann', color: '#e0575b' },
  { id: 'bob', name: 'Bob', color: '#4a8fe7' },
  { id: 'cat', name: 'Cat', color: '#4aa564' },
];

/** Scripted weeks, varied per player so the replay has something to show. */
const SCRIPTS: Record<PlayerId, Action[]> = {
  ann: [
    { type: 'travel', to: 'employment' },
    { type: 'apply', jobId: 'fry_cook' },
    { type: 'travel', to: 'monolith' },
    { type: 'buyFood', foodId: 'burger' },
    { type: 'travel', to: 'park' },
    { type: 'activity', activityId: 'stroll' },
    { type: 'travel', to: 'newsstand' },
    { type: 'buyNews', sourceId: 'tabloid' },
    { type: 'endWeek' },
  ],
  bob: [
    { type: 'travel', to: 'employment' },
    { type: 'apply', jobId: 'barista' },
    { type: 'travel', to: 'cafe' },
    { type: 'buyFood', foodId: 'coffee_pastry' },
    { type: 'travel', to: 'gym' },
    { type: 'activity', activityId: 'workout' },
    { type: 'travel', to: 'newsstand' },
    { type: 'buyNews', sourceId: 'daily_bugle' },
    { type: 'endWeek' },
  ],
  cat: [
    { type: 'travel', to: 'employment' },
    { type: 'apply', jobId: 'orderly' },
    { type: 'travel', to: 'clinic' },
    { type: 'clinic' },
    { type: 'travel', to: 'lookout' },
    { type: 'activity', activityId: 'view' },
    { type: 'travel', to: 'newsstand' },
    { type: 'buyNews', sourceId: 'tabloid' },
    { type: 'endWeek' },
  ],
};

/** Apply a scripted sequence of actions, skipping any that fail. */
function playScript(state: GameState, playerId: PlayerId, script: Action[]): GameState {
  let s = state;
  for (const action of script) {
    const result = applyAction(s, playerId, action);
    if (result.ok) s = result.state;
    // Otherwise: skip. The rest of the script still gets a chance to run.
  }
  return s;
}

export function ReplayDemo({ scene }: ReplayDemoProps) {
  const graph = useMemo(() => new TownGraph(TOWN), []);

  const players = useMemo(() => {
    const rec: Record<PlayerId, { name: string; color: string }> = {};
    for (const p of PLAYER_SETUP) rec[p.id] = { name: p.name, color: p.color };
    return rec;
  }, []);

  const starts = useMemo(() => {
    const rec: Record<PlayerId, NodeId> = {};
    for (const p of PLAYER_SETUP) rec[p.id] = TOWN.startNode;
    return rec;
  }, []);

  const logs = useMemo(() => {
    let state = createGame({
      mode: 'classic',
      goals: DEFAULT_GOALS,
      seed: 7,
      townId: 'riverton',
      players: PLAYER_SETUP.map(({ id, name }) => ({ id, name })),
    });
    for (const { id } of PLAYER_SETUP) state = playScript(state, id, SCRIPTS[id]!);
    const { report } = resolveWeek(state);
    return report.logs;
  }, []);

  useEffect(() => {
    scene.setTown(TOWN);
  }, [scene]);

  return <ReplayView scene={scene} town={TOWN} graph={graph} logs={logs} starts={starts} players={players} />;
}
