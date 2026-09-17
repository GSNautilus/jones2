/**
 * The thirteen clerk portraits, one per classic location.
 *
 * Each is a `PortraitSpec` — proportions, colouring and a list of features —
 * assembled by `buildPortrait` in a fixed order: background, torso, neck, head,
 * ears, hair, face, eyewear, hat, then whatever is peculiar to that person.
 * Every portrait is exactly PORTRAIT_W x PORTRAIT_H so the location window can
 * reserve one box for all of them.
 */
import { C } from '../palette';
import type { Sprite, SpriteMap } from '../types';
import { fillCircle, hline, put, rect, vline } from '../surface';
import {
  blankPortrait,
  drawEars,
  drawHead,
  drawNeck,
  faceR,
  makeGeom,
  type Geom,
  type Jaw,
  type Tone,
} from './head';
import {
  drawBeard,
  drawBrows,
  drawEyes,
  drawGlasses,
  drawMouth,
  drawNose,
  type BeardStyle,
  type BrowStyle,
  type EyeStyle,
  type GlassStyle,
  type MouthStyle,
  type NoseStyle,
} from './features';
import { drawHair, drawHat, drawTorso, type HairSpec, type HatStyle, type TorsoSpec } from './dress';

export interface PortraitSpec {
  bg: number;
  tone: Tone;
  headW?: number;
  headH?: number;
  jaw?: Jaw;
  turn?: number;
  eyeGap?: number;
  hair: HairSpec;
  hat?: { style: HatStyle; main: number; trim: number };
  brow: BrowStyle;
  browColor?: number;
  eyes: EyeStyle;
  nose: NoseStyle;
  mouth: MouthStyle;
  lip?: number;
  beard?: BeardStyle;
  glasses?: GlassStyle;
  frame?: number;
  torso: TorsoSpec;
  ears?: boolean;
  /** Anything only this person has: earrings, a headset, a loupe strap. */
  extra?: (g: Geom, t: Sprite) => void;
}

export function buildPortrait(spec: PortraitSpec): Sprite {
  const g = makeGeom({
    tone: spec.tone,
    headW: spec.headW,
    headH: spec.headH,
    jaw: spec.jaw,
    turn: spec.turn,
    eyeGap: spec.eyeGap,
  });
  const t = blankPortrait(spec.bg);
  drawTorso(g, t, spec.torso);
  drawNeck(g, t, Math.round(g.headW * 0.19));
  drawHead(g, t);
  if (spec.ears !== false) drawEars(g, t);
  drawHair(g, t, spec.hair);
  drawBrows(g, t, spec.brow, spec.browColor ?? spec.hair.shade);
  drawEyes(g, t, spec.eyes);
  drawNose(g, t, spec.nose);
  drawMouth(g, t, spec.mouth, spec.lip ?? C.ink);
  drawBeard(g, t, spec.beard ?? 'none', spec.hair.color, spec.hair.shade);
  drawGlasses(g, t, spec.glasses ?? 'none', spec.frame ?? C.ink);
  if (spec.hat) drawHat(g, t, spec.hat.style, spec.hat.main, spec.hat.trim);
  spec.extra?.(g, t);
  return t;
}

// ---------------------------------------------------------------- extras

/** Hoop earrings hanging off both ears. */
function earrings(color: number): (g: Geom, t: Sprite) => void {
  return (g, t) => {
    const y = g.eyesY + 6;
    for (const side of [-1, 1] as const) {
      const x = g.cx + side * (faceR(g, y) + 2);
      fillCircle(t, x, y + 3, 3, C.ink);
      fillCircle(t, x, y + 3, 2, color);
      fillCircle(t, x, y + 3, 1, C.ink);
      put(t, x - 1, y + 2, C.white);
      put(t, x, y, color);
    }
  };
}

/** A pearl string across the collar. */
function pearls(g: Geom, t: Sprite): void {
  const y = g.shoulderY + 4;
  for (let i = -5; i <= 5; i++) {
    const dy = Math.abs(i) > 3 ? -1 : 0;
    put(t, g.cx + i * 2, y + dy, C.white);
    put(t, g.cx + i * 2 + 1, y + dy, C.creamShade);
  }
}

/** Telesales headset: a band over the crown and a boom mic to the mouth. */
function headset(g: Geom, t: Sprite): void {
  const top = Math.floor(g.crownY - g.crownRY) - 1;
  for (let x = g.cx - 14; x <= g.cx + 14; x++) {
    const d = (x - g.cx) / 14;
    const y = top + Math.round(6 * d * d);
    put(t, x, y, C.ink);
    put(t, x, y + 1, C.metal);
  }
  const ey = g.eyesY + 1;
  for (const side of [-1, 1] as const) {
    const x = g.cx + side * (faceR(g, ey) + 2);
    rect(t, x - 2, ey - 3, 5, 7, C.ink);
    rect(t, x - 1, ey - 2, 3, 5, C.slate);
    put(t, x, ey, C.metal);
  }
  const bx = g.cx + faceR(g, ey) + 1;
  for (let i = 0; i < 9; i++) put(t, bx - i, ey + 4 + Math.round(i * 0.75), C.ink);
  fillCircle(t, bx - 9, ey + 11, 2, C.ink);
  put(t, bx - 9, ey + 11, C.metal);
}

/** A stubby cigar clamped in the corner of the mouth. */
function cigar(g: Geom, t: Sprite): void {
  const y = g.mouthY + 1;
  const x = g.cx + 5;
  rect(t, x, y - 1, 10, 4, C.ink);
  rect(t, x + 1, y, 8, 2, C.woodDark);
  rect(t, x + 7, y, 2, 2, C.orange);
  put(t, x + 9, y, C.yellow);
  put(t, x + 2, y, C.wood);
}

// ---------------------------------------------------------------- the cast

const SPECS: Record<string, PortraitSpec> = {
  /** ACNE Employment: a bored civil servant who has read your file already. */
  employment: {
    bg: C.slate,
    tone: { face: C.skin, shade: C.skinShade },
    jaw: 'square',
    headW: 29,
    turn: -1,
    eyeGap: 7,
    hair: { style: 'receding', color: C.stoneDark, shade: C.inkSoft, light: C.stone },
    brow: 'flat',
    browColor: C.stoneDark,
    eyes: 'tired',
    nose: 'long',
    mouth: 'flat',
    beard: 'moustache',
    glasses: 'square',
    torso: { style: 'suit', main: C.slateDark, shade: C.ink, accent: C.white, tie: C.redDark },
  },

  /** Monolith Burger: a teenager in a paper hat who means every word of it. */
  monolith: {
    bg: C.orangeDark,
    tone: { face: C.cream, shade: C.creamShade },
    jaw: 'round',
    headH: 33,
    eyeGap: 6,
    hair: { style: 'crop', color: C.orange, shade: C.orangeDark },
    hat: { style: 'paper', main: C.white, trim: C.red },
    brow: 'thick',
    browColor: C.orangeDark,
    eyes: 'normal',
    nose: 'button',
    mouth: 'grin',
    torso: { style: 'stripe', main: C.white, shade: C.creamShade, accent: C.red, badge: C.yellow },
    extra: (g, t) => {
      // freckles across the nose and cheeks
      for (const [dx, dy] of [
        [-7, 1],
        [-5, 3],
        [-9, 3],
        [6, 1],
        [8, 3],
        [4, 3],
      ] as Array<[number, number]>) {
        put(t, g.cx + dx, g.noseY - 4 + dy, C.sandDark);
      }
    },
  },

  /** Z-Mart: cheerful, overworked, wearing the blue smock and a name tag. */
  zmart: {
    bg: C.teal,
    tone: { face: C.sand, shade: C.sandDark },
    jaw: 'oval',
    turn: 1,
    eyeGap: 6,
    hair: { style: 'curly', color: C.inkSoft, shade: C.ink, light: C.slate },
    brow: 'raised',
    browColor: C.ink,
    eyes: 'normal',
    nose: 'broad',
    mouth: 'smile',
    torso: { style: 'vest', main: C.blue, shade: C.blueDark, accent: C.white, badge: C.red },
  },

  /** QT Clothing: sells anything to anyone, and dresses the part. */
  qt_clothing: {
    bg: C.purple,
    tone: { face: C.skin, shade: C.skinShade },
    jaw: 'narrow',
    headW: 26,
    turn: -1,
    eyeGap: 5,
    hair: { style: 'updo', color: C.gold, shade: C.goldDark, light: C.yellow },
    brow: 'arched',
    browColor: C.goldDark,
    eyes: 'wide',
    nose: 'small',
    mouth: 'smirk',
    lip: C.red,
    torso: { style: 'suit', main: C.pink, shade: C.maroon, accent: C.white },
    extra: earrings(C.gold),
  },

  /** Socket City: a commission salesman with a headset and a loud bow tie. */
  socket_city: {
    bg: C.blueDark,
    tone: { face: C.skinShade, shade: C.wood },
    jaw: 'oval',
    headW: 27,
    eyeGap: 6,
    hair: { style: 'slick', color: C.ink, shade: C.inkSoft, light: C.inkSoft },
    brow: 'angry',
    browColor: C.ink,
    eyes: 'narrow',
    nose: 'hook',
    mouth: 'grin',
    beard: 'thin_tache',
    torso: { style: 'stripe', main: C.yellow, shade: C.yellowDark, accent: C.blue, tie: C.red },
    extra: headset,
  },

  /** Black's Market: thirty years on the checkout and every minute shows. */
  blacks_market: {
    bg: C.greenDark,
    tone: { face: C.skin, shade: C.skinShade },
    jaw: 'round',
    headW: 29,
    turn: 1,
    eyeGap: 7,
    hair: { style: 'bun', color: C.stone, shade: C.stoneDark, light: C.white },
    brow: 'flat',
    browColor: C.stoneDark,
    eyes: 'tired',
    nose: 'button',
    mouth: 'flat',
    glasses: 'halfmoon',
    frame: C.inkSoft,
    torso: { style: 'apron', main: C.green, shade: C.greenDark, accent: C.cream },
  },

  /** Hi-Tech U: the professor, mostly hair, entirely certain. */
  university: {
    bg: C.purpleDark,
    tone: { face: C.cream, shade: C.creamShade },
    jaw: 'narrow',
    headW: 27,
    headH: 33,
    eyeGap: 5,
    hair: { style: 'wild', color: C.white, shade: C.stone, light: C.white },
    brow: 'thick',
    browColor: C.stone,
    eyes: 'bright',
    nose: 'long',
    mouth: 'smile',
    beard: 'beard',
    glasses: 'round',
    torso: { style: 'vest', main: C.olive, shade: C.oliveDark, accent: C.cream, tie: C.maroon },
  },

  /** P.I.G.G.Y. Bank: the teller, immaculate, takes very little interest. */
  bank: {
    bg: C.slateDark,
    tone: { face: C.wood, shade: C.woodDark },
    jaw: 'oval',
    headW: 27,
    turn: -1,
    eyeGap: 6,
    hair: { style: 'bob', color: C.ink, shade: C.ink, light: C.inkSoft },
    brow: 'arched',
    browColor: C.ink,
    eyes: 'normal',
    nose: 'small',
    mouth: 'pursed',
    lip: C.maroon,
    torso: { style: 'suit', main: C.blueDark, shade: C.ink, accent: C.white },
    extra: pearls,
  },

  /** The Factory: the foreman, hard hat on, already unimpressed. */
  factory: {
    bg: C.metalDark,
    tone: { face: C.sand, shade: C.sandDark },
    jaw: 'square',
    headW: 31,
    headH: 33,
    eyeGap: 7,
    hair: { style: 'crop', color: C.trunkDark, shade: C.ink },
    hat: { style: 'hard', main: C.yellow, trim: C.yellowDark },
    brow: 'thick',
    browColor: C.ink,
    eyes: 'narrow',
    nose: 'broad',
    mouth: 'frown',
    beard: 'moustache',
    torso: { style: 'shirt', main: C.denim, shade: C.denimDark, accent: C.white },
    extra: (g, t) => {
      // a day's stubble along the jaw under the moustache
      for (let y = g.mouthY + 2; y <= g.chinY; y++) {
        const r = faceR(g, y);
        for (let x = g.cx - r; x <= g.cx + r; x++) if ((x + y) % 3 === 0) put(t, x, y, g.tone.shade);
      }
    },
  },

  /** The Pawn Shop: gaunt, loupe down, pricing your watch already. */
  pawn: {
    bg: C.oliveDark,
    tone: { face: C.skinShade, shade: C.wood },
    jaw: 'narrow',
    headW: 26,
    headH: 35,
    turn: 1,
    eyeGap: 5,
    hair: { style: 'bald', color: C.stoneDark, shade: C.inkSoft, light: C.stone },
    brow: 'angry',
    browColor: C.stoneDark,
    eyes: 'beady',
    nose: 'hook',
    mouth: 'smirk',
    beard: 'goatee',
    glasses: 'loupe',
    torso: { style: 'vest', main: C.ink, shade: C.inkSoft, accent: C.cream, tie: C.maroon },
  },

  /** Rent Office: fat, loud jacket, tells you not to snivel. */
  rent_office: {
    bg: C.brickDark,
    tone: { face: C.skin, shade: C.skinShade },
    jaw: 'square',
    headW: 33,
    headH: 33,
    turn: -1,
    eyeGap: 8,
    hair: { style: 'comb_over', color: C.inkSoft, shade: C.ink, light: C.inkSoft },
    brow: 'angry',
    browColor: C.ink,
    eyes: 'beady',
    nose: 'broad',
    mouth: 'frown',
    torso: { style: 'plaid', main: C.orangeDark, shade: C.maroon, accent: C.orange, tie: C.teal },
    extra: (g, t) => {
      // heavy jowls, then the cigar
      for (let y = g.mouthY; y <= g.chinY; y++) {
        const r = faceR(g, y);
        vline(t, g.cx - r + 1, y, 1, g.tone.shade);
        vline(t, g.cx + r - 2, y, 1, g.tone.shade);
      }
      hline(t, g.cx - 8, g.mouthY + 4, 17, g.tone.shade);
      cigar(g, t);
    },
  },

  /** Low-Cost Housing: the caretaker, unshaven, holding a grudge and a cap. */
  lowcost: {
    bg: C.woodDark,
    tone: { face: C.sand, shade: C.sandDark },
    jaw: 'oval',
    headW: 28,
    turn: 1,
    eyeGap: 6,
    hair: { style: 'scruff', color: C.stoneDark, shade: C.inkSoft, light: C.stone },
    hat: { style: 'flat', main: C.olive, trim: C.oliveDark },
    brow: 'flat',
    browColor: C.stoneDark,
    eyes: 'narrow',
    nose: 'broad',
    mouth: 'smirk',
    beard: 'stubble',
    torso: { style: 'plaid', main: C.maroon, shade: C.ink, accent: C.brickDark },
  },

  /** Security Apartments: the doorman, braided and correct. */
  security_apts: {
    bg: C.blue,
    tone: { face: C.trunk, shade: C.trunkDark },
    jaw: 'oval',
    headW: 28,
    eyeGap: 7,
    hair: { style: 'crop', color: C.stone, shade: C.stoneDark },
    hat: { style: 'peaked', main: C.maroon, trim: C.gold },
    brow: 'flat',
    browColor: C.stone,
    eyes: 'normal',
    nose: 'broad',
    mouth: 'smile',
    beard: 'sideburns',
    torso: { style: 'uniform', main: C.maroon, shade: C.ink, accent: C.gold },
  },
};

/** The classic location ids, in the order the contact sheet lays them out. */
export const PORTRAIT_KEYS = [
  'employment',
  'monolith',
  'zmart',
  'qt_clothing',
  'socket_city',
  'blacks_market',
  'university',
  'bank',
  'factory',
  'pawn',
  'rent_office',
  'lowcost',
  'security_apts',
] as const;

/** Clerk portraits keyed by classic location id. */
export const PORTRAITS: SpriteMap = Object.fromEntries(
  PORTRAIT_KEYS.map((id) => [id, buildPortrait(SPECS[id])]),
);

/** The spec a portrait was built from, for tools that want to vary it. */
export const PORTRAIT_SPECS: Readonly<Record<string, PortraitSpec>> = SPECS;
