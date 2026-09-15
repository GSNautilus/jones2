/** Windows, window grids and glazed shop bands. */
import { C } from '../palette';
import type { Target } from '../surface';
import { box, hline, put, rect, vline } from '../surface';

export interface WindowOptions {
  glass?: number;
  glassDark?: number;
  /** Frame / mullion colour. */
  frame?: number;
  /** Sill colour; defaults to the frame shade. */
  sill?: number;
  ink?: number;
  /** Glint pixel in the top-left of each pane (default true). */
  highlight?: boolean;
  /** Lit from inside: warm glow instead of sky reflection. */
  lit?: boolean;
  litColor?: number;
}

/** One pane: sky reflection top-left, darker glass bottom-right, dark sill. */
export function windowPane(t: Target, x: number, y: number, w: number, h: number, o: WindowOptions = {}): void {
  const ink = o.ink ?? C.ink;
  const glass = o.lit ? (o.litColor ?? C.yellow) : (o.glass ?? C.glass);
  const dark = o.lit ? (o.litColor ?? C.yellow) : (o.glassDark ?? C.glassDark);
  const sill = o.sill ?? o.frame ?? C.stoneDark;

  rect(t, x, y, w, h, glass);
  // reflection: lower-right half is darker
  for (let j = 0; j < h; j++) {
    const start = Math.max(0, Math.round(w - (j / Math.max(1, h - 1)) * w));
    if (start < w) rect(t, x + start, y + j, w - start, 1, dark);
  }
  box(t, x, y, w, h, -1, ink);
  if (o.highlight !== false && w >= 3 && h >= 3) {
    put(t, x + 1, y + 1, C.white);
    if (w >= 4) put(t, x + 2, y + 1, C.white);
  }
  // sill
  hline(t, x - 1, y + h, w + 2, sill);
  hline(t, x - 1, y + h + 1, w + 2, ink);
}

/** A grid of panes filling the given rectangle. */
export function windowGrid(
  t: Target,
  x: number,
  y: number,
  w: number,
  h: number,
  cols: number,
  rows: number,
  o: WindowOptions = {},
): void {
  if (cols < 1 || rows < 1) return;
  const gapX = 3;
  const gapY = 4;
  const paneW = Math.floor((w - gapX * (cols - 1)) / cols);
  const paneH = Math.floor((h - gapY * (rows - 1)) / rows);
  if (paneW < 3 || paneH < 3) return;
  const usedW = paneW * cols + gapX * (cols - 1);
  const x0 = x + Math.floor((w - usedW) / 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      windowPane(t, x0 + c * (paneW + gapX), y + r * (paneH + gapY), paneW, paneH, o);
    }
  }
}

/**
 * A continuous shopfront glazing band divided by mullions — the long window
 * strip on a supermarket or an electronics store.
 */
export function windowBand(
  t: Target,
  x: number,
  y: number,
  w: number,
  h: number,
  mullions: number,
  o: WindowOptions = {},
): void {
  const ink = o.ink ?? C.ink;
  const glass = o.glass ?? C.glass;
  const dark = o.glassDark ?? C.glassDark;
  const frame = o.frame ?? C.white;

  rect(t, x, y, w, h, glass);
  // one big diagonal reflection across the whole band
  for (let j = 0; j < h; j++) {
    const start = Math.max(0, Math.round(w * 0.45 + j * 1.2));
    if (start < w) rect(t, x + start, y + j, w - start, 1, dark);
  }
  // sweeping highlight streaks
  for (let k = 0; k < 2; k++) {
    const sx = x + 3 + k * 6;
    for (let j = 1; j < h - 1; j++) put(t, sx + j, y + j, C.white);
  }
  const pitch = mullions > 0 ? w / (mullions + 1) : 0;
  for (let m = 1; m <= mullions; m++) {
    const mx = x + Math.round(m * pitch);
    vline(t, mx, y, h, frame);
    vline(t, mx + 1, y, h, ink);
  }
  box(t, x, y, w, h, -1, ink);
  hline(t, x, y + 1, w, frame);
  hline(t, x - 1, y + h, w + 2, o.sill ?? C.stoneDark);
  hline(t, x - 1, y + h + 1, w + 2, ink);
}

/** A small round or arched attic window. */
export function roundWindow(t: Target, cx: number, cy: number, r: number, o: WindowOptions = {}): void {
  const ink = o.ink ?? C.ink;
  const glass = o.glass ?? C.glass;
  const dark = o.glassDark ?? C.glassDark;
  for (let j = -r; j <= r; j++) {
    const span = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.5 - j * j)));
    rect(t, cx - span, cy + j, span * 2 + 1, 1, j < 0 ? glass : dark);
    put(t, cx - span - 1, cy + j, ink);
    put(t, cx + span + 1, cy + j, ink);
  }
  hline(t, cx - 1, cy - r - 1, 3, ink);
  hline(t, cx - 1, cy + r + 1, 3, ink);
  put(t, cx - 1, cy - 1, C.white);
}
