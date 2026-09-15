/**
 * Small set-dressing parts that more than one building needs: fences, bunting,
 * aerials, fire escapes, notice boards, topiary and the little pictogram icons
 * that go on shop signs (cup, fork, dumbbell, bolt, cross, pig).
 *
 * Everything here draws into a target at an explicit position and adds its own
 * ink, so a building can stack them without thinking about layering.
 */
import { C } from '../palette';
import type { Target } from '../surface';
import { box, fillCircle, fillEllipse, hline, line, put, rect, vline } from '../surface';

// ---------------------------------------------------------------- fences

/** Picket fence: posts every 4px with two rails. `h` includes the posts. */
export function picketFence(
  t: Target,
  x: number,
  y: number,
  w: number,
  h: number,
  face = C.white,
  shade = C.creamShade,
): void {
  for (let i = 0; i < w; i += 4) {
    vline(t, x + i, y + 1, h - 1, face);
    vline(t, x + i + 1, y + 1, h - 1, shade);
    put(t, x + i, y, C.ink);
    put(t, x + i + 1, y, C.ink);
  }
  hline(t, x, y + 2, w, face);
  hline(t, x, y + 3, w, C.ink);
  hline(t, x, y + h - 3, w, face);
  hline(t, x, y + h - 2, w, C.ink);
}

/** Chain-link fence: a diamond mesh between posts, used on the car lot. */
export function chainFence(t: Target, x: number, y: number, w: number, h: number, wire = C.metal): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (((i + j) & 3) === 0 || ((i - j) & 3) === 0) put(t, x + i, y + j, wire);
    }
  }
  hline(t, x, y, w, C.metalDark);
  hline(t, x, y + h - 1, w, C.ink);
  for (let i = 0; i <= w; i += 14) vline(t, x + Math.min(i, w - 1), y - 1, h + 1, C.metalDark);
}

// ---------------------------------------------------------------- strings

/**
 * A sagging string of triangular pennants between two points — the used-car
 * lot, the grocer's forecourt.
 */
export function bunting(
  t: Target,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colors: readonly number[] = [C.red, C.yellow, C.white, C.blue],
  sag = 5,
): void {
  const span = x1 - x0;
  if (span <= 0) return;
  const yAt = (i: number): number => {
    const u = i / span;
    return Math.round(y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag);
  };
  for (let i = 0; i <= span; i++) put(t, x0 + i, yAt(i), C.ink);
  for (let i = 3; i < span - 5; i += 7) {
    const c = colors[((i / 7) | 0) % colors.length];
    const ty = yAt(i + 2) + 1;
    for (let j = 0; j < 4; j++) {
      const halfW = 2 - Math.floor(j / 2);
      rect(t, x0 + i + 2 - halfW, ty + j, halfW * 2 + 1, 1, c);
    }
    put(t, x0 + i, ty, C.ink);
    put(t, x0 + i + 4, ty, C.ink);
    put(t, x0 + i + 2, ty + 4, C.ink);
  }
}

// ---------------------------------------------------------------- rooftop

/** A rooftop TV aerial: mast plus four crossbars. */
export function tvAerial(t: Target, cx: number, baseY: number, h: number, color = C.metalDark): void {
  vline(t, cx, baseY - h, h, color);
  vline(t, cx + 1, baseY - h, h, C.ink);
  for (let k = 0; k < 4; k++) {
    const y = baseY - h + 2 + k * 3;
    const half = 3 + k;
    hline(t, cx - half, y, half * 2 + 1, color);
  }
  put(t, cx, baseY - h - 1, C.ink);
}

/** A satellite dish on a short mast, tilted up and to the left. */
export function satelliteDish(
  t: Target,
  cx: number,
  baseY: number,
  r: number,
  face = C.white,
  shade = C.stoneDark,
): void {
  // mast and base plate
  vline(t, cx, baseY - r, r, C.metalDark);
  vline(t, cx + 1, baseY - r, r, C.ink);
  hline(t, cx - 3, baseY - 1, 7, C.metalDark);
  hline(t, cx - 3, baseY, 7, C.ink);

  const dy = baseY - r - Math.round(r * 0.8);
  const ry = Math.round(r * 0.9);
  // dish face: light on the upper-left, shaded to the lower-right
  for (let j = -ry; j <= ry; j++) {
    const span = Math.round(r * Math.sqrt(Math.max(0, 1 - (j / ry) * (j / ry))));
    if (span <= 0) continue;
    rect(t, cx - span, dy + j, span * 2 + 1, 1, face);
    rect(t, cx + Math.max(0, span - Math.round(span * 1.1)), dy + j, span, 1, j > -1 ? shade : face);
    put(t, cx - span - 1, dy + j, C.ink);
    put(t, cx + span + 1, dy + j, C.ink);
  }
  hline(t, cx - 2, dy - ry - 1, 5, C.ink);
  hline(t, cx - 2, dy + ry + 1, 5, C.ink);
  // rim highlight on the lit edge
  for (let j = -ry + 1; j < 0; j++) {
    const span = Math.round(r * Math.sqrt(Math.max(0, 1 - (j / ry) * (j / ry))));
    put(t, cx - span, dy + j, C.white);
  }
  // feed horn on a strut out to the upper left
  line(t, cx, dy, cx - r - 1, dy - ry, C.metalDark);
  box(t, cx - r - 3, dy - ry - 3, 4, 4, C.metal, C.ink);
}

/** A row of lit marquee bulbs along a horizontal edge. */
export function bulbRun(t: Target, x: number, y: number, w: number, pitch = 4, on = C.yellow, off = C.yellowDark): void {
  for (let i = 1; i < w - 1; i += pitch) {
    put(t, x + i, y, on);
    put(t, x + i + 1, y, off);
    put(t, x + i, y + 1, off);
  }
}

/** A fire escape: a zigzag of landings and ladders bolted to a facade. */
export function fireEscape(t: Target, x: number, y: number, w: number, floors: number, pitch: number): void {
  for (let k = 0; k < floors; k++) {
    const ly = y + k * pitch;
    // landing deck
    hline(t, x, ly, w, C.metalDark);
    hline(t, x, ly + 1, w, C.ink);
    // railing
    for (let i = 0; i < w; i += 3) vline(t, x + i, ly - 4, 4, C.metal);
    hline(t, x, ly - 4, w, C.metal);
    hline(t, x, ly - 5, w, C.ink);
    // ladder down to the next landing
    if (k < floors - 1) {
      const lx = k % 2 === 0 ? x + 2 : x + w - 5;
      vline(t, lx, ly + 2, pitch - 2, C.metalDark);
      vline(t, lx + 3, ly + 2, pitch - 2, C.metalDark);
      for (let j = ly + 3; j < ly + pitch - 1; j += 3) hline(t, lx, j, 4, C.metal);
    }
  }
}

// ---------------------------------------------------------------- street

/** A free-standing notice board on two legs, papered with pinned sheets. */
export function noticeBoard(t: Target, cx: number, baseY: number, w: number, h: number): void {
  const x = cx - (w >> 1);
  const y = baseY - h - 5;
  for (const lx of [x + 2, x + w - 4]) {
    rect(t, lx, y + h, 2, 5, C.woodDark);
    vline(t, lx, y + h, 5, C.wood);
    put(t, lx + 1, baseY, C.ink);
  }
  box(t, x, y, w, h, C.wood, C.ink);
  box(t, x + 2, y + 2, w - 4, h - 4, C.woodDark, C.ink);
  const slot = Math.max(5, Math.floor((w - 6) / 3));
  for (let k = 0; k < 3; k++) {
    const nx = x + 3 + k * slot;
    const ny = y + 3 + (k & 1);
    box(t, nx, ny, Math.min(5, slot - 1), h - 7 - (k & 1), k === 1 ? C.cream : C.white, C.ink);
    put(t, nx + 2, ny, C.red);
  }
}

/** A flag on a pole, streaming to the right. `topY` is the top of the pole. */
export function flag(t: Target, x: number, topY: number, h: number, cloth = C.red, clothShade = C.redDark): void {
  vline(t, x, topY, h, C.metal);
  vline(t, x + 1, topY, h, C.metalDark);
  put(t, x, topY - 1, C.yellow);
  for (let j = 0; j < 8; j++) {
    const wave = j < 4 ? 0 : 1;
    rect(t, x + 2, topY + 1 + j + wave, 13, 1, j < 4 ? cloth : clothShade);
    put(t, x + 15, topY + 1 + j + wave, C.ink);
  }
  hline(t, x + 2, topY, 13, C.ink);
  hline(t, x + 2, topY + 10, 13, C.ink);
}

/** A wall-mounted security camera on a bracket, looking down-left. */
export function securityCamera(t: Target, x: number, y: number): void {
  hline(t, x, y, 3, C.metalDark);
  box(t, x + 2, y - 1, 7, 4, C.metal, C.ink);
  hline(t, x + 3, y - 1, 5, C.white);
  put(t, x + 8, y + 1, C.red);
  put(t, x + 1, y + 1, C.ink);
}

/** Cone-shaped topiary in a pot; the upscale restaurant's doorway dressing. */
export function topiary(t: Target, cx: number, baseY: number, h = 14): void {
  box(t, cx - 3, baseY - 4, 7, 5, C.creamShade, C.ink);
  hline(t, cx - 2, baseY - 4, 5, C.cream);
  for (let j = 0; j < h - 5; j++) {
    const half = Math.round((j / Math.max(1, h - 6)) * 3.4);
    rect(t, cx - half, baseY - h + 1 + j, half * 2 + 1, 1, C.leaf);
    rect(t, cx + 1, baseY - h + 1 + j, half, 1, C.leafDark);
    put(t, cx - half, baseY - h + 1 + j, C.ink);
    put(t, cx + half, baseY - h + 1 + j, C.ink);
  }
  put(t, cx, baseY - h, C.ink);
}

/** A crate of produce on the pavement, heaped over the top. */
export function produceCrate(t: Target, x: number, baseY: number, w: number, fruit: number, fruitDark: number): void {
  const h = 8;
  box(t, x, baseY - h, w, h, C.wood, C.ink);
  hline(t, x + 1, baseY - h + 1, w - 2, C.woodDark);
  hline(t, x + 1, baseY - 3, w - 2, C.woodDark);
  for (let i = 2; i < w - 1; i += 3) vline(t, x + i, baseY - h + 2, h - 5, C.woodDark);
  for (let i = 0; i < w - 2; i += 3) {
    fillCircle(t, x + i + 2, baseY - h - 1, 1, fruit);
    put(t, x + i + 3, baseY - h, fruitDark);
    put(t, x + i + 1, baseY - h - 2, C.ink);
  }
  hline(t, x, baseY - 1, w, C.woodDark);
}

// ---------------------------------------------------------------- sign icons

export type IconFn = (t: Target, x: number, y: number, w: number, h: number) => void;

/** A steaming coffee cup and saucer, scaled to fill its board. */
export function iconCup(t: Target, x: number, y: number, w: number, h: number): void {
  const cx = x + (w >> 1);
  const cupW = Math.max(9, w - 8);
  const half = cupW >> 1;
  const cupH = Math.max(6, Math.round(h * 0.52));
  const cupY = y + h - cupH - 3;

  // steam, rising from two points on the rim
  for (const sx of [cx - 3, cx + 2]) {
    for (let j = 0; j < cupY - y - 1; j++) put(t, sx + (j % 4 < 2 ? 0 : 1), cupY - 2 - j, C.white);
  }

  // cup body, tapering slightly to the base
  for (let j = 0; j < cupH; j++) {
    const taper = Math.round((j / Math.max(1, cupH - 1)) * 2);
    rect(t, cx - half + taper, cupY + j, cupW - taper * 2, 1, C.white);
    rect(t, cx + 1, cupY + j, half - taper - 1, 1, C.paving);
    put(t, cx - half + taper - 1, cupY + j, C.ink);
    put(t, cx + half - taper, cupY + j, C.ink);
  }
  // coffee at the top
  rect(t, cx - half + 1, cupY, cupW - 2, 2, C.woodDark);
  hline(t, cx - half + 1, cupY, cupW - 2, C.wood);
  hline(t, cx - half - 1, cupY - 1, cupW + 2, C.ink);

  // handle
  const hy = cupY + Math.round(cupH * 0.3);
  vline(t, cx + half + 1, hy, Math.max(2, cupH - 4), C.white);
  vline(t, cx + half + 2, hy, Math.max(2, cupH - 4), C.ink);
  put(t, cx + half, hy - 1, C.ink);
  put(t, cx + half, hy + Math.max(2, cupH - 4), C.ink);

  // saucer
  hline(t, cx - half - 3, cupY + cupH, cupW + 6, C.white);
  hline(t, cx - half - 2, cupY + cupH + 1, cupW + 4, C.paving);
  hline(t, cx - half - 3, cupY + cupH + 2, cupW + 6, C.ink);
  put(t, cx - half - 4, cupY + cupH, C.ink);
  put(t, cx + half + 3, cupY + cupH, C.ink);
}

/** A fork, tines up — The Gilded Fork. */
export function iconFork(t: Target, x: number, y: number, w: number, h: number): void {
  const cx = x + (w >> 1);
  const top = y + 2;
  for (const dx of [-3, 0, 3]) vline(t, cx + dx, top, 6, C.gold);
  hline(t, cx - 3, top + 6, 7, C.gold);
  hline(t, cx - 3, top + 7, 7, C.goldDark);
  const stemH = Math.max(3, h - 12);
  rect(t, cx - 1, top + 8, 2, stemH, C.gold);
  vline(t, cx, top + 8, stemH, C.goldDark);
  for (const dx of [-4, 4]) vline(t, cx + dx, top, 8, C.ink);
  for (const dx of [-2, 2]) vline(t, cx + dx, top, 6, C.ink);
  hline(t, cx - 3, top - 1, 7, C.ink);
  vline(t, cx - 2, top + 8, stemH, C.ink);
  vline(t, cx + 1, top + 8, stemH, C.ink);
  hline(t, cx - 2, top + 8 + stemH, 4, C.ink);
}

/** A dumbbell — Flex Factory. */
export function iconDumbbell(t: Target, x: number, y: number, w: number, h: number): void {
  const cy = y + (h >> 1);
  const x0 = x + 2;
  const x1 = x + w - 3;
  const barW = Math.max(3, x1 - x0 - 7);
  rect(t, x0 + 4, cy - 1, barW, 3, C.metal);
  hline(t, x0 + 4, cy - 1, barW, C.white);
  hline(t, x0 + 4, cy + 2, barW, C.ink);
  hline(t, x0 + 4, cy - 2, barW, C.ink);
  for (const bx of [x0, x1 - 3]) {
    box(t, bx, cy - 5, 4, 11, C.metalDark, C.ink);
    vline(t, bx + 1, cy - 4, 9, C.metal);
  }
}

/**
 * A lightning bolt, authored row by row: a wide shoulder, a hard jog to the
 * left, then a tapering tail. Anything smoother stops reading as a bolt.
 */
const BOLT_ROWS = [
  '..####',
  '..####',
  '.####.',
  '.####.',
  '######',
  '.#####',
  '..####',
  '..###.',
  '.###..',
  '.###..',
  '.##...',
  '.##...',
  '.#....',
];

/** Draw the bolt scaled to fill roughly `w` x `h`. */
export function iconBolt(t: Target, x: number, y: number, w: number, h: number): void {
  const sw = Math.max(1, Math.round(w / 6));
  const sh = Math.max(1, Math.round(h / BOLT_ROWS.length));
  for (let r = 0; r < BOLT_ROWS.length; r++) {
    const row = BOLT_ROWS[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== '#') continue;
      const edge = c === 0 || row[c - 1] !== '#';
      const right = c === row.length - 1 || row[c + 1] !== '#';
      for (let jy = 0; jy < sh; jy++) {
        for (let jx = 0; jx < sw; jx++) {
          const fill = right && jx === sw - 1 ? C.yellowDark : C.yellow;
          put(t, x + c * sw + jx, y + r * sh + jy, fill);
        }
      }
      if (edge) vline(t, x + c * sw - 1, y + r * sh, sh, C.ink);
      if (right) vline(t, x + (c + 1) * sw, y + r * sh, sh, C.ink);
      if (r === 0) hline(t, x + c * sw, y - 1, sw, C.ink);
      if (r === BOLT_ROWS.length - 1) hline(t, x + c * sw, y + BOLT_ROWS.length * sh, sw, C.ink);
    }
  }
  // patch the ink where the silhouette steps sideways
  for (let r = 1; r < BOLT_ROWS.length; r++) {
    for (let c = 0; c < 6; c++) {
      const here = BOLT_ROWS[r][c] === '#';
      const above = BOLT_ROWS[r - 1][c] === '#';
      if (here && !above) hline(t, x + c * sw, y + r * sh - 1, sw, C.ink);
      if (!here && above) hline(t, x + c * sw, y + r * sh, sw, C.ink);
    }
  }
}

/** A medical cross. */
export function iconCross(
  t: Target,
  x: number,
  y: number,
  w: number,
  h: number,
  color = C.red,
  shade = C.redDark,
): void {
  const armW = Math.max(3, Math.round(Math.min(w, h) / 3));
  const cx = x + (w >> 1);
  const cy = y + (h >> 1);
  rect(t, cx - (armW >> 1), y, armW, h, color);
  rect(t, x, cy - (armW >> 1), w, armW, color);
  vline(t, cx + (armW >> 1) - 1, y + 1, h - 2, shade);
  hline(t, x + 1, cy + (armW >> 1) - 1, w - 2, shade);
  box(t, cx - (armW >> 1), y, armW, h, -1, C.ink);
  box(t, x, cy - (armW >> 1), w, armW, -1, C.ink);
  rect(t, cx - (armW >> 1) + 1, cy - (armW >> 1) + 1, armW - 2, armW - 2, color);
}

/** A pig's head on a plate — Chez Cholesterol. */
export function iconPig(t: Target, x: number, y: number, w: number, h: number): void {
  const cx = x + (w >> 1);
  const cy = y + (h >> 1) - 1;
  for (const dx of [-7, 4]) {
    for (let j = 0; j < 4; j++) rect(t, cx + dx + (dx < 0 ? 0 : 3 - j), cy - 7 + j, 2 + j, 1, C.pink);
  }
  fillEllipse(t, cx, cy, 8, 6, C.pink);
  fillEllipse(t, cx + 2, cy + 2, 6, 4, C.red);
  fillEllipse(t, cx, cy + 3, 3.5, 2.5, C.pink);
  put(t, cx - 1, cy + 3, C.ink);
  put(t, cx + 1, cy + 3, C.ink);
  put(t, cx - 3, cy - 1, C.ink);
  put(t, cx + 3, cy - 1, C.ink);
  for (let j = -6; j <= 6; j++) {
    const span = Math.floor(8 * Math.sqrt(Math.max(0, 1 - (j / 6) * (j / 6))));
    if (span <= 0) continue;
    put(t, cx - span, cy + j, C.ink);
    put(t, cx + span, cy + j, C.ink);
  }
  hline(t, cx - 11, cy + 8, 23, C.white);
  hline(t, cx - 10, cy + 9, 21, C.stoneDark);
  hline(t, cx - 11, cy + 10, 23, C.ink);
  hline(t, cx - 11, cy + 7, 23, C.ink);
}

/** Three pawnbroker's balls hanging from a bar. */
export function pawnBalls(t: Target, cx: number, y: number): void {
  hline(t, cx - 10, y, 21, C.metalDark);
  hline(t, cx - 10, y + 1, 21, C.ink);
  for (const [dx, dy] of [
    [-7, 6],
    [0, 9],
    [7, 6],
  ] as Array<[number, number]>) {
    vline(t, cx + dx, y + 1, dy - 4, C.metalDark);
    fillCircle(t, cx + dx, y + dy, 3, C.gold);
    fillCircle(t, cx + dx + 1, y + dy + 1, 2, C.goldDark);
    put(t, cx + dx - 1, y + dy - 1, C.white);
    for (let j = -3; j <= 3; j++) {
      const span = Math.floor(Math.sqrt(Math.max(0, 10.5 - j * j)));
      if (span <= 0) continue;
      put(t, cx + dx - span - 1, y + dy + j, C.ink);
      put(t, cx + dx + span + 1, y + dy + j, C.ink);
    }
    hline(t, cx + dx - 1, y + dy - 4, 3, C.ink);
    hline(t, cx + dx - 1, y + dy + 4, 3, C.ink);
  }
}

/** A dress form on a stand — QT Clothing's window. */
export function mannequin(t: Target, cx: number, baseY: number, cloth = C.pink, clothShade = C.red): void {
  // tripod stand
  vline(t, cx, baseY - 7, 7, C.metalDark);
  vline(t, cx + 1, baseY - 7, 7, C.ink);
  hline(t, cx - 4, baseY, 9, C.metalDark);
  hline(t, cx - 4, baseY + 1, 9, C.ink);

  // skirt: flares from the waist to the hem
  for (let j = 0; j < 9; j++) {
    const half = 2 + Math.round(j * 0.42);
    rect(t, cx - half, baseY - 16 + j, half * 2 + 1, 1, cloth);
    rect(t, cx + 1, baseY - 16 + j, half, 1, clothShade);
    put(t, cx - half - 1, baseY - 16 + j, C.ink);
    put(t, cx + half + 1, baseY - 16 + j, C.ink);
  }
  hline(t, cx - 6, baseY - 7, 13, C.ink);

  // bodice: nips in at the waist, out at the bust
  const bust = [3, 4, 4, 3, 3, 2, 2];
  for (let j = 0; j < bust.length; j++) {
    const half = bust[j];
    rect(t, cx - half, baseY - 23 + j, half * 2 + 1, 1, cloth);
    rect(t, cx + 1, baseY - 23 + j, half, 1, clothShade);
    put(t, cx - half - 1, baseY - 23 + j, C.ink);
    put(t, cx + half + 1, baseY - 23 + j, C.ink);
  }
  // shoulders and neck knob
  hline(t, cx - 4, baseY - 24, 9, C.ink);
  put(t, cx, baseY - 25, C.white);
  put(t, cx, baseY - 26, C.ink);
  // a belt at the waist
  hline(t, cx - 2, baseY - 17, 5, C.ink);
}

/** A palm tree: a slim leaning trunk and a fan of thick drooping fronds. */
export function palmTree(t: Target, cx: number, baseY: number, h: number, lean = 1): void {
  const topX = cx + lean * Math.round(h * 0.18);
  const topY = baseY - h;
  // trunk: two pixels wide, banded, curving into the lean
  for (let j = 0; j < h; j++) {
    const u = j / Math.max(1, h - 1);
    const px = Math.round(cx + (topX - cx) * u * u);
    put(t, px, baseY - j, C.trunk);
    put(t, px + 1, baseY - j, C.trunkDark);
    put(t, px - 1, baseY - j, C.ink);
    put(t, px + 2, baseY - j, C.ink);
    if (j % 4 === 0) {
      put(t, px, baseY - j, C.trunkDark);
      put(t, px + 1, baseY - j, C.trunk);
    }
  }
  // fronds: a thick spine that droops, with a serrated underside
  const fronds: Array<[number, number, number]> = [
    [-13, 0, 6],
    [-9, -5, 3],
    [-3, -8, 0],
    [4, -8, 0],
    [10, -5, 3],
    [14, 0, 6],
  ];
  for (const [dx, dy, droop] of fronds) {
    const ex = topX + dx;
    const ey = topY + dy;
    const mid = { x: topX + Math.round(dx * 0.55), y: topY + Math.round(dy * 0.8) - 2 };
    line(t, topX, topY + 1, mid.x, mid.y, C.leaf);
    line(t, mid.x, mid.y, ex, ey + droop, C.leaf);
    line(t, topX, topY + 2, mid.x, mid.y + 1, C.leafDark);
    line(t, mid.x, mid.y + 1, ex, ey + droop + 1, C.leafDark);
    // serrations along the top of each frond
    for (let k = 2; k < 6; k++) {
      const u = k / 6;
      put(t, Math.round(topX + (ex - topX) * u), Math.round(topY + (ey + droop - topY) * u) - 1, C.leafLight);
    }
    put(t, ex, ey + droop + 2, C.leafDark);
  }
  // coconuts under the crown
  put(t, topX - 1, topY + 3, C.trunkDark);
  put(t, topX + 2, topY + 4, C.trunkDark);
  put(t, topX, topY - 1, C.leafLight);
}
