/**
 * The centre window as a DOM element: one canvas, painted at native resolution
 * by `paint.ts` and blown up with smoothing off.
 *
 * All the geometry comes from `layout.ts`, so the same rectangles that were
 * painted are the ones the pointer is tested against — there is no second,
 * drifting copy of the layout in the event handlers.
 *
 * Sized for the screen by `fitPanel` (PLAN §7): the designed width at ×2 on a
 * desktop; on a phone a crisp in-between scale, a narrower window and taller
 * rows. Pointer events throughout: a mouse hovers and clicks as before; a
 * finger drags the list to scroll, and a tap on a greyed row or button puts
 * its reason on the status line, since there is no hover to show it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { PALETTE, createSurface } from '@jones2/pixelart';
import { toRGBA } from '../map/surface';
import { clampScroll, hitPanel, layoutPanel, scrollAfterDrag, type PanelHit, type PanelModel } from './layout';
import { paintPanel, type PaintState } from './paint';
import { devicePixels, fitPanel } from './screen';
import { useScreen } from './useScreen';

/** Rows one wheel notch moves: a 39-job list is unusable one row at a time. */
const WHEEL_ROWS = 3;

export interface PixelPanelProps {
  model: PanelModel;
  /** The window's designed width in native pixels; narrower on a small screen. */
  width?: number;
  /** Rows visible at once before the list scrolls; fewer on a short screen. */
  maxListRows?: number;
  onRow?: (index: number) => void;
  onButton?: (index: number) => void;
  /** Shown above the buttons when nothing is hovered. */
  hint?: string;
}

interface Drag {
  id: number;
  y: number;
  scroll: number;
  moved: boolean;
  touch: boolean;
}

export function PixelPanel({ model, width = 360, maxListRows = 12, onRow, onButton, hint }: PixelPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screen = useScreen();
  const [scroll, setScroll] = useState(0);
  const [hover, setHover] = useState<PanelHit>(null);
  const drag = useRef<Drag | null>(null);

  // A new window (or a changed row count) starts at the top.
  const signature = `${model.title}|${model.rows.length}`;
  const lastSignature = useRef(signature);
  if (lastSignature.current !== signature) {
    lastSignature.current = signature;
    if (scroll !== 0) setScroll(0);
    if (hover !== null) setHover(null);
  }

  const fit = useMemo(() => fitPanel(model, { width, maxListRows }, screen), [model, width, maxListRows, screen]);
  const scale = fit.scale;
  const dev = devicePixels(scale, screen.dpr);

  const layout = useMemo(
    () => layoutPanel(model, { width: fit.width, maxListRows: fit.maxListRows, scroll, density: fit.density }),
    [model, fit, scroll],
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
  }, [layout, model, state, dev]);

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

  const enabled = (hit: NonNullable<PanelHit>): boolean =>
    hit.kind === 'row' ? model.rows[hit.index]?.enabled !== false : model.buttons[hit.index]?.enabled !== false;

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const touch = e.pointerType !== 'mouse';
    drag.current = { id: e.pointerId, y: e.clientY, scroll: layout.scroll, moved: false, touch };
    // A finger gets the row lit as it presses, which is all the hover it has.
    if (touch) setHover(locate(e));
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      const dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dy) > (d.touch ? 8 : 6)) {
        d.moved = true;
        if (d.touch) setHover(null);
      }
      if (d.moved) setScroll(scrollAfterDrag(model, layout, d.scroll, dy / scale));
      return;
    }
    if (e.pointerType === 'mouse') setHover(locate(e));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || d.moved) return;
    const hit = locate(e);
    if (!hit) {
      if (d.touch) setHover(null);
      return;
    }
    if (!enabled(hit)) {
      // The reason stays on the status line until the next tap.
      if (d.touch) setHover(hit);
      return;
    }
    if (d.touch) setHover(null);
    if (hit.kind === 'row') onRow?.(hit.index);
    else onButton?.(hit.index);
  };

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
      width={layout.width * dev}
      height={layout.height * dev}
      style={{ width: px, height: py }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse' && !drag.current) setHover(null);
      }}
      onWheel={(e) => setScroll((s) => clampScroll(model, layout, s + (e.deltaY > 0 ? WHEEL_ROWS : -WHEEL_ROWS)))}
    />
  );
}
