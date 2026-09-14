import { useEffect, useMemo, useState } from 'react';
import {
  ACHIEVEMENTS,
  DEFAULT_GOALS,
  HOUSING,
  ITEMS,
  JOBS,
  LOCATIONS,
  allPlayersDone,
  applyAction,
  availableActions,
  createGame,
  effectiveClothingTier,
  getGraph,
  goalProgress,
  netWorth,
  resolveWeek,
  totalCredits,
  type ActionOption,
  type Delta,
  type GameState,
  type PlayerState,
  type WeekReport,
} from '@jones2/sim';

const STORAGE = 'jones2-debug-state';

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

function save(s: GameState | null) {
  try {
    if (s) localStorage.setItem(STORAGE, JSON.stringify(s));
    else localStorage.removeItem(STORAGE);
  } catch {
    /* ignore */
  }
}

const hm = (m: number) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

function Deltas({ deltas }: { deltas: Delta[] }) {
  if (!deltas.length) return null;
  return (
    <span className="d">
      {' '}
      {deltas
        .filter((d) => Math.abs(d.amount) >= 0.05)
        .map((d, i) => (
          <span key={i} className="tag">
            {d.stat} {d.amount > 0 ? '+' : ''}
            {d.stat === 'cash' || d.stat === 'savings' || d.stat === 'loan' ? Math.round(d.amount) : d.amount.toFixed(1)}
            {d.note ? ` (${d.note})` : ''}
          </span>
        ))}
    </span>
  );
}

function Setup({ onStart }: { onStart: (s: GameState) => void }) {
  const [names, setNames] = useState('Ann, Bob');
  const [mode, setMode] = useState<'classic' | 'fixed'>('classic');
  const [weeks, setWeeks] = useState(30);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [goals, setGoals] = useState({ ...DEFAULT_GOALS });
  return (
    <div className="setup">
      <h1>Jones 2 — debug client</h1>
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
      <button
        onClick={() => {
          const players = names
            .split(',')
            .map((n) => n.trim())
            .filter(Boolean)
            .map((n, i) => ({ id: `p${i}`, name: n }));
          onStart(createGame({ mode, weeks: mode === 'fixed' ? weeks : undefined, goals, seed, townId: 'riverton', players }));
        }}
      >
        Start game
      </button>
    </div>
  );
}

function Stats({ state, p }: { state: GameState; p: PlayerState }) {
  const g = goalProgress(state, p);
  const job = p.job ? JOBS[p.job.jobId]! : null;
  const home = p.home ? HOUSING[p.home]! : null;
  const row = (k: string, v: React.ReactNode) => (
    <div className="stat">
      <span>{k}</span>
      <b>{v}</b>
    </div>
  );
  const bar = (label: string, v: number) => (
    <div>
      <div className="stat">
        <span>{label}</span>
        <span>{Math.round(Math.min(1, v) * 100)}%</span>
      </div>
      <div className="bar">
        <div style={{ width: `${Math.min(100, v * 100)}%` }} />
      </div>
    </div>
  );
  return (
    <>
      <h2>{p.name}</h2>
      {row('Week', state.week)}
      {row('Time left', hm(p.minutesLeft))}
      {row('Cash', money(p.cash))}
      {row('Savings', money(p.savings))}
      {row('Loan', money(p.loan))}
      {row('Happiness', p.happiness.toFixed(0))}
      {row('Health', `${p.health.toFixed(0)}${p.sick ? ' (sick)' : ''}`)}
      {row('Clothing', `tier ${p.clothing.tier} (${p.clothing.condition}%) → ${effectiveClothingTier(p)}`)}
      {row('Job', job ? `${job.title} (${p.job!.shiftsThisWeek}/6 shifts)` : 'none')}
      {row('Home', home ? home.name : 'none')}
      {row('Meals', `${p.week.meals}/5`)}
      {row('Groceries', p.groceries)}
      {row('Transport', ['walk', p.items.includes('bicycle') && 'bike', p.busPassWeeks > 0 && `bus(${p.busPassWeeks}w)`, p.items.includes('used_car') && 'car'].filter(Boolean).join(', '))}
      {row('Credits', totalCredits(p))}
      {row('Degrees', p.degrees.join(', ') || 'none')}
      {row('Experience', Object.entries(p.experience).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(' ') || '—')}
      {row('Items', p.items.map((i) => ITEMS[i]!.name).join(', ') || 'none')}
      <h3>Goals</h3>
      {bar('Money', g.money)}
      {bar('Happiness', g.happiness)}
      {bar('Education', g.education)}
      {bar('Career', g.career)}
      <h3>Journal</h3>
      {p.journal.length === 0 && <div className="d">Nothing known.</div>}
      <ul className="log">
        {p.journal.map((f, i) => (
          <li key={i}>
            wk {f.week}: {f.headline} <span className="d">({f.source})</span>
          </li>
        ))}
      </ul>
      <h3>Achievements</h3>
      <ul className="log">
        {ACHIEVEMENTS.map((a) => {
          const taken = state.achievementsTaken[a.id];
          return (
            <li key={a.id} className={taken ? 'd' : ''}>
              {a.name}: {a.description} {taken && <span className="tag">{state.players[taken]!.name}</span>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Actions({ state, pid, onAct }: { state: GameState; pid: string; onAct: (o: ActionOption) => void }) {
  const p = state.players[pid]!;
  const opts = useMemo(() => availableActions(state, pid), [state, pid]);
  const graph = getGraph(state.config.townId);
  const node = graph.node(p.node);
  const loc = node.location ? LOCATIONS[node.location] : null;
  const here = opts.filter((o) => o.action.type !== 'travel' && o.action.type !== 'endWeek');
  const travel = opts.filter((o) => o.action.type === 'travel');
  const end = opts.find((o) => o.action.type === 'endWeek')!;
  const [bid, setBid] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState(100);
  const Btn = ({ o }: { o: ActionOption }) => (
    <button disabled={!o.enabled} title={o.reason} onClick={() => onAct(o)}>
      {o.label}
      <small>
        {o.minutes ? hm(o.minutes) : ''}
        {o.reason ? ` — ${o.reason}` : ''}
      </small>
    </button>
  );
  return (
    <>
      <h2>{node.name ?? p.node}</h2>
      {loc && <div className="d">{loc.tagline}</div>}
      <h3>Here</h3>
      {here.length === 0 && <div className="d">Nothing to do here.</div>}
      {here.map((o, i) => {
        if (o.action.type === 'offer') {
          const h = o.action.housingId;
          const b = bid[h] ?? o.action.bid;
          return (
            <div key={i}>
              <input type="number" value={b} onChange={(e) => setBid({ ...bid, [h]: Number(e.target.value) })} />
              <Btn o={{ ...o, action: { ...o.action, bid: b }, label: `Offer $${b} on ${HOUSING[h]!.name}` }} />
            </div>
          );
        }
        if (o.action.type === 'bank') {
          const op = o.action.op;
          return (
            <div key={i}>
              {op === 'deposit' && <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />}
              <Btn o={{ ...o, action: { ...o.action, amount: op === 'deposit' || op === 'withdraw' || op === 'borrow' || op === 'repay' ? amount : o.action.amount }, label: `${op} $${amount}` }} />
            </div>
          );
        }
        return <Btn key={i} o={o} />;
      })}
      <h3>Travel</h3>
      {travel
        .sort((a, b) => a.minutes - b.minutes)
        .map((o, i) => (
          <Btn key={i} o={o} />
        ))}
      <h3>Week</h3>
      <Btn o={end} />
    </>
  );
}

function Report({ report, state }: { report: WeekReport; state: GameState }) {
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

export function App() {
  const [state, setState] = useState<GameState | null>(load);
  const [pid, setPid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<WeekReport | null>(null);

  useEffect(() => save(state), [state]);
  useEffect(() => {
    if (!state) return;
    if (!pid || state.players[pid]!.weekDone) {
      const next = state.playerOrder.find((id) => !state.players[id]!.weekDone) ?? null;
      setPid(next);
    }
  }, [state, pid]);

  if (!state) return <Setup onStart={(s) => { setState(s); setReport(null); }} />;

  const reset = () => {
    save(null);
    setState(null);
    setPid(null);
    setReport(null);
  };

  if (state.phase === 'finished') {
    return (
      <div className="setup">
        <h1>{state.players[state.winner!]!.name} wins!</h1>
        {report && <Report report={report} state={state} />}
        <button onClick={reset}>New game</button>
      </div>
    );
  }

  if (allPlayersDone(state)) {
    return (
      <div className="setup">
        <h1>Week {state.week} — everyone is done</h1>
        <button
          onClick={() => {
            const r = resolveWeek(state);
            setReport(r.report);
            setState(r.state);
            setPid(null);
          }}
        >
          Resolve the week
        </button>
        <button onClick={reset}>Abandon game</button>
      </div>
    );
  }

  if (!pid) return null;
  const p = state.players[pid]!;

  const act = (o: ActionOption) => {
    const r = applyAction(state, pid, o.action);
    if (!r.ok) {
      setError(r.reason);
      return;
    }
    setError(null);
    setState(r.state);
  };

  return (
    <div className="wrap">
      <div className="col">
        <Stats state={state} p={p} />
        <h3>Switch player</h3>
        {state.playerOrder.map((id) => (
          <button key={id} disabled={state.players[id]!.weekDone} onClick={() => setPid(id)}>
            {state.players[id]!.name}
            {state.players[id]!.weekDone && <small>done</small>}
          </button>
        ))}
        <button onClick={reset}>Abandon game</button>
      </div>
      <div className="col">
        {error && <div className="warn">{error}</div>}
        <Actions state={state} pid={pid} onAct={act} />
      </div>
      <div className="col">
        {report && <Report report={report} state={state} />}
        <h2>This week</h2>
        <div className="d">
          Economy: wages ×{state.economy.wageIndex.toFixed(2)}, prices ×{state.economy.priceIndex.toFixed(2)}, rent ×{state.economy.rentIndex.toFixed(2)}
          {Object.keys(state.sales).length > 0 && `, sale at ${Object.keys(state.sales).map((l) => LOCATIONS[l]!.name).join(', ')}`}
        </div>
        <ul className="log">
          {p.log.map((e, i) => (
            <li key={i}>
              <span className="d">{hm(e.minute)}</span> {e.text}
              <Deltas deltas={e.deltas} />
            </li>
          ))}
        </ul>
        <h3>Net worth</h3>
        {money(netWorth(p))}
      </div>
    </div>
  );
}
