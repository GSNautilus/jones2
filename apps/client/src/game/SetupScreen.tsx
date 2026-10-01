/** New game form, in the same bevelled frame style as the HUD. */
import { useEffect } from 'react';
import { audio } from '../audio';
import { useState } from 'react';
import { CLASSIC_DEFAULT_GOALS, DEFAULT_GOALS, type GameConfig, type GoalTargets, type Ruleset } from '@jones2/sim';
import { Frame, FrameButton } from '../hud/Frame';
import { MAX_PLAYERS, tokenColor, tokenNumber } from '../classic/tokens';
import type { GameStore } from './store';
import { ExpansionsWindow } from './ExpansionsWindow';
import { configExpansions, expansionChoices, expansionSummary } from './expansions';

const GOAL_KEYS = ['money', 'happiness', 'education', 'career'] as const;

/** Classic goals are the original's 10..100 dials; Jones 2 goals are raw stats. */
const CLASSIC_GOAL_MIN = 10;
const CLASSIC_GOAL_MAX = 100;

/** Present on a host device (src/online/): the new game can be an online one instead. */
export interface OnlineSetup {
  /** Create the online game and open it in the host panel. Rejects with a readable message. */
  create: (config: GameConfig) => Promise<void>;
}

export function SetupScreen({ store, online }: { store: GameStore; online?: OnlineSetup }) {
  // Browsers only allow sound after a click; the first click on this screen starts the music.
  useEffect(() => {
    let done = false;
    const onFirst = () => {
      if (done) return;
      done = true;
      void audio.load().then(() => audio.play('newGame'));
    };
    window.addEventListener('pointerdown', onFirst, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirst);
      audio.stop();
    };
  }, []);

  const [where, setWhere] = useState<'here' | 'online'>('here');
  const [creating, setCreating] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const isOnline = !!online && where === 'online';
  // Always the classic rules (see the note where the Rules choice used to be).
  const ruleset: Ruleset = 'classic';
  // The map: 'classic' is the original's ring, 'riverton' the Jones 2 town.
  const [townId, setTownId] = useState<string>('classic');
  // Expansions open closed buildings on the Jones 2 map; ticks are kept across a map switch.
  const [expansions, setExpansions] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const canExpand = expansionChoices(townId).length > 0;
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

  const config = (): GameConfig | null => {
    const players = names
      .map((n, i) => ({ id: `p${i}`, name: n.trim() }))
      .filter((p) => p.name !== '')
      .slice(0, MAX_PLAYERS);
    if (players.length === 0) return null;
    const chosen = configExpansions(townId, expansions);
    return {
      ruleset,
      mode: isClassic ? 'classic' : mode,
      weeks: !isClassic && mode === 'fixed' ? weeks : undefined,
      goals: { ...goals },
      seed,
      townId,
      players,
      // Left out when none, so a plain game's config is unchanged.
      ...(chosen ? { expansions: chosen } : {}),
    };
  };

  const start = () => {
    const c = config();
    if (!c) return;
    if (!isOnline) {
      store.start(c);
      // Leaving #/new: the game just started replaces any saved one.
      if (location.hash.startsWith('#/new')) location.hash = '';
      return;
    }
    setCreating(true);
    setProblem(null);
    online!
      .create(c)
      .catch((e: unknown) => setProblem(e instanceof Error ? e.message : String(e)))
      .finally(() => setCreating(false));
  };

  return (
    <div className="hud-modal setup-stage">
      <Frame title="Jones 2 — new game" className="hud-modal-card setup-card">
        {online && (
          <>
            <label>Where</label>
            <select
              className="hud-action-input"
              value={where}
              onChange={(e) => {
                const w = e.target.value as 'here' | 'online';
                setWhere(w);
              }}
            >
              <option value="here">On this screen — everyone takes turns here</option>
              <option value="online">Online — everyone plays on their own device, one link each</option>
            </select>
          </>
        )}

        {/*
          No Rules choice: every new game uses the classic rules and the classic
          screen (clerks, windows, options), on either map. The extended-design
          ruleset still exists in the sim but only has the early placeholder
          screen, so it is not offered (DESIGN decision log 2026-10-02).
        */}

        <label>Map</label>
        <select
          className="hud-action-input"
          value={townId}
          onChange={(e) => setTownId(e.target.value)}
        >
          <option value="classic">Classic — the original board, a ring of 13 buildings</option>
          <option value="riverton">Jones 2 — Riverton, the river and highway town</option>
        </select>

        {canExpand && (
          <>
            <label>Expansions</label>
            <div className="setup-expansions">
              <FrameButton onClick={() => setPicking(true)}>Expansions…</FrameButton>
              <span className="hud-tagline">{expansionSummary(townId, expansions)}</span>
            </div>
          </>
        )}

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

        {problem && <p className="hud-tagline">{problem}</p>}
        <FrameButton onClick={start} className="setup-start" disabled={creating}>
          {isOnline ? (creating ? 'Creating…' : 'Create online game') : 'Start game'}
        </FrameButton>
        {online && (
          <p className="hud-tagline">
            <a href="#/host">Host panel: your online games and their links</a>
          </p>
        )}
        {store.state && (
          <p className="hud-tagline">
            <a href="#">Back to the game in progress on this screen</a> (starting a new one here replaces it)
          </p>
        )}
      </Frame>
      {picking && canExpand && (
        <ExpansionsWindow townId={townId} chosen={expansions} onChange={setExpansions} onClose={() => setPicking(false)} />
      )}
    </div>
  );
}
