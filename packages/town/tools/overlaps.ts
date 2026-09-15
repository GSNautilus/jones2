/**
 * Report building overlaps and buildings on roads using the REAL sprite sizes
 * from the art catalogue (dev-only cross-package import).
 *   npx tsx packages/town/tools/overlaps.ts
 */
import { buildFromRef } from '../../pixelart/src/index';
import type { Town, TownEdge } from '../src/types';
import town from '../src/towns/riverton.json';
import { sampleCurve } from './geom';

interface Box { id: string; x: number; y: number; w: number; h: number }

const T = town as Town;
const nodes = new Map(T.nodes.map((n) => [n.id, n]));

const boxes: Box[] = T.nodes
  .filter((n) => n.location)
  .map((n) => {
    const ref = n.pixel ?? { kind: n.location! };
    const s = buildFromRef(ref.kind, ref.params);
    return { id: n.id, x: n.x - s.anchorX, y: n.y - s.anchorY, w: s.width, h: s.height };
  });

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

let problems = 0;
for (let i = 0; i < boxes.length; i++) {
  for (let j = i + 1; j < boxes.length; j++) {
    const o = overlap(boxes[i]!, boxes[j]!);
    if (o > 0) {
      problems++;
      console.log(`OVERLAP ${boxes[i]!.id} x ${boxes[j]!.id}: ${o}px²`);
    }
  }
}

function edgePoly(e: TownEdge) {
  const a = nodes.get(e.a)!;
  const b = nodes.get(e.b)!;
  return sampleCurve({ x: a.x, y: a.y }, e.curve ?? [], { x: b.x, y: b.y }, 2);
}

for (const e of T.edges) {
  if (e.kind === 'busline') continue;
  const half = e.kind === 'highway' ? 9 : e.kind === 'street' ? 6 : 3;
  const poly = edgePoly(e);
  for (const b of boxes) {
    if (b.id === e.a || b.id === e.b) continue;
    // Only the facade band matters visually; roads under the roof band read as "behind".
    const facadeTop = b.y + b.h * 0.45;
    const hit = poly.some((p) => p.x >= b.x - half && p.x <= b.x + b.w + half && p.y >= facadeTop && p.y <= b.y + b.h);
    if (hit) {
      problems++;
      console.log(`ROAD ${e.a}-${e.b} (${e.kind}) crosses ${b.id}`);
    }
  }
}

// Canvas grew from 640x400 to 768x448 once real sprite sizes turned out
// bigger than the original placeholder box — see riverton.ts's header.
const CANVAS_W = 768;
const CANVAS_H = 448;
for (const b of boxes) {
  if (b.x < 4 || b.y < 4 || b.x + b.w > CANVAS_W - 4 || b.y + b.h > CANVAS_H - 4) {
    problems++;
    console.log(`EDGE ${b.id} leaves the canvas (${b.x},${b.y} ${b.w}x${b.h})`);
  }
}

console.log(problems ? `${problems} problems` : 'no overlaps, no roads through facades, all in canvas');
console.log('sizes:', boxes.map((b) => `${b.id}=${b.w}x${b.h}`).join(' '));
