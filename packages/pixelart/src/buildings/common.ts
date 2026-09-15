/** Shared scaffolding for building generators. */
import type { Sprite } from '../types';
import { createSprite } from '../surface';
import { SHADOW_ROWS } from '../parts/common';

export type Params = Record<string, string | number | boolean> | undefined;
export type BuildingGenerator = (params?: Params) => Sprite;

export function str(p: Params, key: string, dflt: string): string {
  const v = p?.[key];
  return typeof v === 'string' ? v : dflt;
}

export function num(p: Params, key: string, dflt: number): number {
  const v = p?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : dflt;
}

export function bool(p: Params, key: string, dflt: boolean): boolean {
  const v = p?.[key];
  return typeof v === 'boolean' ? v : dflt;
}

/** Resolve a colour param that may be given as a palette name or an index. */
export function colorParam(p: Params, key: string, names: Readonly<Record<string, number>>, dflt: number): number {
  const v = p?.[key];
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && names[v] !== undefined) return names[v];
  return dflt;
}

export interface Frame {
  sprite: Sprite;
  /** Left edge of the facade (the eaves overhang further). */
  x: number;
  /** Facade width. */
  w: number;
  cx: number;
  /** Top of the roof band. */
  roofY: number;
  roofH: number;
  /** Top of the facade. */
  wallY: number;
  wallH: number;
  /** Bottom row of the facade — the ground line. */
  groundY: number;
}

/**
 * Lay out a building sprite: a roof band, a facade below it, and three rows at
 * the bottom reserved for the ground shadow. `topPad` reserves space above the
 * roof for signs, towers and stacks.
 */
export function frame(
  width: number,
  height: number,
  opts: { topPad?: number; inset?: number; roofH?: number } = {},
): Frame {
  const inset = opts.inset ?? 3;
  const topPad = opts.topPad ?? 0;
  const groundY = height - (SHADOW_ROWS + 2);
  const roofY = topPad;
  const roofH = opts.roofH ?? Math.max(8, Math.round((groundY - topPad) * 0.3));
  const wallY = roofY + roofH;
  const x = inset;
  const w = width - inset * 2;
  const sprite = createSprite(width, height, width >> 1, height - 2, w, 6);
  return { sprite, x, w, cx: x + (w >> 1), roofY, roofH, wallY, wallH: groundY - wallY + 1, groundY };
}
