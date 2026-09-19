/**
 * The centre window as a DOM element: one canvas, painted at native resolution
 * by `paint.ts` and blown up by an integer zoom with smoothing off.
 *
 * All the geometry comes from `layout.ts`, so the same rectangles that were
 * painted are the ones the mouse is tested against — there is no second,
 * drifting copy of the layout in the event handlers.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PALETTE, createSurface } from '@jones2/pixelart';
import { toRGBA } from '../map/surface';
import { clampScroll, hitPanel, layoutPanel, type PanelHit, type PanelModel } from './layout';
import { paintPanel, type PaintState } from './paint';

/** Rows one wheel notch moves: a 39-job list is unusable one row at a time. */
const WHEEL_ROWS = 3;

export interface PixelPanelProps {
  model: PanelModel;
  /** Integer magnification of the native art. */
  scale?: number;
  width?: number;
  maxListRows?: number;
  onRow?: (index: number) => void;
  onButton?: (index: number) => void;
  /** Shown above the buttons when nothing is hovered. */
  hint?: string;
}

export function PixelPanel({
  model,
  scale = 2,
  width = 360,
  maxListRows = 12,
  onRow,
  onButton,
  hint,
}: PixelPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scroll, setScroll] = useState(0);
  const [hover, setHover] = useState<PanelHit>(null);

  // A new window (or a changed row count) starts at the top.
  const signature = `${model.title}|${model.rows.length}`;
  const lastSignature = useRef(signature);
  if (lastSignature.current !== signature) {
    lastSignature.current = signature;
    if (scroll !== 0) setScroll(0);
  }

  const layout = useMemo(
    () => layoutPanel(model, { width, maxListRows, scroll }),
    [model, width, maxListRows, scroll],
  );

  const state: PaintState = useMemo(() => {
    const hoveredRow = hover?.kind === 'row' ? model.rows[hover.index] : undefined;
    const hoveredButton = hover?.kind === 'button' ? model.buttons[hover.index] : undefined;
    const reason = hoveredRow?.reason ?? hoveredButton?.reason;
    const label = hoveredRow?.enabled === false || hoveredButton?.enabled === false ? reason : undefined;
    return {
      hoverRow: hover?.kind === 'row' ? hover.index : -1,
      hoverButton: hover?.kind === 'button' ? hover.index : -1,
      status: label ?? reason ?? hint ?? '',
      warn: !!label,
    };
  }, [hover, model, hint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const surface = createSurface(layout.width, layout.height, 0);
    paintPanel(surface, model, layout, state);
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
    (e: { clientX: number; clientY: number }): PanelHit => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const box = canvas.getBoundingClientRect();
      const x = ((e.clientX - box.left) / box.width) * layout.width;
      const y = ((e.clientY - box.top) / box.height) * layout.height;
      return hitPanel(layout, model, x, y);
    },
    [layout, model],
  );

  const px = layout.width * scale;
  const py = layout.height * scale;

  // The button rectangles in CSS pixels, so an automated harness (the
  // screenshot tool) can click DONE without guessing at the layout.
  const buttonMap = layout.buttons.map((b) => ({
    key: model.buttons[b.index]?.key ?? String(b.index),
    x: b.rect.x * scale,
    y: b.rect.y * scale,
    w: b.rect.w * scale,
    h: b.rect.h * scale,
  }));

  // The same for the visible rows, keyed as the model keys them.
  const rowMap = layout.rows.map((r) => ({
    key: model.rows[r.index]?.key ?? String(r.index),
    x: r.rect.x * scale,
    y: r.rect.y * scale,
    w: r.rect.w * scale,
    h: r.rect.h * scale,
  }));

  return (
    <canvas
      ref={canvasRef}
      className="classic-panel"
      data-buttons={JSON.stringify(buttonMap)}
      data-rows={JSON.stringify(rowMap)}
      width={px}
      height={py}
      style={{ width: px, height: py }}
      onMouseMove={(e) => setHover(locate(e))}
      onMouseLeave={() => setHover(null)}
      onWheel={(e) => setScroll((s) => clampScroll(model, layout, s + (e.deltaY > 0 ? WHEEL_ROWS : -WHEEL_ROWS)))}
      onClick={(e) => {
        const hit = locate(e);
        if (!hit) return;
        if (hit.kind === 'row') {
          if (model.rows[hit.index]?.enabled !== false) onRow?.(hit.index);
        } else if (model.buttons[hit.index]?.enabled !== false) {
          onButton?.(hit.index);
        }
      }}
    />
  );
}
