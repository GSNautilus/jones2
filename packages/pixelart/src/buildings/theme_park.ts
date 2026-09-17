/**
 * The Theme Park. Not a building: the park gate. Two striped pylons carry an
 * arched name board with pennants strung between them; a ferris wheel turns
 * over the hoarding on the left and a candy-striped carousel on the right.
 * The widest sprite in the town, and the only one allowed to be.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { box, createSprite, fillCircle, hline, line, put, rect, vline } from '../surface';
import { drawTextCentred } from '../font';
import { groundShadow, inkRowEdges } from '../parts/common';
import { bunting, flag } from '../parts/details';
import { str, type Params } from './common';

const CAR_COLORS = [C.red, C.yellow, C.blue, C.green, C.orange, C.teal, C.purple, C.pink];

/** A one pixel circle outline, sampled densely enough to leave no gaps. */
function ring(t: Sprite, cx: number, cy: number, r: number, index: number): void {
  if (r < 1) return;
  const steps = Math.max(32, Math.round(r * 9));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    put(t, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), index);
  }
}

/** The big wheel: an A-frame, a banded rim, eight spokes and eight cars. */
function ferrisWheel(t: Sprite, cx: number, cy: number, r: number, baseY: number): void {
  // A-frame legs, drawn first so the hub covers their tops
  for (const dir of [-1, 1]) {
    line(t, cx + dir * 2, cy, cx + dir * 11, baseY, C.metal);
    line(t, cx + dir * 3, cy, cx + dir * 12, baseY, C.ink);
    line(t, cx + dir * 1, cy, cx + dir * 10, baseY, C.ink);
  }
  hline(t, cx - 13, baseY, 27, C.ink);

  // rim
  ring(t, cx, cy, r, C.ink);
  ring(t, cx, cy, r - 1, C.metal);
  ring(t, cx, cy, r - 2, C.metalDark);
  ring(t, cx, cy, r - 3, C.ink);

  // spokes and hub
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    line(t, cx + Math.round(dx * 2), cy + Math.round(dy * 2), cx + Math.round(dx * (r - 3)), cy + Math.round(dy * (r - 3)), C.metal);
  }
  fillCircle(t, cx, cy, 3, C.yellow);
  fillCircle(t, cx + 1, cy + 1, 2, C.yellowDark);
  ring(t, cx, cy, 4, C.ink);

  // cars, hung off the rim
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const gx = Math.round(cx + Math.cos(a) * (r - 1));
    const gy = Math.round(cy + Math.sin(a) * (r - 1));
    const col = CAR_COLORS[k];
    box(t, gx - 3, gy - 1, 7, 5, col, C.ink);
    hline(t, gx - 2, gy, 5, C.white);
    put(t, gx + 2, gy + 2, C.ink);
  }
}

/** A candy-striped carousel roof on its posts, with a pennant on the finial. */
function carousel(t: Sprite, cx: number, apexY: number, h: number, half: number, baseY: number): void {
  // posts and platform, behind the cone
  for (const dx of [-half + 4, -2, half - 6]) {
    vline(t, cx + dx, apexY + h - 2, baseY - apexY - h + 3, C.cream);
    vline(t, cx + dx + 1, apexY + h - 2, baseY - apexY - h + 3, C.creamShade);
    vline(t, cx + dx + 2, apexY + h - 2, baseY - apexY - h + 3, C.ink);
    vline(t, cx + dx - 1, apexY + h - 2, baseY - apexY - h + 3, C.ink);
  }
  // a horse on its brass pole, between the posts
  const hy = apexY + h + 5;
  vline(t, cx - 5, apexY + h + 2, 12, C.gold);
  vline(t, cx - 4, apexY + h + 2, 12, C.goldDark);
  rect(t, cx - 8, hy + 2, 8, 4, C.white);      // body
  rect(t, cx - 3, hy - 1, 4, 4, C.white);      // neck and head
  put(t, cx, hy - 1, C.creamShade);
  vline(t, cx - 7, hy + 6, 3, C.white);        // legs
  vline(t, cx - 2, hy + 6, 3, C.white);
  box(t, cx - 8, hy + 2, 8, 4, -1, C.ink);
  box(t, cx - 3, hy - 1, 4, 4, -1, C.ink);
  put(t, cx - 7, hy + 9, C.ink);
  put(t, cx - 2, hy + 9, C.ink);
  put(t, cx - 1, hy, C.ink);

  // the cone, striped
  for (let j = 0; j < h; j++) {
    const u = j / Math.max(1, h - 1);
    const span = Math.round(half * u);
    for (let i = -span; i <= span; i++) {
      const band = (Math.abs(Math.round(i / 3)) + (i < 0 ? 0 : 1)) & 1;
      put(t, cx + i, apexY + j, band === 0 ? C.red : C.white);
    }
    put(t, cx - span, apexY + j, C.ink);
    put(t, cx + span, apexY + j, C.ink);
  }
  // the valance under the eaves
  rect(t, cx - half, apexY + h, half * 2 + 1, 2, C.yellow);
  hline(t, cx - half, apexY + h + 1, half * 2 + 1, C.yellowDark);
  box(t, cx - half, apexY + h, half * 2 + 1, 3, -1, C.ink);
  for (let i = -half + 1; i < half; i += 4) put(t, cx + i, apexY + h + 3, C.ink);

  // finial and pennant
  vline(t, cx, apexY - 7, 8, C.metalDark);
  vline(t, cx + 1, apexY - 7, 8, C.ink);
  for (let j = 0; j < 4; j++) rect(t, cx + 2, apexY - 7 + j, 6 - j, 1, j < 2 ? C.blue : C.blueDark);
  put(t, cx, apexY - 8, C.yellow);
}

export function themePark(params?: Params): Sprite {
  const name = str(params, 'sign', 'THEME PARK');
  const W = 140;
  const H = 98;
  const groundY = H - 4;
  const t = createSprite(W, H, W >> 1, H - 2, W - 8, 8);

  const apronY = groundY - 5;
  const wallY = 68;
  const towerY = 34;
  const boardX = 46;
  const boardW = 66;
  const boardY = 14;
  const boardH = 20;

  // --- the rides, behind the hoarding --------------------------------------
  ferrisWheel(t, 26, 42, 19, wallY + 3);
  carousel(t, 122, 32, 17, 14, wallY + 4);

  // --- hoarding and forecourt ----------------------------------------------
  rect(t, 3, wallY, W - 6, apronY - wallY, C.cream);
  for (let i = 0; i < W - 8; i += 8) rect(t, 4 + i, wallY + 3, 4, apronY - wallY - 4, C.red);
  hline(t, 4, wallY + 1, W - 8, C.white);
  rect(t, 3, wallY - 3, W - 6, 4, C.blue);
  hline(t, 4, wallY - 2, W - 8, C.slate);
  box(t, 3, wallY - 3, W - 6, 4, -1, C.ink);
  box(t, 3, wallY, W - 6, apronY - wallY, -1, C.ink);

  rect(t, 3, apronY, W - 6, groundY - apronY + 1, C.paving);
  hline(t, 3, apronY, W - 6, C.white);
  hline(t, 3, groundY, W - 6, C.pavingDark);
  box(t, 3, apronY, W - 6, groundY - apronY + 1, -1, C.ink);

  // --- the gate ------------------------------------------------------------
  const gateX = boardX + 16;
  const gateW = boardW - 32;
  const archY = wallY - 9;
  rect(t, gateX, archY, gateW, apronY - archY, C.stone);
  hline(t, gateX + 1, archY + 1, gateW - 2, C.white);
  vline(t, gateX + gateW - 2, archY, apronY - archY, C.stoneDark);
  box(t, gateX, archY, gateW, apronY - archY, -1, C.ink);

  // the opening, cut through to the midway beyond
  const openX = gateX + 4;
  const openW = gateW - 8;
  const openY = archY + 4;
  const arcR = openW >> 1;
  for (let j = 0; j < arcR; j++) {
    const span = Math.floor(Math.sqrt(Math.max(0, arcR * arcR - (arcR - 1 - j) * (arcR - 1 - j))));
    rect(t, openX + arcR - span, openY + j, span * 2, 1, C.inkSoft);
    put(t, openX + arcR - span - 1, openY + j, C.ink);
    put(t, openX + arcR + span, openY + j, C.ink);
  }
  rect(t, openX, openY + arcR, openW, apronY - openY - arcR, C.inkSoft);
  vline(t, openX - 1, openY + arcR, apronY - openY - arcR, C.ink);
  vline(t, openX + openW, openY + arcR, apronY - openY - arcR, C.ink);
  // the midway path running away from the gate
  for (let j = 0; j < 9; j++) {
    const half = 3 + j;
    rect(t, gateX + (gateW >> 1) - half, apronY - 1 - j, half * 2, 1, j < 4 ? C.shadow : C.pavingDark);
  }
  // turnstiles across the opening
  for (const bx of [openX + 5, openX + openW - 7]) {
    vline(t, bx, apronY - 11, 11, C.metal);
    vline(t, bx + 1, apronY - 11, 11, C.ink);
    for (let k = 0; k < 3; k++) {
      hline(t, bx - 4, apronY - 10 + k * 3, 9, C.metal);
      hline(t, bx - 4, apronY - 9 + k * 3, 9, C.metalDark);
    }
  }

  // pylons either side
  for (const px of [boardX + 2, boardX + boardW - 16]) {
    rect(t, px, towerY, 14, apronY - towerY, C.yellow);
    for (let j = towerY + 2; j < apronY - 2; j += 8) rect(t, px + 1, j, 12, 4, C.orange);
    vline(t, px + 12, towerY, apronY - towerY, C.orangeDark);
    vline(t, px + 13, towerY, apronY - towerY, C.orangeDark);
    box(t, px, towerY, 14, apronY - towerY, -1, C.ink);
    // a ticket window in each pylon
    box(t, px + 3, apronY - 20, 8, 9, C.glass, C.ink);
    rect(t, px + 3, apronY - 16, 8, 5, C.glassDark);
    put(t, px + 4, apronY - 19, C.white);
    hline(t, px + 2, apronY - 11, 10, C.cream);
    hline(t, px + 2, apronY - 10, 10, C.ink);
  }

  // --- the name board ------------------------------------------------------
  box(t, boardX, boardY, boardW, boardH, C.purple, C.ink);
  box(t, boardX + 1, boardY + 1, boardW - 2, boardH - 2, -1, C.pink);
  hline(t, boardX + 2, boardY + 2, boardW - 4, C.purpleDark);
  drawTextCentred(t, boardX + 1, boardY + 7, boardW, name, C.ink, { spacing: 1 });
  drawTextCentred(t, boardX, boardY + 6, boardW, name, C.yellow, { spacing: 1 });
  // a row of bulbs under the board, and scrolls tying it to the pylons
  for (let i = 3; i < boardW - 3; i += 5) {
    put(t, boardX + i, boardY + boardH, C.yellow);
    put(t, boardX + i + 1, boardY + boardH, C.yellowDark);
  }
  for (const [sx, dir] of [
    [boardX, 1],
    [boardX + boardW - 1, -1],
  ] as Array<[number, number]>) {
    for (let j = 0; j < 6; j++) {
      put(t, sx + dir * j, boardY + boardH + j, C.ink);
      put(t, sx + dir * (j + 1), boardY + boardH + j, C.purpleDark);
    }
  }

  // flags on the board, pennants down to the pylons
  flag(t, boardX + 3, 0, 15, C.red, C.redDark);
  flag(t, boardX + boardW - 6, 0, 15, C.green, C.greenDark);
  bunting(t, boardX + 4, boardY + boardH + 4, boardX + boardW - 4, boardY + boardH + 4, [C.red, C.yellow, C.blue, C.white], 6);
  bunting(t, 8, wallY - 12, boardX + 3, boardY + boardH + 6, [C.yellow, C.red, C.white, C.blue], 7);
  bunting(t, boardX + boardW - 3, boardY + boardH + 6, W - 8, wallY - 12, [C.blue, C.white, C.red, C.yellow], 7);

  inkRowEdges(t, C.ink, 0, wallY - 3);
  groundShadow(t, 3, groundY + 1, W - 6);
  return t;
}
