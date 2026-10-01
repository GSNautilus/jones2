/**
 * The viewport, device pixel ratio and pointer kind, kept current across
 * resizes, rotation and moving the window to another monitor. Feeds the pure
 * choices in `screen.ts`.
 */
import { useEffect, useState } from 'react';
import type { ScreenInfo } from './screen';

const COARSE = '(pointer: coarse)';

function read(): ScreenInfo {
  if (typeof window === 'undefined') return { width: 1280, height: 800, dpr: 1, touch: false };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    touch: typeof window.matchMedia === 'function' && window.matchMedia(COARSE).matches,
  };
}

function same(a: ScreenInfo, b: ScreenInfo): boolean {
  return a.width === b.width && a.height === b.height && a.dpr === b.dpr && a.touch === b.touch;
}

export function useScreen(): ScreenInfo {
  const [screen, setScreen] = useState<ScreenInfo>(read);
  useEffect(() => {
    const update = () => {
      const next = read();
      setScreen((s) => (same(s, next) ? s : next));
    };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    const coarse = typeof window.matchMedia === 'function' ? window.matchMedia(COARSE) : null;
    coarse?.addEventListener?.('change', update);
    update();
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      coarse?.removeEventListener?.('change', update);
    };
  }, []);
  return screen;
}
