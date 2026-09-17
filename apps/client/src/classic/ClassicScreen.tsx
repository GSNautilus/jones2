/**
 * The classic play screen (PLAN §2): the board fills the stage, nothing is
 * permanently on top of it except the clock at the bottom centre and the cash
 * readout at the bottom right. Everything else is a centre window over the map
 * — start-of-week cards, the location window, goals, statistics.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { availableActions, getGraph, type Action, type ActionOption } from '@jones2/sim';
import type { NodeId } from '@jones2/town';
import type { FigurePose, FigureStyle, PickResult, TownScene } from '../map/api';
import { Clock } from '../hud/Clock';
import { MapControls } from '../hud/MapControls';
import { useSetTimePreview } from '../hud/preview';
import type { GameStore } from '../game/store';
import { cardsFrom, currentCard, deckKey } from './cards';
import { CLOSED_LABEL, assignTokens, tokenLabel } from './tokens';
import { closedNodes, isArrivalLocation, isClassicLocation, locationName } from './locations';
import { buildLocationWindow, locationPanel } from './menu';
import type { PanelModel } from './layout';
import { PixelPanel } from './PixelPanel';
import { goalsModel, statsModel } from './screens';
import { hoursLeft, hoursOf, travelTooltip } from './tooltip';

export interface ClassicScreenProps {
  store: GameStore;
  scene: TownScene;
  pickRef: MutableRefObject<((hit: PickResult) => void) | null>;
  hoverRef: MutableRefObject<((hit: PickResult) => void) | null>;
}

type Overlay = 'none' | 'goals' | 'stats' | 'closed';

function travelTo(a: Action): NodeId | null {
  return a.type === 'travel' ? a.to : null;
}

export function ClassicScreen({ store, scene, pickRef, hoverRef }: ClassicScreenProps) {
  const { state, currentPid } = store;
  const setPreview = useSetTimePreview();

  const [dismissed, setDismissed] = useState(0);
  const [deck, setDeck] = useState('');
  const [openLoc, setOpenLoc] = useState<string | null>(null);
  const [visits, setVisits] = useState<Record<string, number>>({});
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [closedName, setClosedName] = useState('');
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [clockHover, setClockHover] = useState(false);
  const mouse = useRef({ x: 0, y: 0 });

  const stateRef = useRef(state);
  stateRef.current = state;

  // `.hud-root` is pointer-events: none, so the cursor is tracked on the window.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const player = state && currentPid ? state.players[currentPid] : null;
  const graph = state ? getGraph(state.config.townId) : null;

  const options: ActionOption[] = useMemo(
    () => (state && currentPid ? availableActions(state, currentPid) : []),
    [state, currentPid],
  );
  const travelOptions = useMemo(() => options.filter((o) => o.action.type === 'travel'), [options]);

  // ---- start-of-week cards -------------------------------------------------
  const cards = useMemo(() => cardsFrom(player?.classic?.weekStart), [player]);
  const wantDeck = state && currentPid ? deckKey(state.week, currentPid) : '';
  useEffect(() => {
    if (wantDeck && wantDeck !== deck) {
      setDeck(wantDeck);
      setDismissed(0);
      setOpenLoc(null);
      setOverlay('none');
    }
  }, [wantDeck, deck]);
  const card = deck === wantDeck ? currentCard(cards, dismissed) : cards[0] ?? null;

  // ---- map: highlight, figures, camera ------------------------------------
  useEffect(() => {
    const dests = travelOptions
      .filter((o) => o.enabled)
      .map((o) => travelTo(o.action))
      .filter((n): n is NodeId => n !== null && isClassicLocation(graph?.node(n).location));
    scene.setHighlight(dests);
  }, [scene, travelOptions, graph]);

  useEffect(() => {
    if (!state || !graph) return;
    const tokens = assignTokens(state.playerOrder);
    const figures: Record<string, FigureStyle> = {};
    const poses: Record<string, FigurePose> = {};
    for (const id of state.playerOrder) {
      const pl = state.players[id]!;
      const t = tokens[id]!;
      figures[id] = { color: t.color, label: tokenLabel(t.token, pl.name) };
      poses[id] = { kind: 'at', node: pl.node, ghost: id !== currentPid };
    }
    for (const { node, location } of closedNodes(graph.town)) {
      figures[`closed:${location}`] = { color: '#888888', label: CLOSED_LABEL };
      poses[`closed:${location}`] = { kind: 'at', node };
    }
    scene.setFigures(figures);
    scene.setPoses(poses);
  }, [scene, state, graph, currentPid]);

  useEffect(() => {
    const s = stateRef.current;
    if (!s || !currentPid || !graph) return;
    const n = graph.node(s.players[currentPid]!.node);
    scene.panTo(n.x, n.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, currentPid]);

  // ---- map: hover and click -----------------------------------------------
  // The handlers are registered ONCE and read everything volatile through refs.
  // Re-registering them on each render would run the cleanup, which clears the
  // route and the clock preview the hover had just set.
  const blocked = card !== null || overlay !== 'none' || openLoc !== null;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const pidRef = useRef(currentPid);
  pidRef.current = currentPid;
  const graphRef = useRef(graph);
  graphRef.current = graph;
  const optionsRef = useRef(travelOptions);
  optionsRef.current = travelOptions;
  const storeRef = useRef(store);
  storeRef.current = store;

  const openWindow = useCallback((loc: string) => {
    setVisits((v) => ({ ...v, [loc]: (v[loc] ?? 0) + 1 }));
    setOpenLoc(loc);
  }, []);
  const openRef = useRef(openWindow);
  openRef.current = openWindow;

  useEffect(() => {
    hoverRef.current = (hit: PickResult) => {
      const s = stateRef.current;
      const currentPid = pidRef.current;
      const graph = graphRef.current;
      const travelOptions = optionsRef.current;
      if (blockedRef.current || !s || !currentPid || !hit.node || !graph) {
        scene.setRoute(null);
        setPreview(null);
        setTip(null);
        return;
      }
      const loc = graph.node(hit.node).location;
      if (!loc) {
        scene.setRoute(null);
        setPreview(null);
        setTip(null);
        return;
      }
      const p = s.players[currentPid]!;
      const name = locationName(loc);
      const at = { x: mouse.current.x, y: mouse.current.y };
      if (isArrivalLocation(loc)) {
        scene.setRoute(null);
        setPreview(null);
        setTip({ ...at, text: `${name} · Arrivals only` });
        return;
      }
      if (!isClassicLocation(loc)) {
        scene.setRoute(null);
        setPreview(null);
        setTip({ ...at, text: travelTooltip({ name, hours: 0, hoursLeft: 0, enabled: false, closed: true }) });
        return;
      }
      if (hit.node === p.node) {
        scene.setRoute(null);
        setPreview(null);
        setTip({ ...at, text: travelTooltip({ name, hours: 0, hoursLeft: 0, enabled: false, here: true }) });
        return;
      }
      const opt = travelOptions.find((o) => travelTo(o.action) === hit.node);
      if (!opt) {
        scene.setRoute(null);
        setPreview(null);
        setTip(null);
        return;
      }
      const route = graph.bestRoute(p.node, hit.node, ['walk']);
      scene.setRoute(route?.path ?? null);
      setPreview(opt.minutes);
      setTip({
        ...at,
        text: travelTooltip({
          name,
          hours: hoursOf(opt.minutes),
          hoursLeft: hoursLeft(p.minutesLeft),
          enabled: opt.enabled,
          reason: opt.reason,
        }),
      });
    };
    pickRef.current = (hit: PickResult) => {
      const s = stateRef.current;
      const currentPid = pidRef.current;
      const graph = graphRef.current;
      const travelOptions = optionsRef.current;
      if (blockedRef.current || !s || !currentPid || !hit.node || !graph) return;
      const loc = graph.node(hit.node).location;
      if (!loc) return;
      setTip(null);
      scene.setRoute(null);
      setPreview(null);
      if (isArrivalLocation(loc)) return;
      if (!isClassicLocation(loc)) {
        setClosedName(locationName(loc));
        setOverlay('closed');
        return;
      }
      if (hit.node === s.players[currentPid]!.node) {
        openRef.current(loc);
        return;
      }
      const opt = travelOptions.find((o) => travelTo(o.action) === hit.node);
      if (!opt || !opt.enabled) return;
      storeRef.current.act(opt.action);
      openRef.current(loc);
    };
    return () => {
      pickRef.current = null;
      hoverRef.current = null;
      scene.setRoute(null);
      setPreview(null);
    };
  }, [pickRef, hoverRef, scene, setPreview]);

  // ---- the window ----------------------------------------------------------
  const windowActions = useMemo(
    () =>
      state && currentPid && openLoc
        ? buildLocationWindow(state, currentPid, openLoc, { visit: (visits[openLoc] ?? 1) - 1 })
        : null,
    [state, currentPid, openLoc, visits],
  );
  const windowModel: PanelModel | null = useMemo(
    () => (windowActions ? locationPanel(windowActions) : null),
    [windowActions],
  );

  if (!state || !currentPid || !player) return null;

  const cash = Math.round(player.cash);
  const left = hoursLeft(player.minutesLeft);

  const cardModel: PanelModel | null = card
    ? {
        title: card.title,
        bubble: card.text,
        rows: card.rows.map((r, i) => ({ key: `d${i}`, text: r.text, value: r.value })),
        buttons: [{ key: 'done', label: 'DONE' }],
      }
    : null;

  const closedModel: PanelModel = {
    title: closedName.toUpperCase(),
    bubble: 'CLOSED. THIS BUILDING IS NOT PART OF THE CLASSIC GAME.',
    rows: [],
    buttons: [{ key: 'done', label: 'DONE' }],
  };

  return (
    <div className="hud-root classic-root">
      <MapControls scene={scene} />

      <div className="classic-bar-left">
        <button type="button" className="hud-btn" onClick={() => setOverlay('goals')}>
          Goals
        </button>
        <button type="button" className="hud-btn" onClick={() => setOverlay('stats')}>
          Statistics
        </button>
        <button
          type="button"
          className="hud-btn"
          onClick={() => {
            setOpenLoc(null);
            store.act({ type: 'endWeek' });
          }}
        >
          End week
        </button>
        <button
          type="button"
          className="hud-btn"
          title="Abandon this game and return to setup"
          onClick={() => {
            if (window.confirm('Abandon this game and start a new one?')) store.reset();
          }}
        >
          New game
        </button>
      </div>

      <div className="classic-turn">
        {`${player.name.toUpperCase()} — TOKEN ${assignTokens(state.playerOrder)[currentPid]!.token}`}
      </div>

      <div
        className="classic-clock"
        onMouseEnter={() => setClockHover(true)}
        onMouseLeave={() => setClockHover(false)}
      >
        <Clock
          minutesLeft={player.minutesLeft}
          minutesBudget={player.minutesBudget}
          week={state.week}
          variant="classic"
        />
      </div>

      <div className="classic-readout">
        <span className="classic-readout-value">{`$${cash.toLocaleString()}`}</span>
        {clockHover && <span className="classic-readout-time">{`${left}H LEFT`}</span>}
      </div>

      {tip && !blocked && (
        <div className="classic-tip" style={{ left: tip.x + 14, top: tip.y + 16 }}>
          {tip.text}
        </div>
      )}

      {cardModel && (
        <div className="classic-modal">
          <PixelPanel model={cardModel} width={320} maxListRows={8} onButton={() => setDismissed((n) => n + 1)} />
        </div>
      )}

      {!cardModel && overlay === 'closed' && (
        <div className="classic-modal">
          <PixelPanel model={closedModel} width={300} maxListRows={4} onButton={() => setOverlay('none')} />
        </div>
      )}

      {!cardModel && overlay === 'goals' && (
        <div className="classic-modal">
          <PixelPanel model={goalsModel(state)} width={360} maxListRows={15} onButton={() => setOverlay('none')} />
        </div>
      )}

      {!cardModel && overlay === 'stats' && (
        <div className="classic-modal">
          <PixelPanel model={statsModel(state, player)} width={400} maxListRows={16} onButton={() => setOverlay('none')} />
        </div>
      )}

      {!cardModel && overlay === 'none' && windowModel && windowActions && (
        <div className="classic-modal">
          <PixelPanel
            model={windowModel}
            width={380}
            maxListRows={11}
            hint={`${left}H LEFT`}
            onRow={(i) => {
              const row = windowActions.rows[i];
              if (row) store.act(row.action);
            }}
            onButton={(i) => {
              const btn = windowActions.buttons[i];
              if (!btn) return;
              if (!btn.action) setOpenLoc(null);
              else store.act(btn.action);
            }}
          />
        </div>
      )}

      {store.error && <div className="hud-toast">{store.error}</div>}
    </div>
  );
}
