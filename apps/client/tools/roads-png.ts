/**
 * Headless proof that the road rasteriser draws roads.
 *
 * Builds a small synthetic town - a main street of four edges sharing one
 * `street` id, two curved side streets ending on it at T-junctions, a
 * crossroads, a highway, a footpath and a bus line along part of the main
 * street - paints only the road passes onto a grass field, and writes the
 * result to art/sheets/roads-test.png. There is no DOM and no canvas: the
 * surface goes straight to RGBA and into the PNG encoder.
 *
 *   npx tsx apps/client/tools/roads-png.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE } from '@jones2/pixelart';
import type { Town } from '@jones2/town';
import { encodePNG } from '../../../packages/pixelart/tools/png';
import { type RoadColours, drawRoads, roadColours } from '../src/map/roads';
import { RenderPalette, type Surface, createSurface, toRGBA } from '../src/map/surface';

export const ROAD_TEST_TOWN: Town = {
  id: 'roadtest',
  name: 'Road Test',
  startNode: 'm0',
  nodes: [
    // Main street, west to east, gently curved.
    { id: 'm0', x: 20, y: 150 },
    { id: 'm1', x: 110, y: 150, name: 'Market', location: 'market' },
    { id: 'm2', x: 210, y: 140 },
    { id: 'm3', x: 310, y: 150, name: 'Bank', location: 'bank' },
    { id: 'm4', x: 400, y: 150 },
    // Side street A: curves up off m1 (a T-junction).
    { id: 'a1', x: 120, y: 60 },
    { id: 'a2', x: 150, y: 20 },
    // Side street B: curves down off m3 (a T-junction).
    { id: 'b1', x: 300, y: 240 },
    { id: 'b2', x: 340, y: 285 },
    // Crossroads: a north-south street crossing the main street at m2.
    { id: 'x0', x: 210, y: 40 },
    { id: 'x1', x: 210, y: 265 },
    // Highway across the bottom.
    { id: 'h0', x: 20, y: 300 },
    { id: 'h1', x: 200, y: 310 },
    { id: 'h2', x: 400, y: 295 },
    // Footpath off the crossroads.
    { id: 'p1', x: 120, y: 230 },
  ],
  edges: [
    { a: 'm0', b: 'm1', minutes: 5, kind: 'street', street: 'main' },
    { a: 'm1', b: 'm2', minutes: 5, kind: 'street', street: 'main', curve: [{ x: 160, y: 143 }] },
    { a: 'm2', b: 'm3', minutes: 5, kind: 'street', street: 'main', curve: [{ x: 260, y: 143 }] },
    { a: 'm3', b: 'm4', minutes: 5, kind: 'street', street: 'main' },

    { a: 'm1', b: 'a1', minutes: 4, kind: 'street', street: 'sideA', curve: [{ x: 100, y: 100 }] },
    { a: 'a1', b: 'a2', minutes: 3, kind: 'street', street: 'sideA' },

    { a: 'm3', b: 'b1', minutes: 4, kind: 'street', street: 'sideB', curve: [{ x: 320, y: 195 }] },
    { a: 'b1', b: 'b2', minutes: 3, kind: 'street', street: 'sideB', curve: [{ x: 310, y: 268 }] },

    { a: 'x0', b: 'm2', minutes: 4, kind: 'street', street: 'cross' },
    { a: 'm2', b: 'x1', minutes: 4, kind: 'street', street: 'cross' },

    { a: 'h0', b: 'h1', minutes: 6, kind: 'highway', street: 'hwy', curve: [{ x: 110, y: 312 }] },
    { a: 'h1', b: 'h2', minutes: 6, kind: 'highway', street: 'hwy', curve: [{ x: 300, y: 310 }] },

    { a: 'p1', b: 'x1', minutes: 3, kind: 'path', curve: [{ x: 170, y: 250 }] },

    // Bus line along the western half of the main street and up side street A.
    { a: 'm0', b: 'm1', minutes: 5, kind: 'busline', street: 'bus1' },
    { a: 'm1', b: 'm2', minutes: 5, kind: 'busline', street: 'bus1', curve: [{ x: 160, y: 143 }] },
    { a: 'm2', b: 'm3', minutes: 5, kind: 'busline', street: 'bus1', curve: [{ x: 260, y: 143 }] },
  ],
};

export const WIDTH = 430;
export const HEIGHT = 330;

/** Paint only the road passes onto a grass field. Shared with the road tests. */
export function paintRoadTest(town: Town = ROAD_TEST_TOWN): {
  surface: Surface;
  pal: RenderPalette;
  colours: RoadColours;
  grass: number;
} {
  const pal = new RenderPalette(PALETTE);
  const grass = pal.index('grass', [104, 158, 84]);
  const surface = createSurface(WIDTH, HEIGHT, grass);
  drawRoads(surface, town, pal, 0, 0);
  return { surface, pal, colours: roadColours(pal), grass };
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const out = resolve(here, '../../../art/sheets/roads-test.png');
  const { surface, pal } = paintRoadTest();
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, encodePNG(WIDTH, HEIGHT, new Uint8Array(toRGBA(surface, pal.colors).buffer)));
  console.log(`wrote ${out} (${WIDTH}x${HEIGHT})`);
}

// Only when run as a script: the tests import the town and the painter.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
