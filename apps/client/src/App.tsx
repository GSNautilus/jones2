/**
 * Mode switch by URL query:
 *   (default)  play   — the game (src/game/); the URL hash picks online play:
 *                       #/join/<token> redeems an invite, #/game/<id>/<seat> plays
 *                       an online seat (src/online/), anything else is hot-seat
 *   ?replay    replay — demo replay of a scripted week (src/replay/)
 *   ?editor    editor — town editor (src/editor/)
 *   ?map       map    — renderer demo (src/map/demo.tsx)
 */
import { useEffect, useRef, useState } from 'react';
import { riverton, type Town } from '@jones2/town';
import { MapCanvas, useTownScene, type PickResult } from './map';
import { MapDemo } from './map/demo';
import { ReplayDemo } from './replay/demo';
import { ReplayView } from './replay/ReplayView';
import { GameRoot } from './game';
import { EditorPanel, type EditorHandle } from './editor';
import { createGame } from '@jones2/sim';
import { hostCreateGame, isHost } from './online/api';
import { HostKeyScreen } from './online/HostKeyScreen';
import { HostPanel } from './online/HostPanel';
import { JoinScreen } from './online/JoinScreen';
import { OnlineGames } from './online/OnlineGames';
import { OnlineRoot } from './online/OnlineRoot';
import { hostHash, parseRoute, type Route } from './online/route';
import type { OnlineSetup } from './game/SetupScreen';

const TOWN = riverton as Town;
type Mode = 'play' | 'replay' | 'editor' | 'map';

function modeFromUrl(): Mode {
  const q = new URLSearchParams(location.search);
  if (q.has('editor')) return 'editor';
  if (q.has('replay')) return 'replay';
  if (q.has('map')) return 'map';
  return 'play';
}

function ModeLinks({ mode }: { mode: Mode }) {
  const links: [Mode, string][] = [
    ['play', '/'],
    ['replay', '/?replay'],
    ['editor', '/?editor'],
    ['map', '/?map'],
  ];
  return (
    <div className="overlay mode-links" style={{ left: 'auto', right: 12, top: 12 }}>
      {links.map(([m, href]) => (
        <a
          key={m}
          href={href}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            padding: '3px 7px',
            background: m === mode ? '#c9a04a' : '#f3e9c8',
            color: '#1f1b24',
            textDecoration: 'none',
            border: '2px solid #1f1b24',
          }}
        >
          {m}
        </a>
      ))}
    </div>
  );
}

/** The camera is fixed top-down, so there is no rotate control. */
function CameraButtons({ scene }: { scene: ReturnType<typeof useTownScene> }) {
  return (
    <div className="overlay">
      <button onClick={() => scene.zoom(0.8)} title="Zoom in">+</button>
      <button onClick={() => scene.zoom(1.25)} title="Zoom out">{'−'}</button>
      <button onClick={() => scene.fitAll()} title="Fit town">Fit</button>
    </div>
  );
}

/** The online route in the URL hash, kept current. */
function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Is this browser a host device? Asked once; never signs in just to ask. */
function useIsHost(): boolean {
  const [host, setHost] = useState(false);
  useEffect(() => {
    let live = true;
    isHost()
      .then((h) => live && setHost(h))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return host;
}

/** The new game screen's online option: build week 1 with the sim, create the game, open it in the host panel. */
const ONLINE: OnlineSetup = {
  create: async (config) => {
    const state = createGame(config);
    const seats = await hostCreateGame(config.players.map((p) => p.name).join(', '), state);
    location.hash = hostHash(seats[0]?.gameId);
  },
};

function PlayRoot() {
  const route = useRoute();
  const host = useIsHost();
  const pickRef = useRef<((hit: PickResult) => void) | null>(null);
  const hoverRef = useRef<((hit: PickResult) => void) | null>(null);
  const scene = useTownScene({
    onPick: (h) => pickRef.current?.(h),
    onHover: (h) => hoverRef.current?.(h),
  });
  // Dev builds expose the scene so a scripted browser (screenshots, the
  // trailer capture) can drive the camera. Never in production.
  useEffect(() => {
    const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
    if (env?.DEV) (window as unknown as { __scene?: typeof scene }).__scene = scene;
  }, [scene]);
  // GameRoot loads the town the game is on (the setup screen shows Riverton).
  // Play mode has no mode links: the bottom-right corner is the cash readout
  // and the END TURN button. The other modes are reached by their URLs.
  const mapSlot = <MapCanvas scene={scene} />;
  if (route.kind === 'game') {
    return (
      <OnlineRoot
        key={`${route.gameId}/${route.playerId}`}
        gameId={route.gameId}
        playerId={route.playerId}
        scene={scene}
        mapSlot={mapSlot}
        pickRef={pickRef}
        hoverRef={hoverRef}
        ReplayView={ReplayView}
      />
    );
  }
  if (route.kind === 'join' || route.kind === 'hostkey' || route.kind === 'host') {
    return (
      <div className="stage">
        <div className="stage-map">{mapSlot}</div>
        {route.kind === 'join' ? (
          <JoinScreen token={route.token} />
        ) : route.kind === 'hostkey' ? (
          <HostKeyScreen token={route.token} />
        ) : (
          <HostPanel focus={route.gameId} />
        )}
      </div>
    );
  }
  return (
    <>
      <GameRoot
        scene={scene}
        mapSlot={mapSlot}
        pickRef={pickRef}
        hoverRef={hoverRef}
        ReplayView={ReplayView}
        online={host ? ONLINE : undefined}
        newGame={route.kind === 'new'}
      />
      <OnlineGames />
    </>
  );
}

function ReplayRoot() {
  const scene = useTownScene();
  return (
    <div className="mapwrap" style={{ height: '100%' }}>
      <MapCanvas scene={scene} />
      <CameraButtons scene={scene} />
      <ReplayDemo scene={scene} />
      <ModeLinks mode="replay" />
    </div>
  );
}

function EditorRoot() {
  const editorRef = useRef<EditorHandle>(null);
  const [town, setTown] = useState<Town>(() => structuredClone(TOWN));
  const scene = useTownScene({
    editable: true,
    onPick: (h) => editorRef.current?.onPick(h),
    onHover: (h) => editorRef.current?.onHover(h),
    onDragStart: (h) => editorRef.current?.onDragStart(h),
    onDrag: (h) => editorRef.current?.onDrag(h),
    onDragEnd: () => editorRef.current?.onDragEnd(),
  });
  useEffect(() => {
    scene.setTown(town);
  }, [scene, town]);
  useEffect(() => {
    scene.fitAll();
  }, [scene]);
  return (
    <div className="layout" style={{ gridTemplateColumns: '1fr 380px' }}>
      <div className="mapwrap">
        <MapCanvas scene={scene} />
        <CameraButtons scene={scene} />
        <ModeLinks mode="editor" />
      </div>
      <div className="panel right">
        <EditorPanel ref={editorRef} scene={scene} town={town} onChange={setTown} />
      </div>
    </div>
  );
}

export function App() {
  const [mode] = useState<Mode>(modeFromUrl);
  switch (mode) {
    case 'map':
      return (
        <div className="mapwrap" style={{ height: '100%' }}>
          <MapDemo />
          <ModeLinks mode="map" />
        </div>
      );
    case 'replay':
      return <ReplayRoot />;
    case 'editor':
      return <EditorRoot />;
    default:
      return <PlayRoot />;
  }
}
