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
import { assignTokens, tokenLabel } from '../classic/tokens';
import { Deltas } from './format';

/** Matches the ReplayView contract in src/replay/types.ts. */
export interface ReplayProps {
  scene: TownScene;
  town: Town;
  graph: TownGraph;
  logs: Record<PlayerId, PlayerEvent[]>;
  starts: Record<PlayerId, NodeId>;
  /** `label` is the figure's map label (a token marker for the classic screen); the name when absent. */
  players: Record<PlayerId, { name: string; color: string; label?: string }>;
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
  if (report.notes.length === 0) return null;
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

/** Hour of the week an event started at, for the log. */
function hourOf(minute: number): string {
  return `${Math.floor(minute / 60)}h`;
}

/**
 * The week's log, one column per player: every action they took with the hour
 * it started at and what it changed. The same events the recap animates.
 */
function PlayerLogs({ report, state }: { report: WeekReport; state: GameState }) {
  return (
    <div className="report-logs">
      {state.playerOrder.map((id) => {
        const events = report.logs[id] ?? [];
        return (
          <div key={id} className="report-log">
            <h4>{state.players[id]!.name}</h4>
            {events.length === 0 ? (
              <p className="hud-tagline">Did nothing this week.</p>
            ) : (
              <ol>
                {events.map((e, i) => (
                  <li key={i}>
                    <span className="report-log-hour">{hourOf(e.minute)}</span> {e.text}
                    {e.deltas.length > 0 && <Deltas deltas={e.deltas} />}
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
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
        <Frame title={winner ? `${winner.name} wins!` : 'Game over'} className="hud-modal-card hud-modal-wide">
          {lastReport && <PlayerLogs report={lastReport} state={state} />}
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
          <p className="hud-tagline">Resolve the week and watch the recap of what everyone did, or go straight to the report.</p>
          <div className="hud-row hud-row-wrap">
            <FrameButton
              onClick={() => {
                setReplayStarts(weekStarts);
                store.resolve();
                setStep('replay');
              }}
            >
              Resolve and watch the recap
            </FrameButton>
            <FrameButton
              onClick={() => {
                store.resolve();
                setStep('done');
              }}
            >
              Skip the recap
            </FrameButton>
          </div>
        </Frame>
      </div>
    );
  }

  if (step === 'replay') {
    if (!replayStarts || !lastReport) return null;
    const graph = getGraph(state.config.townId);
    // The classic screen's players are numbered tokens; they stay tokens in
    // the recap, each on its own seat beside the door so nobody overlaps.
    const classic = state.config.ruleset === 'classic';
    const tokens = assignTokens(state.playerOrder);
    const players: Record<PlayerId, { name: string; color: string; label?: string }> = {};
    for (const id of state.playerOrder) {
      const name = state.players[id]!.name;
      const t = tokens[id]!;
      players[id] = classic
        ? { name, color: t.color, label: tokenLabel(t.token, name) }
        : { name, color: playerColors[id] ?? '#888888' };
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
          Skip recap
        </FrameButton>
      </div>
    );
  }

  // step === 'done', game still playing: show the report, then continue.
  return (
    <div className="hud-modal">
      <Frame title={`Week ${lastReport ? lastReport.week : state.week} resolved`} className="hud-modal-card hud-modal-wide">
        {lastReport && <PlayerLogs report={lastReport} state={state} />}
        {lastReport && <ReportNotes report={lastReport} state={state} />}
        <FrameButton onClick={onExit}>Continue</FrameButton>
      </Frame>
    </div>
  );
}
