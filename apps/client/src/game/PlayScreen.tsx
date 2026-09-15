/**
 * The three-column play layout: StatsPanel | map | ActionsPanel. Travel is
 * driven from the map: destinations are highlighted, a click on an enabled
 * destination dispatches the travel action, hovering previews the route.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import { availableActions, getGraph, transportModes, type Action } from '@jones2/sim';
import type { NodeId } from '@jones2/town';
import type { FigurePose, FigureStyle, PickResult, TownScene } from '../map/api';
import type { GameStore } from './store';
import { StatsPanel } from './StatsPanel';
import { ActionsPanel } from './ActionsPanel';

export interface PlayScreenProps {
  store: GameStore;
  scene: TownScene;
  mapSlot: ReactNode;
  pickRef: MutableRefObject<((hit: PickResult) => void) | null>;
  hoverRef: MutableRefObject<((hit: PickResult) => void) | null>;
}

function travelTarget(action: Action): NodeId | null {
  return action.type === 'travel' ? action.to : null;
}

export function PlayScreen({ store, scene, mapSlot, pickRef, hoverRef }: PlayScreenProps) {
  const { state, currentPid } = store;
  const [note, setNote] = useState<string | null>(null);

  // Read via a ref inside effects that shouldn't re-run on every state tick
  // (panning should only happen when the current player changes).
  const stateRef = useRef(state);
  stateRef.current = state;

  const travelOptions = useMemo(
    () => (state && currentPid ? availableActions(state, currentPid).filter((o) => o.action.type === 'travel') : []),
    [state, currentPid],
  );

  // Highlight enabled destinations on the map.
  useEffect(() => {
    const dests = travelOptions
      .filter((o) => o.enabled)
      .map((o) => travelTarget(o.action))
      .filter((n): n is NodeId => n !== null);
    scene.setHighlight(dests);
  }, [scene, travelOptions]);

  // Wire pick/hover handlers the parent forwards from the renderer.
  useEffect(() => {
    pickRef.current = (hit: PickResult) => {
      if (!hit.node) return;
      const opt = travelOptions.find((o) => travelTarget(o.action) === hit.node);
      if (!opt) return;
      if (opt.enabled) {
        store.act(opt.action);
        setNote(null);
      } else {
        setNote(opt.reason ?? 'Cannot travel there');
      }
    };
    hoverRef.current = (hit: PickResult) => {
      const s = stateRef.current;
      if (!s || !currentPid || !hit.node) {
        scene.setRoute(null);
        return;
      }
      const opt = travelOptions.find((o) => travelTarget(o.action) === hit.node);
      if (!opt) {
        scene.setRoute(null);
        return;
      }
      const p = s.players[currentPid]!;
      const graph = getGraph(s.config.townId);
      const route = graph.bestRoute(p.node, hit.node, transportModes(p));
      scene.setRoute(route?.path ?? null);
    };
    return () => {
      pickRef.current = null;
      hoverRef.current = null;
      scene.setRoute(null);
    };
  }, [pickRef, hoverRef, scene, travelOptions, currentPid, store]);

  // Keep figures and their poses in sync with the sim.
  useEffect(() => {
    if (!state) return;
    const figures: Record<string, FigureStyle> = {};
    const poses: Record<string, FigurePose> = {};
    for (const id of state.playerOrder) {
      const pl = state.players[id]!;
      figures[id] = { color: store.playerColors[id] ?? '#888888', label: pl.name };
      poses[id] = { kind: 'at', node: pl.node, ghost: id !== currentPid };
    }
    scene.setFigures(figures);
    scene.setPoses(poses);
  }, [scene, state, currentPid, store.playerColors]);

  // Pan to the current player only when the current player changes.
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !currentPid) return;
    const p = s.players[currentPid]!;
    const graph = getGraph(s.config.townId);
    const node = graph.node(p.node);
    scene.panTo(node.x, node.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, currentPid]);

  if (!state || !currentPid) return null;

  return (
    <div className="layout">
      <div className="panel">
        <StatsPanel store={store} />
      </div>
      <div className="mapwrap">
        {mapSlot}
        <div className="overlay">
          <button onClick={() => scene.rotate(1)}>{'⟳'}</button>
          <button onClick={() => scene.zoom(1.2)}>+</button>
          <button onClick={() => scene.zoom(1 / 1.2)}>{'−'}</button>
          <button onClick={() => scene.fitAll()}>Fit</button>
        </div>
        {note && (
          <div className="overlay bottom">
            <span className="tag warn">{note}</span>
          </div>
        )}
      </div>
      <div className="panel right">
        <ActionsPanel store={store} />
      </div>
    </div>
  );
}
