/**
 * Standalone exercise of the renderer: Riverton, two figures, a highlight set,
 * a route, and camera controls. Wire it into `App.tsx` to eyeball the map.
 */
import { useEffect, useRef, useState } from 'react';
import { riverton } from '@jones2/town';
import type { Town } from '@jones2/town';
import type { PickResult } from './api';
import { MapCanvas, useTownScene } from './MapCanvas';

/** The JSON import widens `facing`/`roof`/`kind` to string; the data is valid. */
const TOWN = riverton as unknown as Town;

const HIGHLIGHT = ['monolith', 'university', 'gym'];
const ROUTE = ['bus_depot', 'j_center', 'employment'];

export function MapDemo() {
  const [log, setLog] = useState<string>('click the map');
  const logRef = useRef(setLog);
  logRef.current = setLog;

  const scene = useTownScene({
    onPick: (hit: PickResult) => {
      logRef.current(
        hit.node
          ? `picked ${hit.node}  (${hit.x.toFixed(1)}, ${hit.y.toFixed(1)})`
          : `ground (${hit.x.toFixed(1)}, ${hit.y.toFixed(1)})`,
      );
    },
  });

  useEffect(() => {
    scene.setTown(TOWN);
    scene.setFigures({
      a: { color: '#d64545', label: 'Ann' },
      b: { color: '#2f6fed', label: 'Bob' },
    });
    scene.setPoses({
      a: { kind: 'at', node: 'bus_depot' },
      b: { kind: 'at', node: 'university' },
    });
    scene.setHighlight(HIGHLIGHT);
    scene.setRoute(ROUTE);
  }, [scene]);

  return (
    <div className="mapwrap" style={{ height: '100%' }}>
      <MapCanvas scene={scene} />
      <div className="overlay">
        <button onClick={() => scene.rotate(-1)}>&#8630; rotate</button>
        <button onClick={() => scene.rotate(1)}>rotate &#8631;</button>
        <button onClick={() => scene.zoom(0.8)}>zoom in</button>
        <button onClick={() => scene.zoom(1.25)}>zoom out</button>
        <button onClick={() => scene.fitAll()}>fit all</button>
        <button onClick={() => scene.follow('a')}>follow Ann</button>
        <button onClick={() => scene.follow(null)}>follow off</button>
      </div>
      <div
        className="overlay bottom"
        style={{ justifyContent: 'flex-start', pointerEvents: 'none' }}
      >
        <span
          style={{
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            padding: '4px 10px',
          }}
        >
          {log}
        </span>
      </div>
    </div>
  );
}
