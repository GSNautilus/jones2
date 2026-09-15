/**
 * Zero-dependency PNG encoder (8-bit RGBA) plus sprite rasterisation helpers.
 * Uses node:zlib for the deflate stream and a local CRC32 table.
 */
import { deflateSync } from 'node:zlib';
import type { Palette, Sprite } from '../src/types';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Encode raw RGBA bytes (length w*h*4) as a PNG file buffer. */
export function encodePNG(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const raw = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const idat = new Uint8Array(deflateSync(raw, { level: 9 }));
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Rasterise a sprite (or any indexed grid) to RGBA at an integer scale. Index 0 is transparent. */
export function spriteToRGBA(
  sprite: { width: number; height: number; pixels: Uint8Array },
  palette: Palette,
  scale = 1,
): { width: number; height: number; data: Uint8Array } {
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const idx = sprite.pixels[y * sprite.width + x];
      if (idx === 0) continue;
      const c = palette.colors[idx] ?? [255, 0, 255];
      for (let dy = 0; dy < scale; dy++) {
        let o = ((y * scale + dy) * w + x * scale) * 4;
        for (let dx = 0; dx < scale; dx++) {
          data[o] = c[0];
          data[o + 1] = c[1];
          data[o + 2] = c[2];
          data[o + 3] = 255;
          o += 4;
        }
      }
    }
  }
  return { width: w, height: h, data };
}

/** Composite RGBA pixels of a sprite onto a flat RGBA canvas (used by the sheet tool). */
export function blitRGBA(
  dst: { width: number; height: number; data: Uint8Array },
  src: { width: number; height: number; data: Uint8Array },
  x0: number,
  y0: number,
): void {
  for (let y = 0; y < src.height; y++) {
    const dy = y0 + y;
    if (dy < 0 || dy >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = x0 + x;
      if (dx < 0 || dx >= dst.width) continue;
      const so = (y * src.width + x) * 4;
      if (src.data[so + 3] === 0) continue;
      const doff = (dy * dst.width + dx) * 4;
      dst.data[doff] = src.data[so];
      dst.data[doff + 1] = src.data[so + 1];
      dst.data[doff + 2] = src.data[so + 2];
      dst.data[doff + 3] = 255;
    }
  }
}
