/**
 * Portrait geometry: the skull, neck and ears every clerk is built on.
 *
 * A portrait is PORTRAIT_W x PORTRAIT_H, head-and-shoulders, lit from the
 * top-left like everything else in the package. `makeGeom` turns a handful of
 * proportions into the row-by-row half-widths of the head, so hair, hats and
 * features can all ask "how wide is the face on this row?" instead of guessing.
 */
import type { Sprite } from '../types';
import { createSprite, dither, hline, put, rect, type Target } from '../surface';
import { C } from '../palette';

export const PORTRAIT_W = 56;
export const PORTRAIT_H = 64;

/** Fraction of the head height taken by the cranium above the cheekbones. */
const CRANIUM = 0.42;

export type Jaw = 'oval' | 'round' | 'square' | 'narrow';

/** A two-step colour ramp: flat fill plus the tone used on right edges. */
export interface Tone {
  face: number;
  shade: number;
}

export interface Geom {
  /** Centre column of the face, already nudged by `turn`. */
  cx: number;
  headTop: number;
  headH: number;
  headW: number;
  /** Half-width of the face on each head row, integer, index 0 = headTop. */
  radii: number[];
  /** Centre and radii of the cranium ellipse, used to sit hair and hats on. */
  crownY: number;
  crownRX: number;
  crownRY: number;
  /** Distance of each eye from the centre line. */
  eyeGap: number;
  eyesY: number;
  browY: number;
  noseY: number;
  mouthY: number;
  chinY: number;
  shoulderY: number;
  tone: Tone;
  /** -1 turned to the viewer's left, +1 to the right. */
  turn: number;
}

function taper(jaw: Jaw, u: number): number {
  if (jaw === 'round') return 1 - 0.55 * Math.pow(u, 2.6);
  if (jaw === 'square') return 1 - 0.36 * Math.pow(u, 3.2);
  if (jaw === 'narrow') return 1 - 0.72 * Math.pow(u, 1.7);
  return 1 - 0.6 * Math.pow(u, 2.1);
}

export interface GeomOptions {
  tone: Tone;
  headW?: number;
  headH?: number;
  headTop?: number;
  jaw?: Jaw;
  turn?: number;
  eyeGap?: number;
}

export function makeGeom(opts: GeomOptions): Geom {
  const headW = opts.headW ?? 28;
  const headH = opts.headH ?? 34;
  const headTop = opts.headTop ?? 12;
  const jaw = opts.jaw ?? 'oval';
  const turn = opts.turn ?? 0;
  const rx = headW / 2;

  const radii: number[] = [];
  for (let i = 0; i < headH; i++) {
    const t = (i + 0.5) / headH;
    let w: number;
    if (t < CRANIUM) {
      const u = ((CRANIUM - t) / CRANIUM) * 0.93;
      w = rx * Math.sqrt(Math.max(0, 1 - u * u));
    } else {
      w = rx * taper(jaw, (t - CRANIUM) / (1 - CRANIUM));
    }
    radii.push(Math.max(1, Math.round(w)));
  }

  return {
    cx: (PORTRAIT_W >> 1) - 1 + turn,
    headTop,
    headH,
    headW,
    radii,
    crownY: headTop + CRANIUM * headH,
    crownRX: rx,
    crownRY: CRANIUM * headH,
    eyeGap: opts.eyeGap ?? 6,
    eyesY: headTop + Math.round(headH * 0.52),
    browY: headTop + Math.round(headH * 0.52) - 4,
    noseY: headTop + Math.round(headH * 0.76),
    mouthY: headTop + Math.round(headH * 0.89),
    chinY: headTop + headH - 1,
    shoulderY: 48,
    tone: opts.tone,
    turn,
  };
}

/** Half-width of the face on row `y`; 0 above the crown or below the chin. */
export function faceR(g: Geom, y: number): number {
  const i = y - g.headTop;
  if (i < 0 || i >= g.radii.length) return 0;
  return g.radii[i];
}

/**
 * Half-width of a shell sitting on the head: an ellipse `grow` bigger than the
 * cranium above the cheekbones, and the face plus `side` below them.
 */
export function shellR(g: Geom, y: number, grow: number, side: number, lift: number): number {
  if (y >= g.crownY) return faceR(g, y) + side;
  const ry = g.crownRY + lift;
  const dy = (y - g.crownY) / ry;
  if (dy < -1) return -1;
  return Math.round((g.crownRX + grow) * Math.sqrt(Math.max(0, 1 - dy * dy)));
}

/** One centred row of a shape, width 2r+1. */
export function span(t: Target, cx: number, y: number, r: number, index: number): void {
  if (r < 0) return;
  hline(t, cx - r, y, 2 * r + 1, index);
}

/** The blank sprite a portrait is drawn into: a flat background, nothing else. */
export function blankPortrait(bg: number): Sprite {
  const s = createSprite(PORTRAIT_W, PORTRAIT_H, PORTRAIT_W >> 1, PORTRAIT_H - 1, PORTRAIT_W, PORTRAIT_H);
  rect(s, 0, 0, PORTRAIT_W, PORTRAIT_H, bg);
  return s;
}

/** Neck and its cast shadow, drawn before the head so the chin overlaps it. */
export function drawNeck(g: Geom, t: Sprite, width = 5): void {
  const top = g.chinY - 6;
  const bottom = g.shoulderY + 2;
  rect(t, g.cx - width - 1, top, width * 2 + 3, bottom - top, C.ink);
  rect(t, g.cx - width, top, width * 2 + 1, bottom - top, g.tone.face);
  // the jaw throws a shadow across the top of the neck, deepest under the chin
  rect(t, g.cx - width, top, width * 2 + 1, 4, g.tone.shade);
  dither(t, g.cx - width, top + 4, width * 2 + 1, 2, g.tone.shade, -1, 0);
  rect(t, g.cx + width - 1, top, 2, bottom - top, g.tone.shade);
}

/** The head itself: ink shell, skin fill, right-edge shading and a temple hollow. */
export function drawHead(g: Geom, t: Sprite): void {
  const { cx, headTop, radii, tone } = g;
  for (let i = 0; i < radii.length; i++) span(t, cx, headTop + i, radii[i] + 1, C.ink);
  span(t, cx, headTop - 1, radii[0], C.ink);
  span(t, cx, g.chinY + 1, radii[radii.length - 1], C.ink);
  for (let i = 0; i < radii.length; i++) span(t, cx, headTop + i, radii[i], tone.face);

  // light from the top-left: the right cheek and the underside of the jaw turn
  for (let i = 0; i < radii.length; i++) {
    const y = headTop + i;
    const r = radii[i];
    const deep = y > g.eyesY - 6 ? 2 : 1;
    rect(t, cx + r - deep + 1, y, deep, 1, tone.shade);
    if (i > 0 && i % 2 === 0 && y > g.eyesY) put(t, cx + r - deep, y, tone.shade);
  }
  // chin underside
  for (let i = radii.length - 3; i < radii.length; i++) {
    span(t, cx, headTop + i, Math.max(0, radii[i] - 2), tone.shade);
  }
  span(t, cx, g.chinY - 1, Math.max(0, radii[radii.length - 2] - 4), tone.face);
}

/** Ears: two lobes poking out at eye level, inked on the outside. */
export function drawEars(g: Geom, t: Sprite, drop = 0): void {
  const top = g.eyesY - 2 + drop;
  for (let j = 0; j < 8; j++) {
    const y = top + j;
    const r = faceR(g, y);
    const w = j === 0 || j === 7 ? 1 : 2;
    rect(t, g.cx - r - w, y, w, 1, g.tone.face);
    rect(t, g.cx + r + 1, y, w, 1, g.tone.shade);
    put(t, g.cx - r - w - 1, y, C.ink);
    put(t, g.cx + r + w + 1, y, C.ink);
  }
  put(t, g.cx - faceR(g, top) - 1, top - 1, C.ink);
  put(t, g.cx + faceR(g, top) + 1, top - 1, C.ink);
  put(t, g.cx - faceR(g, top + 8) - 1, top + 8, C.ink);
  put(t, g.cx + faceR(g, top + 8) + 1, top + 8, C.ink);
  // a scoop inside each ear
  for (let j = 2; j < 6; j++) {
    put(t, g.cx - faceR(g, top + j) - 1, top + j, g.tone.shade);
    put(t, g.cx + faceR(g, top + j) + 1, top + j, g.tone.face);
  }
}
