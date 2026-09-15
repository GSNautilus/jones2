/**
 * Street furniture and vehicles — the things the layout scatters between the
 * buildings. Like nature, every prop anchors at the bottom centre of its
 * footprint so it can be dropped at a world position.
 *
 * Vehicles are drawn three-quarters from the side (a shallow roof over a long
 * flank) rather than true top-down, so they sit in the same tilted projection
 * as the buildings.
 */
import { C } from '../palette';
import type { Sprite, SpriteMap } from '../types';
import { box, createSprite, dither, hline, line, put, rect, vline, type Target } from '../surface';
import { outlineSilhouette } from '../parts/common';

/** Small dithered contact shadow under a prop. */
function shadow(t: Target, x: number, y: number, w: number): void {
  dither(t, x, y, w, 2, C.shadow, -1, 0);
}

function prop(w: number, h: number, footprintW = w, footprintH = 4): Sprite {
  return createSprite(w, h, w >> 1, h - 1, footprintW, footprintH);
}

// ---------------------------------------------------------------- vehicles

/** Wheels: two dark blocks with a lighter hub, sitting on the ground line. */
function wheels(t: Target, baseY: number, front: number, back: number, w = 4, h = 3): void {
  for (const wx of [front, back]) {
    rect(t, wx, baseY - h + 1, w, h, C.ink);
    rect(t, wx + 1, baseY - h + 2, w - 2, h - 2, C.inkSoft);
    put(t, wx + 1, baseY - h + 2, C.metal);
    hline(t, wx + 1, baseY, w - 2, C.ink);
  }
}

function car(face: number, shade: number): Sprite {
  const W = 20;
  const H = 12;
  const t = prop(W, H, 18, 3);
  const baseY = H - 2;
  shadow(t, 1, H - 2, 18);

  // cabin
  rect(t, 6, 1, 8, 3, C.glass);
  rect(t, 9, 2, 5, 2, C.glassDark);
  put(t, 7, 2, C.white);
  box(t, 5, 1, 10, 4, -1, C.ink);
  line(t, 5, 4, 3, 4, C.ink);
  line(t, 15, 4, 17, 4, C.ink);

  // body
  rect(t, 2, 4, 16, 4, face);
  hline(t, 2, 4, 16, face);
  hline(t, 1, 5, 18, face);
  rect(t, 1, 7, 18, 1, shade);
  vline(t, 18, 5, 3, shade);
  box(t, 1, 4, 18, 4, -1, C.ink);
  hline(t, 1, 8, 18, C.ink);

  // lights and a door seam
  put(t, 18, 6, C.yellow);
  put(t, 1, 6, C.red);
  vline(t, 10, 5, 3, shade);

  wheels(t, baseY, 3, 13);
  return t;
}

function bus(): Sprite {
  const W = 36;
  const H = 18;
  const t = prop(W, H, 34, 3);
  const baseY = H - 2;
  shadow(t, 1, H - 2, 34);

  // body: a tall slab about two thirds of a storey high, nose to the right
  rect(t, 1, 1, 34, 12, C.yellow);
  rect(t, 1, 10, 34, 3, C.yellowDark);
  vline(t, 34, 2, 11, C.yellowDark);
  box(t, 1, 1, 34, 12, -1, C.ink);
  // knock the top corners off so it is not a plain box
  put(t, 1, 1, 0);
  put(t, 34, 1, 0);
  put(t, 2, 1, C.ink);
  put(t, 33, 1, C.ink);
  put(t, 1, 2, C.ink);
  put(t, 34, 2, C.ink);

  // two long passenger windows, the folding door, then the windscreen
  for (const wx of [3, 12]) {
    rect(t, wx, 3, 8, 6, C.slate);
    for (let j = 0; j < 6; j++) rect(t, wx + 8 - j - 1, 3 + j, j + 1, 1, C.slateDark);
    put(t, wx + 1, 4, C.white);
    put(t, wx + 2, 4, C.white);
    box(t, wx, 3, 8, 6, -1, C.ink);
  }
  box(t, 22, 3, 4, 8, C.slateDark, C.ink);
  rect(t, 23, 4, 2, 5, C.slate);
  vline(t, 24, 4, 5, C.slateDark);
  rect(t, 28, 3, 6, 6, C.slate);
  for (let j = 0; j < 6; j++) rect(t, 28 + 6 - j - 1, 3 + j, j + 1, 1, C.slateDark);
  put(t, 29, 4, C.white);
  box(t, 28, 3, 6, 6, -1, C.ink);

  // waistline stripe, bumper, lights
  hline(t, 2, 9, 32, C.ink);
  rect(t, 1, 12, 34, 1, C.ink);
  put(t, 34, 11, C.white);
  put(t, 33, 11, C.white);
  put(t, 1, 11, C.red);
  put(t, 2, 11, C.red);

  wheels(t, baseY, 5, 25, 7, 5);
  return t;
}

// ---------------------------------------------------------------- furniture

function lamp(): Sprite {
  const W = 11;
  const H = 30;
  const t = prop(W, H, 6, 3);
  const cx = 4;
  shadow(t, 1, H - 2, 7);

  // post
  rect(t, cx, 6, 2, H - 8, C.metalDark);
  vline(t, cx, 6, H - 8, C.metal);
  box(t, cx, 6, 2, H - 8, -1, C.ink);
  // splayed base
  rect(t, cx - 2, H - 4, 6, 2, C.metalDark);
  box(t, cx - 2, H - 4, 6, 2, -1, C.ink);
  // arm out to the right
  line(t, cx + 1, 6, cx + 4, 3, C.metalDark);
  line(t, cx + 1, 7, cx + 4, 4, C.ink);
  // lantern
  box(t, cx + 3, 3, 5, 5, C.yellow, C.ink);
  hline(t, cx + 4, 4, 3, C.white);
  put(t, cx + 5, 8, C.yellowDark);
  // glow
  put(t, cx + 2, 5, C.yellowDark);
  put(t, cx + 8, 5, C.yellowDark);
  return t;
}

function bench(): Sprite {
  const W = 20;
  const H = 13;
  const t = prop(W, H, 18, 3);
  shadow(t, 2, H - 2, 16);

  // back slats
  for (const y of [1, 4]) {
    rect(t, 2, y, 16, 2, C.wood);
    hline(t, 2, y + 1, 16, C.woodDark);
    box(t, 2, y, 16, 2, -1, C.ink);
  }
  // seat
  rect(t, 1, 7, 18, 2, C.wood);
  hline(t, 1, 8, 18, C.woodDark);
  box(t, 1, 7, 18, 2, -1, C.ink);
  // cast-iron ends
  for (const lx of [2, 16]) {
    vline(t, lx, 1, 10, C.metalDark);
    vline(t, lx, 1, 1, C.ink);
    vline(t, lx + 1, 9, 3, C.metalDark);
    put(t, lx, H - 2, C.ink);
    put(t, lx + 1, H - 2, C.ink);
  }
  return t;
}

function picnicTable(): Sprite {
  const W = 24;
  const H = 16;
  const t = prop(W, H, 22, 4);
  shadow(t, 2, H - 2, 20);

  // table top, seen slightly from above
  rect(t, 2, 2, 20, 4, C.wood);
  hline(t, 2, 2, 20, C.cream);
  hline(t, 2, 5, 20, C.woodDark);
  for (let i = 5; i < 20; i += 5) vline(t, 2 + i, 3, 3, C.woodDark);
  box(t, 2, 2, 20, 4, -1, C.ink);

  // benches either side
  for (const [by, bx, bw] of [
    [9, 0, 24],
    [7, 3, 18],
  ] as Array<[number, number, number]>) {
    rect(t, bx, by, bw, 2, C.wood);
    hline(t, bx, by + 1, bw, C.woodDark);
    box(t, bx, by, bw, 2, -1, C.ink);
  }
  // A-frame legs
  for (const lx of [5, 17]) {
    line(t, lx, 6, lx - 3, H - 2, C.woodDark);
    line(t, lx, 6, lx + 3, H - 2, C.woodDark);
    line(t, lx + 1, 6, lx - 2, H - 2, C.ink);
    line(t, lx + 1, 6, lx + 4, H - 2, C.ink);
  }
  return t;
}

function signpost(): Sprite {
  const W = 16;
  const H = 26;
  const t = prop(W, H, 6, 3);
  const cx = 6;
  shadow(t, 3, H - 2, 7);

  rect(t, cx, 3, 2, H - 5, C.wood);
  vline(t, cx + 1, 3, H - 5, C.woodDark);
  box(t, cx, 3, 2, H - 5, -1, C.ink);

  // two pointed blades, one each way
  const blade = (y: number, dir: 1 | -1): void => {
    const x0 = dir === 1 ? cx : cx - 7;
    box(t, x0, y, 9, 6, C.cream, C.ink);
    hline(t, x0 + 1, y + 1, 7, C.white);
    hline(t, x0 + 1, y + 3, 5, C.stoneDark);
    const tipX = dir === 1 ? x0 + 8 : x0;
    for (let j = 0; j < 3; j++) {
      put(t, tipX + dir * j, y + j, C.ink);
      put(t, tipX + dir * j, y + 5 - j, C.ink);
    }
  };
  blade(4, 1);
  blade(12, -1);
  return t;
}

function hydrant(): Sprite {
  const W = 9;
  const H = 12;
  const t = prop(W, H, 7, 3);
  shadow(t, 1, H - 2, 7);

  box(t, 3, 2, 4, 8, C.red, C.ink);
  vline(t, 5, 3, 7, C.redDark);
  vline(t, 6, 3, 7, C.redDark);
  // cap
  box(t, 2, 0, 6, 3, C.red, C.ink);
  hline(t, 3, 1, 4, C.white);
  // side nozzles
  put(t, 2, 5, C.redDark);
  put(t, 7, 5, C.redDark);
  put(t, 1, 5, C.ink);
  put(t, 8, 5, C.ink);
  // base flange
  box(t, 1, H - 3, 8, 2, C.redDark, C.ink);
  return t;
}

function mailbox(): Sprite {
  const W = 12;
  const H = 18;
  const t = prop(W, H, 9, 3);
  shadow(t, 2, H - 2, 9);

  // legs
  for (const lx of [4, 7]) {
    vline(t, lx, 11, 6, C.metalDark);
    put(t, lx, H - 2, C.ink);
  }
  // domed body
  rect(t, 2, 4, 8, 8, C.blue);
  for (let j = 0; j < 3; j++) {
    const half = 2 + j;
    rect(t, 6 - half, 1 + j, half * 2, 1, C.blue);
    put(t, 6 - half - 1, 1 + j, C.ink);
    put(t, 6 + half, 1 + j, C.ink);
  }
  rect(t, 7, 4, 3, 8, C.blueDark);
  box(t, 2, 4, 8, 8, -1, C.ink);
  hline(t, 3, 4, 6, C.blue);
  // posting slot and flag
  rect(t, 3, 6, 6, 2, C.ink);
  hline(t, 3, 6, 6, C.slateDark);
  put(t, 10, 5, C.red);
  put(t, 10, 6, C.red);
  hline(t, 1, H - 3, 10, C.pavingDark);
  hline(t, 1, H - 2, 10, C.ink);
  return t;
}

/** One 16px run of picket fence, drawn to butt seamlessly against the next. */
function fenceH(): Sprite {
  const W = 16;
  const H = 14;
  const t = prop(W, H, 16, 2);
  shadow(t, 0, H - 2, 16);
  for (let i = 0; i < W; i += 4) {
    rect(t, i, 2, 3, H - 4, C.white);
    vline(t, i + 2, 3, H - 5, C.creamShade);
    box(t, i, 2, 3, H - 4, -1, C.ink);
    put(t, i + 1, 1, C.white);
    put(t, i, 2, C.ink);
    put(t, i + 2, 2, C.ink);
    put(t, i + 1, 1, C.ink);
  }
  for (const ry of [5, 10]) {
    hline(t, 0, ry, W, C.creamShade);
    hline(t, 0, ry + 1, W, C.ink);
  }
  return t;
}

/** A fence running away from the viewer: three posts receding up and left. */
function fenceV(): Sprite {
  const W = 14;
  const H = 20;
  const t = prop(W, H, 12, 10);
  shadow(t, 1, H - 2, 12);
  // rails first, so the posts sit in front of them
  for (const [y0, y1] of [
    [9, 4],
    [14, 8],
  ] as Array<[number, number]>) {
    line(t, 11, y0, 1, y1, C.white);
    line(t, 11, y0 + 1, 1, y1 + 1, C.ink);
  }
  // posts: nearest is tallest and lowest
  for (const [px, top, bottom] of [
    [10, 4, 18],
    [5, 2, 13],
    [0, 0, 9],
  ] as Array<[number, number, number]>) {
    box(t, px, top, 3, bottom - top, C.white, C.ink);
    vline(t, px + 2, top + 1, bottom - top - 2, C.creamShade);
  }
  return t;
}

/** A short timber jetty running out over the water — the lakeside cottage. */
function dock(): Sprite {
  const W = 30;
  const H = 18;
  const t = prop(W, H, 28, 6);

  // water behind and under the deck
  rect(t, 0, 10, W, H - 10, C.water);
  for (let k = 0; k < 4; k++) hline(t, 2 + k * 7, 13 + (k & 1) * 3, 5, C.waterLight);
  hline(t, 4, 16, 7, C.waterDark);
  hline(t, 18, 15, 6, C.waterDark);

  // piles, dropping into the water
  for (const px of [3, 13, 23]) {
    rect(t, px, 10, 3, 7, C.woodDark);
    vline(t, px, 10, 7, C.wood);
    box(t, px, 10, 3, 7, -1, C.ink);
    hline(t, px - 1, 16, 5, C.waterLight);
  }

  // deck: planks running out to the right, lit along the near edge
  rect(t, 1, 4, 28, 7, C.wood);
  hline(t, 1, 4, 28, C.cream);
  hline(t, 1, 10, 28, C.woodDark);
  for (let i = 4; i < 28; i += 4) vline(t, 1 + i, 5, 5, C.woodDark);
  box(t, 1, 4, 28, 7, -1, C.ink);

  // a mooring post at the far end with a rope loop
  rect(t, 25, 0, 3, 5, C.woodDark);
  vline(t, 25, 0, 5, C.wood);
  box(t, 25, 0, 3, 5, -1, C.ink);
  put(t, 24, 2, C.cream);
  put(t, 24, 3, C.cream);
  return t;
}

/** A road bridge segment the layout can drop over the river. */
function bridge(): Sprite {
  const W = 32;
  const H = 20;
  const t = prop(W, H, 32, 20);

  // far parapet
  rect(t, 0, 2, W, 4, C.stone);
  hline(t, 0, 2, W, C.white);
  hline(t, 0, 5, W, C.stoneDark);
  box(t, 0, 2, W, 4, -1, C.ink);
  for (let i = 3; i < W - 2; i += 6) vline(t, i, 3, 2, C.stoneDark);

  // deck
  rect(t, 0, 6, W, 8, C.road);
  hline(t, 0, 6, W, C.roadEdge);
  hline(t, 0, 13, W, C.roadEdge);
  for (let i = 2; i < W - 3; i += 8) hline(t, i, 9, 5, C.roadLine);

  // near parapet
  rect(t, 0, 14, W, 4, C.stone);
  hline(t, 0, 14, W, C.white);
  hline(t, 0, 17, W, C.stoneDark);
  box(t, 0, 14, W, 4, -1, C.ink);
  for (let i = 3; i < W - 2; i += 6) vline(t, i, 15, 2, C.stoneDark);

  // the underside in shadow, so it reads as spanning something
  rect(t, 0, 18, W, 2, C.shadow);
  hline(t, 0, 18, W, C.ink);
  return t;
}

export const PROPS: SpriteMap = {
  lamp: lamp(),
  bench: bench(),
  car_red: car(C.red, C.redDark),
  car_blue: car(C.blue, C.blueDark),
  car_green: car(C.green, C.greenDark),
  bus: bus(),
  signpost: signpost(),
  hydrant: hydrant(),
  mailbox: mailbox(),
  fence_h: fenceH(),
  fence_v: fenceV(),
  picnic_table: picnicTable(),
  dock: dock(),
  bridge: bridge(),
};

/** Named car colours, so a lot or a street can be filled without string-building. */
export const CAR_KEYS = ['car_red', 'car_blue', 'car_green'] as const;
