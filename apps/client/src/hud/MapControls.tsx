/**
 * Top-right: camera buttons. The camera is fixed top-down, so there is no
 * rotate control. Per `src/map/api.ts`, `zoom(factor)` takes factor < 1 to zoom
 * IN and > 1 to zoom OUT.
 */
import type { TownScene } from '../map/api';
import { FrameButton } from './Frame';

export const ZOOM_IN = 0.8;
export const ZOOM_OUT = 1.25;

export function MapControls({ scene }: { scene: TownScene }) {
  return (
    <div className="hud-mapcontrols">
      <FrameButton onClick={() => scene.zoom(ZOOM_IN)} title="Zoom in">
        +
      </FrameButton>
      <FrameButton onClick={() => scene.zoom(ZOOM_OUT)} title="Zoom out">
        {'−'}
      </FrameButton>
      <FrameButton onClick={() => scene.fitAll()} title="Fit the whole town">
        Fit
      </FrameButton>
    </div>
  );
}
