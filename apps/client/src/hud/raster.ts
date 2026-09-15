/**
 * A tiny RGBA pixel rasteriser. Everything the clock draws is plotted pixel by
 * pixel into an ImageData-shaped buffer at the art's native size, then blown up
 * with `imageSmoothingEnabled = false`. Canvas arcs and lines would be
 * anti-aliased, which reads as vector art once magnified; this does not.
 *
 * Angles are "clock degrees": 0 is 12 o'clock, increasing clockwise.
 */

export type Rgba = readonly [number, number, number, number];

export interface PixelBuffer {
  width: number;
  height: number;
  /** RGBA, row-major, length width * height * 4. */
  data: Uint8ClampedArray;
}

export function createBuffer(width: number, height: number): PixelBuffer {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function clearBuffer(buf: PixelBuffer): void {
  buf.data.fill(0);
}

/** `#rgb`, `#rrggbb` or `#rrggbbaa` to an RGBA tuple. */
export function hexToRgba(hex: string, alpha = 255): Rgba {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : alpha;
  return [r, g, b, a];
}

/** Source-over a single pixel. Out-of-bounds writes are dropped. */
export function put(buf: PixelBuffer, x: number, y: number, c: Rgba): void {
  const xi = x | 0;
  const yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= buf.width || yi >= buf.height) return;
  const i = (yi * buf.width + xi) * 4;
  const a = c[3] / 255;
  if (a >= 1) {
    buf.data[i] = c[0];
    buf.data[i + 1] = c[1];
    buf.data[i + 2] = c[2];
    buf.data[i + 3] = 255;
    return;
  }
  const inv = 1 - a;
  buf.data[i] = c[0] * a + buf.data[i]! * inv;
  buf.data[i + 1] = c[1] * a + buf.data[i + 1]! * inv;
  buf.data[i + 2] = c[2] * a + buf.data[i + 2]! * inv;
  buf.data[i + 3] = c[3] + buf.data[i + 3]! * inv;
}

export function fillRect(buf: PixelBuffer, x: number, y: number, w: number, h: number, c: Rgba): void {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) put(buf, x + xx, y + yy, c);
}

/** Filled circle, midpoint style (no anti-aliasing). */
export function disc(buf: PixelBuffer, cx: number, cy: number, r: number, c: Rgba): void {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) put(buf, x, y, c);
    }
  }
}

/** Circle outline of the given thickness (drawn inward from `r`). */
export function ring(buf: PixelBuffer, cx: number, cy: number, r: number, thickness: number, c: Rgba): void {
  arc(buf, cx, cy, r - thickness, r, 0, 360, c);
}

/** Clock degrees of the vector from the centre to (x, y). */
function angleAt(dx: number, dy: number): number {
  return ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
}

export interface ArcOptions {
  /** Draw only every other 2x2 block, for a translucent "hatched" look. */
  hatch?: boolean;
}

/**
 * Annulus sector between radii [rInner, rOuter] and clock degrees
 * [startDeg, endDeg] (clockwise). A span of >= 360 draws the full ring.
 */
export function arc(
  buf: PixelBuffer,
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number,
  c: Rgba,
  opts: ArcOptions = {},
): void {
  const span = endDeg - startDeg;
  if (span <= 0) return;
  const full = span >= 360;
  const start = ((startDeg % 360) + 360) % 360;
  const i2 = rInner * rInner;
  const o2 = rOuter * rOuter;
  for (let y = Math.floor(cy - rOuter); y <= Math.ceil(cy + rOuter); y++) {
    for (let x = Math.floor(cx - rOuter); x <= Math.ceil(cx + rOuter); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < i2 || d2 > o2) continue;
      if (!full) {
        const rel = (angleAt(dx, dy) - start + 360) % 360;
        if (rel > span) continue;
      }
      if (opts.hatch && ((x + y) & 3) > 1) continue;
      put(buf, x, y, c);
    }
  }
}

/** Bresenham line, thickened by stamping a square brush. */
export function line(
  buf: PixelBuffer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  c: Rgba,
): void {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const xe = Math.round(x1);
  const ye = Math.round(y1);
  const dx = Math.abs(xe - x);
  const dy = -Math.abs(ye - y);
  const sx = x < xe ? 1 : -1;
  const sy = y < ye ? 1 : -1;
  let err = dx + dy;
  const t = Math.max(1, Math.round(thickness));
  const off = Math.floor((t - 1) / 2);
  for (;;) {
    for (let j = 0; j < t; j++) for (let i = 0; i < t; i++) put(buf, x - off + i, y - off + j, c);
    if (x === xe && y === ye) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** A hand drawn from the centre outward at a clock angle. */
export function hand(
  buf: PixelBuffer,
  cx: number,
  cy: number,
  degrees: number,
  length: number,
  thickness: number,
  c: Rgba,
  backswing = 0,
): void {
  const rad = ((degrees - 90) * Math.PI) / 180;
  const tipX = cx + Math.cos(rad) * length;
  const tipY = cy + Math.sin(rad) * length;
  const tailX = cx - Math.cos(rad) * backswing;
  const tailY = cy - Math.sin(rad) * backswing;
  line(buf, tailX, tailY, tipX, tipY, thickness, c);
}

/** Point on a circle, in buffer coordinates. */
export function polar(cx: number, cy: number, degrees: number, r: number): [number, number] {
  const rad = ((degrees - 90) * Math.PI) / 180;
  return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r];
}
