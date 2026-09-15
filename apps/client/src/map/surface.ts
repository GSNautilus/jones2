/**
 * Native-resolution, palette-indexed drawing. Every layer the renderer builds
 * is a Surface: a Uint8Array of palette indices, exactly like Sprite in
 * `@jones2/pixelart`. Index 0 is transparent.
 *
 * Working in indices (not RGBA) means sprites from the art package blit
 * straight in, nothing is ever anti-aliased, and the whole layer becomes an
 * ImageData in one pass at the end (toRGBA). Alpha only ever appears at the
 * final composite step in TownScene.
 */
import type { Palette, RGB, Sprite } from './pixelart';
import { GLYPH_ADVANCE, GLYPH_H, GLYPH_W, glyph } from './font';

export interface Surface {
  width: number;
  height: number;
  pixels: Uint8Array;
}

export function createSurface(width: number, height: number, fill = 0): Surface {
  const pixels = new Uint8Array(Math.max(0, width * height));
  if (fill) pixels.fill(fill);
  return { width, height, pixels };
}

export function put(s: Surface, x: number, y: number, idx: number): void {
  if (idx === 0) return;
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= s.width || yi >= s.height) return;
  s.pixels[yi * s.width + xi] = idx;
}

export function get(s: Surface, x: number, y: number): number {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= s.width || yi >= s.height) return 0;
  return s.pixels[yi * s.width + xi]!;
}

export function fillRect(s: Surface, x: number, y: number, w: number, h: number, idx: number): void {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(s.width, Math.round(x + w));
  const y1 = Math.min(s.height, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) {
    s.pixels.fill(idx, yy * s.width + x0, yy * s.width + x1);
  }
}

/** Checkerboard fill: shadows, ghosts and 50% highlight washes. */
export function ditherRect(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  idx: number,
  phase = 0,
): void {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(s.width, Math.round(x + w));
  const y1 = Math.min(s.height, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      if (((xx + yy + phase) & 1) === 0) s.pixels[yy * s.width + xx] = idx;
    }
  }
}

export function strokeRect(s: Surface, x: number, y: number, w: number, h: number, idx: number): void {
  fillRect(s, x, y, w, 1, idx);
  fillRect(s, x, y + h - 1, w, 1, idx);
  fillRect(s, x, y, 1, h, idx);
  fillRect(s, x + w - 1, y, 1, h, idx);
}

/** Bresenham, 1px, no anti-aliasing. */
export function line(s: Surface, x0: number, y0: number, x1: number, y1: number, idx: number): void {
  let ax = Math.round(x0);
  let ay = Math.round(y0);
  const bx = Math.round(x1);
  const by = Math.round(y1);
  const dx = Math.abs(bx - ax);
  const dy = -Math.abs(by - ay);
  const sx = ax < bx ? 1 : -1;
  const sy = ay < by ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    put(s, ax, ay, idx);
    if (ax === bx && ay === by) return;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      ax += sx;
    }
    if (e2 <= dx) {
      err += dx;
      ay += sy;
    }
  }
}

/** Filled axis-aligned ellipse. */
export function fillEllipse(s: Surface, cx: number, cy: number, rx: number, ry: number, idx: number): void {
  if (rx <= 0 || ry <= 0) return;
  const top = Math.ceil(ry);
  for (let yy = -top; yy <= top; yy++) {
    const t = 1 - (yy * yy) / (ry * ry);
    if (t < 0) continue;
    const half = rx * Math.sqrt(t);
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half);
    for (let xx = x0; xx <= x1; xx++) put(s, xx, cy + yy, idx);
  }
}

/** 1px ellipse outline (the ring under a highlighted node). */
export function strokeEllipse(s: Surface, cx: number, cy: number, rx: number, ry: number, idx: number): void {
  if (rx <= 0 || ry <= 0) return;
  const steps = Math.max(16, Math.round((rx + ry) * 3));
  let px = 0;
  let py = 0;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i > 0) line(s, px, py, x, y, idx);
    px = x;
    py = y;
  }
}

/** Filled disc: the stamp roads and junction caps are built from. */
export function disc(s: Surface, cx: number, cy: number, r: number, idx: number): void {
  const ri = Math.ceil(r);
  const r2 = r * r;
  const cxi = Math.round(cx);
  const cyi = Math.round(cy);
  for (let yy = -ri; yy <= ri; yy++) {
    const rest = r2 - yy * yy;
    if (rest < 0) continue;
    const half = Math.floor(Math.sqrt(rest));
    const row = cyi + yy;
    if (row < 0 || row >= s.height) continue;
    const a = Math.max(0, cxi - half);
    const b = Math.min(s.width - 1, cxi + half);
    if (a > b) continue;
    s.pixels.fill(idx, row * s.width + a, row * s.width + b + 1);
  }
}

export interface BlitOptions {
  /** Draw only every other pixel (50% ghost). */
  ghost?: boolean;
  /** Replace every non-transparent pixel with this index (shadow/silhouette). */
  tint?: number;
  /** Remap specific sprite indices, e.g. a player body colour. */
  remap?: Map<number, number>;
}

/** Blit a sprite with its top-left at (dx, dy). Index 0 is transparent. */
export function blit(s: Surface, sprite: Sprite, dx: number, dy: number, opts: BlitOptions = {}): void {
  const x0 = Math.round(dx);
  const y0 = Math.round(dy);
  const { ghost, tint, remap } = opts;
  for (let sy = 0; sy < sprite.height; sy++) {
    const ty = y0 + sy;
    if (ty < 0 || ty >= s.height) continue;
    for (let sx = 0; sx < sprite.width; sx++) {
      let v = sprite.pixels[sy * sprite.width + sx]!;
      if (v === 0) continue;
      const tx = x0 + sx;
      if (tx < 0 || tx >= s.width) continue;
      if (ghost && ((tx + ty) & 1) === 1) continue;
      if (tint !== undefined) v = tint;
      else if (remap) v = remap.get(v) ?? v;
      s.pixels[ty * s.width + tx] = v;
    }
  }
}

/** Blit a sprite so its anchor lands on (x, y). */
export function blitAnchored(s: Surface, sprite: Sprite, x: number, y: number, opts: BlitOptions = {}): void {
  blit(s, sprite, Math.round(x) - sprite.anchorX, Math.round(y) - sprite.anchorY, opts);
}

/**
 * Tile sprites across a rectangle, aligned to the global tile grid so adjacent
 * fills never seam. `pick` chooses the variant for a tile cell.
 */
export function tileRect(
  s: Surface,
  tileW: number,
  tileH: number,
  x: number,
  y: number,
  w: number,
  h: number,
  pick: (tx: number, ty: number) => Sprite,
): void {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(s.width, Math.round(x + w));
  const y1 = Math.min(s.height, Math.round(y + h));
  if (x1 <= x0 || y1 <= y0 || tileW <= 0 || tileH <= 0) return;
  const startTx = Math.floor(x0 / tileW);
  const startTy = Math.floor(y0 / tileH);
  for (let ty = startTy; ty * tileH < y1; ty++) {
    for (let tx = startTx; tx * tileW < x1; tx++) {
      const tile = pick(tx, ty);
      const ox = tx * tileW;
      const oy = ty * tileH;
      for (let sy = 0; sy < tile.height; sy++) {
        const py = oy + sy;
        if (py < y0 || py >= y1) continue;
        for (let sx = 0; sx < tile.width; sx++) {
          const px = ox + sx;
          if (px < x0 || px >= x1) continue;
          const v = tile.pixels[sy * tile.width + sx]!;
          if (v !== 0) s.pixels[py * s.width + px] = v;
        }
      }
    }
  }
}

/**
 * Copy the rectangle of `src` starting at (sx, sy) into the whole of `dst`.
 * Out-of-bounds rows and columns are cleared. This is how the visible window is
 * lifted out of the cached static ground layer every frame.
 */
export function copyWindow(dst: Surface, src: Surface, sx: number, sy: number): void {
  const x0 = Math.round(sx);
  const y0 = Math.round(sy);
  for (let y = 0; y < dst.height; y++) {
    const srcY = y0 + y;
    const dstRow = y * dst.width;
    if (srcY < 0 || srcY >= src.height) {
      dst.pixels.fill(0, dstRow, dstRow + dst.width);
      continue;
    }
    const a = Math.min(dst.width, Math.max(0, -x0));
    const b = Math.min(dst.width, Math.max(0, src.width - x0));
    if (a > 0) dst.pixels.fill(0, dstRow, dstRow + a);
    if (b < dst.width) dst.pixels.fill(0, dstRow + Math.max(a, b), dstRow + dst.width);
    if (b > a) {
      dst.pixels.set(src.pixels.subarray(srcY * src.width + x0 + a, srcY * src.width + x0 + b), dstRow + a);
    }
  }
}

/** Draw uppercase 3x5 text with its top-left at (x, y). Returns the width drawn. */
export function text(s: Surface, str: string, x: number, y: number, idx: number): number {
  const up = str.toUpperCase();
  const left = Math.round(x);
  let cx = left;
  const cy = Math.round(y);
  for (const ch of up) {
    const bits = glyph(ch);
    if (bits) {
      for (let gy = 0; gy < GLYPH_H; gy++) {
        for (let gx = 0; gx < GLYPH_W; gx++) {
          if (bits[gy * GLYPH_W + gx] === '1') put(s, cx + gx, cy + gy, idx);
        }
      }
    }
    cx += GLYPH_ADVANCE;
  }
  return Math.max(0, cx - GLYPH_ADVANCE + GLYPH_W - left);
}

/**
 * The palette the renderer flattens with: the art package's palette, plus the
 * chrome colours the renderer needs itself (roads, highlights, labels, player
 * tints).
 *
 * Two things make this less trivial than it looks:
 *  - the art package may ADD colours lazily as sprites are generated, so the
 *    base array is read live, never copied once;
 *  - chrome colours are therefore allocated from index 255 DOWNWARDS, so they
 *    can never collide with art indices growing up from 1.
 */
export class RenderPalette {
  private readonly base: Palette;
  private readonly extra: RGB[] = [];
  private readonly extraByKey = new Map<string, number>();
  private cache: RGB[] = [];
  private cachedBaseLen = -1;

  constructor(base: Palette) {
    this.base = base;
  }

  /** Flat index -> RGB table. Rebuilt only when the art palette has grown. */
  get colors(): RGB[] {
    if (this.cachedBaseLen !== this.base.colors.length) this.rebuild();
    return this.cache;
  }

  private rebuild(): void {
    const out: RGB[] = new Array(256);
    for (let i = 0; i < 256; i++) out[i] = MAGENTA;
    const n = Math.min(this.base.colors.length, 256);
    for (let i = 0; i < n; i++) out[i] = this.base.colors[i]!;
    for (let k = 0; k < this.extra.length; k++) out[255 - k] = this.extra[k]!;
    out[0] = [0, 0, 0];
    this.cache = out;
    this.cachedBaseLen = this.base.colors.length;
  }

  /** Index for a named art colour, adding `fallback` if the art palette has no such name. */
  index(name: string, fallback: RGB): number {
    const hit = this.base.names[name];
    if (hit !== undefined && hit > 0 && hit < 256) return hit;
    return this.add(fallback);
  }

  /** Index for an exact RGB in the renderer's own high slots. */
  add(rgb: RGB): number {
    const k = key(rgb);
    const hit = this.extraByKey.get(k);
    if (hit !== undefined) return hit;
    // Reuse an art colour if it is already an exact match.
    for (let i = 1; i < this.base.colors.length; i++) {
      const c = this.base.colors[i]!;
      if (c[0] === rgb[0] && c[1] === rgb[1] && c[2] === rgb[2]) {
        this.extraByKey.set(k, i);
        return i;
      }
    }
    const slot = 255 - this.extra.length;
    if (slot <= this.base.colors.length) return this.nearest(rgb);
    this.extra.push(rgb);
    this.extraByKey.set(k, slot);
    this.cachedBaseLen = -1;
    return slot;
  }

  /** Index for a `#rrggbb` colour string. */
  hex(hex: string): number {
    return this.add(parseHex(hex));
  }

  private nearest(rgb: RGB): number {
    let best = 1;
    let bestD = Infinity;
    const colors = this.colors;
    for (let i = 1; i < colors.length; i++) {
      const c = colors[i]!;
      const d = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }
}

const MAGENTA: RGB = [255, 0, 255];

function key(c: RGB): string {
  return `${c[0]},${c[1]},${c[2]}`;
}

export function parseHex(hex: string): RGB {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]! : h;
  const n = Number.parseInt(full.slice(0, 6) || '000000', 16);
  if (Number.isNaN(n)) return [255, 0, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Flatten a surface to RGBA. Index 0 becomes fully transparent. */
export function toRGBA(s: Surface, colors: RGB[], out?: Uint8ClampedArray): Uint8ClampedArray {
  const n = s.width * s.height;
  const buf = out && out.length === n * 4 ? out : new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const v = s.pixels[i]!;
    const o = i * 4;
    if (v === 0) {
      buf[o] = 0;
      buf[o + 1] = 0;
      buf[o + 2] = 0;
      buf[o + 3] = 0;
      continue;
    }
    const c = colors[v] ?? colors[1] ?? ([255, 0, 255] as RGB);
    buf[o] = c[0];
    buf[o + 1] = c[1];
    buf[o + 2] = c[2];
    buf[o + 3] = 255;
  }
  return buf;
}
