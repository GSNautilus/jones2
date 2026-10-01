/**
 * Sizing the classic screen for whatever it is shown on (PLAN §7): a desktop
 * gets the designed ×2, a phone gets the largest scale that still fits.
 *
 * Pixel art stays crisp only when every art pixel covers a whole number of
 * DEVICE pixels. A phone has 2 or 3 device pixels per CSS pixel, so it can
 * show the art at ×1.33 or ×1.67 CSS and still be crisp; those are the
 * in-between steps offered here. Pure: no DOM, so every choice is testable.
 */
import { layoutPanel, type Density, type PanelModel } from './layout';

export interface ScreenInfo {
  /** Viewport in CSS pixels. */
  width: number;
  height: number;
  /** Device pixels per CSS pixel. */
  dpr: number;
  /** The primary pointer is a finger (`pointer: coarse`). */
  touch: boolean;
}

/** The designed magnification, used whenever it fits. */
export const DESKTOP_SCALE = 2;
/** Narrowest a window is laid out before a smaller scale is tried instead. */
export const MIN_PANEL_W = 240;

function safeDpr(dpr: number): number {
  return dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
}

/**
 * CSS scales from `max` down to ×1, largest first: the whole-CSS-pixel ones
 * (what a desktop has always had) plus every one that lands on whole device
 * pixels for this screen.
 */
export function crispScales(dpr: number, max = DESKTOP_SCALE): number[] {
  const d = safeDpr(dpr);
  const out: number[] = [];
  for (let s = Math.floor(max); s >= 1; s--) out.push(s);
  for (let k = Math.floor(max * d + 1e-9); k >= 1; k--) {
    const s = k / d;
    if (s < 1 - 1e-9) break;
    if (s <= max + 1e-9) out.push(s);
  }
  out.sort((a, b) => b - a);
  return out.filter((s, i) => i === 0 || out[i - 1]! - s > 1e-6);
}

/** Device pixels per art pixel at a CSS scale: what a canvas's backing store is sized by. */
export function devicePixels(scale: number, dpr: number): number {
  return Math.max(1, Math.round(scale * safeDpr(dpr)));
}

export function densityFor(screen: ScreenInfo): Density {
  return screen.touch ? 'touch' : 'mouse';
}

export interface PanelFit {
  scale: number;
  width: number;
  maxListRows: number;
  density: Density;
  /** False when even the smallest scale overflows `screen` (the window then scrolls). */
  fits: boolean;
}

/**
 * The scale, width and visible rows for a centre window: the wanted width
 * and rows at the largest crisp scale where the window fits in `screen` (the
 * room the furniture leaves, not the whole viewport), with the list cut
 * shorter (it scrolls) before the scale is dropped, but never below four rows
 * while a smaller scale is left to try.
 */
export function fitPanel(
  model: PanelModel,
  want: { width: number; maxListRows: number },
  screen: ScreenInfo,
  /** Fewest list rows that count as fitting (fewer only when the list is shorter). */
  minRowsWanted = 4,
): PanelFit {
  const density = densityFor(screen);
  const margin = screen.touch ? 8 : 16;
  const availW = Math.max(1, screen.width - margin * 2);
  const availH = Math.max(1, screen.height - margin * 2);
  const scales = crispScales(screen.dpr);
  const minRows = Math.min(model.rows.length, want.maxListRows, minRowsWanted);

  let fallback: PanelFit | null = null;
  for (let i = 0; i < scales.length; i++) {
    const scale = scales[i]!;
    const last = i === scales.length - 1;
    const width = Math.min(want.width, Math.floor(availW / scale));
    if (width < MIN_PANEL_W && !last) continue;
    const room = Math.floor(availH / scale);
    let rows = want.maxListRows;
    let layout = layoutPanel(model, { width, maxListRows: rows, density });
    if (layout.height > room && layout.visible > 0) {
      rows = Math.max(1, layout.visible - Math.ceil((layout.height - room) / layout.rowH));
      layout = layoutPanel(model, { width, maxListRows: rows, density });
    }
    const fits = layout.height <= room && layout.width <= Math.floor(availW / scale);
    const fit = { scale, width, maxListRows: rows, density, fits };
    if (fits && rows >= minRows) return fit;
    fallback = { ...fit, fits: false };
  }
  return fallback ?? { scale: scales[scales.length - 1] ?? 1, width: want.width, maxListRows: want.maxListRows, density, fits: false };
}

/* ---------------------------------------------------------- furniture --- */

/**
 * Where the board's furniture goes (the clock with WEEK #N, the cash box
 * with END TURN, GOALS / STATISTICS / OPTIONS):
 * - `corners`: along the bottom, as the original (PLAN §2);
 * - `rail`: a column down the right, for a screen too short for the corners;
 * - `dock`: a strip under the map, for a portrait screen.
 * Windows only ever get the room the furniture leaves, so nothing overlaps.
 */
export type FurnitureMode = 'corners' | 'rail' | 'dock';

export interface Box {
  w: number;
  h: number;
}

/** Native sizes of the furniture's pieces (from `layoutChrome`). */
export interface Furniture {
  /** GOALS / STATISTICS / OPTIONS side by side. */
  bar: Box;
  /** The same three stacked, for the rail. */
  barStack: Box;
  /** The cash box with END TURN. */
  readout: Box;
  /** The clock face's art size. */
  clock: number;
}

/** CSS pixels kept clear at each edge: what windows may not cover. */
export interface Room {
  top: number;
  right: number;
  bottom: number;
}

export interface ScreenLayout {
  mode: FurnitureMode;
  /** CSS scale of the furniture. */
  scale: number;
  room: Room;
  /** In the rail: how many pieces (clock, cash box, buttons) the first column takes; 3 is one column. */
  split: number;
}

/** Margin from the screen edge, and between pieces (CSS px). */
export const EDGE = 12;
export const GAP = 12;
/** The WEEK #N plate under the clock: fixed-size DOM text (CSS px). */
export const PLATE_W = 90;
export const PLATE_H = 27;
/** The player plate and map buttons along the top (CSS px). */
export const TOP_BAND = 48;
/** Padding inside the rail and the dock, and their border (CSS px). */
export const BAND_PAD = 8;
export const BAND_BORDER = 3;

/** The window everything is sized around: the Employment Office, the biggest. */
export const REFERENCE_WINDOW: { model: PanelModel; want: { width: number; maxListRows: number } } = {
  model: {
    title: 'EMPLOYMENT OFFICE',
    portrait: 'employment',
    bubble: 'WELCOME TO ACNE EMPLOYMENT. WHY WORK FOR THE BEST WHEN YOU CAN WORK LIKE THE REST.',
    rows: Array.from({ length: 11 }, (_, i) => ({ key: `r${i}`, text: 'APARTMENT MANAGER', value: '$9/H', hours: '4H' })),
    buttons: [
      { key: 'back', label: 'BACK' },
      { key: 'done', label: 'DONE' },
    ],
  },
  want: { width: 380, maxListRows: 11 },
};

export interface Placement {
  fits: boolean;
  room: Room;
  /** See `ScreenLayout.split`. */
  split: number;
}

/**
 * Whether `mode` at `scale` fits the screen, and the room it keeps clear.
 * The rail stacks clock, cash box and buttons in one column, or in two when
 * one would be too tall for the screen.
 */
export function placeFurniture(mode: FurnitureMode, f: Furniture, s: number, screen: ScreenInfo): Placement {
  const clockW = Math.max(f.clock * s, PLATE_W);
  const clockH = f.clock * s + PLATE_H;
  if (mode === 'corners') {
    // The clock is centred, so each side gets half of what it leaves.
    const side = Math.max(f.bar.w, f.readout.w) * s;
    const fits = 2 * (EDGE + side + GAP) + clockW <= screen.width;
    const bottom = Math.max(clockH + 8, f.bar.h * s + EDGE, f.readout.h * s + EDGE);
    return { fits: fits && bottom + TOP_BAND < screen.height, room: { top: TOP_BAND, right: 0, bottom }, split: 3 };
  }
  if (mode === 'rail') {
    const pieces: Box[] = [
      { w: clockW, h: clockH },
      { w: f.readout.w * s, h: f.readout.h * s },
      { w: f.barStack.w * s, h: f.barStack.h * s },
    ];
    const colH = (ps: Box[]) => ps.reduce((h, p, i) => h + p.h + (i ? GAP : 0), 0);
    const colW = (ps: Box[]) => Math.max(...ps.map((p) => p.w));
    const inner = screen.height - 2 * BAND_PAD;
    for (const split of [3, 2, 1]) {
      const cols = split === 3 ? [pieces] : [pieces.slice(0, split), pieces.slice(split)];
      if (!cols.every((c) => colH(c) <= inner)) continue;
      const w = cols.reduce((sum, c, i) => sum + colW(c) + (i ? GAP : 0), 0) + 2 * BAND_PAD + BAND_BORDER;
      return { fits: w <= screen.width / 2, room: { top: TOP_BAND, right: w, bottom: 0 }, split };
    }
    return { fits: false, room: { top: TOP_BAND, right: colW(pieces) + 2 * BAND_PAD + BAND_BORDER, bottom: 0 }, split: 3 };
  }
  const w = Math.max(clockW + GAP + f.readout.w * s, f.bar.w * s) + 2 * BAND_PAD;
  const h = Math.max(clockH, f.readout.h * s) + 6 + f.bar.h * s + 2 * BAND_PAD + BAND_BORDER;
  return { fits: w <= screen.width && h <= screen.height / 2, room: { top: TOP_BAND, right: 0, bottom: h }, split: 3 };
}

/** The screen less the room kept clear: what a window may use. */
export function windowArea(screen: ScreenInfo, room: Room): ScreenInfo {
  return { ...screen, width: Math.max(1, screen.width - room.right), height: Math.max(1, screen.height - room.top - room.bottom) };
}

/** Rows the reference window must keep for an arrangement to be taken outright. */
export const GOOD_ROWS = 6;

/**
 * The furniture's mode and scale. Largest scale first; at each scale the
 * corners (landscape) or the dock (portrait) are tried before the rail. A
 * choice is taken outright when the furniture fits and the reference window
 * fits beside it with at least GOOD_ROWS rows, at no smaller a scale than the
 * furniture's: so a desktop keeps its ×2 corners and a short screen moves the
 * furniture aside rather than squeezing the windows. When nothing passes, the
 * arrangement that leaves windows the most rows wins.
 */
export function chooseLayout(screen: ScreenInfo, f: Furniture, ref = REFERENCE_WINDOW): ScreenLayout {
  const portrait = screen.height > screen.width;
  const scales = crispScales(screen.dpr);
  // A portrait screen too small for the dock still has the rail.
  const modes: FurnitureMode[] = portrait ? ['dock', 'rail'] : ['corners', 'rail'];
  const goodRows = Math.min(GOOD_ROWS, ref.want.maxListRows, ref.model.rows.length);
  let best: { choice: ScreenLayout; score: number[] } | null = null;
  for (const scale of scales) {
    for (const mode of modes) {
      const { fits, room, split } = placeFurniture(mode, f, scale, screen);
      if (!fits) continue;
      const fit = fitPanel(ref.model, ref.want, windowArea(screen, room), goodRows);
      const choice = { mode, scale, room, split };
      if (fit.fits && fit.scale >= scale - 1e-9) return choice;
      const loose = fitPanel(ref.model, ref.want, windowArea(screen, room));
      const score = [loose.fits ? 1 : 0, loose.maxListRows, loose.scale, scale];
      if (!best || isBetter(score, best.score)) best = { choice, score };
    }
  }
  if (best) return best.choice;
  const scale = scales[scales.length - 1] ?? 1;
  const mode: FurnitureMode = portrait ? 'dock' : 'rail';
  const { room, split } = placeFurniture(mode, f, scale, screen);
  return { mode, scale, room, split };
}

function isBetter(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i]! !== b[i]!) return a[i]! > b[i]!;
  }
  return false;
}
