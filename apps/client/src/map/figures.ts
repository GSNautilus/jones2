/**
 * Figures: where each one is this frame, and how it is drawn.
 *
 * Positions come from `poseAlongEdge` so a figure on a curved road follows the
 * curve. Walk frames cycle on real time (the sim never sees a clock), and the
 * name label is 3x5 text on a dark box. Ghosts are checker-dithered rather than
 * alpha-blended: at native resolution there is no alpha.
 */
import type { NodeId, Town, TransportMode } from '@jones2/town';
import type { FigurePose, FigureStyle } from './api';
import { type ArtSet, PX_PER_UNIT } from './art';
import { textWidth } from './font';
import { facingOf, poseAlongEdge } from './roads';
import {
  type RenderPalette,
  type Surface,
  blitAnchored,
  fillRect,
  strokeRect,
  text,
} from './surface';

/** One walk frame every 150 ms. */
export const WALK_FRAME_MS = 150;

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
  const base = {
    id: fig.id,
    label: fig.style.label,
    tint: fig.style.color,
    ghost: fig.pose.ghost === true,
    mode: fig.pose.mode,
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
  const x = Math.round(f.nx - ox - w / 2);
  const y = Math.round(f.ny - oy - spriteHeight - h - 1);
  fillRect(s, x, y, w, h, panel);
  strokeRect(s, x, y, w, h, ink);
  text(s, label, x + 2, y + 2, white);
}
