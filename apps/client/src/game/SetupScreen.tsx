/** New game form, in the same bevelled frame style as the HUD. */
import { useState } from 'react';
import { CLASSIC_DEFAULT_GOALS, DEFAULT_GOALS, type GoalTargets, type Ruleset } from '@jones2/sim';
import { Frame, FrameButton } from '../hud/Frame';
import { MAX_PLAYERS, tokenColor, tokenNumber } from '../classic/tokens';
import type { GameStore } from './store';

const GOAL_KEYS = ['money', 'happiness', 'education', 'career'] as const;

/** Classic goals are the original's 10..100 dials; Jones 2 goals are raw stats. */
const CLASSIC_GOAL_MIN = 10;
const CLASSIC_GOAL_MAX = 100;

export function SetupScreen({ store }: { store: GameStore }) {
  const [ruleset, setRuleset] = useState<Ruleset>('classic');
  const [names, setNames] = useState(['Ann', 'Bob', '', '']);
  const [mode, setMode] = useState<'classic' | 'fixed'>('classic');
  const [weeks, setWeeks] = useState(30);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [classicGoals, setClassicGoals] = useState<GoalTargets>({ ...CLASSIC_DEFAULT_GOALS });
  const [jones2Goals, setJones2Goals] = useState<GoalTargets>({ ...DEFAULT_GOALS });

  const isClassic = ruleset === 'classic';
  const goals = isClassic ? classicGoals : jones2Goals;
  const setGoals = isClassic ? setClassicGoals : setJones2Goals;

  const clampGoal = (v: number) =>
    isClassic ? Math.max(CLASSIC_GOAL_MIN, Math.min(CLASSIC_GOAL_MAX, Math.round(v))) : Math.max(1, Math.round(v));

  const start = () => {
    const players = names
      .map((n, i) => ({ id: `p${i}`, name: n.trim() }))
      .filter((p) => p.name !== '')
      .slice(0, MAX_PLAYERS);
    if (players.length === 0) return;
    store.start({
      ruleset,
      mode: isClassic ? 'classic' : mode,
      weeks: !isClassic && mode === 'fixed' ? weeks : undefined,
      goals: { ...goals },
      seed,
      townId: 'riverton',
      players,
    });
  };

  return (
    <div className="hud-modal setup-stage">
      <Frame title="Jones 2 — new game" className="hud-modal-card setup-card">
        <label>Rules</label>
        <select className="hud-action-input" value={ruleset} onChange={(e) => setRuleset(e.target.value as Ruleset)}>
          <option value="classic">Classic — Jones in the Fast Lane</option>
          <option value="jones2">Jones 2 — the extended design</option>
        </select>

        <label>Players</label>
        <div className="setup-players">
          {names.map((n, i) => (
            <div key={i} className="setup-player">
              <span className="setup-token" style={{ background: tokenColor(i) }}>
                {tokenNumber(i)}
              </span>
              <input
                className="hud-action-input"
                placeholder={i < 2 ? 'name' : 'empty seat'}
                value={n}
                onChange={(e) => setNames(names.map((v, j) => (j === i ? e.target.value : v)))}
              />
            </div>
          ))}
        </div>

        {!isClassic && (
          <>
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
          </>
        )}

        <label>Seed</label>
        <input className="hud-action-input" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />

        <div className="setup-goals">
          {GOAL_KEYS.map((k) => (
            <div key={k}>
              <label>Goal: {k}</label>
              <input
                className="hud-action-input"
                type="number"
                min={isClassic ? CLASSIC_GOAL_MIN : 1}
                max={isClassic ? CLASSIC_GOAL_MAX : undefined}
                value={goals[k]}
                onChange={(e) => setGoals({ ...goals, [k]: clampGoal(Number(e.target.value)) })}
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
