/** New game form, in the same bevelled frame style as the HUD. */
import { useState } from 'react';
import { DEFAULT_GOALS, type GoalTargets } from '@jones2/sim';
import { Frame, FrameButton } from '../hud/Frame';
import type { GameStore } from './store';

export function SetupScreen({ store }: { store: GameStore }) {
  const [names, setNames] = useState('Ann, Bob');
  const [mode, setMode] = useState<'classic' | 'fixed'>('classic');
  const [weeks, setWeeks] = useState(30);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [goals, setGoals] = useState<GoalTargets>({ ...DEFAULT_GOALS });

  const start = () => {
    const players = names
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n, i) => ({ id: `p${i}`, name: n }));
    if (players.length === 0) return;
    store.start({
      mode,
      weeks: mode === 'fixed' ? weeks : undefined,
      goals,
      seed,
      townId: 'riverton',
      players,
    });
  };

  return (
    <div className="hud-modal setup-stage">
      <Frame title="Jones 2 — new game" className="hud-modal-card setup-card">
        <label>Players (comma separated)</label>
        <input className="hud-action-input" value={names} onChange={(e) => setNames(e.target.value)} />

        <label>Mode</label>
        <select className="hud-action-input" value={mode} onChange={(e) => setMode(e.target.value as 'classic' | 'fixed')}>
          <option value="classic">Classic race</option>
          <option value="fixed">Fixed length</option>
        </select>

        {mode === 'fixed' && (
          <>
            <label>Weeks</label>
            <input className="hud-action-input" type="number" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
          </>
        )}

        <label>Seed</label>
        <input className="hud-action-input" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />

        <div className="setup-goals">
          {(['money', 'happiness', 'education', 'career'] as const).map((k) => (
            <div key={k}>
              <label>Goal: {k}</label>
              <input
                className="hud-action-input"
                type="number"
                value={goals[k]}
                onChange={(e) => setGoals({ ...goals, [k]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>

        <FrameButton onClick={start} className="setup-start">
          Start game
        </FrameButton>
      </Frame>
    </div>
  );
}
