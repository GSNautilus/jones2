/**
 * The play screen is now HUD only: the map fills the stage (GameRoot mounts it)
 * and this component renders the overlay panels on top of it — week log,
 * camera buttons, location panel, status strip and the clock.
 *
 * Travel is still driven from the map: destinations are highlighted, a click on
 * an enabled destination dispatches the travel action, hovering previews the
 * route on the ground AND the travel cost on the clock.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { availableActions, getGraph, transportModes, type Action } from '@jones2/sim';
import type { NodeId } from '@jones2/town';
import type { FigurePose, FigureStyle, PickResult, TownScene } from '../map/api';
import { Clock } from '../hud/Clock';
import { LocationPanel } from '../hud/LocationPanel';
import { MapControls } from '../hud/MapControls';
import { StatusStrip } from '../hud/StatusStrip';
import { WeekLog } from '../hud/WeekLog';
import { useSetTimePreview } from '../hud/preview';
import type { GameStore } from './store';

export interface PlayScreenProps {
  store: GameStore;
  scene: TownScene;
  pickRef: MutableRefObject<((hit: PickResult) => void) | null>;
  hoverRef: MutableRefObject<((hit: PickResult) => void) | null>;
}

function travelTarget(action: Action): NodeId | null {
  return action.type === 'travel' ? action.to : null;
}

export function PlayScreen({ store, scene, pickRef, hoverRef }: PlayScreenProps) {
  const { state, currentPid } = store;
  const [note, setNote] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const setPreview = useSetTimePreview();

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

  // Clear a stale travel preview whenever the options change (the player moved).
  useEffect(() => {
    setPreview(null);
  }, [setPreview, travelOptions]);

  // Wire pick/hover handlers the parent forwards from the renderer.
  useEffect(() => {
    pickRef.current = (hit: PickResult) => {
      if (!hit.node) return;
      const opt = travelOptions.find((o) => travelTarget(o.action) === hit.node);
      if (!opt) return;
      setPreview(null);
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
        setPreview(null);
        return;
      }
      const opt = travelOptions.find((o) => travelTarget(o.action) === hit.node);
      if (!opt) {
        scene.setRoute(null);
        setPreview(null);
        return;
      }
      const p = s.players[currentPid]!;
      const graph = getGraph(s.config.townId);
      const route = graph.bestRoute(p.node, hit.node, transportModes(p));
      scene.setRoute(route?.path ?? null);
      setPreview(opt.enabled ? opt.minutes : null);
    };
    return () => {
      pickRef.current = null;
      hoverRef.current = null;
      scene.setRoute(null);
      setPreview(null);
    };
  }, [pickRef, hoverRef, scene, travelOptions, currentPid, store, setPreview]);

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

  // A rejected travel note is transient.
  useEffect(() => {
    if (!note) return undefined;
    const t = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(t);
  }, [note]);

  if (!state || !currentPid) return null;
  const p = state.players[currentPid]!;

  return (
    <div className="hud-root">
      <WeekLog store={store} open={logOpen} onToggle={() => setLogOpen((v) => !v)} />
      <MapControls scene={scene} />
      <LocationPanel store={store} collapsed={panelCollapsed} onToggle={() => setPanelCollapsed((v) => !v)} />
      <StatusStrip store={store} open={statsOpen} onToggle={() => setStatsOpen((v) => !v)} />
      <Clock minutesLeft={p.minutesLeft} minutesBudget={p.minutesBudget} week={state.week} />
      {note && <div className="hud-toast">{note}</div>}
    </div>
  );
}
