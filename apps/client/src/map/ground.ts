/**
 * The static layer: one native-resolution palette-indexed surface holding the
 * whole town - grass, decor areas, roads, shadows, decor props and buildings.
 * Rebuilt only on `setTown()` and `moveNode()`; every frame just copies the
 * visible window out of it.
 *
 * It also produces the two lists the dynamic pass needs: depth-sorted
 * placements (so figures can be occluded by the buildings in front of them) and
 * pick rectangles.
 */
import type { Sprite } from './pixelart';
import type { Decor, NodeId, Town, TownNode } from '@jones2/town';
import { type ArtSet, PX_PER_UNIT, TILE, pixelRef } from './art';
import { hash2 } from './art.placeholder';
import { drawRoads } from './roads';
import {
  type RenderPalette,
  type Surface,
  blitAnchored,
  createSurface,
  fillRect,
  put,
  tileRect,
} from './surface';

/** Native-pixel margin kept around the town so edge buildings are not clipped. */
export const LAYER_MARGIN = 3 * TILE;

/** How close (native px) the cursor must be to a junction to hit it. */
export const JUNCTION_HIT_RADIUS = 10;

export interface Placement {
  /** Present for buildings; absent for scenery. */
  id?: NodeId;
  sprite: Sprite;
  /** Anchor position in native world pixels. */
  nx: number;
  ny: number;
  /** Insertion index, used to keep the depth sort stable. */
  order: number;
}

export interface PickRect {
  id: NodeId;
  /** Native world pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Ground {
  surface: Surface;
  /** Native world pixel at the surface's top-left corner. */
  offsetX: number;
  offsetY: number;
  /** Depth-sorted, back to front. */
  placements: Placement[];
  /** Buildings only, in the same order; junctions are picked by radius. */
  picks: PickRect[];
  /** Native world bounds of the whole layer. */
  width: number;
  height: number;
}

/** Stable painter's sort: anchor y, then x, then insertion order. */
export function sortByDepth<T extends { nx: number; ny: number; order: number }>(items: T[]): T[] {
  return items.slice().sort((a, b) => a.ny - b.ny || a.nx - b.nx || a.order - b.order);
}

const AREA_KINDS = new Set<Decor['kind']>(['water', 'grass', 'plaza']);

function tileKindFor(kind: Decor['kind']): 'water' | 'grass' | 'plaza' {
  return kind === 'water' ? 'water' : kind === 'plaza' ? 'plaza' : 'grass';
}

/** Native world bounds covering nodes (with their sprites), decor and roads. */
export function townBounds(town: Town, art: ArtSet): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const n of town.nodes) {
    const nx = n.x * PX_PER_UNIT;
    const ny = n.y * PX_PER_UNIT;
    if (n.building) {
      const s = art.building(pixelRef(n), n);
      grow(nx - s.anchorX, ny - s.anchorY);
      grow(nx - s.anchorX + s.width, ny - s.anchorY + s.height);
    } else {
      grow(nx - 8, ny - 8);
      grow(nx + 8, ny + 8);
    }
  }
  for (const d of town.decor ?? []) {
    const x = d.x * PX_PER_UNIT;
    const y = d.y * PX_PER_UNIT;
    grow(x - 8, y - 16);
    grow(x + (d.w ?? 0) * PX_PER_UNIT + 8, y + (d.h ?? 0) * PX_PER_UNIT + 8);
  }
  for (const e of town.edges) {
    for (const c of e.curve ?? []) grow(c.x * PX_PER_UNIT, c.y * PX_PER_UNIT);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: TILE, h: TILE };
  return {
    x: Math.floor(minX) - LAYER_MARGIN,
    y: Math.floor(minY) - LAYER_MARGIN,
    w: Math.ceil(maxX - minX) + LAYER_MARGIN * 2,
    h: Math.ceil(maxY - minY) + LAYER_MARGIN * 2,
  };
}

/** Dithered ellipse, used for building shadows (no alpha at native resolution). */
export function ditherEllipse(s: Surface, cx: number, cy: number, rx: number, ry: number, idx: number): void {
  if (rx <= 0 || ry <= 0) return;
  const top = Math.ceil(ry);
  for (let yy = -top; yy <= top; yy++) {
    const t = 1 - (yy * yy) / (ry * ry);
    if (t < 0) continue;
    const half = rx * Math.sqrt(t);
    const y = Math.round(cy) + yy;
    for (let xx = Math.round(cx - half); xx <= Math.round(cx + half); xx++) {
      if (((xx + y) & 1) === 0) put(s, xx, y, idx);
    }
  }
}

export function buildGround(town: Town, art: ArtSet, pal: RenderPalette): Ground {
  const b = townBounds(town, art);
  const surface = createSurface(Math.max(1, b.w), Math.max(1, b.h));
  const offsetX = b.x;
  const offsetY = b.y;
  const shadow = pal.index('shadow', [63, 74, 56]);

  // 1. Grass everywhere. The variant is a hash of the tile coordinate so the
  //    pattern is stable across rebuilds and never seams at a fill boundary.
  const tileAt = (kind: 'grass' | 'water' | 'plaza' | 'path', tx: number, ty: number): Sprite =>
    art.tile(kind, Math.floor(hash2(tx, ty, kind.length) * 4));
  tileRect(surface, TILE, TILE, 0, 0, surface.width, surface.height, (tx, ty) =>
    tileAt('grass', tx + Math.floor(offsetX / TILE), ty + Math.floor(offsetY / TILE)),
  );

  // 2. Decor areas as tile fills.
  for (const d of town.decor ?? []) {
    if (!AREA_KINDS.has(d.kind)) continue;
    const kind = tileKindFor(d.kind);
    const x = d.x * PX_PER_UNIT - offsetX;
    const y = d.y * PX_PER_UNIT - offsetY;
    const w = Math.max(TILE, (d.w ?? 4) * PX_PER_UNIT);
    const h = Math.max(TILE, (d.h ?? 4) * PX_PER_UNIT);
    tileRect(surface, TILE, TILE, x, y, w, h, (tx, ty) =>
      tileAt(kind, tx + Math.floor(offsetX / TILE), ty + Math.floor(offsetY / TILE)),
    );
    if (kind === 'water') {
      // A one-pixel bank so water does not just stop mid-tile.
      const edge = pal.index('waterDark', [47, 86, 136]);
      fillRect(surface, x, y, w, 1, edge);
      fillRect(surface, x, y + h - 1, w, 1, edge);
      fillRect(surface, x, y, 1, h, edge);
      fillRect(surface, x + w - 1, y, 1, h, edge);
    }
  }

  // 3. Roads, always under the buildings.
  drawRoads(surface, town, pal, offsetX, offsetY);

  // 4. Scenery props and buildings in one depth-sorted pass.
  const placements: Placement[] = [];
  let order = 0;
  for (const d of town.decor ?? []) {
    if (AREA_KINDS.has(d.kind)) continue;
    placements.push({
      sprite: art.nature(d.kind),
      nx: d.x * PX_PER_UNIT,
      ny: d.y * PX_PER_UNIT,
      order: order++,
    });
  }
  const byId = new Map<NodeId, TownNode>();
  for (const n of town.nodes) {
    // Any node that is a place (sim location or explicit recipe) gets a building; junctions don't.
    if (!n.location && !n.pixel && !n.building) continue;
    const sprite = art.building(pixelRef(n), n);
    byId.set(n.id, n);
    placements.push({
      id: n.id,
      sprite,
      nx: n.x * PX_PER_UNIT,
      ny: n.y * PX_PER_UNIT,
      order: order++,
    });
  }

  const sorted = sortByDepth(placements);
  // Pick boxes share the painter's order, so scanning backwards finds the
  // building drawn in front first.
  const picks: PickRect[] = [];
  for (const p of sorted) {
    const node = p.id ? byId.get(p.id) : undefined;
    if (node) picks.push(pickRectFor(node, p.sprite));
  }
  for (const p of sorted) {
    const lx = p.nx - offsetX;
    const ly = p.ny - offsetY;
    if (p.id) {
      ditherEllipse(
        surface,
        lx + 2,
        ly + Math.max(1, Math.round(p.sprite.footprintH / 4)),
        p.sprite.footprintW / 2 + 1,
        p.sprite.footprintH / 2 + 1,
        shadow,
      );
    }
    blitAnchored(surface, p.sprite, lx, ly);
  }

  return { surface, offsetX, offsetY, placements: sorted, picks, width: b.w, height: b.h };
}

/**
 * Picking box for a building: the anchor-centred ground footprint unioned with
 * the sprite's own bounding box, so the facade above the footprint is clickable
 * too. Native world pixels.
 */
export function pickRectFor(node: TownNode, sprite: Sprite): PickRect {
  const nx = node.x * PX_PER_UNIT;
  const ny = node.y * PX_PER_UNIT;
  const fx0 = nx - sprite.footprintW / 2;
  const fy0 = ny - sprite.footprintH / 2;
  const fx1 = fx0 + sprite.footprintW;
  const fy1 = fy0 + sprite.footprintH;
  const sx0 = nx - sprite.anchorX;
  const sy0 = ny - sprite.anchorY;
  const sx1 = sx0 + sprite.width;
  const sy1 = sy0 + sprite.height;
  const x = Math.min(fx0, sx0);
  const y = Math.min(fy0, sy0);
  return { id: node.id, x, y, w: Math.max(fx1, sx1) - x, h: Math.max(fy1, sy1) - y };
}

/**
 * Node under a native-world-pixel point.
 *
 * Junctions are checked twice: once inside a tight radius before buildings, and
 * once inside the full radius after. Without the first pass a junction that
 * happens to sit under a neighbouring building's facade would be impossible to
 * click, which matters a lot in the editor.
 */
export function pickNode(town: Town, picks: PickRect[], nx: number, ny: number): NodeId | null {
  const near = nearestNode(town, nx, ny, JUNCTION_HIT_RADIUS / 2, true);
  if (near) return near;
  for (let i = picks.length - 1; i >= 0; i--) {
    const r = picks[i]!;
    if (nx >= r.x && nx < r.x + r.w && ny >= r.y && ny < r.y + r.h) return r.id;
  }
  return nearestNode(town, nx, ny, JUNCTION_HIT_RADIUS, false);
}

function nearestNode(
  town: Town,
  nx: number,
  ny: number,
  radius: number,
  junctionsOnly: boolean,
): NodeId | null {
  let best: NodeId | null = null;
  let bestD = radius * radius;
  for (const n of town.nodes) {
    if (junctionsOnly && n.building) continue;
    const dx = n.x * PX_PER_UNIT - nx;
    const dy = n.y * PX_PER_UNIT - ny;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = n.id;
    }
  }
  return best;
}
