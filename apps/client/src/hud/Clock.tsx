/**
 * The big clock: the one HUD element the player should never have to look for.
 *
 * A week is 60 hours = 5 days x 12 hours. The face is a 12-hour dial whose hour
 * hand sweeps once per game day; the ring around it drains as the week is spent
 * (green -> amber -> red). Hovering an action hatches the slice of the ring it
 * would eat and the readout shows what would be left.
 *
 * The art is rasterised by hand at 96x96 and blown up with smoothing off, so it
 * stays pixel art rather than turning into a vector dial. `skin.ts` is where a
 * real sprite face gets swapped in.
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  formatHM,
  formatTimeOfDay,
  pieSweep,
  previewWedge,
  readClock,
  type ClockReading,
} from './clockMath';
import { arc, clearBuffer, createBuffer, disc, hand, hexToRgba, polar, put, type PixelBuffer, type Rgba } from './raster';
import { clockSkin, drawSprite, HUD } from './skin';
import { useTimePreview } from './preview';

/** Native art size in pixels; the canvas is this times `scale`. */
export const CLOCK_ART = 96;
const TICK_MS = 400;

const CX = 47.5;
const CY = 47.5;
const R_OUTER = 47;
const R_RING_OUT = 46;
const R_RING_IN = 40;
const R_FACE = 38;

const INK = hexToRgba(HUD.ink);
const INK_SOFT = hexToRgba(HUD.inkSoft);
const WOOD_DARK = hexToRgba(HUD.woodDark);
const BRASS = hexToRgba(HUD.brass);
const BRASS_LIGHT = hexToRgba(HUD.brassLight);
const BRASS_DARK = hexToRgba(HUD.brassDark);
const PANEL = hexToRgba(HUD.panel);
const PANEL_SHADE = hexToRgba(HUD.panelShade);
const TRACK = hexToRgba('#2a2330');
const ZONE: Record<ClockReading['zone'], Rgba> = {
  green: hexToRgba(HUD.green),
  amber: hexToRgba(HUD.amber),
  red: hexToRgba(HUD.red),
};
/** The spent sector of the face: a dark wash the ticks and numerals read through. */
const SPENT = hexToRgba('#3a3242', 150);
const PREVIEW = hexToRgba('#ffffff', 190);
const PREVIEW_OVER = hexToRgba('#ffd9c8', 235);

export interface PaintInput {
  reading: ClockReading;
  preview: number | null;
  /** The real (un-animated) minutes left, so the preview arc is not smeared by the tick animation. */
  actualLeft: number;
}

/** Exported so a Node script (or a test) can render the face without a DOM. */
export function paintClock(buf: PixelBuffer, input: PaintInput): void {
  clearBuffer(buf);
  const { reading } = input;
  const skin = clockSkin();

  // Bezel: dark rim, brass body, a light top-left highlight.
  disc(buf, CX, CY, R_OUTER, INK);
  arc(buf, CX, CY, R_RING_IN - 2, R_OUTER - 1, 0, 360, BRASS_DARK);
  arc(buf, CX, CY, R_RING_IN - 2, R_OUTER - 2, 200, 360, BRASS);
  arc(buf, CX, CY, R_OUTER - 3, R_OUTER - 1, 270, 360, BRASS_LIGHT);

  // The ring is now plain track: the week's state is told by the pie on the face.
  arc(buf, CX, CY, R_RING_IN, R_RING_OUT, 0, 360, TRACK);
  const sweep = pieSweep(reading.left, reading.budget);
  if (sweep > 0.5) arc(buf, CX, CY, R_RING_IN, R_RING_OUT, 0, sweep, ZONE[reading.zone]);

  // Face.
  if (skin.face) {
    drawSprite(buf, skin.face, Math.round(CX - skin.face.width / 2), Math.round(CY - skin.face.height / 2));
  } else {
    disc(buf, CX, CY, R_FACE, INK);
    disc(buf, CX, CY, R_FACE - 1, PANEL);
    arc(buf, CX, CY, R_FACE - 6, R_FACE - 1, 90, 270, PANEL_SHADE);
    for (let h = 0; h < 12; h++) {
      const deg = h * 30;
      const major = h % 3 === 0;
      const [x0, y0] = polar(CX, CY, deg, R_FACE - (major ? 9 : 6));
      const [x1, y1] = polar(CX, CY, deg, R_FACE - 3);
      const colour = major ? INK : INK_SOFT;
      // Ticks are short: stamp the two endpoints and the midpoint, no AA.
      for (let t = 0; t <= 1.0001; t += 0.25) {
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        put(buf, Math.round(x), Math.round(y), colour);
        if (major) put(buf, Math.round(x) + (Math.abs(Math.cos(((deg - 90) * Math.PI) / 180)) > 0.5 ? 0 : 1), Math.round(y), colour);
      }
    }
  }

  // PIE FILL (PLAN §4): the face fills clockwise as the week is spent, so the
  // bright remainder IS the time left. Drawn over the face so the ticks show.
  if (sweep > 0.5) arc(buf, CX, CY, 0, R_FACE - 2, 0, sweep, SPENT);

  // Preview: the wedge the candidate action would add, hatched, just past the fill.
  const wedge = input.preview != null ? previewWedge(input.actualLeft, reading.budget, input.preview) : null;
  if (wedge) {
    const from = wedge.from * 360;
    const to = wedge.to * 360;
    arc(buf, CX, CY, 0, R_FACE - 2, from, to, wedge.clipped ? PREVIEW_OVER : PREVIEW, { hatch: true });
  }

  // Hands. Sprite hands would be rotated by the art package; until then, lines.
  hand(buf, CX, CY, reading.hourAngle, 20, 3, INK, 5);
  hand(buf, CX, CY, reading.minuteAngle, 29, 1, INK, 4);
  hand(buf, CX, CY, reading.hourAngle, 18, 1, WOOD_DARK, 3);
  disc(buf, CX, CY, 3, INK);
  disc(buf, CX, CY, 2, BRASS);
}

export interface ClockProps {
  minutesLeft: number;
  minutesBudget: number;
  week: number;
  /** Integer magnification of the 96px art. 2 => 192 css px. */
  scale?: number;
  /**
   * `full` is the Jones 2 screen's clock (day/time plates and the LED readout).
   * `classic` is the original's: the face with WEEK #N under it and nothing
   * else — the cash/hours readout lives in the bottom-right corner instead.
   */
  variant?: 'full' | 'classic';
}

export function Clock({ minutesLeft, minutesBudget, week, scale = 2, variant = 'full' }: ClockProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<ImageData | null>(null);
  const buf = useMemo(() => createBuffer(CLOCK_ART, CLOCK_ART), []);
  const { minutes: preview } = useTimePreview();

  // Animated value: the hands and ring ease from the old minutes to the new.
  const shownRef = useRef(minutesLeft);
  const rafRef = useRef<number | null>(null);
  const previewRef = useRef<number | null>(preview);
  const leftRef = useRef(minutesLeft);
  previewRef.current = preview;
  leftRef.current = minutesLeft;

  const px = CLOCK_ART * Math.max(1, Math.round(scale));

  const paint = useMemo(() => {
    return () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (!offRef.current) {
        const off = document.createElement('canvas');
        off.width = CLOCK_ART;
        off.height = CLOCK_ART;
        offRef.current = off;
      }
      const off = offRef.current;
      const offCtx = off.getContext('2d');
      if (!offCtx) return;
      paintClock(buf, {
        reading: readClock(shownRef.current, minutesBudget),
        preview: previewRef.current,
        actualLeft: leftRef.current,
      });
      if (!imageRef.current) imageRef.current = offCtx.createImageData(CLOCK_ART, CLOCK_ART);
      const img = imageRef.current;
      img.data.set(buf.data);
      offCtx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    };
  }, [buf, minutesBudget]);

  // Tick animation whenever the real value moves.
  useEffect(() => {
    const from = shownRef.current;
    const to = minutesLeft;
    if (from === to) {
      paint();
      return undefined;
    }
    const t0 = typeof performance === 'undefined' ? Date.now() : performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / TICK_MS);
      const eased = 1 - (1 - t) * (1 - t);
      shownRef.current = from + (to - from) * eased;
      paint();
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else {
        shownRef.current = to;
        rafRef.current = null;
        paint();
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [minutesLeft, paint]);

  // Repaint on preview / size changes.
  useEffect(() => {
    paint();
  }, [paint, preview, px]);

  const reading = readClock(minutesLeft, minutesBudget);
  const after = preview != null ? Math.max(0, minutesLeft - preview) : null;
  const over = preview != null && minutesLeft - preview < 0;

  if (variant === 'classic') {
    return (
      <div className="hud-clock hud-clock-classic">
        <canvas
          ref={canvasRef}
          width={px}
          height={px}
          className="hud-clock-face"
          style={{ width: px, height: px }}
          aria-label={`${formatHM(reading.left)} left this week, week ${week}`}
          role="img"
        />
        <div className="hud-week-plate">{`WEEK #${week}`}</div>
      </div>
    );
  }

  return (
    <div className="hud-clock">
      <canvas
        ref={canvasRef}
        width={px}
        height={px}
        className="hud-clock-face"
        style={{ width: px, height: px }}
        aria-label={`${formatHM(reading.left)} left this week, day ${reading.day}, week ${week}`}
        role="img"
      />
      <div className="hud-clock-plates">
        <span className="hud-plate">DAY {reading.day}</span>
        <span className="hud-plate hud-plate-time">{formatTimeOfDay(reading)}</span>
        <span className="hud-plate">WEEK {week}</span>
      </div>
      <div className={`hud-led hud-led-${reading.zone}`}>
        <span className="hud-led-value">{formatHM(reading.left)}</span>
        <span className="hud-led-unit">left</span>
        {after != null && (
          <span className={`hud-led-preview${over ? ' over' : ''}`}>
            {'→'} {over ? 'not enough time' : formatHM(after)}
          </span>
        )}
      </div>
    </div>
  );
}
