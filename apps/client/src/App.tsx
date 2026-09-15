/**
 * Mode switch by URL query:
 *   (default)  play   — hot-seat game with the 3D map for travel (src/game/)
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
  // In play mode the top-right corner belongs to the camera buttons, so the
  // mode switch sits in the bottom-right instead.
  const spot = mode === 'play'
    ? { left: 'auto' as const, right: 10, top: 'auto' as const, bottom: 10 }
    : { left: 'auto' as const, right: 12, top: 12 };
  return (
    <div className="overlay mode-links" style={spot}>
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

function PlayRoot() {
  const pickRef = useRef<((hit: PickResult) => void) | null>(null);
  const hoverRef = useRef<((hit: PickResult) => void) | null>(null);
  const scene = useTownScene({
    onPick: (h) => pickRef.current?.(h),
    onHover: (h) => hoverRef.current?.(h),
  });
  useEffect(() => {
    scene.setTown(TOWN);
    scene.fitAll();
  }, [scene]);
  return (
    <>
      <GameRoot scene={scene} mapSlot={<MapCanvas scene={scene} />} pickRef={pickRef} hoverRef={hoverRef} ReplayView={ReplayView} />
      <ModeLinks mode="play" />
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
