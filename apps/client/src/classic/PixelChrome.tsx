/**
 * A corner box of the board as a DOM canvas: painted at native resolution by
 * `chrome.ts` and blown up with smoothing off. Hover and press are tested
 * against the rectangles that were painted. `scale` may be an in-between
 * value such as ×1.33 on a phone (PLAN §7): the backing store is sized in
 * whole device pixels, so the art stays crisp.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { PALETTE, createSurface } from '@jones2/pixelart';
import { toRGBA } from '../map/surface';
import { hitChrome, layoutChrome, paintChrome, type ChromeModel, type ChromeState } from './chrome';
import { devicePixels } from './screen';

export interface PixelChromeProps {
  model: ChromeModel;
  /** CSS pixels per art pixel. */
  scale?: number;
  /** Device pixels per CSS pixel. */
  dpr?: number;
  onButton?: (key: string) => void;
  /** Tooltips by button key, shown by the browser. */
  titles?: Record<string, string>;
  className?: string;
}

export function PixelChrome({ model, scale = 2, dpr = 1, onButton, titles, className }: PixelChromeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<ChromeState>({ hover: -1, pressed: -1 });
  const layout = useMemo(() => layoutChrome(model), [model]);
  const dev = devicePixels(scale, dpr);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const surface = createSurface(layout.width, layout.height, 0);
    paintChrome(surface, model, layout, state);
    const off = document.createElement('canvas');
    off.width = layout.width;
    off.height = layout.height;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    const image = offCtx.createImageData(layout.width, layout.height);
    image.data.set(toRGBA(surface, PALETTE.colors));
    offCtx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  }, [layout, model, state, dev]);

  const locate = useCallback(
    (e: { clientX: number; clientY: number }): number => {
      const canvas = canvasRef.current;
      if (!canvas) return -1;
      const b = canvas.getBoundingClientRect();
      const x = ((e.clientX - b.left) / b.width) * layout.width;
      const y = ((e.clientY - b.top) / b.height) * layout.height;
      return hitChrome(layout, x, y);
    },
    [layout],
  );

  const hoverKey = state.hover >= 0 ? model.buttons[state.hover]?.key : undefined;
  const buttonMap = layout.buttons.map((b) => ({
    key: model.buttons[b.index]?.key ?? String(b.index),
    x: b.rect.x * scale,
    y: b.rect.y * scale,
    w: b.rect.w * scale,
    h: b.rect.h * scale,
  }));

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const h = locate(e);
    const wasPressed = state.pressed;
    // A finger leaves no hover behind it.
    setState({ hover: e.pointerType === 'mouse' ? h : -1, pressed: -1 });
    if (h >= 0 && h === wasPressed && model.buttons[h]?.enabled !== false) onButton?.(model.buttons[h]!.key);
  };

  return (
    <canvas
      ref={canvasRef}
      className={`classic-chrome${className ? ` ${className}` : ''}`}
      data-buttons={JSON.stringify(buttonMap)}
      title={hoverKey && titles ? titles[hoverKey] : undefined}
      width={layout.width * dev}
      height={layout.height * dev}
      style={{ width: layout.width * scale, height: layout.height * scale, cursor: state.hover >= 0 ? 'pointer' : 'default' }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const h = locate(e);
        setState((s) => (s.hover === h ? s : { ...s, hover: h }));
      }}
      onPointerLeave={() => setState({ hover: -1, pressed: -1 })}
      onPointerCancel={() => setState({ hover: -1, pressed: -1 })}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const h = locate(e);
        if (h >= 0 && model.buttons[h]?.enabled !== false) setState({ hover: h, pressed: h });
      }}
      onPointerUp={onPointerUp}
    />
  );
}
