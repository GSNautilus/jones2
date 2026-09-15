/**
 * Standalone exercise of the pixel renderer: Riverton, three figures (one
 * walking a curved edge, one ghost), a highlight set, a route, and the camera
 * controls. Open with `/?map`.
 *
 * There are no rotate buttons: the camera is fixed top-down.
 */
import { useEffect, useRef, useState } from 'react';
import { riverton } from '@jones2/town';
import type { Town } from '@jones2/town';
import type { PickResult } from './api';
import { usingPlaceholderArt } from './art';
import { MapCanvas, useTownScene } from './MapCanvas';

/** The JSON import widens `facing`/`roof`/`kind` to string; the data is valid. */
const TOWN = riverton as unknown as Town;

const HIGHLIGHT = ['monolith', 'university', 'gym'];
const ROUTE = ['bus_depot', 'j_center', 'employment'];

const BADGE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid var(--line)',
  borderRadius: 6,
  padding: '4px 10px',
  font: '12px/1.4 ui-monospace, monospace',
};

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
      c: { color: '#7a6ab0', label: 'Cal' },
    });
    scene.setHighlight(HIGHLIGHT);
    scene.setRoute(ROUTE);
    scene.fitAll();

    // Ann walks bus_depot -> j_center back and forth so the walk cycle, the
    // facing logic and the curve-following code are all visible.
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const phase = ((performance.now() - start) / 4000) % 2;
      const t = phase < 1 ? phase : 2 - phase;
      scene.setPoses({
        a: { kind: 'between', from: 'bus_depot', to: 'j_center', t },
        b: { kind: 'at', node: 'university' },
        c: { kind: 'at', node: 'gym', ghost: true },
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  return (
    <div className="mapwrap" style={{ height: '100%' }}>
      <MapCanvas scene={scene} />
      <div className="overlay">
        <button onClick={() => scene.zoom(0.8)}>zoom in</button>
        <button onClick={() => scene.zoom(1.25)}>zoom out</button>
        <button onClick={() => scene.fitAll()}>fit all</button>
        <button onClick={() => scene.follow('a')}>follow Ann</button>
        <button onClick={() => scene.follow(null)}>follow off</button>
      </div>
      <div
        className="overlay bottom"
        style={{ justifyContent: 'flex-start', pointerEvents: 'none', gap: 8, flexWrap: 'wrap' }}
      >
        <span style={BADGE}>{log}</span>
        {usingPlaceholderArt() && (
          <span style={BADGE}>
            placeholder art - real sprites arrive by swapping getArt() in src/map/art.ts
          </span>
        )}
      </div>
    </div>
  );
}
