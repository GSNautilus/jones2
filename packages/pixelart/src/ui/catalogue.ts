/**
 * HUD furniture: a 9-slice panel, a 9-slice button in three states, a clock
 * face with separate hands, and the twelve 12x12 stat icons.
 *
 * NINE-SLICE CONTRACT
 * -------------------
 * `panel` is 24x24 and `PANEL_INSETS` is `{ top: 8, right: 8, bottom: 8, left: 8 }`.
 * Slice it into nine pieces at those insets: the four 8x8 corners are drawn as
 * they are, the four edge strips are stretched or tiled along their long axis,
 * and the 8x8 centre fills the rest. The border is built from concentric rings
 * so every edge strip is uniform along its length — tiling and stretching give
 * identical results.
 *
 * `button_normal` / `button_hover` / `button_pressed` are 18x18 with
 * `BUTTON_INSETS` of 6 on every side, and follow the same rule.
 *
 * CLOCK
 * -----
 * `clock_face` is 96x96 with the ring and twelve ticks but no hands. The hands
 * are separate sprites drawn pointing straight up, with their anchor at the
 * pivot (bottom centre): `clock_hand_hour` is 40px long, `clock_hand_minute`
 * 44px. Rotate them by re-rasterising — take the anchor as the origin, rotate
 * the tip, and stroke with `line`.
 */
import { C } from '../palette';
import type { Sprite, SpriteMap } from '../types';
import { box, createSprite, fillCircle, hline, line, put, rect, spriteFromRows, vline } from '../surface';
import { drawTextCentred } from '../font';
import { CLASSIC_UI } from './classic';

// ---------------------------------------------------------------- 9-slice

export interface SliceInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Slice insets for `UI.panel`. */
export const PANEL_INSETS: SliceInsets = { top: 8, right: 8, bottom: 8, left: 8 };

/** Slice insets for the three `UI.button_*` sprites. */
export const BUTTON_INSETS: SliceInsets = { top: 6, right: 6, bottom: 6, left: 6 };

/**
 * Paint a square of concentric rings. `lit` is used where the ring touches the
 * top or left edge, `dark` on the bottom or right, so the bevel reads as lit
 * from the top-left. Anything inside the last ring takes `fill`.
 */
function ringed(size: number, lit: readonly number[], dark: readonly number[], fill: number): Sprite {
  const s = createSprite(size, size, 0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (d >= lit.length) {
        put(s, x, y, fill);
        continue;
      }
      const onTopOrLeft = y === d || x === d;
      put(s, x, y, onTopOrLeft ? lit[d] : dark[d]);
    }
  }
  return s;
}

/** Dark wood behind brass: the frame every HUD box is drawn in. */
function panel(): Sprite {
  const lit = [C.ink, C.gold, C.goldDark, C.ink, C.wood, C.woodDark, C.woodDark, C.ink];
  const dark = [C.ink, C.goldDark, C.ink, C.ink, C.woodDark, C.ink, C.woodDark, C.ink];
  const s = ringed(24, lit, dark, C.woodDark);
  // a brass stud in each corner of the frame
  for (const [cx, cy] of [
    [4, 4],
    [19, 4],
    [4, 19],
    [19, 19],
  ] as Array<[number, number]>) {
    put(s, cx, cy, C.gold);
    put(s, cx + 1, cy, C.goldDark);
    put(s, cx, cy + 1, C.goldDark);
  }
  return s;
}

function button(face: number, shade: number, highlight: number, pressed: boolean): Sprite {
  const lit = pressed
    ? [C.ink, shade, shade, face, face, face]
    : [C.ink, highlight, face, face, face, face];
  const dark = pressed
    ? [C.ink, highlight, face, face, face, face]
    : [C.ink, shade, shade, face, face, face];
  return ringed(18, lit, dark, face);
}

// ---------------------------------------------------------------- clock

const CLOCK_SIZE = 96;

function clockFaceSprite(): Sprite {
  const s = createSprite(CLOCK_SIZE, CLOCK_SIZE, CLOCK_SIZE >> 1, CLOCK_SIZE >> 1, CLOCK_SIZE, CLOCK_SIZE);
  const c = CLOCK_SIZE / 2 - 0.5;

  fillCircle(s, c, c, 47, C.ink);
  fillCircle(s, c, c, 46, C.gold);
  fillCircle(s, c, c, 43, C.goldDark);
  fillCircle(s, c, c, 41, C.ink);
  fillCircle(s, c, c, 40, C.cream);
  // a soft inner shading so the dial is not a flat disc
  fillCircle(s, c + 3, c + 4, 36, C.creamShade);
  fillCircle(s, c, c, 34, C.cream);

  // twelve ticks, the quarters longer and squarer
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const quarter = h % 3 === 0;
    const outer = 38;
    const inner = quarter ? 29 : 33;
    const ox = c + Math.cos(a) * outer;
    const oy = c + Math.sin(a) * outer;
    const ix = c + Math.cos(a) * inner;
    const iy = c + Math.sin(a) * inner;
    line(s, Math.round(ix), Math.round(iy), Math.round(ox), Math.round(oy), C.ink);
    if (quarter) {
      line(s, Math.round(ix + Math.sin(a)), Math.round(iy - Math.cos(a)), Math.round(ox + Math.sin(a)), Math.round(oy - Math.cos(a)), C.ink);
      line(s, Math.round(ix - Math.sin(a)), Math.round(iy + Math.cos(a)), Math.round(ox - Math.sin(a)), Math.round(oy + Math.cos(a)), C.ink);
    }
  }

  // the maker's name, where a real dial would have it
  drawTextCentred(s, 0, Math.round(c) + 14, CLOCK_SIZE, 'JONES', C.goldDark, { spacing: 1 });

  // pivot boss
  fillCircle(s, c, c, 3, C.goldDark);
  fillCircle(s, c, c, 2, C.gold);
  put(s, Math.round(c) - 1, Math.round(c) - 1, C.white);
  return s;
}

/**
 * A hand pointing straight up, pivoting on its bottom-centre anchor. Tapered
 * from `baseW` at the pivot to a point, with a 1px ink outline.
 */
function clockHand(length: number, baseW: number, face: number): Sprite {
  const w = baseW + 4;
  const s = createSprite(w, length, w >> 1, length - 1, w, 1);
  const cx = w >> 1;
  for (let j = 0; j < length; j++) {
    const u = j / (length - 1);
    // full width for the first two thirds, then taper to the tip
    const half = Math.max(0, Math.round(((baseW - 1) / 2) * (u < 0.35 ? 1 : 1 - (u - 0.35) / 0.8)));
    const y = length - 1 - j;
    rect(s, cx - half, y, half * 2 + 1, 1, face);
    put(s, cx - half - 1, y, C.ink);
    put(s, cx + half + 1, y, C.ink);
    if (half > 0) put(s, cx + half, y, C.goldDark);
  }
  put(s, cx, 0, C.ink);
  // counterweight tail below the pivot reads as a real hand
  fillCircle(s, cx, length - 3, 2, face);
  for (let j = -2; j <= 2; j++) {
    const span = Math.floor(Math.sqrt(Math.max(0, 5 - j * j)));
    put(s, cx - span - 1, length - 3 + j, C.ink);
    put(s, cx + span + 1, length - 3 + j, C.ink);
  }
  return s;
}

// ---------------------------------------------------------------- icons

/* eslint-disable sort-keys */
const ICON_LEGEND: Record<string, number> = {
  K: C.ink,
  x: C.inkSoft,
  W: C.white,
  C: C.cream,
  R: C.red,
  r: C.redDark,
  Y: C.yellow,
  y: C.yellowDark,
  G: C.green,
  g: C.greenDark,
  B: C.blue,
  b: C.blueDark,
  O: C.orange,
  o: C.orangeDark,
  M: C.metal,
  m: C.metalDark,
  S: C.skin,
  w: C.wood,
  d: C.woodDark,
  A: C.gold,
  a: C.goldDark,
  L: C.leaf,
  s: C.stone,
  D: C.denim,
  Q: C.glass,
  q: C.glassDark,
};

/* prettier-ignore */
const ICON_ROWS: Record<string, string[]> = {
  health: [
    '............',
    '...KK..KK...',
    '..KRRKKRRK..',
    '.KRRRRRRRRK.',
    '.KRWRRRRRRK.',
    '.KRRRRRRRRK.',
    '..KrrrrrrK..',
    '...KrrrrK...',
    '....KrrK....',
    '.....KK.....',
    '............',
    '............',
  ],
  happiness: [
    '............',
    '...KKKKKK...',
    '..KYYYYYYK..',
    '.KYYYYYYYYK.',
    '.KYKKYYKKYK.',
    '.KYKKYYKKYK.',
    '.KYYYYYYYYK.',
    '.KYKYYYYKYK.',
    '.KYYKKKKYYK.',
    '..KyyyyyyK..',
    '...KKKKKK...',
    '............',
  ],
  education: [
    '............',
    '.....KK.....',
    '...KKbbKK...',
    '.KKbbbbbbKK.',
    'KbbbbbbbbbbK',
    '.KKbbbbbbKK.',
    '..KKbbbbKK.A',
    '...KbbbbK..A',
    '...KbbbbK..A',
    '...KKKKKK..A',
    '..........aA',
    '............',
  ],
  career: [
    '............',
    '....KKKK....',
    '...KwwwwK...',
    '.KKKKKKKKKK.',
    '.KwwwwwwwwK.',
    '.KwwwKKwwwK.',
    '.KwwwKKwwwK.',
    '.KddddddddK.',
    '.KddddddddK.',
    '.KKKKKKKKKK.',
    '............',
    '............',
  ],
  home: [
    '............',
    '.....KK.....',
    '....KRRK....',
    '...KRRRRK...',
    '..KRRRRRRK..',
    '.KRRRRRRRRK.',
    'KRrrrrrrrrRK',
    '.KCCCCCCCCK.',
    '.KCKKCCKKCK.',
    '.KCKKCCKKCK.',
    '.KKKKKKKKKK.',
    '............',
  ],
  food: [
    '............',
    '............',
    '..KKKKKKKK..',
    '.KOOWOOWOOK.',
    'KOOOOOOOOOOK',
    'KLLLLLLLLLLK',
    'KddddddddddK',
    'KOOOOOOOOOOK',
    '.KooooooooK.',
    '..KKKKKKKK..',
    '............',
    '............',
  ],
  bus: [
    '............',
    '.KKKKKKKKKK.',
    'KYYYYYYYYYYK',
    'KYBBKBBKBBYK',
    'KYBBKBBKBBYK',
    'KYYYYYYYYYYK',
    'KKKKKKKKKKKK',
    'KyyyyyyyyyyK',
    '.KKK....KKK.',
    '.KmK....KmK.',
    '..K......K..',
    '............',
  ],
  car: [
    '............',
    '............',
    '....KKKKK...',
    '...KQQQqKK..',
    '..KBQQQqBBK.',
    '.KBBBBBBBBBK',
    'KBBBBBBBBBBK',
    'KbbbbbbbbbbK',
    'KKKKKKKKKKKK',
    '..KmK..KmK..',
    '..KKK..KKK..',
    '............',
  ],
  walk: [
    '............',
    '....KKK.....',
    '...KSSSK....',
    '....KKK.....',
    '..KKKBKKK...',
    '.KSBBBBBSK..',
    '.KKBBBBBKK..',
    '...KBBBK....',
    '...KDKDK....',
    '..KD.KKDK...',
    '..KK..KKKK..',
    '.KK.....KK..',
  ],
};

/** Cash: a green note with the font's own dollar sign on it. */
function iconCash(): Sprite {
  const s = createSprite(12, 12, 0, 0, 12, 12);
  box(s, 0, 2, 12, 9, C.green, C.ink);
  hline(s, 1, 3, 10, C.leafLight);
  hline(s, 1, 9, 10, C.greenDark);
  box(s, 1, 3, 10, 7, -1, C.greenDark);
  drawTextCentred(s, 0, 3, 12, '$', C.white, { spacing: 0 });
  return s;
}

/** Clock: a plain ring with hands at ten past ten, for the time budget stat. */
function iconClock(): Sprite {
  const s = createSprite(12, 12, 0, 0, 12, 12);
  fillCircle(s, 5.5, 5.5, 5.5, C.ink);
  fillCircle(s, 5.5, 5.5, 4.5, C.white);
  fillCircle(s, 5.5, 5.5, 3.5, C.cream);
  line(s, 6, 6, 3, 3, C.ink);
  line(s, 6, 6, 9, 4, C.ink);
  put(s, 6, 6, C.red);
  put(s, 6, 1, C.ink);
  put(s, 6, 10, C.ink);
  put(s, 1, 6, C.ink);
  put(s, 10, 6, C.ink);
  return s;
}

/** Bicycle: two rings, a frame, handlebars and a saddle. */
function iconBike(): Sprite {
  const s = createSprite(12, 12, 0, 0, 12, 12);
  for (const wx of [2, 9]) {
    fillCircle(s, wx, 8, 2.5, C.ink);
    fillCircle(s, wx, 8, 1.2, 0);
    put(s, wx, 8, C.metalDark);
  }
  // frame
  line(s, 2, 8, 6, 8, C.metalDark);
  line(s, 2, 8, 5, 4, C.metalDark);
  line(s, 5, 4, 6, 8, C.metalDark);
  line(s, 5, 4, 9, 8, C.metalDark);
  // handlebars and saddle
  line(s, 8, 3, 10, 3, C.ink);
  line(s, 9, 3, 9, 8, C.metalDark);
  hline(s, 4, 3, 3, C.ink);
  put(s, 5, 4, C.ink);
  return s;
}

function fromRows(key: string): Sprite {
  const s = spriteFromRows(ICON_ROWS[key], ICON_LEGEND, { anchorX: 0, anchorY: 0, footprintW: 12, footprintH: 12 });
  return s;
}

// ---------------------------------------------------------------- catalogue

export const UI: SpriteMap = {
  ...CLASSIC_UI,

  panel: panel(),
  button_normal: button(C.gold, C.goldDark, C.yellow, false),
  button_hover: button(C.yellow, C.goldDark, C.white, false),
  button_pressed: button(C.goldDark, C.ink, C.gold, true),

  clock_face: clockFaceSprite(),
  clock_hand_hour: clockHand(40, 5, C.ink),
  clock_hand_minute: clockHand(44, 3, C.ink),

  icon_cash: iconCash(),
  icon_health: fromRows('health'),
  icon_happiness: fromRows('happiness'),
  icon_education: fromRows('education'),
  icon_career: fromRows('career'),
  icon_clock: iconClock(),
  icon_home: fromRows('home'),
  icon_food: fromRows('food'),
  icon_bus: fromRows('bus'),
  icon_car: fromRows('car'),
  icon_bike: iconBike(),
  icon_walk: fromRows('walk'),
};

/** The twelve HUD stat icons, in the order the HUD lays them out. */
export const ICON_KEYS = [
  'icon_cash',
  'icon_health',
  'icon_happiness',
  'icon_education',
  'icon_career',
  'icon_clock',
  'icon_home',
  'icon_food',
  'icon_bus',
  'icon_car',
  'icon_bike',
  'icon_walk',
] as const;
