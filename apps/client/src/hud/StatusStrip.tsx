/**
 * Bottom-left: who you are, what you have, at a glance. Clicking it opens the
 * full stats drawer (goals, journal, achievements, items). The hot-seat
 * switch-player control lives here too.
 */
import { HOUSING, JOBS, netWorth } from '@jones2/sim';
import type { GameStore } from '../game/store';
import { money } from '../game/format';
import { StatsPanel } from '../game/StatsPanel';
import { Frame, FrameButton } from './Frame';

function PixelBar({ label, value, max = 100, tone }: { label: string; value: number; max?: number; tone: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span className="hud-bar-row" title={`${label} ${Math.round(value)}/${max}`}>
      <span className="hud-bar-label">{label}</span>
      <span className="hud-bar">
        <span className="hud-bar-fill" style={{ width: `${pct}%`, background: tone }} />
      </span>
    </span>
  );
}

export interface StatusStripProps {
  store: GameStore;
  open: boolean;
  onToggle: () => void;
}

export function StatusStrip({ store, open, onToggle }: StatusStripProps) {
  const { state, currentPid } = store;
  if (!state || !currentPid) return null;
  const p = state.players[currentPid]!;
  const colour = store.playerColors[currentPid] ?? '#888888';
  const job = p.job ? JOBS[p.job.jobId]! : null;
  const home = p.home ? HOUSING[p.home]! : null;
  const others = state.playerOrder.filter((id) => id !== currentPid);

  return (
    <div className="hud-status">
      {open && (
        <Frame
          title="Player file"
          className="hud-status-drawer"
          actions={
            <FrameButton onClick={onToggle} title="Close">
              {'✕'}
            </FrameButton>
          }
        >
          <StatsPanel store={store} />
          <div className="hud-row hud-row-wrap" style={{ marginTop: 10 }}>
            <FrameButton onClick={store.reset} title="Abandon this game">
              Abandon game
            </FrameButton>
          </div>
        </Frame>
      )}

      <Frame className="hud-status-strip">
        <button type="button" className="hud-status-main" onClick={onToggle} title="Open the full player file">
          <span className="hud-status-name" style={{ color: colour }}>
            <span className="hud-swatch" style={{ background: colour }} />
            {p.name}
          </span>
          <span className="hud-cash">{money(p.cash)}</span>
          <span className="hud-status-sub">
            net {money(netWorth(p))}
            {p.savings > 0 && ` · sav ${money(p.savings)}`}
            {p.loan > 0 && ` · loan ${money(p.loan)}`}
          </span>
          <PixelBar label="HP" value={p.health} tone="var(--hud-green)" />
          <PixelBar label="HAP" value={p.happiness} tone="var(--hud-brass)" />
          <span className="hud-status-sub">
            {job ? `${job.title} (${p.job!.shiftsThisWeek}/6)` : 'No job'} · {home ? home.name : 'No home'}
            {p.sick && ' · sick'}
          </span>
          <span className="hud-status-hint">{open ? 'Hide details' : 'Details'}</span>
        </button>

        {others.length > 0 && (
          <div className="hud-row hud-row-wrap hud-switch">
            {others.map((id) => (
              <FrameButton
                key={id}
                disabled={state.players[id]!.weekDone}
                onClick={() => store.setCurrentPid(id)}
                title={state.players[id]!.weekDone ? 'Week already ended' : `Switch to ${state.players[id]!.name}`}
              >
                <span className="hud-swatch" style={{ background: store.playerColors[id] }} />
                {state.players[id]!.name}
                {state.players[id]!.weekDone ? ' ✓' : ''}
              </FrameButton>
            ))}
          </div>
        )}
      </Frame>
    </div>
  );
}
