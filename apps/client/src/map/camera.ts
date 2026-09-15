/**
 * Fixed top-down camera. There is no rotation and no fractional scale: the town
 * is drawn once at native resolution and blown up by an integer zoom with
 * nearest-neighbour sampling, which is the only way pixel art stays crisp.
 *
 * Three spaces:
 * - town units   - what the town JSON and the whole public contract speak.
 * - native px    - town units x PX_PER_UNIT. The resolution everything is drawn at.
 * - screen px    - CSS pixels inside the canvas. native x zoom, offset by the view origin.
 *
 * Everything here is pure so picking and framing can be unit-tested.
 */
import { PX_PER_UNIT } from './art';

/**
 * The only zoom levels. Integers, so drawImage never interpolates. Level 1 is
 * native resolution: a big town fits on screen whole, at the cost of labels
 * (the renderer hides them there).
 */
export const ZOOM_LEVELS: readonly number[] = [1, 2, 3, 4];

/** Below this zoom, text overlays are unreadable and are not drawn. */
export const LABEL_MIN_ZOOM = 2;

export interface View {
  /** One of ZOOM_LEVELS. */
  zoom: number;
  /** Native-pixel coordinate shown at the canvas's left edge. */
  originX: number;
  /** Native-pixel coordinate shown at the canvas's top edge. */
  originY: number;
  /** Canvas size in CSS pixels. */
  width: number;
  height: number;
}

export interface Pt {
  x: number;
  y: number;
}

export function createView(): View {
  return { zoom: ZOOM_LEVELS[0]!, originX: 0, originY: 0, width: 1, height: 1 };
}

export function townToNative(v: number): number {
  return v * PX_PER_UNIT;
}

export function nativeToTown(v: number): number {
  return v / PX_PER_UNIT;
}

/** Canvas-relative screen pixel -> town units. The picking math. */
export function screenToTown(sx: number, sy: number, view: View): Pt {
  return {
    x: (view.originX + sx / view.zoom) / PX_PER_UNIT,
    y: (view.originY + sy / view.zoom) / PX_PER_UNIT,
  };
}

/** Town units -> canvas-relative screen pixel. */
export function townToScreen(tx: number, ty: number, view: View): Pt {
  return {
    x: (tx * PX_PER_UNIT - view.originX) * view.zoom,
    y: (ty * PX_PER_UNIT - view.originY) * view.zoom,
  };
}

/** Screen pixel -> native pixel (the coordinate space every layer is drawn in). */
export function screenToNative(sx: number, sy: number, view: View): Pt {
  return { x: view.originX + sx / view.zoom, y: view.originY + sy / view.zoom };
}

/**
 * Largest zoom level at which a native-pixel box fits inside a viewport.
 * Falls back to the smallest level when nothing fits (the town then overflows,
 * which beats a fractional scale).
 */
export function fitZoom(
  nativeW: number,
  nativeH: number,
  viewW: number,
  viewH: number,
  levels: readonly number[] = ZOOM_LEVELS,
): number {
  const sorted = [...levels].sort((a, b) => a - b);
  let best = sorted[0]!;
  for (const z of sorted) {
    if (nativeW * z <= viewW && nativeH * z <= viewH) best = z;
  }
  return best;
}

/** Next zoom level in or out. `dir` is -1 (in) or +1 (out). */
export function stepZoom(current: number, dir: number, levels: readonly number[] = ZOOM_LEVELS): number {
  const sorted = [...levels].sort((a, b) => a - b);
  let i = sorted.indexOf(current);
  if (i < 0) i = 0;
  const next = dir < 0 ? i + 1 : i - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, next))]!;
}

/** Origin that centres a town point in the viewport. */
export function centreOrigin(townX: number, townY: number, view: View): Pt {
  return {
    x: townX * PX_PER_UNIT - view.width / (2 * view.zoom),
    y: townY * PX_PER_UNIT - view.height / (2 * view.zoom),
  };
}

/**
 * Origin that keeps the town point currently under (sx, sy) under the cursor
 * after a zoom change. Used by the wheel handler.
 */
export function originAfterZoomAt(sx: number, sy: number, town: Pt, newZoom: number): Pt {
  return {
    x: town.x * PX_PER_UNIT - sx / newZoom,
    y: town.y * PX_PER_UNIT - sy / newZoom,
  };
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Clamp the origin so at least some of the layer stays on screen. */
export function clampOrigin(view: View, layerW: number, layerH: number): void {
  const visW = view.width / view.zoom;
  const visH = view.height / view.zoom;
  const slackX = Math.max(0, visW * 0.5);
  const slackY = Math.max(0, visH * 0.5);
  view.originX = Math.max(-slackX, Math.min(layerW - visW + slackX, view.originX));
  view.originY = Math.max(-slackY, Math.min(layerH - visH + slackY, view.originY));
}
