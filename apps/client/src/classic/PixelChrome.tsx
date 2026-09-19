/**
 * A corner box of the board as a DOM canvas: painted at native resolution by
 * `chrome.ts` and blown up by an integer scale with smoothing off. Hover and
 * press are tested against the rectangles that were painted.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PALETTE, createSurface } from '@jones2/pixelart';
import { toRGBA } from '../map/surface';
import { hitChrome, layoutChrome, paintChrome, type ChromeModel, type ChromeState } from './chrome';

export interface PixelChromeProps {
  model: ChromeModel;
  scale?: number;
  onButton?: (key: string) => void;
  /** Tooltips by button key, shown by the browser. */
  titles?: Record<string, string>;
  className?: string;
}

export function PixelChrome({ model, scale = 2, onButton, titles, className }: PixelChromeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<ChromeState>({ hover: -1, pressed: -1 });
  const layout = useMemo(() => layoutChrome(model), [model]);

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
  }, [layout, model, state]);

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

  return (
    <canvas
      ref={canvasRef}
      className={`classic-chrome${className ? ` ${className}` : ''}`}
      data-buttons={JSON.stringify(buttonMap)}
      title={hoverKey && titles ? titles[hoverKey] : undefined}
      width={layout.width * scale}
      height={layout.height * scale}
      style={{ width: layout.width * scale, height: layout.height * scale, cursor: state.hover >= 0 ? 'pointer' : 'default' }}
      onMouseMove={(e) => {
        const h = locate(e);
        setState((s) => (s.hover === h ? s : { ...s, hover: h }));
      }}
      onMouseLeave={() => setState({ hover: -1, pressed: -1 })}
      onMouseDown={(e) => {
        const h = locate(e);
        if (h >= 0 && model.buttons[h]?.enabled !== false) setState({ hover: h, pressed: h });
      }}
      onMouseUp={(e) => {
        const h = locate(e);
        const wasPressed = state.pressed;
        setState({ hover: h, pressed: -1 });
        if (h >= 0 && h === wasPressed && model.buttons[h]?.enabled !== false) onButton?.(model.buttons[h]!.key);
      }}
    />
  );
}
