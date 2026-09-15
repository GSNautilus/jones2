/**
 * The action buttons for wherever the player is standing, grouped by kind.
 * Travel is not here — it happens on the map (see PlayScreen). The heading,
 * the End Week button and the week log now live in the HUD's LocationPanel and
 * WeekLog, so this component renders groups of buttons and nothing else.
 *
 * Every button publishes its minute cost to the time preview on hover, which is
 * what draws the hatched arc on the clock.
 */
import { useMemo, useState } from 'react';
import { HOUSING, availableActions, type Action, type ActionOption } from '@jones2/sim';
import type { GameStore } from './store';
import { usePreviewHandlers } from '../hud/preview';
import { hm } from './format';

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

export function ActionButton({ o, onClick }: { o: ActionOption; onClick: () => void }) {
  const preview = usePreviewHandlers(o.enabled ? o.minutes : null);
  return (
    <>
      <button type="button" className="hud-action" disabled={!o.enabled} title={o.reason} onClick={onClick} {...preview}>
        <span className="hud-action-label">{o.label}</span>
        {o.minutes > 0 && <span className="hud-action-mins">{hm(o.minutes)}</span>}
      </button>
      {!o.enabled && o.reason && <div className="hud-action-reason">{o.reason}</div>}
    </>
  );
}

export interface ActionsPanelProps {
  store: GameStore;
  /** Options to render; defaults to everything available here except travel and endWeek. */
  options?: ActionOption[];
}

export function ActionsPanel({ store, options }: ActionsPanelProps) {
  const { state, currentPid } = store;
  const [bid, setBid] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState(100);

  const computed = useMemo(
    () => (state && currentPid ? availableActions(state, currentPid) : []),
    [state, currentPid],
  );

  if (!state || !currentPid) return null;
  const here = (options ?? computed).filter((o) => o.action.type !== 'travel' && o.action.type !== 'endWeek');

  const groups = new Map<Kind, ActionOption[]>();
  for (const o of here) {
    const k = kindOf(o.action);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(o);
  }

  return (
    <>
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
                    <input
                      className="hud-action-input"
                      type="number"
                      value={b}
                      onChange={(e) => setBid({ ...bid, [h]: Number(e.target.value) })}
                    />
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
                    {op === 'deposit' && (
                      <input
                        className="hud-action-input"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                      />
                    )}
                    <ActionButton o={{ ...o, label: `${op} $${amount}` }} onClick={() => store.act({ ...bankAction, amount })} />
                  </div>
                );
              }
              return <ActionButton key={i} o={o} onClick={() => store.act(o.action)} />;
            })}
          </div>
        );
      })}
    </>
  );
}
