/**
 * Top-left: this week's log as a drawer, plus the week's economy line. Log
 * stamps use the same day/time convention as the clock and the replay.
 */
import { LOCATIONS } from '@jones2/sim';
import type { GameStore } from '../game/store';
import { Deltas } from '../game/format';
import { Frame, FrameButton } from './Frame';
import { DAY_MINUTES, DAY_START_HOUR } from './clockMath';

/** "D2 10:30" for a number of minutes spent this week. */
export function stamp(minutesSpent: number): string {
  const m = Math.max(0, Math.round(minutesSpent));
  const day = Math.floor(m / DAY_MINUTES) + 1;
  const into = m % DAY_MINUTES;
  const hh = String(DAY_START_HOUR + Math.floor(into / 60)).padStart(2, '0');
  const mm = String(into % 60).padStart(2, '0');
  return `D${day} ${hh}:${mm}`;
}

export function WeekLog({ store, open, onToggle }: { store: GameStore; open: boolean; onToggle: () => void }) {
  const { state, currentPid } = store;
  if (!state || !currentPid) return null;
  const p = state.players[currentPid]!;
  const sales = Object.keys(state.sales);

  return (
    <div className="hud-weeklog">
      <FrameButton onClick={onToggle} active={open} title="This week's log">
        {'☰'} Log{p.log.length > 0 ? ` (${p.log.length})` : ''}
      </FrameButton>
      {open && (
        <Frame
          title={`Week ${state.week}`}
          className="hud-weeklog-drawer"
          actions={
            <FrameButton onClick={onToggle} title="Close">
              {'✕'}
            </FrameButton>
          }
        >
          <div className="hud-tagline">
            wages {'×'}
            {state.economy.wageIndex.toFixed(2)} · prices {'×'}
            {state.economy.priceIndex.toFixed(2)} · rent {'×'}
            {state.economy.rentIndex.toFixed(2)}
            {sales.length > 0 && ` · sale at ${sales.map((l) => LOCATIONS[l]?.name ?? l).join(', ')}`}
          </div>
          <ul className="hud-log">
            {p.log.length === 0 && <li className="hud-hint">Nothing done yet this week.</li>}
            {p.log.map((e, i) => (
              <li key={i}>
                <span className="hud-log-stamp">{stamp(e.minute)}</span> {e.text}
                <Deltas deltas={e.deltas} />
              </li>
            ))}
          </ul>
        </Frame>
      )}
    </div>
  );
}
