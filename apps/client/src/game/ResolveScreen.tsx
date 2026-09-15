/**
 * Shown once every player has ended their week, and when the game is over.
 * Confirms resolution, then plays the week's replay (via the ReplayView the
 * parent supplies), then shows the WeekReport notes.
 */
import { useState } from 'react';
import type { ComponentType } from 'react';
import { getGraph, type GameState, type PlayerEvent, type PlayerId, type WeekReport } from '@jones2/sim';
import type { NodeId, Town, TownGraph } from '@jones2/town';
import type { TownScene } from '../map/api';
import type { GameStore } from './store';
import { Deltas } from './format';

/** Matches the ReplayView contract in src/replay/types.ts. */
export interface ReplayProps {
  scene: TownScene;
  town: Town;
  graph: TownGraph;
  logs: Record<PlayerId, PlayerEvent[]>;
  starts: Record<PlayerId, NodeId>;
  players: Record<PlayerId, { name: string; color: string }>;
  onDone?: () => void;
}

export interface ResolveScreenProps {
  store: GameStore;
  scene: TownScene;
  ReplayView: ComponentType<ReplayProps>;
  /** Called once the player is done looking at the resolved week and the game continues. */
  onExit: () => void;
}

function ReportNotes({ report, state }: { report: WeekReport; state: GameState }) {
  return (
    <div className="report">
      <b>Week {report.week} resolved</b>
      <ul>
        {report.notes.map((n, i) => (
          <li key={i}>
            {n.player ? <b>{state.players[n.player]!.name}: </b> : <b>Town: </b>}
            {n.text}
            {n.deltas && <Deltas deltas={n.deltas} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Step = 'confirm' | 'replay' | 'done';

export function ResolveScreen({ store, scene, ReplayView, onExit }: ResolveScreenProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [replayStarts, setReplayStarts] = useState<Record<PlayerId, NodeId> | null>(null);
  const { state, lastReport, weekStarts, playerColors } = store;

  if (!state) return null;

  // Finished, and not in the middle of showing this session's replay: either
  // loaded from storage already finished, or the player skipped/finished it.
  if (state.phase === 'finished' && step !== 'replay') {
    const winner = state.winner ? state.players[state.winner] : null;
    return (
      <div className="center">
        <h1>{winner ? `${winner.name} wins!` : 'Game over'}</h1>
        {lastReport && <ReportNotes report={lastReport} state={state} />}
        <button onClick={store.reset}>New game</button>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="center">
        <h1>
          Week {state.week} {'—'} everyone is done
        </h1>
        <button
          onClick={() => {
            setReplayStarts(weekStarts);
            store.resolve();
            setStep('replay');
          }}
        >
          Resolve the week
        </button>
        <button onClick={store.reset}>Abandon game</button>
      </div>
    );
  }

  if (step === 'replay') {
    if (!replayStarts || !lastReport) return null;
    const graph = getGraph(state.config.townId);
    const players: Record<PlayerId, { name: string; color: string }> = {};
    for (const id of state.playerOrder) {
      players[id] = { name: state.players[id]!.name, color: playerColors[id] ?? '#888888' };
    }
    return (
      <div className="replay-wrap">
        <ReplayView
          scene={scene}
          town={graph.town}
          graph={graph}
          logs={lastReport.logs}
          starts={replayStarts}
          players={players}
          onDone={() => setStep('done')}
        />
        <button className="skip" onClick={() => setStep('done')}>
          Skip replay
        </button>
      </div>
    );
  }

  // step === 'done', game still playing: show the report, then continue.
  return (
    <div className="center">
      <h1>Week resolved</h1>
      {lastReport && <ReportNotes report={lastReport} state={state} />}
      <button onClick={onExit}>Continue</button>
    </div>
  );
}
