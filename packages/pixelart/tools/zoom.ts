/**
 * Dev aid: render named sprites large so they can be judged pixel by pixel.
 *   npx tsx packages/pixelart/tools/zoom.ts factory university 6
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PALETTE, C } from '../src/palette';
import { createSurface, hline } from '../src/surface';
import type { Sprite } from '../src/types';
import { BUILDINGS } from '../src/buildings/catalogue';
import { TILES } from '../src/tiles/catalogue';
import { NATURE } from '../src/nature/catalogue';
import { CHARACTERS } from '../src/characters/catalogue';
import { PROPS } from '../src/props/catalogue';
import { UI } from '../src/ui/catalogue';
import { PORTRAITS } from '../src/portraits';
import { blitRGBA, encodePNG, spriteToRGBA } from './png';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../../art/sheets');

const args = process.argv.slice(2);
const scale = Number(args[args.length - 1]) || 6;
const names = Number.isFinite(Number(args[args.length - 1])) ? args.slice(0, -1) : args;

function lookup(name: string): Sprite {
  // portraits share their ids with buildings, so ask for them as `p:bank`
  if (name.startsWith('p:')) return PORTRAITS[name.slice(2)] as Sprite;
  if (BUILDINGS[name]) return BUILDINGS[name]();
  return (TILES[name] ?? NATURE[name] ?? PROPS[name] ?? UI[name] ?? PORTRAITS[name] ?? CHARACTERS[name]) as Sprite;
}

const sprites = names.map((n) => [n, lookup(n)] as const).filter(([, s]) => s);
const width = sprites.reduce((w, [, s]) => w + s.width + 4, 8);
const height = sprites.reduce((h, [, s]) => Math.max(h, s.height), 0) + 8;
const surf = createSurface(width, height, C.pavingDark);
let x = 4;
for (const [, s] of sprites) {
  for (let y = 0; y < s.height; y++) {
    for (let px = 0; px < s.width; px++) {
      const idx = s.pixels[y * s.width + px];
      if (idx !== 0) hline(surf, x + px, y + 4, 1, idx);
    }
  }
  x += s.width + 4;
}

const img = spriteToRGBA(surf, PALETTE, scale);
const canvas = { width: img.width, height: img.height, data: new Uint8Array(img.width * img.height * 4) };
for (let i = 0; i < canvas.data.length; i += 4) {
  canvas.data[i] = 120;
  canvas.data[i + 1] = 120;
  canvas.data[i + 2] = 126;
  canvas.data[i + 3] = 255;
}
blitRGBA(canvas, img, 0, 0);
mkdirSync(OUT, { recursive: true });
const file = resolve(OUT, 'zoom.png');
writeFileSync(file, encodePNG(canvas.width, canvas.height, canvas.data));
console.log(`${file}  ${canvas.width}x${canvas.height}`);
