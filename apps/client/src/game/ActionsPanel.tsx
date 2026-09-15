/**
 * Right panel: port of the debug client's Actions, minus the travel list
 * (travel now happens on the map — see PlayScreen). Groups "here" actions by
 * kind, keeps the bid/amount inputs for offers and bank ops, and shows the
 * End Week button plus this week's log.
 */
import { useMemo, useState } from 'react';
import { HOUSING, LOCATIONS, availableActions, getGraph, netWorth, type Action, type ActionOption } from '@jones2/sim';
import type { GameStore } from './store';
import { Deltas, hm, money } from './format';

type Kind = 'Work' | 'Jobs' | 'Study' | 'Shop' | 'Eat' | 'Activities' | 'Home' | 'Bank' | 'News' | 'Housing' | 'Other';

const KIND_ORDER: Kind[] = ['Work', 'Jobs', 'Study', 'Shop', 'Eat', 'Activities', 'Home', 'Bank', 'News', 'Housing', 'Other'];

function kindOf(action: Action): Kind {
  switch (action.type) {
    case 'work':
    case 'quit':
      return 'Work';
    case 'apply':
      return 'Jobs';
    case 'class':
    case 'homeStudy':
      return 'Study';
    case 'buyItem':
    case 'pawnItem':
    case 'buyClothes':
      return 'Shop';
    case 'buyFood':
    case 'buyGroceries':
      return 'Eat';
    case 'activity':
    case 'lottery':
      return 'Activities';
    case 'cook':
    case 'relax':
      return 'Home';
    case 'bank':
    case 'buyInsurance':
      return 'Bank';
    case 'buyNews':
      return 'News';
    case 'rent':
    case 'offer':
      return 'Housing';
    case 'buyBusPass':
    case 'clinic':
      return 'Other';
    default:
      return 'Other';
  }
}

function ActionButton({ o, onClick }: { o: ActionOption; onClick: () => void }) {
  return (
    <button className="block" disabled={!o.enabled} title={o.reason} onClick={onClick}>
      {o.label}
      <small>{o.minutes ? hm(o.minutes) : ''}</small>
      {!o.enabled && o.reason && (
        <div className="muted" style={{ fontSize: 11, clear: 'both' }}>
          {o.reason}
        </div>
      )}
    </button>
  );
}

export function ActionsPanel({ store }: { store: GameStore }) {
  const { state, currentPid, error } = store;
  const [bid, setBid] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState(100);

  const opts = useMemo(
    () => (state && currentPid ? availableActions(state, currentPid) : []),
    [state, currentPid],
  );

  if (!state || !currentPid) return null;
  const p = state.players[currentPid]!;
  const graph = getGraph(state.config.townId);
  const node = graph.node(p.node);
  const loc = node.location ? LOCATIONS[node.location] : null;

  const here = opts.filter((o) => o.action.type !== 'travel' && o.action.type !== 'endWeek');
  const end = opts.find((o) => o.action.type === 'endWeek');

  const groups = new Map<Kind, ActionOption[]>();
  for (const o of here) {
    const k = kindOf(o.action);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(o);
  }

  return (
    <>
      {error && <div className="warn">{error}</div>}
      <h2>{node.name ?? p.node}</h2>
      {loc && <div className="muted">{loc.tagline}</div>}

      {KIND_ORDER.map((k) => {
        const items = groups.get(k);
        if (!items || items.length === 0) return null;
        return (
          <div key={k}>
            <h3>{k}</h3>
            {items.map((o, i) => {
              if (o.action.type === 'offer') {
                const offerAction = o.action;
                const h = offerAction.housingId;
                const b = bid[h] ?? offerAction.bid;
                return (
                  <div key={i}>
                    <input type="number" value={b} onChange={(e) => setBid({ ...bid, [h]: Number(e.target.value) })} />
                    <ActionButton
                      o={{ ...o, label: `Offer $${b} on ${HOUSING[h]!.name}` }}
                      onClick={() => store.act({ ...offerAction, bid: b })}
                    />
                  </div>
                );
              }
              if (o.action.type === 'bank') {
                const bankAction = o.action;
                const op = bankAction.op;
                return (
                  <div key={i}>
                    {op === 'deposit' && <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />}
                    <ActionButton
                      o={{ ...o, label: `${op} $${amount}` }}
                      onClick={() => store.act({ ...bankAction, amount })}
                    />
                  </div>
                );
              }
              return <ActionButton key={i} o={o} onClick={() => store.act(o.action)} />;
            })}
          </div>
        );
      })}

      <h3>Week</h3>
      {end && <ActionButton o={end} onClick={() => store.act(end.action)} />}

      <h2>This week</h2>
      <div className="muted">
        Economy: wages {'×'}
        {state.economy.wageIndex.toFixed(2)}, prices {'×'}
        {state.economy.priceIndex.toFixed(2)}, rent {'×'}
        {state.economy.rentIndex.toFixed(2)}
        {Object.keys(state.sales).length > 0 && `, sale at ${Object.keys(state.sales).map((l) => LOCATIONS[l]!.name).join(', ')}`}
      </div>
      <ul className="log">
        {p.log.map((e, i) => (
          <li key={i}>
            <span className="muted">{hm(e.minute)}</span> {e.text}
            <Deltas deltas={e.deltas} />
          </li>
        ))}
      </ul>
      <h3>Net worth</h3>
      {money(netWorth(p))}
    </>
  );
}
