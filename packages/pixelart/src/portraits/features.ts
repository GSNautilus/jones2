/**
 * Faces: brows, eyes, nose, mouth, facial hair and eyewear.
 *
 * Everything is authored as rows of single-character codes and stamped with
 * `drawRows`, the same way the character sprites are — at five pixels to an eye
 * there is no room for generated shapes.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { dither, drawRows, fillCircle, hline, put, rect, vline } from '../surface';
import { faceR, type Geom } from './head';

export type EyeStyle = 'normal' | 'wide' | 'narrow' | 'tired' | 'bright' | 'beady';
export type BrowStyle = 'flat' | 'raised' | 'angry' | 'thick' | 'arched';
export type NoseStyle = 'small' | 'button' | 'long' | 'broad' | 'hook';
export type MouthStyle = 'smile' | 'grin' | 'flat' | 'frown' | 'smirk' | 'talk' | 'pursed';
export type BeardStyle = 'none' | 'moustache' | 'thin_tache' | 'beard' | 'goatee' | 'stubble' | 'sideburns';
export type GlassStyle = 'none' | 'square' | 'round' | 'halfmoon' | 'loupe';

/* eslint-disable sort-keys */
/* prettier-ignore */
const EYES: Record<EyeStyle, string[]> = {
  normal: ['.KKK.', 'KWBWK', '.kkk.'],
  wide:   ['.KKK.', 'KWBWK', 'KWWWK', '.KKK.'],
  narrow: ['KKKKK', '.WBW.', '..k..'],
  tired:  ['KKKK.', 'kWBWK', '..kk.'],
  bright: ['.KKK.', 'KWBWK', 'KWWWK', '.kkk.'],
  beady:  ['.KKK.', 'KWBWK', '..k..'],
};

/* prettier-ignore */
const MOUTHS: Record<MouthStyle, string[]> = {
  smile:  ['K.....K', '.KKKKK.'],
  grin:   ['.KKKKK.', 'KWWWWWK', '.KKKKK.'],
  flat:   ['.KKKKK.'],
  frown:  ['.KKKKK.', 'K.....K'],
  smirk:  ['..KKKKK', '.KKKK..'],
  talk:   ['.KKKK.', 'KRRRRK', 'KWWWWK', '.KKKK.'],
  pursed: ['..KKK..', '.KKKKK.'],
};

/* prettier-ignore */
const NOSES: Record<NoseStyle, string[]> = {
  small:  ['.s.', 'ssK'],
  button: ['.ss.', 'sssK', '.KK.'],
  long:   ['.s..', '.s..', '.ss.', 'sssK', '.KK.'],
  broad:  ['.ss..', '.sss.', 'KsssK', '.KKK.'],
  hook:   ['.s..', '.ss.', '..ss', '.sKK'],
};

function legend(g: Geom, ink = C.ink): Record<string, number> {
  return { K: ink, k: C.inkSoft, W: C.white, B: C.ink, R: C.maroon, s: g.tone.shade, S: g.tone.face };
}

export function drawEyes(g: Geom, t: Sprite, style: EyeStyle, iris = C.ink): void {
  const rows = EYES[style];
  const lg = { ...legend(g), B: iris };
  const y = g.eyesY - 1;
  drawRows(t, g.cx - g.eyeGap - 2 - Math.max(0, g.turn), y, rows, lg);
  drawRows(t, g.cx + g.eyeGap - 2 - Math.min(0, g.turn), y, rows, lg);
}

export function drawBrows(g: Geom, t: Sprite, style: BrowStyle, color: number): void {
  const y = g.browY;
  for (const side of [-1, 1] as const) {
    const base = g.cx + side * g.eyeGap;
    for (let i = -3; i <= 3; i++) {
      const x = base + i;
      // `i` runs from the nose side outwards for the right brow and the other
      // way for the left, so `out` is the distance towards the temple
      const out = side === 1 ? i : -i;
      let dy = 0;
      if (style === 'raised') dy = out > 1 ? -1 : 0;
      if (style === 'angry') dy = out < -1 ? 1 : 0;
      if (style === 'arched') dy = Math.abs(out) > 2 ? 1 : -1;
      put(t, x, y + dy, color);
      if (style === 'thick') put(t, x, y + dy + 1, color);
      if (style === 'thick') put(t, x, y + dy - 1, color);
    }
  }
}

export function drawNose(g: Geom, t: Sprite, style: NoseStyle): void {
  const rows = NOSES[style];
  const w = rows[rows.length - 1].length;
  drawRows(t, g.cx - (w >> 1) + g.turn, g.noseY - rows.length + 1, rows, legend(g));
}

export function drawMouth(g: Geom, t: Sprite, style: MouthStyle, lip = C.ink): void {
  const rows = MOUTHS[style];
  const w = rows[0].length;
  const lg = { ...legend(g), K: lip };
  drawRows(t, g.cx - (w >> 1) + g.turn, g.mouthY, rows, lg);
  // a shadow under the lower lip gives the chin some form
  if (style !== 'talk') dither(t, g.cx - 2 + g.turn, g.mouthY + rows.length + 1, 5, 1, g.tone.shade, -1, 0);
}

export function drawBeard(g: Geom, t: Sprite, style: BeardStyle, color: number, shade: number): void {
  if (style === 'none') return;
  const cx = g.cx + g.turn;
  if (style === 'moustache' || style === 'thin_tache') {
    const half = style === 'moustache' ? 6 : 5;
    const thick = style === 'moustache' ? 3 : 2;
    const top = g.mouthY - 1 - thick;
    for (let i = -half; i <= half; i++) {
      const drop = style === 'moustache' && Math.abs(i) > 3 ? 1 : 0;
      for (let j = 0; j < thick; j++) put(t, cx + i, top + drop + j, j === 0 ? color : shade);
    }
    return;
  }
  if (style === 'stubble') {
    for (let y = g.mouthY - 1; y <= g.chinY + 1; y++) {
      const r = faceR(g, y);
      dither(t, g.cx - r, y, 2 * r + 1, 1, shade, -1, y & 1);
    }
    for (let y = g.eyesY + 3; y < g.mouthY - 1; y++) {
      const r = faceR(g, y);
      dither(t, g.cx - r, y, 3, 1, shade, -1, y & 1);
      dither(t, g.cx + r - 2, y, 3, 1, shade, -1, y & 1);
    }
    return;
  }
  if (style === 'sideburns') {
    for (let y = g.eyesY - 3; y < g.noseY; y++) {
      const r = faceR(g, y);
      rect(t, g.cx - r, y, 3, 1, color);
      rect(t, g.cx + r - 2, y, 3, 1, shade);
    }
    return;
  }
  if (style === 'goatee') {
    // chin tuft only, kept clear of the mouth so the expression still reads
    for (let y = g.mouthY + 3; y <= g.chinY + 1; y++) {
      const w = y > g.chinY - 1 ? 2 : 3;
      rect(t, cx - w, y, w * 2 + 1, 1, y & 1 ? color : shade);
      put(t, cx - w - 1, y, C.ink);
      put(t, cx + w + 1, y, C.ink);
    }
    hline(t, cx - 2, g.chinY + 2, 5, C.ink);
    for (let i = -4; i <= 4; i++) put(t, cx + i, g.mouthY - 2, color);
    return;
  }
  // full beard: everything below the moustache line, following the jaw
  for (let y = g.mouthY - 2; y <= g.chinY + 3; y++) {
    const r = Math.max(2, faceR(g, Math.min(y, g.chinY)) + (y > g.chinY ? -2 : 0));
    if (y >= g.mouthY && y <= g.mouthY + 1) {
      // leave the mouth showing
      rect(t, g.cx - r, y, r - 3, 1, color);
      rect(t, g.cx + 4, y, r - 3, 1, shade);
      continue;
    }
    hline(t, g.cx - r, y, 2 * r + 1, y & 1 ? color : shade);
  }
  for (let y = g.mouthY - 2; y <= g.chinY + 3; y++) {
    const r = Math.max(2, faceR(g, Math.min(y, g.chinY)) + (y > g.chinY ? -2 : 0));
    put(t, g.cx - r - 1, y, C.ink);
    put(t, g.cx + r + 1, y, C.ink);
  }
  hline(t, g.cx - 4, g.chinY + 4, 9, C.ink);
}

export function drawGlasses(g: Geom, t: Sprite, style: GlassStyle, frame = C.ink): void {
  if (style === 'none') return;
  const y = g.eyesY;
  if (style === 'loupe') {
    const lx = g.cx + g.eyeGap;
    fillCircle(t, lx, y, 6, C.ink);
    fillCircle(t, lx, y, 5, C.metalDark);
    fillCircle(t, lx, y, 4, C.ink);
    fillCircle(t, lx, y, 3, C.glassDark);
    put(t, lx - 2, y - 2, C.glass);
    put(t, lx - 1, y - 2, C.white);
    // the headband strap over the brow
    hline(t, g.cx - faceR(g, y - 7), y - 7, 2 * faceR(g, y - 7) + 1, C.woodDark);
    hline(t, g.cx - faceR(g, y - 6), y - 6, 2 * faceR(g, y - 6) + 1, C.ink);
    return;
  }
  if (style === 'round') {
    for (const side of [-1, 1] as const) {
      const ex = g.cx + side * g.eyeGap;
      fillCircle(t, ex, y, 5, frame);
      fillCircle(t, ex, y, 4, 0);
      // repaint the lens interior: transparent would punch a hole in the face
      fillCircle(t, ex, y, 4, g.tone.face);
      drawLens(t, ex - 4, y - 4, 9, 9, frame);
    }
    hline(t, g.cx - 2, y, 5, frame);
    put(t, g.cx - faceR(g, y) - 1, y - 1, frame);
    put(t, g.cx + faceR(g, y) + 1, y - 1, frame);
    return;
  }
  const w = style === 'halfmoon' ? 12 : 13;
  const h = style === 'halfmoon' ? 5 : 9;
  const top = style === 'halfmoon' ? y - 1 : y - 4;
  for (const side of [-1, 1] as const) {
    const ex = g.cx + side * g.eyeGap - (w >> 1);
    if (style !== 'halfmoon') hline(t, ex, top, w, frame);
    hline(t, ex, top + h - 1, w, frame);
    vline(t, ex, top, h, frame);
    vline(t, ex + w - 1, top, h, frame);
    drawLens(t, ex, top, w, h, frame);
  }
  hline(t, g.cx - 2, top + (style === 'halfmoon' ? 0 : 2), 5, frame);
  // temple arms reaching back to the ears
  for (const side of [-1, 1] as const) {
    const r = faceR(g, top + 1);
    if (side < 0) hline(t, g.cx - r - 1, top + 1, 3, frame);
    else hline(t, g.cx + r - 1, top + 1, 3, frame);
  }
  if (style === 'halfmoon') {
    // a chain looping down towards the collar
    for (let j = 0; j < 8; j++) {
      put(t, g.cx - faceR(g, top + j) - 1 + (j >> 2), top + 3 + j, C.goldDark);
      put(t, g.cx + faceR(g, top + j) + 1 - (j >> 2), top + 3 + j, C.goldDark);
    }
  }
}

/** A diagonal glint across a lens, so glasses read as glass and not as holes. */
function drawLens(t: Sprite, x: number, y: number, w: number, h: number, frame: number): void {
  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) {
      if (i + j === 3 || i + j === 4) put(t, x + i, y + j, frame === C.ink ? C.glass : C.white);
    }
  }
}
