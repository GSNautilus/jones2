/**
 * The player figure: 12x20, four facings, three walk frames each.
 *
 * These are hand-placed pixels rather than generated shapes — at twelve pixels
 * across, every one counts. Rows 0-14 are the body (one grid per facing) and
 * rows 15-19 are the legs (one grid per walk frame).
 *
 * The shirt is painted in the reserved `shirtKey` palette index; `tintCharacter`
 * swaps it for a player colour, so one set of sprites serves everyone.
 */
import { C, SHIRT_KEY } from '../palette';
import type { Sprite, SpriteMap } from '../types';
import { cloneSprite, createSprite, drawRows, tint } from '../surface';

export const FIGURE_W = 12;
export const FIGURE_H = 20;

export type Facing = 's' | 'n' | 'e' | 'w';

/* eslint-disable sort-keys */
const LEGEND: Record<string, number> = {
  K: C.ink,
  k: C.inkSoft,
  S: C.skin,
  s: C.skinShade,
  H: C.hair,
  h: C.trunkDark,
  W: C.white,
  T: SHIRT_KEY,
  D: C.denim,
  d: C.denimDark,
  B: C.trunkDark,
};

/* prettier-ignore */
const BODY: Record<'s' | 'n' | 'e', string[]> = {
  s: [
    '...KKKKKK...',
    '..KHHHHHHK..',
    '..KHHHHHHK..',
    '..KHSSSSHK..',
    '..KSKSSKSK..',
    '..KSSSSSSK..',
    '..KSsSSsSK..',
    '..KKSSSSKK..',
    '.KTTTWWTTTK.',
    'KTTTTWWTTTTK',
    'KTTTTTTTTTTK',
    'KTTTTTTTTTTK',
    'KTTkTTTTkTTK',
    'KSKTTTTTTKSK',
    '.KkTTTTTTkK.',
  ],
  n: [
    '...KKKKKK...',
    '..KHHHHHHK..',
    '..KHHHHHHK..',
    '..KHHHHHHK..',
    '..KHhhhhHK..',
    '..KHHHHHHK..',
    '..KHHHHHHK..',
    '..KKSSSSKK..',
    '.KTTTTTTTTK.',
    'KTTTTTTTTTTK',
    'KTTTTTTTTTTK',
    'KTTTTTTTTTTK',
    'KTTkTTTTkTTK',
    'KSKTTTTTTKSK',
    '.KkTTTTTTkK.',
  ],
  e: [
    '...KKKKK....',
    '..KHHHHHK...',
    '..KHHHHHSK..',
    '..KHHSSSSK..',
    '..KHHSKSSSK.',
    '..KHHSSSSSK.',
    '..KKHSSSsK..',
    '...KKSSSKK..',
    '..KWWTTTTK..',
    '..KTTTTTTK..',
    '..KTTTTTTK..',
    '..KTTTTTTK..',
    '..KTTTTTkK..',
    '..KTTTTSSK..',
    '..KkTTTTkK..',
  ],
};

/** Row 13 of the profile body, swinging the near arm with the stride. */
/* prettier-ignore */
const ARM_E: string[] = [
  '..KTTTTSSK..',
  '..KTTSSKK...',
  '..KTTTTTSSK.',
];

/* prettier-ignore */
const LEGS_FRONT: string[][] = [
  [
    '..KDDDdddK..',
    '..KDDKKddK..',
    '..KDDKKddK..',
    'KBBBBKKBBBBK',
    '.KKKK..KKKK.',
  ],
  [
    '..KDDDdddK..',
    '..KDDKKddK..',
    '.KBBBKKddK..',
    '.KKKK.KBBBBK',
    '.......KKKK.',
  ],
  [
    '..KDDDdddK..',
    '..KDDKKddK..',
    '..KDDKKBBBK.',
    'KBBBBK.KKKK.',
    '.KKKK.......',
  ],
];

/* prettier-ignore */
const LEGS_SIDE: string[][] = [
  [
    '..KDDDdddK..',
    '..KDDDdddK..',
    '..KDDDdddK..',
    '.KBBBBBBK...',
    '.KKKKKKKK...',
  ],
  [
    '..KDDDdddK..',
    '.KDDKKdddK..',
    'KDDK..KdddK.',
    'KBBBK.KBBBBK',
    '.KKKK..KKKKK',
  ],
  [
    '..KDDDdddK..',
    '..KDDDKKddK.',
    '.KDDDK..KddK',
    'KBBBBK.KBBBK',
    '.KKKKK..KKKK',
  ],
];

function figure(dir: 's' | 'n' | 'e', frameIndex: number): Sprite {
  const s = createSprite(FIGURE_W, FIGURE_H, 6, FIGURE_H - 1, 8, 4);
  const body = BODY[dir].slice();
  if (dir === 'e') body[13] = ARM_E[frameIndex];
  drawRows(s, 0, 0, body, LEGEND);
  drawRows(s, 0, 15, (dir === 'e' ? LEGS_SIDE : LEGS_FRONT)[frameIndex], LEGEND);
  return s;
}

function flipX(s: Sprite): Sprite {
  const out = cloneSprite(s);
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) {
      out.pixels[y * s.width + x] = s.pixels[y * s.width + (s.width - 1 - x)];
    }
  }
  out.anchorX = s.width - 1 - s.anchorX;
  return out;
}

const sprites: SpriteMap = {};
for (const dir of ['s', 'n', 'e'] as const) {
  for (let f = 0; f < 3; f++) sprites[`walk_${dir}_${f}`] = figure(dir, f);
  sprites[`idle_${dir}`] = figure(dir, 0);
}
for (let f = 0; f < 3; f++) sprites[`walk_w_${f}`] = flipX(sprites[`walk_e_${f}`] as Sprite);
sprites.idle_w = flipX(sprites.idle_e as Sprite);

export const CHARACTERS: SpriteMap = sprites;

/** Swap the reserved shirt index for a player's colour. */
export function tintCharacter(sprite: Sprite, shirtIndex: number): Sprite {
  return tint(sprite, SHIRT_KEY, shirtIndex);
}

/** Frame name for a facing and animation step. */
export function walkFrame(dir: Facing, step: number): string {
  return `walk_${dir}_${((step % 3) + 3) % 3}`;
}
