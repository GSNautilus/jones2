/** Left panel: port of the debug client's Stats, plus switch-player/abandon. */
import type { ReactNode } from 'react';
import { ACHIEVEMENTS, HOUSING, ITEMS, JOBS, effectiveClothingTier, goalProgress, totalCredits } from '@jones2/sim';
import type { GameStore } from './store';
import { hm, money } from './format';

function StatRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="stat">
      <span>{k}</span>
      <b>{v}</b>
    </div>
  );
}

function GoalBar({ label, v }: { label: string; v: number }) {
  return (
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
}

export function StatsPanel({ store }: { store: GameStore }) {
  const { state, currentPid } = store;
  if (!state || !currentPid) return null;
  const p = state.players[currentPid]!;
  const g = goalProgress(state, p);
  const job = p.job ? JOBS[p.job.jobId]! : null;
  const home = p.home ? HOUSING[p.home]! : null;

  return (
    <>
      <h2 style={{ color: store.playerColors[currentPid] }}>{p.name}</h2>
      <StatRow k="Week" v={state.week} />
      <StatRow k="Time left" v={hm(p.minutesLeft)} />
      <StatRow k="Cash" v={money(p.cash)} />
      <StatRow k="Savings" v={money(p.savings)} />
      <StatRow k="Loan" v={money(p.loan)} />
      <StatRow k="Happiness" v={p.happiness.toFixed(0)} />
      <StatRow k="Health" v={`${p.health.toFixed(0)}${p.sick ? ' (sick)' : ''}`} />
      <StatRow k="Clothing" v={`tier ${p.clothing.tier} (${p.clothing.condition}%) → ${effectiveClothingTier(p)}`} />
      <StatRow k="Job" v={job ? `${job.title} (${p.job!.shiftsThisWeek}/6 shifts)` : 'none'} />
      <StatRow k="Home" v={home ? home.name : 'none'} />
      <StatRow k="Meals" v={`${p.week.meals}/5`} />
      <StatRow k="Groceries" v={p.groceries} />
      <StatRow
        k="Transport"
        v={['walk', p.items.includes('bicycle') && 'bike', p.busPassWeeks > 0 && `bus(${p.busPassWeeks}w)`, p.items.includes('used_car') && 'car']
          .filter(Boolean)
          .join(', ')}
      />
      <StatRow k="Credits" v={totalCredits(p)} />
      <StatRow k="Degrees" v={p.degrees.join(', ') || 'none'} />
      <StatRow
        k="Experience"
        v={
          Object.entries(p.experience)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => `${k}:${v}`)
            .join(' ') || '—'
        }
      />
      <StatRow k="Items" v={p.items.map((i) => ITEMS[i]!.name).join(', ') || 'none'} />

      <h3>Goals</h3>
      <GoalBar label="Money" v={g.money} />
      <GoalBar label="Happiness" v={g.happiness} />
      <GoalBar label="Education" v={g.education} />
      <GoalBar label="Career" v={g.career} />

      <h3>Journal</h3>
      {p.journal.length === 0 && <div className="muted">Nothing known.</div>}
      <ul className="log">
        {p.journal.map((f, i) => (
          <li key={i}>
            wk {f.week}: {f.headline} <span className="muted">({f.source})</span>
          </li>
        ))}
      </ul>

      <h3>Achievements</h3>
      <ul className="log">
        {ACHIEVEMENTS.map((a) => {
          const taken = state.achievementsTaken[a.id];
          return (
            <li key={a.id} className={taken ? 'muted' : ''}>
              {a.name}: {a.description} {taken && <span className="tag">{state.players[taken]!.name}</span>}
            </li>
          );
        })}
      </ul>

      <h3>Switch player</h3>
      {state.playerOrder.map((id) => (
        <button
          key={id}
          className="block"
          disabled={state.players[id]!.weekDone}
          onClick={() => store.setCurrentPid(id)}
          style={{ borderLeftColor: store.playerColors[id], borderLeftWidth: 4 }}
        >
          {state.players[id]!.name}
          {state.players[id]!.weekDone && <small> done</small>}
        </button>
      ))}
      <button onClick={store.reset}>Abandon game</button>
    </>
  );
}
