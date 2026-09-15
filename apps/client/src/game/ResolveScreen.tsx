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
import { Frame, FrameButton } from '../hud/Frame';
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
      <div className="hud-modal">
        <Frame title={winner ? `${winner.name} wins!` : 'Game over'} className="hud-modal-card">
          {lastReport && <ReportNotes report={lastReport} state={state} />}
          <FrameButton onClick={store.reset}>New game</FrameButton>
        </Frame>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="hud-modal">
        <Frame title={`Week ${state.week} — everyone is done`} className="hud-modal-card">
          <p className="hud-tagline">Resolve the week to see how it played out.</p>
          <div className="hud-row hud-row-wrap">
            <FrameButton
              onClick={() => {
                setReplayStarts(weekStarts);
                store.resolve();
                setStep('replay');
              }}
            >
              Resolve the week
            </FrameButton>
            <FrameButton onClick={store.reset}>Abandon game</FrameButton>
          </div>
        </Frame>
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
        <FrameButton className="skip" onClick={() => setStep('done')}>
          Skip replay
        </FrameButton>
      </div>
    );
  }

  // step === 'done', game still playing: show the report, then continue.
  return (
    <div className="hud-modal">
      <Frame title={`Week ${lastReport ? lastReport.week : state.week} resolved`} className="hud-modal-card">
        {lastReport && <ReportNotes report={lastReport} state={state} />}
        <FrameButton onClick={onExit}>Continue</FrameButton>
      </Frame>
    </div>
  );
}
