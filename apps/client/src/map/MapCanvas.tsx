/**
 * React glue for the town renderer. `useTownScene` owns a scene instance for
 * the life of a component; `<MapCanvas>` attaches it to a canvas and keeps it
 * sized to its parent box.
 */
import { useEffect, useRef } from 'react';
import type { TownScene, TownSceneOptions } from './api';
import { createTownScene } from './TownScene';

/**
 * Create one `TownScene` for this component and dispose it on unmount.
 * Options are read once; changing them later has no effect (the scene is
 * deliberately stable so town/figure state survives re-renders).
 */
export function useTownScene(options?: TownSceneOptions): TownScene {
  const ref = useRef<TownScene | null>(null);
  if (ref.current === null) ref.current = createTownScene(options);
  const scene = ref.current;

  useEffect(() => {
    return () => {
      scene.dispose();
    };
  }, [scene]);

  return scene;
}

export interface MapCanvasProps {
  scene: TownScene;
  className?: string;
}

export function MapCanvas({ scene, className }: MapCanvasProps) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const holder = holderRef.current;
    if (!canvas || !holder) return undefined;

    scene.mount(canvas);
    scene.resize();

    const onResize = () => scene.resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    observer?.observe(holder);
    window.addEventListener('resize', onResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
      // Detach only. The scene's owner (useTownScene) disposes it; disposing
      // here would wipe the town on React StrictMode's mount/unmount/mount.
      scene.unmount();
    };
  }, [scene]);

  return (
    <div ref={holderRef} className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
