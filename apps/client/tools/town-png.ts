/**
 * Render the real town's static ground layer — grass, water, roads, crossings,
 * decor and buildings — straight to a PNG, with no browser involved. This is
 * the cheapest honest look at what the map renderer actually produces.
 *
 *   npx tsx apps/client/tools/town-png.ts [shrink] [x,y,w,h] [zoom] [riverton|classic]
 *
 * `shrink` samples every Nth pixel (1 = full size). The optional crop is in
 * town units and is handy for looking closely at one bridge or underpass.
 * Writes art/sheets/<town>-client.png.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOWNS } from '@jones2/town';
import { encodePNG } from '../../../packages/pixelart/tools/png';
import { getArt } from '../src/map/art';
import { buildGround } from '../src/map/ground';
import { RenderPalette, toRGBA } from '../src/map/surface';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOWN_ID = process.argv[5] ?? 'riverton';
const town = TOWNS[TOWN_ID];
if (!town) throw new Error(`Unknown town ${TOWN_ID}`);
const OUT = resolve(HERE, `../../../art/sheets/${TOWN_ID}-client.png`);

const art = getArt();
const pal = new RenderPalette(art.palette);
const ground = buildGround(town, art, pal);

const shrink = Math.max(1, Number(process.argv[2] ?? 1) | 0);
const crop = (process.argv[3] ?? '').split(',').map(Number);
const zoom = Math.max(1, Number(process.argv[4] ?? 1) | 0);
const cx = crop.length === 4 ? crop[0]! - ground.offsetX : 0;
const cy = crop.length === 4 ? crop[1]! - ground.offsetY : 0;
const cw = crop.length === 4 ? crop[2]! : ground.surface.width;
const ch = crop.length === 4 ? crop[3]! : ground.surface.height;

const rgba = toRGBA(ground.surface, pal.colors);
const w = Math.floor((cw / shrink) * zoom);
const h = Math.floor((ch / shrink) * zoom);
const out = new Uint8Array(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const sx = cx + Math.floor((x / zoom) * shrink);
    const sy = cy + Math.floor((y / zoom) * shrink);
    if (sx < 0 || sy < 0 || sx >= ground.surface.width || sy >= ground.surface.height) continue;
    const src = (sy * ground.surface.width + sx) * 4;
    const dst = (y * w + x) * 4;
    out[dst] = rgba[src]!;
    out[dst + 1] = rgba[src + 1]!;
    out[dst + 2] = rgba[src + 2]!;
    out[dst + 3] = 255;
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encodePNG(w, h, out));
console.log(`${OUT}  ${w}x${h}  (source ${ground.surface.width}x${ground.surface.height}, 1/${shrink}, x${zoom})`);
