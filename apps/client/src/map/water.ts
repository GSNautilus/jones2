/**
 * Water that looks like water.
 *
 * A `WaterCourse` is authored exactly like a street — a curve with a width —
 * so it is rasterised exactly like one: sample the curve, stamp a disc of half
 * the width at every sample into a MASK, then fill the mask with water tiles.
 * The shoreline is then the OUTLINE of that mask, the same trick the roads use
 * to get kerbs from the asphalt mask, which is what makes a meander read as a
 * bank rather than as a stack of stair-stepped rectangles.
 *
 * Rectangle `water` decor (small ponds) goes into the same mask, so a pond and
 * a river get the same tiles and the same shore.
 */
import type { Decor, Town, WaterCourse } from '@jones2/town';
import type { Sprite } from './pixelart';
import { PX_PER_UNIT, TILE } from './art';
import type { Pt } from './camera';
import { samplePath } from './streets';
import { type RenderPalette, type Surface, createSurface, disc, fillRect, tileRect } from './surface';

/** Mask value for water, so the mask reads like the road mask. */
export const WATER_MASK = 1;

export interface WaterColours {
  fill: number;
  shore: number;
  glint: number;
}

export function waterColours(pal: RenderPalette): WaterColours {
  return {
    fill: pal.index('water', [58, 112, 178]),
    shore: pal.index('waterDark', [47, 86, 136]),
    glint: pal.index('waterLight', [110, 168, 216]),
  };
}

/** The drawn centreline of a course, in native world pixels. */
export function courseSamples(course: WaterCourse): Pt[] {
  return samplePath(course.points.map((p) => ({ x: p.x * PX_PER_UNIT, y: p.y * PX_PER_UNIT }))).pts;
}

/** Rectangle `water` decor, in native world pixels. */
export function pondRects(town: Town): Array<{ x: number; y: number; w: number; h: number }> {
  return (town.decor ?? [])
    .filter((d: Decor) => d.kind === 'water')
    .map((d) => ({
      x: d.x * PX_PER_UNIT,
      y: d.y * PX_PER_UNIT,
      w: Math.max(TILE, (d.w ?? 4) * PX_PER_UNIT),
      h: Math.max(TILE, (d.h ?? 4) * PX_PER_UNIT),
    }));
}

/**
 * A 1-or-0 mask of every wet pixel, in the surface's own coordinates.
 * `offsetX/offsetY` are the native world pixel of the surface's top-left.
 */
export function buildWaterMask(
  town: Town,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
): Surface {
  const mask = createSurface(width, height);
  for (const course of town.water ?? []) {
    const r = (course.width * PX_PER_UNIT) / 2;
    for (const p of denseSamples(courseSamples(course))) {
      disc(mask, p.x - offsetX, p.y - offsetY, r, WATER_MASK);
    }
  }
  for (const r of pondRects(town)) {
    fillRect(mask, r.x - offsetX, r.y - offsetY, r.w, r.h, WATER_MASK);
  }
  return mask;
}

/** Resample so the disc stamps overlap however coarse the curve samples are. */
function denseSamples(pts: Pt[], spacing = 1): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / spacing));
    for (let k = 0; k < steps; k++) {
      out.push({ x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps });
    }
  }
  const last = pts[pts.length - 1];
  if (last) out.push(last);
  return out;
}

/**
 * Paint every water course and pond into `s` and hand back the mask, so the
 * caller can keep buildings and props out of the water if it wants to.
 * `tile` supplies the water tile for a global tile cell.
 */
export function drawWater(
  s: Surface,
  town: Town,
  pal: RenderPalette,
  offsetX: number,
  offsetY: number,
  tile: (tx: number, ty: number) => Sprite,
): Surface {
  const mask = buildWaterMask(town, s.width, s.height, offsetX, offsetY);
  const c = waterColours(pal);
  if (!mask.pixels.some((v) => v !== 0)) return mask;

  // 1. Tile the whole masked area, aligned to the global grid so a pond and a
  //    river never seam against each other.
  const field = createSurface(s.width, s.height);
  const bounds = maskBounds(mask);
  if (bounds) {
    tileRect(field, TILE, TILE, bounds.x, bounds.y, bounds.w, bounds.h, (tx, ty) => tile(tx, ty));
    for (let i = 0; i < mask.pixels.length; i++) {
      if (mask.pixels[i] === 0) continue;
      const v = field.pixels[i]!;
      s.pixels[i] = v === 0 ? c.fill : v;
    }
  }

  // 2. Shoreline: the outline of the mask, 1px, exactly like a kerb.
  drawShoreline(s, mask, c);
  return mask;
}

function maskBounds(mask: Surface): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let y = 0; y < mask.height; y++) {
    const row = y * mask.width;
    for (let x = 0; x < mask.width; x++) {
      if (mask.pixels[row + x] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * A wet pixel with at least one dry four-neighbour is the bank. Deriving it
 * from the mask means the shore is exactly 1px, continuous round every bend,
 * and can never appear inside the channel.
 */
export function drawShoreline(s: Surface, mask: Surface, c: WaterColours): void {
  const w = mask.width;
  const h = mask.height;
  const m = mask.pixels;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (m[row + x] === 0) continue;
      const up = y > 0 ? m[row - w + x]! : 0;
      const dn = y < h - 1 ? m[row + w + x]! : 0;
      const lf = x > 0 ? m[row + x - 1]! : 0;
      const rt = x < w - 1 ? m[row + x + 1]! : 0;
      if (up && dn && lf && rt) continue;
      s.pixels[row + x] = c.shore;
    }
  }
}
