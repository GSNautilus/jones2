/**
 * Drawing primitives over indexed-colour buffers. Everything here is pure and
 * allocation-light: the only allocations are the buffers themselves and the
 * point arrays returned by the curve samplers.
 */
import type { Sprite, Surface } from './types';

/** Anything with an indexed pixel buffer: a Surface or a Sprite. */
export type Target = Surface | Sprite;

export interface Pt {
  x: number;
  y: number;
}

export function createSurface(width: number, height: number, fill = 0): Surface {
  const pixels = new Uint8Array(width * height);
  if (fill !== 0) pixels.fill(fill);
  return { width, height, pixels };
}

export function createSprite(
  width: number,
  height: number,
  anchorX = width >> 1,
  anchorY = height - 1,
  footprintW = width,
  footprintH = 8,
): Sprite {
  return { width, height, pixels: new Uint8Array(width * height), anchorX, anchorY, footprintW, footprintH };
}

export function cloneSprite(s: Sprite): Sprite {
  return { ...s, pixels: new Uint8Array(s.pixels) };
}

// ---------------------------------------------------------------- pixels

export function put(t: Target, x: number, y: number, index: number): void {
  x |= 0;
  y |= 0;
  if (x < 0 || y < 0 || x >= t.width || y >= t.height) return;
  t.pixels[y * t.width + x] = index;
}

/** Draw only where the target is currently transparent. */
export function putBehind(t: Target, x: number, y: number, index: number): void {
  x |= 0;
  y |= 0;
  if (x < 0 || y < 0 || x >= t.width || y >= t.height) return;
  const o = y * t.width + x;
  if (t.pixels[o] === 0) t.pixels[o] = index;
}

export function get(t: Target, x: number, y: number): number {
  x |= 0;
  y |= 0;
  if (x < 0 || y < 0 || x >= t.width || y >= t.height) return 0;
  return t.pixels[y * t.width + x];
}

// ---------------------------------------------------------------- shapes

export function hline(t: Target, x: number, y: number, w: number, index: number): void {
  if (w <= 0) return;
  y |= 0;
  if (y < 0 || y >= t.height) return;
  let x0 = Math.max(0, x | 0);
  const x1 = Math.min(t.width, (x | 0) + w);
  const row = y * t.width;
  for (; x0 < x1; x0++) t.pixels[row + x0] = index;
}

export function vline(t: Target, x: number, y: number, h: number, index: number): void {
  if (h <= 0) return;
  x |= 0;
  if (x < 0 || x >= t.width) return;
  let y0 = Math.max(0, y | 0);
  const y1 = Math.min(t.height, (y | 0) + h);
  for (; y0 < y1; y0++) t.pixels[y0 * t.width + x] = index;
}

export function rect(t: Target, x: number, y: number, w: number, h: number, index: number): void {
  for (let i = 0; i < h; i++) hline(t, x, y + i, w, index);
}

/** Filled rect plus a 1px outline of a second colour. Pass -1 for either to skip it. */
export function box(t: Target, x: number, y: number, w: number, h: number, fill: number, outlineIndex = -1): void {
  if (fill >= 0) rect(t, x, y, w, h, fill);
  if (outlineIndex >= 0) {
    hline(t, x, y, w, outlineIndex);
    hline(t, x, y + h - 1, w, outlineIndex);
    vline(t, x, y, h, outlineIndex);
    vline(t, x + w - 1, y, h, outlineIndex);
  }
}

export function outline(t: Target, x: number, y: number, w: number, h: number, index: number): void {
  box(t, x, y, w, h, -1, index);
}

export function line(t: Target, x0: number, y0: number, x1: number, y1: number, index: number): void {
  x0 |= 0;
  y0 |= 0;
  x1 |= 0;
  y1 |= 0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    put(t, x0, y0, index);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export function fillCircle(t: Target, cx: number, cy: number, r: number, index: number): void {
  if (r <= 0) {
    put(t, cx, cy, index);
    return;
  }
  const rr = r * r + r * 0.5;
  const y0 = Math.ceil(cy - r);
  const y1 = Math.floor(cy + r);
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy;
    const span = Math.sqrt(Math.max(0, rr - dy * dy));
    const xa = Math.ceil(cx - span);
    const xb = Math.floor(cx + span);
    hline(t, xa, y, xb - xa + 1, index);
  }
}

/** Filled ellipse — used for tree canopies and smoke puffs. */
export function fillEllipse(t: Target, cx: number, cy: number, rx: number, ry: number, index: number): void {
  const y0 = Math.ceil(cy - ry);
  const y1 = Math.floor(cy + ry);
  for (let y = y0; y <= y1; y++) {
    const dy = (y - cy) / ry;
    const s = 1 - dy * dy;
    if (s <= 0) continue;
    const span = rx * Math.sqrt(s);
    const xa = Math.ceil(cx - span);
    const xb = Math.floor(cx + span);
    hline(t, xa, y, xb - xa + 1, index);
  }
}

/**
 * Checkerboard between two indices. `phase` flips which index owns the even
 * cells; `size` makes coarser checks. Pass -1 for either to leave those pixels.
 */
export function dither(
  t: Target,
  x: number,
  y: number,
  w: number,
  h: number,
  a: number,
  b: number,
  phase = 0,
  size = 1,
): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const cell = ((((i + x) / size) | 0) + (((j + y) / size) | 0) + phase) & 1;
      const idx = cell === 0 ? a : b;
      if (idx >= 0) put(t, x + i, y + j, idx);
    }
  }
}

// ---------------------------------------------------------------- curves

/** Sample a quadratic bezier into a polyline. */
export function bezierQuad(p0: Pt, p1: Pt, p2: Pt, steps = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const u = 1 - s;
    out.push({ x: u * u * p0.x + 2 * u * s * p1.x + s * s * p2.x, y: u * u * p0.y + 2 * u * s * p1.y + s * s * p2.y });
  }
  return out;
}

/** Sample a cubic bezier into a polyline. */
export function bezierCubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps = 32): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const u = 1 - s;
    const a = u * u * u;
    const b = 3 * u * u * s;
    const c = 3 * u * s * s;
    const d = s * s * s;
    out.push({ x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y });
  }
  return out;
}

/** Catmull-Rom spline passing through every control point. */
export function catmullRom(points: readonly Pt[], stepsPerSegment = 12, closed = false): Pt[] {
  const n = points.length;
  if (n < 2) return points.slice();
  const at = (i: number): Pt => {
    if (closed) return points[((i % n) + n) % n];
    return points[Math.max(0, Math.min(n - 1, i))];
  };
  const out: Pt[] = [];
  const last = closed ? n - 1 : n - 2;
  for (let i = 0; i <= last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < stepsPerSegment; s++) {
      const u = s / stepsPerSegment;
      const u2 = u * u;
      const u3 = u2 * u;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * u +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * u +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
      });
    }
  }
  out.push(at(closed ? 0 : n - 1));
  return out;
}

/** Stamp a thick stroke with round joins along a polyline. Thickness is in pixels. */
export function strokePolyline(t: Target, pts: readonly Pt[], thickness: number, index: number): void {
  const r = Math.max(0, (thickness - 1) / 2);
  if (pts.length === 0) return;
  if (pts.length === 1) {
    fillCircle(t, pts[0].x, pts[0].y, r, index);
    return;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(len * 2));
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      fillCircle(t, Math.round(a.x + dx * u), Math.round(a.y + dy * u), r, index);
    }
  }
}

export interface CurveOptions {
  /** Stroke width in pixels (default 1). */
  thickness?: number;
  /** Samples per control-point segment for Catmull-Rom (default 12). */
  steps?: number;
  /** Treat the control points as a closed loop. */
  closed?: boolean;
}

/**
 * Draw a smooth curve through control points and return the sampled polyline,
 * so callers can re-stroke it (road edges) or dash along it (centre lines).
 * Pass a null target to sample without drawing.
 */
export function curve(t: Target | null, points: readonly Pt[], index: number, opts: CurveOptions = {}): Pt[] {
  const pts = catmullRom(points, opts.steps ?? 12, opts.closed ?? false);
  if (t) strokePolyline(t, pts, opts.thickness ?? 1, index);
  return pts;
}

/** Dash along a polyline: `dash` pixels on, `gap` pixels off, starting at `offset`. */
export function dashedPolyline(
  t: Target,
  pts: readonly Pt[],
  thickness: number,
  index: number,
  dash = 6,
  gap = 5,
  offset = 0,
): void {
  const r = Math.max(0, (thickness - 1) / 2);
  const period = dash + gap;
  let travelled = offset;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const steps = Math.max(1, Math.ceil(len * 2));
    for (let s = 0; s < steps; s++) {
      const d = travelled + (len * s) / steps;
      if (d % period < dash) {
        const u = s / steps;
        fillCircle(t, Math.round(a.x + (b.x - a.x) * u), Math.round(a.y + (b.y - a.y) * u), r, index);
      }
    }
    travelled += len;
  }
}

// ---------------------------------------------------------------- blit

export interface BlitOptions {
  flipX?: boolean;
  /** Per-index remap applied while copying, e.g. to tint a shirt. */
  remap?: Readonly<Record<number, number>>;
  /** Only paint where the destination is transparent. */
  behind?: boolean;
}

export function blit(dst: Target, src: Target, x0: number, y0: number, opts: BlitOptions = {}): void {
  const { flipX = false, remap, behind = false } = opts;
  for (let y = 0; y < src.height; y++) {
    const dy = y0 + y;
    if (dy < 0 || dy >= dst.height) continue;
    const srow = y * src.width;
    const drow = dy * dst.width;
    for (let x = 0; x < src.width; x++) {
      let idx = src.pixels[srow + (flipX ? src.width - 1 - x : x)];
      if (idx === 0) continue;
      if (remap) {
        const mapped = remap[idx];
        if (mapped !== undefined) idx = mapped;
      }
      if (idx === 0) continue;
      const dx = x0 + x;
      if (dx < 0 || dx >= dst.width) continue;
      if (behind && dst.pixels[drow + dx] !== 0) continue;
      dst.pixels[drow + dx] = idx;
    }
  }
}

/** Return a copy of a sprite with one palette index swapped for another. */
export function tint(sprite: Sprite, fromIndex: number, toIndex: number): Sprite {
  const out = cloneSprite(sprite);
  for (let i = 0; i < out.pixels.length; i++) if (out.pixels[i] === fromIndex) out.pixels[i] = toIndex;
  return out;
}

/** Four-way flood fill from a seed, replacing the contiguous region of its colour. */
export function floodFill(t: Target, x: number, y: number, index: number): void {
  const target = get(t, x, y);
  if (target === index) return;
  const stack: number[] = [x | 0, y | 0];
  while (stack.length) {
    const cy = stack.pop() as number;
    const cx = stack.pop() as number;
    if (cx < 0 || cy < 0 || cx >= t.width || cy >= t.height) continue;
    const o = cy * t.width + cx;
    if (t.pixels[o] !== target) continue;
    t.pixels[o] = index;
    stack.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
  }
}

/**
 * Build a sprite from rows of single-character codes — the way small sprites
 * are easiest to author and review. `legend` maps each character to a palette
 * index; '.' is always transparent.
 */
export function spriteFromRows(
  rows: readonly string[],
  legend: Readonly<Record<string, number>>,
  opts: { anchorX?: number; anchorY?: number; footprintW?: number; footprintH?: number } = {},
): Sprite {
  const height = rows.length;
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  const s = createSprite(
    width,
    height,
    opts.anchorX ?? width >> 1,
    opts.anchorY ?? height - 1,
    opts.footprintW ?? width,
    opts.footprintH ?? 4,
  );
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const idx = legend[ch];
      if (idx === undefined) throw new Error(`spriteFromRows: no legend entry for '${ch}'`);
      s.pixels[y * width + x] = idx;
    }
  }
  return s;
}

/** Paint rows of codes into an existing target at (x, y). */
export function drawRows(
  t: Target,
  x: number,
  y: number,
  rows: readonly string[],
  legend: Readonly<Record<string, number>>,
): void {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      const idx = legend[ch];
      if (idx === undefined) throw new Error(`drawRows: no legend entry for '${ch}'`);
      put(t, x + i, y + j, idx);
    }
  }
}

/** True if every pixel in the buffer is transparent. */
export function isEmpty(t: Target): boolean {
  for (let i = 0; i < t.pixels.length; i++) if (t.pixels[i] !== 0) return false;
  return true;
}
