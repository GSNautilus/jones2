/** Port of the debug client's Setup form, styled as a `.center` card. */
import { useState } from 'react';
import { DEFAULT_GOALS, type GoalTargets } from '@jones2/sim';
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
    <div className="center">
      <h1>Jones 2</h1>
      <label>Players (comma separated)</label>
      <input value={names} onChange={(e) => setNames(e.target.value)} />
      <label>Mode</label>
      <select value={mode} onChange={(e) => setMode(e.target.value as 'classic' | 'fixed')}>
        <option value="classic">Classic race</option>
        <option value="fixed">Fixed length</option>
      </select>
      {mode === 'fixed' && (
        <>
          <label>Weeks</label>
          <input type="number" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
        </>
      )}
      <label>Seed</label>
      <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
      {(['money', 'happiness', 'education', 'career'] as const).map((k) => (
        <div key={k}>
          <label>Goal: {k}</label>
          <input type="number" value={goals[k]} onChange={(e) => setGoals({ ...goals, [k]: Number(e.target.value) })} />
        </div>
      ))}
      <button onClick={start}>Start game</button>
    </div>
  );
}
