/**
 * The classic interface set: the framed location window, the clerk's speech
 * bubble, the title plate its name sits on, the numbered map tokens and the
 * CLOSED board the map hangs on locations the ruleset does not open.
 *
 * NINE-SLICE CONTRACT — the same rule as `UI.panel`. `window_frame`,
 * `bubble` and `title_plate` are built from concentric rings, so every edge
 * strip is uniform along its length and tiling and stretching agree. Corner
 * ornaments (studs, rivets) stay inside the corner insets. Slice at:
 *   window_frame  32x32  FRAME_INSETS   12 all round
 *   bubble        20x20  BUBBLE_INSETS   7 all round (corner radius 5)
 *   title_plate   22x16  PLATE_INSETS    5 top/bottom, 7 left/right
 *
 * The bubble's tail is a separate sprite so it can be moved along the edge:
 * `bubble_tail_r` points up and to the right (towards a portrait in the top
 * right corner) and `bubble_tail_l` is its mirror.
 */
import { C, PLAYER_SHIRTS } from '../palette';
import type { Sprite, SpriteMap } from '../types';
import { box, createSprite, drawRows, fillCircle, hline, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import type { SliceInsets } from './catalogue';

export const FRAME_INSETS: SliceInsets = { top: 12, right: 12, bottom: 12, left: 12 };
export const BUBBLE_INSETS: SliceInsets = { top: 7, right: 7, bottom: 7, left: 7 };
export const PLATE_INSETS: SliceInsets = { top: 5, right: 7, bottom: 5, left: 7 };

/**
 * Concentric rings, optionally with rounded corners. `lit` is used where a ring
 * touches the top or left edge and `dark` on the bottom or right, so the bevel
 * reads as lit from the top-left; anything inside the last ring takes `fill`.
 * The rounding only ever touches the corner boxes, so edge strips stay uniform.
 */
function ringed(
  w: number,
  h: number,
  lit: readonly number[],
  dark: readonly number[],
  fill: number,
  radius = 0,
): Sprite {
  const s = createSprite(w, h, 0, 0, w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = Math.min(x, w - 1 - x);
      const py = Math.min(y, h - 1 - y);
      const onTop = y === py;
      const onLeft = x === px;
      let d = Math.min(px, py);
      if (radius > 0 && px < radius && py < radius) {
        const dd = radius - Math.hypot(radius - px, radius - py);
        if (dd < -0.5) continue;
        d = Math.max(0, Math.floor(dd + 0.5));
      }
      if (d >= lit.length) {
        put(s, x, y, fill);
        continue;
      }
      const isLit = (onTop && onLeft) || (onTop && py === d) || (onLeft && px === d);
      put(s, x, y, isLit ? lit[d] : dark[d]);
    }
  }
  return s;
}

/** A brass stud: three tones so it reads as a dome at 1x. */
function stud(s: Sprite, cx: number, cy: number): void {
  rect(s, cx - 1, cy - 1, 3, 3, C.goldDark);
  rect(s, cx - 1, cy - 1, 2, 2, C.gold);
  put(s, cx - 1, cy - 1, C.white);
  put(s, cx + 1, cy + 1, C.ink);
}

/** The centre window: heavy carved wood between two brass beads. */
function windowFrame(): Sprite {
  const lit = [C.ink, C.gold, C.goldDark, C.ink, C.wood, C.wood, C.woodDark, C.wood, C.woodDark, C.ink, C.gold, C.ink];
  const dark = [
    C.ink, C.goldDark, C.ink, C.ink, C.woodDark, C.woodDark, C.woodDark, C.woodDark, C.ink, C.ink, C.goldDark, C.ink,
  ];
  const s = ringed(32, 32, lit, dark, C.glass);
  for (const [x, y] of [
    [6, 6],
    [25, 6],
    [6, 25],
    [25, 25],
  ] as Array<[number, number]>) {
    stud(s, x, y);
  }
  return s;
}

/** The greeting bubble: soft cream with a rounded ink edge. */
function bubble(): Sprite {
  const lit = [C.ink, C.white, C.cream];
  const dark = [C.ink, C.creamShade, C.cream];
  return ringed(20, 20, lit, dark, C.cream, 5);
}

/** The tail, wide where it meets the bubble and tapering up to the right. */
function bubbleTail(): Sprite {
  const W = 14;
  const H = 14;
  const s = createSprite(W, H, 0, H - 1, W, 1);
  for (let i = 0; i < W; i++) {
    const u = (W - 1 - i) / (W - 1);
    const y0 = Math.round(4 * u);
    const y1 = Math.round(13 * u);
    for (let y = y0; y <= y1; y++) put(s, i, y, y >= y1 - 1 ? C.creamShade : C.cream);
    if (i > 0) {
      put(s, i, y0, C.ink);
      put(s, i, y1, C.ink);
    }
  }
  put(s, W - 1, 0, C.ink);
  return s;
}

function mirror(src: Sprite): Sprite {
  const s = createSprite(src.width, src.height, src.width - 1 - src.anchorX, src.anchorY, src.width, src.footprintH);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) s.pixels[y * src.width + x] = src.pixels[y * src.width + (src.width - 1 - x)];
  }
  return s;
}

/** The engraved name plate across the top of the window. */
function titlePlate(): Sprite {
  const lit = [C.ink, C.gold, C.goldDark, C.ink];
  const dark = [C.ink, C.goldDark, C.ink, C.ink];
  const s = ringed(22, 16, lit, dark, C.maroon);
  for (const [x, y] of [
    [3, 3],
    [18, 3],
    [3, 12],
    [18, 12],
  ] as Array<[number, number]>) {
    put(s, x, y, C.gold);
    put(s, x + 1, y, C.goldDark);
    put(s, x, y + 1, C.goldDark);
  }
  return s;
}

// ---------------------------------------------------------------- tokens

export const TOKEN_SIZE = 14;

/** The four player colours the map tokens are ringed in. */
export const TOKEN_COLORS: number[] = [PLAYER_SHIRTS[0], PLAYER_SHIRTS[1], PLAYER_SHIRTS[2], PLAYER_SHIRTS[3]];

function token(n: number, ring: number): Sprite {
  const s = createSprite(TOKEN_SIZE, TOKEN_SIZE, TOKEN_SIZE >> 1, TOKEN_SIZE >> 1, TOKEN_SIZE, TOKEN_SIZE);
  const c = TOKEN_SIZE / 2 - 0.5;
  fillCircle(s, c, c, 6.6, C.ink);
  fillCircle(s, c, c, 5.6, ring);
  fillCircle(s, c, c, 4.0, C.white);
  fillCircle(s, c, c + 1, 3.6, C.creamShade);
  fillCircle(s, c, c - 0.5, 3.4, C.white);
  drawTextCentred(s, 0, 3, TOKEN_SIZE, String(n), C.ink, { spacing: 0 });
  return s;
}

/** Numbered player markers for the map, one per seat. */
export const TOKENS: SpriteMap = Object.fromEntries(
  TOKEN_COLORS.map((ring, i) => [`token_${i + 1}`, token(i + 1, ring)]),
);

// ---------------------------------------------------------------- closed

/* eslint-disable sort-keys */
/* prettier-ignore */
const TINY: Record<string, string[]> = {
  C: ['###', '#..', '#..', '#..', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  S: ['###', '#..', '###', '..#', '###'],
  E: ['###', '#..', '##.', '#..', '###'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
};

/** A board on two short chains, reading CLOSED, to hang on a shut building. */
function closedSign(): Sprite {
  const W = 28;
  const H = 14;
  const s = createSprite(W, H, W >> 1, H - 1, W, 1);
  for (const x of [5, 22]) {
    vline(s, x, 0, 4, C.metalDark);
    put(s, x, 1, C.metal);
    put(s, x - 1, 0, C.ink);
    put(s, x + 1, 0, C.ink);
  }
  box(s, 0, 3, W, H - 3, C.maroon, C.ink);
  box(s, 1, 4, W - 2, H - 5, -1, C.goldDark);
  hline(s, 2, 4, W - 4, C.gold);
  const word = 'CLOSED';
  let x = 2;
  for (const ch of word) {
    drawRows(s, x, 6, TINY[ch], { '#': C.cream });
    x += 4;
  }
  return s;
}

/** Everything the classic location window and map overlay need. */
export const CLASSIC_UI: SpriteMap = {
  window_frame: windowFrame(),
  bubble: bubble(),
  bubble_tail_r: bubbleTail(),
  bubble_tail_l: mirror(bubbleTail()),
  title_plate: titlePlate(),
  sign_closed: closedSign(),
  ...TOKENS,
};
