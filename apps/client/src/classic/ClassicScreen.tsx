/**
 * The classic play screen (PLAN §2): the board fills the stage, nothing is
 * permanently on top of it except the clock at the bottom centre, the cash
 * readout with the END TURN button at the bottom right, and GOALS /
 * STATISTICS / OPTIONS at the bottom left. Everything else is a centre window
 * over the map — start-of-week cards, the location window, goals, statistics,
 * options.
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
import { cardSound, cardsFrom, currentCard, deckKey } from './cards';
import { CLOSED_LABEL, assignTokens, tokenLabel } from './tokens';
import { closedNodes, greetingIndex, isArrivalLocation, isClassicLocation, locationName } from './locations';
import { planWalk, walkPose, type WalkPlan } from './walk';
import { buildLocationWindow, locationPanel } from './menu';
import type { PanelModel } from './layout';
import { PixelPanel } from './PixelPanel';
import { OptionsPanel } from './OptionsPanel';
import { PixelChrome } from './PixelChrome';
import type { ChromeModel } from './chrome';

const AMBIENT_KEY = 'jones2-ambient';

function loadAmbient(): boolean {
  try {
    return localStorage.getItem(AMBIENT_KEY) !== 'off';
  } catch {
    return true;
  }
}
import { goalsModel, statsModel } from './screens';
import { hoursLeft, hoursOf, travelTooltip } from './tooltip';
import { audio, cardLine, greetingLine, quoteGroupsFor, quoteLine, refusalGroupFor, sfxForEvent, type SfxKey } from '../audio';

export interface ClassicScreenProps {
  store: GameStore;
  scene: TownScene;
  pickRef: MutableRefObject<((hit: PickResult) => void) | null>;
  hoverRef: MutableRefObject<((hit: PickResult) => void) | null>;
}

type Overlay = 'none' | 'goals' | 'stats' | 'options' | 'closed';

function travelTo(a: Action): NodeId | null {
  return a.type === 'travel' ? a.to : null;
}

export function ClassicScreen({ store, scene, pickRef, hoverRef }: ClassicScreenProps) {
  const { state, currentPid } = store;
  const setPreview = useSetTimePreview();

  const [dismissed, setDismissed] = useState(0);
  const [deck, setDeck] = useState('');
  const [openLoc, setOpenLoc] = useState<string | null>(null);
  // Traffic, birds and aircraft on the map; remembered per browser.
  const [ambient, setAmbientState] = useState<boolean>(loadAmbient);
  useEffect(() => {
    scene.setAmbient(ambient);
    try {
      localStorage.setItem(AMBIENT_KEY, ambient ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  }, [scene, ambient]);
  const openLocRef = useRef(openLoc);
  openLocRef.current = openLoc;
  const [visits, setVisits] = useState<Record<string, number>>({});
  const visitsRef = useRef(visits);
  visitsRef.current = visits;
  /** How many times each location's quote group has been spoken, for rotation. */
  const spokenRef = useRef<Record<string, number>>({});
  /** The last action the window asked for, so a refusal can say what there was no time for. */
  const lastActionRef = useRef<Action | null>(null);
  const act = (a: Action) => {
    lastActionRef.current = a;
    store.act(a);
  };
  /** The clerk says one line per group, in order, rotating within each group. */
  const speakGroups = (loc: string, groups: string[]) => {
    const lines: number[] = [];
    for (const group of groups) {
      const k = `${loc}:${group}`;
      const n = spokenRef.current[k] ?? 0;
      spokenRef.current[k] = n + 1;
      const line = quoteLine(audio.voices, loc, group, n);
      if (line !== null) lines.push(line);
    }
    if (lines.length) audio.speak(lines);
  };
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
  const cardKey = card ? `${deck}:${card.index}` : null;
  useEffect(() => {
    if (!card || !cardKey) return;
    const key = cardSound(card);
    // Week one opens with the theme instead of the start-of-turn music.
    if (key === 'startTurn' && state?.week === 1) return;
    if (key) audio.play(key as SfxKey);
    const line = card.step === 'weekend' || card.step === 'news' ? cardLine(audio.voices, card.step, card.text) : null;
    if (line !== null) audio.speak(line);
    else audio.hush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey]);

  // A walk in progress: the token moves along the route over real time and
  // the window opens when it arrives. Input is blocked meanwhile.
  const [walking, setWalking] = useState<{ pid: string; plan: WalkPlan; startedAt: number; then: string } | null>(null);
  const walkingRef = useRef(walking);
  walkingRef.current = walking;

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
      // The player whose turn it is gets the big, bobbing token.
      figures[id] = { color: t.color, label: tokenLabel(t.token, pl.name), emphasis: id === currentPid };
      // A walking player's pose is driven by the walk loop, not by state.
      if (walkingRef.current?.pid === id) continue;
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

  // ---- audio ----------------------------------------------------------------
  useEffect(() => {
    let live = true;
    void audio.loadVoices();
    void audio.load().then(() => {
      if (!live) return;
      audio.start();
      // Effects into memory, so a WORK or a purchase sounds the instant it lands.
      void audio.preload();
    });
    return () => {
      live = false;
      audio.stop();
    };
  }, []);

  // The theme, once, when a game begins.
  const themedRef = useRef(false);
  useEffect(() => {
    if (!state || themedRef.current) return;
    if (state.week === 1) {
      themedRef.current = true;
      void audio.load().then(() => audio.play('theme'));
    }
  }, [state]);

  // A sound for every new entry in the current player's log.
  const heardRef = useRef<{ pid: string | null; len: number }>({ pid: null, len: 0 });
  useEffect(() => {
    if (!state || !currentPid) return;
    const log = state.players[currentPid]!.log;
    const heard = heardRef.current;
    if (heard.pid !== currentPid) {
      heardRef.current = { pid: currentPid, len: log.length };
      return;
    }
    for (let i = heard.len; i < log.length; i++) {
      const key = sfxForEvent(log[i]!);
      if (key) audio.play(key);
      // The clerk answers the outcome aloud while the window is open.
      const loc = openLocRef.current;
      if (loc) speakGroups(loc, quoteGroupsFor(log[i]!));
    }
    heard.len = log.length;
  }, [state, currentPid]);

  // The game refused something: no time, no money, wrong place.
  useEffect(() => {
    if (!store.error) return;
    audio.play('cannot');
    const loc = openLocRef.current;
    const group = refusalGroupFor(store.error, lastActionRef.current?.type);
    if (loc && group) speakGroups(loc, [group]);
  }, [store.error]);

  // The clerk stops talking when the window closes, and the place's music goes.
  useEffect(() => {
    if (openLoc === null) {
      audio.hush();
      audio.leave();
    }
  }, [openLoc]);

  // The walk loop: move the token each frame, then open the window on arrival.
  useEffect(() => {
    if (!walking) return;
    scene.follow(walking.pid);
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - walking.startedAt;
      const pose = walkPose(walking.plan, elapsed);
      if (pose) scene.setPoses({ [walking.pid]: { ...pose, ghost: false } });
      if (elapsed >= walking.plan.durationMs) {
        scene.follow(null);
        scene.setRoute(null);
        setWalking(null);
        openRef.current(walking.then);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [walking, scene]);

  // ---- map: hover and click -----------------------------------------------
  // The handlers are registered ONCE and read everything volatile through refs.
  // Re-registering them on each render would run the cleanup, which clears the
  // route and the clock preview the hover had just set.
  const blocked = card !== null || overlay !== 'none' || openLoc !== null || walking !== null;
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

  // How long the player's log was when the window opened: anything logged
  // after that is an outcome the clerk should announce.
  const [logLenAtOpen, setLogLenAtOpen] = useState(0);
  // The group the player has drilled into within the window (an employer at
  // the Employment Office). Reset whenever a window opens.
  const [group, setGroup] = useState<string | null>(null);
  const openWindow = useCallback((loc: string) => {
    const s = stateRef.current;
    const pid = pidRef.current;
    setLogLenAtOpen(s && pid ? s.players[pid]!.log.length : 0);
    const visit = visitsRef.current[loc] ?? 0;
    setVisits((v) => ({ ...v, [loc]: (v[loc] ?? 0) + 1 }));
    setGroup(null);
    setOpenLoc(loc);
    audio.play(loc === 'university' ? 'university' : 'door');
    // The clerk speaks the greeting the bubble shows.
    const line = greetingLine(audio.voices, loc, greetingIndex(loc, visit));
    if (line !== null) audio.speak(line);
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
      const from = s.players[currentPid]!.node;
      const route = graph.bestRoute(from, hit.node, ['walk']);
      storeRef.current.act(opt.action);
      if (route && route.path.length > 1) {
        const plan = planWalk(route.path, (id) => graph.node(id), route.minutes);
        // Leave the route on the ground until the token has walked it.
        scene.setRoute(route.path);
        audio.play('travel');
        setWalking({ pid: currentPid, plan, startedAt: performance.now(), then: loc });
      } else {
        openRef.current(loc);
      }
    };
    return () => {
      pickRef.current = null;
      hoverRef.current = null;
      scene.setRoute(null);
      setPreview(null);
    };
  }, [pickRef, hoverRef, scene, setPreview]);

  // ---- the window ----------------------------------------------------------
  const windowActions = useMemo(() => {
    if (!state || !currentPid || !openLoc) return null;
    const log = state.players[currentPid]!.log;
    const outcome = log.length > logLenAtOpen ? log[log.length - 1]!.text : undefined;
    const say = store.error ?? outcome;
    return buildLocationWindow(state, currentPid, openLoc, { visit: (visits[openLoc] ?? 1) - 1, say, group });
  }, [state, currentPid, openLoc, visits, logLenAtOpen, store.error, group]);
  const windowModel: PanelModel | null = useMemo(
    () => (windowActions ? locationPanel(windowActions) : null),
    [windowActions],
  );

  if (!state || !currentPid || !player) return null;

  const cash = Math.round(player.cash);
  const left = hoursLeft(player.minutesLeft);

  // The corner furniture, as pixel art. The hours line only reads while the
  // clock is hovered (PLAN §2), but its room is always kept so nothing jumps.
  const barModel: ChromeModel = {
    arrange: 'row',
    buttons: [
      { key: 'goals', label: 'GOALS' },
      { key: 'stats', label: 'STATISTICS' },
      { key: 'options', label: 'OPTIONS' },
    ],
  };
  const readoutModel: ChromeModel = {
    arrange: 'stack',
    display: [`$${cash.toLocaleString()}`, clockHover ? `${left}H LEFT` : ' '],
    buttons: [{ key: 'end', label: 'END TURN', enabled: walking === null }],
  };

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
        <PixelChrome
          model={barModel}
          onButton={(key) => setOverlay(key as 'goals' | 'stats' | 'options')}
          titles={{ goals: 'Everyone’s progress toward the four goals', stats: 'Your money, job, degrees and possessions', options: 'Sound, animation, new game' }}
        />
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
        <PixelChrome
          model={readoutModel}
          titles={{ end: left > 0 ? `End your turn with ${left}h unspent` : 'End your turn' }}
          onButton={() => {
            setOpenLoc(null);
            store.act({ type: 'endWeek' });
          }}
        />
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

      {!cardModel && overlay === 'options' && (
        <OptionsPanel
          onClose={() => setOverlay('none')}
          onNewGame={() => store.reset()}
          animation={{ on: ambient, onChange: setAmbientState }}
        />
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
              if (!row) return;
              if (row.action) act(row.action);
              else if (row.group) setGroup(row.group);
            }}
            onButton={(i) => {
              const btn = windowActions.buttons[i];
              if (!btn) return;
              if (btn.action) act(btn.action);
              else if (btn.key === 'back') setGroup(null);
              else setOpenLoc(null);
            }}
          />
        </div>
      )}

      {store.error && <div className="hud-toast">{store.error}</div>}
    </div>
  );
}
