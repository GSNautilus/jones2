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
/** Portrait screens narrower than this get the dock under the map. */
export const DOCK_MAX_W = 900;

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

/** The dock under the map, rather than the three bottom corners. */
export function usesDock(screen: ScreenInfo): boolean {
  return screen.height > screen.width && screen.width < DOCK_MAX_W;
}

export interface PanelFit {
  scale: number;
  width: number;
  maxListRows: number;
  density: Density;
}

/**
 * The scale, width and visible rows for a centre window: the wanted width
 * and rows at the largest crisp scale where the window fits on screen, with
 * the list cut shorter (it scrolls) before the scale is dropped, but never
 * below four rows while a smaller scale is left to try.
 */
export function fitPanel(
  model: PanelModel,
  want: { width: number; maxListRows: number },
  screen: ScreenInfo,
): PanelFit {
  const density = densityFor(screen);
  const margin = screen.touch ? 8 : 16;
  const availW = Math.max(1, screen.width - margin * 2);
  const availH = Math.max(1, screen.height - margin * 2);
  const scales = crispScales(screen.dpr);
  const minRows = Math.min(model.rows.length, want.maxListRows, 4);

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
    const fit = { scale, width, maxListRows: rows, density };
    if (layout.height <= room && rows >= minRows) return fit;
    fallback = fit;
  }
  return fallback ?? { scale: scales[scales.length - 1] ?? 1, width: want.width, maxListRows: want.maxListRows, density };
}

/**
 * The scale for the board's furniture: the largest crisp scale at which a
 * block `needW` x `needH` native pixels fits the width (less a margin) and
 * takes no more than `maxShare` of the height.
 */
export function chromeScale(screen: ScreenInfo, needW: number, needH: number, maxShare = 0.4): number {
  const scales = crispScales(screen.dpr);
  for (const s of scales) {
    if (needW * s <= screen.width - 24 && needH * s <= screen.height * maxShare) return s;
  }
  return scales[scales.length - 1] ?? 1;
}
