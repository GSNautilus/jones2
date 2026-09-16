/**
 * The two props that make grade separation legible: a bridge deck where a road
 * crosses the water, and a tunnel mouth where a street passes under the
 * highway.
 *
 * Both are `Decor` entries the generator emits, each carrying `dir`, the unit
 * tangent of the road it belongs to, so the deck runs ALONG the road instead of
 * being axis-aligned. Drawn after the roads, which is why the deck reads as the
 * road carrying on over the water; the highway is already painted last, so at
 * an underpass it covers the street and the portals sit either side of it.
 */
import type { Decor, Town } from '@jones2/town';
import { PX_PER_UNIT } from './art';
import { ROAD_STYLE } from './roads';
import { type RenderPalette, type Surface, put } from './surface';

export interface CrossingColours {
  deck: number;
  deckDark: number;
  line: number;
  parapet: number;
  parapetLight: number;
  ink: number;
  shadow: number;
}

export function crossingColours(pal: RenderPalette): CrossingColours {
  return {
    deck: pal.index('road', [84, 84, 94]),
    deckDark: pal.index('roadDark', [66, 66, 76]),
    line: pal.index('roadLine', [222, 190, 84]),
    parapet: pal.index('stone', [150, 150, 158]),
    parapetLight: pal.index('white', [238, 236, 226]),
    ink: pal.index('ink', [34, 28, 42]),
    shadow: pal.index('shadow', [63, 74, 56]),
  };
}

/** Half length and half width of a crossing prop, in native pixels. */
export function crossingSize(kind: string): { along: number; across: number } {
  if (kind === 'viaduct') return { along: 40, across: ROAD_STYLE.highway.width / 2 + 3 };
  if (kind === 'underpass') return { along: 16, across: ROAD_STYLE.street.width / 2 + 2 };
  return { along: 34, across: ROAD_STYLE.street.width / 2 + 3 };
}

export const CROSSING_KINDS = new Set(['bridge', 'viaduct', 'underpass']);

function unit(d: { x: number; y: number } | undefined): { x: number; y: number } {
  if (!d) return { x: 1, y: 0 };
  const len = Math.hypot(d.x, d.y) || 1;
  return { x: d.x / len, y: d.y / len };
}

/**
 * A deck along `dir`: asphalt down the middle, a parapet along each side with a
 * lit top edge, and a band of shadow just past the far parapet so the span
 * reads as standing above the water.
 */
export function drawDeck(s: Surface, d: Decor, c: CrossingColours, offsetX: number, offsetY: number): void {
  const t = unit(d.dir);
  const n = { x: -t.y, y: t.x };
  const { along, across } = crossingSize(d.kind);
  const cx = d.x * PX_PER_UNIT - offsetX;
  const cy = d.y * PX_PER_UNIT - offsetY;
  const fill = d.kind === 'viaduct' ? c.deckDark : c.deck;
  for (let a = -along; a <= along; a += 0.5) {
    for (let b = -across; b <= across; b += 0.5) {
      const x = cx + t.x * a + n.x * b;
      const y = cy + t.y * a + n.y * b;
      const edge = Math.abs(b) >= across - 2.2;
      if (Math.abs(b) >= across - 0.6) put(s, x, y, c.ink);
      else if (edge) put(s, x, y, b < 0 ? c.parapetLight : c.parapet);
      else put(s, x, y, fill);
    }
    // centre line, dashed the same way a road's is
    if (((a + along) % 10) < 6) put(s, cx + t.x * a, cy + t.y * a, c.line);
  }
  // the shadow the deck casts on the water on its downhill side
  for (let a = -along; a <= along; a += 0.5) {
    for (let b = across + 0.5; b <= across + 2; b += 0.5) {
      put(s, cx + t.x * a + n.x * b, cy + t.y * a + n.y * b, c.ink);
    }
  }
}

/**
 * A tunnel mouth: two dark portals across the street, one on each side of the
 * highway, with a stone lintel over each. The street between them is already
 * covered by the highway, which is painted last.
 */
export function drawPortal(s: Surface, d: Decor, c: CrossingColours, offsetX: number, offsetY: number): void {
  const t = unit(d.dir);
  const n = { x: -t.y, y: t.x };
  const { along, across } = crossingSize(d.kind);
  const cx = d.x * PX_PER_UNIT - offsetX;
  const cy = d.y * PX_PER_UNIT - offsetY;
  const gap = ROAD_STYLE.highway.width / 2 + 1;
  for (const side of [-1, 1] as const) {
    for (let a = gap; a <= gap + along * 0.35; a += 0.5) {
      for (let b = -across; b <= across; b += 0.5) {
        const x = cx + t.x * a * side + n.x * b;
        const y = cy + t.y * a * side + n.y * b;
        put(s, x, y, Math.abs(b) >= across - 0.6 ? c.parapet : c.ink);
      }
    }
    // lintel: a stone bar right at the mouth
    for (let b = -across - 1; b <= across + 1; b += 0.5) {
      const a = gap;
      put(s, cx + t.x * a * side + n.x * b, cy + t.y * a * side + n.y * b, c.parapetLight);
    }
  }
}

/** Every crossing prop in the town, drawn over the roads. */
export function drawCrossings(
  s: Surface,
  town: Town,
  pal: RenderPalette,
  offsetX: number,
  offsetY: number,
): void {
  const c = crossingColours(pal);
  for (const d of town.decor ?? []) {
    if (d.kind === 'bridge' || d.kind === 'viaduct') drawDeck(s, d, c, offsetX, offsetY);
    else if (d.kind === 'underpass') drawPortal(s, d, c, offsetX, offsetY);
  }
}
