/**
 * Figures: where each one is this frame, and how it is drawn.
 *
 * Positions come from `poseAlongEdge` so a figure on a curved road follows the
 * curve. Walk frames cycle on real time (the sim never sees a clock), and the
 * name label is 3x5 text on a dark box. Ghosts are checker-dithered rather than
 * alpha-blended: at native resolution there is no alpha.
 */
import type { NodeId, Town, TransportMode } from '@jones2/town';
import type { Sprite } from '@jones2/pixelart';
import type { FigurePose, FigureStyle } from './api';
import { type ArtSet, PX_PER_UNIT } from './art';
import { textWidth } from './font';
import { facingOf, poseAlongEdge } from './roads';
import { blit, blitAnchored, fillRect, put, strokeRect, text, type RenderPalette, type Surface } from './surface';

/** One walk frame every 150 ms. */
export const WALK_FRAME_MS = 150;

/**
 * MARKERS — how a figure can be something other than a walking person without
 * widening `api.ts` (THE CONTRACT). A marker is a prefix on `FigureStyle.label`:
 *
 *   "#2 Bob"   a numbered player token (`UI.token_2`), name plate "Bob"
 *   "@closed"  the CLOSED board, hung at that node, no name plate
 *
 * Nothing else changes: a marked figure still has a pose, is still depth
 * sorted, and still ghosts. Built by `src/classic/tokens.ts`.
 */
export type FigureMarker =
  | { kind: 'token'; n: number; name: string }
  | { kind: 'closed'; name: '' }
  | null;

export function parseMarker(label: string): FigureMarker {
  const token = /^#([1-9])(?:\s+(.*))?$/.exec(label);
  if (token) return { kind: 'token', n: Number(token[1]), name: token[2] ?? '' };
  if (label === '@closed') return { kind: 'closed', name: '' };
  return null;
}

/** The label that makes a figure draw as player `n`'s token. */
export function tokenLabel(n: number, name: string): string {
  return `#${n} ${name}`.trim();
}

/** The label that makes a figure draw as a CLOSED board. */
export const CLOSED_LABEL = '@closed';

/**
 * A node is a building's DOOR, at the bottom edge of its sprite. A token is
 * therefore drawn just BELOW the node, standing on the pavement in front of the
 * shop where it reads against the ground rather than against the façade; the
 * CLOSED board is hung above it, on the building's face.
 */
export const TOKEN_DROP = 8;
/** Gap between the top of a walker's head and the bottom of the token's halo. */
export const TOKEN_HOVER = 3;
/** Width of the ink-and-white ring round a token. */
const HALO = 3;
export const CLOSED_LIFT = 22;
/** Seats stand side by side so four players at one node all show. */
export const TOKEN_SPREAD = 15;

/** Horizontal offset, in native pixels, of seat `n`'s token from the node. */
export function tokenOffset(n: number): number {
  return Math.round((n - 2.5) * TOKEN_SPREAD);
}

export interface FigureState {
  id: string;
  style: FigureStyle;
  pose: FigurePose;
}

export interface ResolvedFigure {
  id: string;
  label: string;
  /** Native world pixels. */
  nx: number;
  ny: number;
  dir: 'n' | 's' | 'e' | 'w';
  frame: number;
  ghost: boolean;
  mode: TransportMode | undefined;
  tint: string;
  /** Non-null when this figure is a token or a CLOSED board rather than a walker. */
  marker: FigureMarker;
}

function nodeAt(town: Town, id: NodeId) {
  return town.nodes.find((n) => n.id === id);
}

/** Turn a pose into a drawable position, in native world pixels. */
export function resolveFigure(
  town: Town,
  fig: FigureState,
  timeMs: number,
): ResolvedFigure | null {
  const marker = parseMarker(fig.style.label);
  const base = {
    id: fig.id,
    label: marker ? marker.name : fig.style.label,
    tint: fig.style.color,
    ghost: fig.pose.ghost === true,
    mode: fig.pose.mode,
    marker,
  };
  if (fig.pose.kind === 'at') {
    const n = nodeAt(town, fig.pose.node);
    if (!n) return null;
    return {
      ...base,
      nx: n.x * PX_PER_UNIT,
      ny: n.y * PX_PER_UNIT,
      dir: 's',
      frame: 0,
    };
  }
  const { from, to, t } = fig.pose;
  if (!nodeAt(town, from) || !nodeAt(town, to)) return null;
  const p = poseAlongEdge(town, from, to, t);
  return {
    ...base,
    nx: p.x * PX_PER_UNIT,
    ny: p.y * PX_PER_UNIT,
    dir: facingOf(p.dx, p.dy),
    // Frames 1 and 2 are the stride; 0 is the idle stance, kept for 'at'.
    frame: 1 + (Math.floor(timeMs / WALK_FRAME_MS) % 2),
  };
}

/** True when any figure is walking, so the render loop keeps ticking. */
export function anyMoving(figures: FigureState[]): boolean {
  return figures.some((f) => f.pose.kind === 'between');
}

const VEHICLE_COLOUR: Record<string, string> = {
  car: '#c8452f',
  bike: '#2f8f5a',
  bus: '#e8c22a',
};

/**
 * Draw one figure into a layer surface. `ox/oy` are the native world pixels at
 * the surface's top-left corner.
 */
export function drawFigure(
  s: Surface,
  art: ArtSet,
  pal: RenderPalette,
  f: ResolvedFigure,
  ox: number,
  oy: number,
): void {
  const x = f.nx - ox;
  const y = f.ny - oy;
  const ink = pal.index('ink', [29, 26, 36]);

  const marker = f.marker;
  if (marker) {
    // Markers are UI sprites, not characters: a numbered token floating over
    // the node, or a CLOSED board hung on the building's face.
    const token = marker.kind === 'token';
    const sprite = art.ui?.(token ? `token_${marker.n}` : 'sign_closed');
    if (!sprite) return;
    if (!token) {
      blitAnchored(s, sprite, x, y - CLOSED_LIFT, { ghost: f.ghost });
      return;
    }
    // A player: the little walker on the ground (idle at a door, striding
    // along a route) with the numbered token floating over their head.
    const dx = tokenOffset(marker.n);
    const walker = art.character(f.dir, f.frame, pal.hex(f.tint));
    blitAnchored(s, walker, x + dx, y, { ghost: f.ghost });
    drawToken(s, pal, sprite, x + dx, y - (walker.anchorY + 1) - TOKEN_HOVER, f.ghost, ink);
    return;
  }

  const tint = pal.hex(f.tint);
  const sprite = art.character(f.dir, f.frame, tint);

  if (f.mode && f.mode !== 'walk') {
    // A placeholder vehicle: a small outlined box under the figure.
    const vc = pal.hex(VEHICLE_COLOUR[f.mode] ?? '#888888');
    const w = sprite.width + 4;
    const h = Math.max(5, Math.round(sprite.height * 0.35));
    const bx = Math.round(x - w / 2);
    const by = Math.round(y - h + 1);
    fillRect(s, bx, by, w, h, vc);
    strokeRect(s, bx, by, w, h, ink);
  }

  blitAnchored(s, sprite, x, y, { ghost: f.ghost });
}

/**
 * A player token, made hard to miss: an ink-and-white halo ring round every
 * token, and the active player's token drawn at double size with a slow bob
 * so the eye finds it on a busy board. Other players' tokens keep their
 * ghost dither.
 */
function drawToken(s: Surface, pal: RenderPalette, sprite: Sprite, x: number, y: number, ghost: boolean, ink: number): void {
  const white = pal.index('white', [242, 242, 238]);
  const scale = ghost ? 1 : 2;
  // The bob only ever lifts the token, so it never dips into the head below.
  const bob = ghost ? 0 : Math.round(Math.sin(Date.now() / 260) * 1.5) - 2;
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  const left = Math.round(x) - (w >> 1);
  // `y` is where the token's halo may reach down to; the disc sits above it.
  const top = Math.round(y) - HALO - h + bob;
  // halo: an ink ring outside a white ring, hugging the sprite's disc
  const cx = left + w / 2 - 0.5;
  const cy = top + h / 2 - 0.5;
  const r = w / 2;
  for (let py = top - HALO; py < top + h + HALO; py++) {
    for (let px = left - HALO; px < left + w + HALO; px++) {
      const d = Math.hypot(px - cx, py - cy);
      if (d > r + 2.5) continue;
      if (d > r + 1.5) put(s, px, py, ink);
      else if (d > r - 0.5) put(s, px, py, white);
    }
  }
  if (scale === 1) {
    blit(s, sprite, left, top, { ghost });
    return;
  }
  for (let sy = 0; sy < sprite.height; sy++) {
    for (let sx = 0; sx < sprite.width; sx++) {
      const v = sprite.pixels[sy * sprite.width + sx]!;
      if (v === 0) continue;
      const px = left + sx * scale;
      const py = top + sy * scale;
      for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) put(s, px + i, py + j, v);
    }
  }
}

/** Name plate above a figure. Drawn after every figure so labels never occlude one. */
export function drawFigureLabel(
  s: Surface,
  pal: RenderPalette,
  f: ResolvedFigure,
  spriteHeight: number,
  ox: number,
  oy: number,
): void {
  const label = f.label.slice(0, 10);
  if (!label) return;
  const ink = pal.index('ink', [29, 26, 36]);
  const panel = pal.index('panel', [36, 31, 43]);
  const white = pal.index('white', [242, 242, 238]);
  const w = textWidth(label) + 4;
  const h = 9;
  // A player's plate sits above the token over their head (14px, doubled for
  // the active player), not on top of it.
  const token = f.marker?.kind === 'token';
  const lift = token ? (f.ghost ? 14 : 28) + TOKEN_HOVER + HALO * 2 + 4 : 0;
  const dx = token && f.marker?.kind === 'token' ? tokenOffset(f.marker.n) : 0;
  const x = Math.round(f.nx - ox + dx - w / 2);
  const y = Math.round(f.ny - oy - spriteHeight - lift - h - 1);
  fillRect(s, x, y, w, h, panel);
  strokeRect(s, x, y, w, h, ink);
  text(s, label, x + 2, y + 2, white);
}
