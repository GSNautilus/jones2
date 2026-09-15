/**
 * Right side: the framed interior panel, the original's centre card moved to
 * the edge so the town stays visible. Location name, tagline, the action
 * buttons grouped by kind, and End Week at the foot. At a junction it collapses
 * to a hint.
 */
import { useMemo } from 'react';
import { LOCATIONS, availableActions, getGraph } from '@jones2/sim';
import type { ActionOption } from '@jones2/sim';
import type { GameStore } from '../game/store';
import { ActionsPanel } from '../game/ActionsPanel';
import { Frame, FrameButton } from './Frame';
import { usePreviewHandlers } from './preview';

function EndWeekButton({ option, onClick }: { option: ActionOption; onClick: () => void }) {
  const preview = usePreviewHandlers(option.minutes);
  return (
    <button type="button" className="hud-btn hud-btn-end" disabled={!option.enabled} title={option.reason} onClick={onClick} {...preview}>
      {option.label}
    </button>
  );
}

export function LocationPanel({ store, collapsed, onToggle }: { store: GameStore; collapsed: boolean; onToggle: () => void }) {
  const { state, currentPid, error } = store;
  const opts = useMemo(() => (state && currentPid ? availableActions(state, currentPid) : []), [state, currentPid]);

  if (!state || !currentPid) return null;
  const p = state.players[currentPid]!;
  const node = getGraph(state.config.townId).node(p.node);
  const loc = node.location ? LOCATIONS[node.location] : null;
  const here = opts.filter((o) => o.action.type !== 'travel' && o.action.type !== 'endWeek');
  const end = opts.find((o) => o.action.type === 'endWeek');

  const title = loc ? loc.name : (node.name ?? 'On the road');

  return (
    <Frame
      className={`hud-location${collapsed ? ' is-collapsed' : ''}`}
      title={title}
      actions={
        <FrameButton onClick={onToggle} title={collapsed ? 'Show actions' : 'Hide actions'}>
          {collapsed ? '▲' : '▼'}
        </FrameButton>
      }
    >
      {loc && <div className="hud-tagline">{loc.tagline}</div>}
      {error && <div className="hud-error">{error}</div>}

      {!collapsed && (
        <>
          {here.length === 0 ? (
            <div className="hud-hint">Click a highlighted building to go there.</div>
          ) : (
            <div className="hud-actions">
              <ActionsPanel store={store} options={here} />
            </div>
          )}
          {end && <EndWeekButton option={end} onClick={() => store.act(end.action)} />}
        </>
      )}
    </Frame>
  );
}
