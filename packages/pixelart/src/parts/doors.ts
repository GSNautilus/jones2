/** Doors and entrances. All of them sit on the ground line of the facade. */
import { C } from '../palette';
import type { Target } from '../surface';
import { box, hline, put, rect, vline } from '../surface';

export interface DoorOptions {
  face?: number;
  shade?: number;
  ink?: number;
  /** Knob / handle colour. */
  handle?: number;
  /** Frame surround colour; omit for none. */
  frame?: number;
}

/** A single panelled door. */
export function doorSingle(t: Target, x: number, y: number, w: number, h: number, o: DoorOptions = {}): void {
  const ink = o.ink ?? C.ink;
  const face = o.face ?? C.wood;
  const shade = o.shade ?? C.woodDark;
  if (o.frame !== undefined) box(t, x - 1, y - 1, w + 2, h + 1, o.frame, ink);
  rect(t, x, y, w, h, face);
  vline(t, x + w - 1, y, h, shade);
  hline(t, x, y, w, shade);
  box(t, x, y, w, h, -1, ink);
  if (w >= 6 && h >= 8) {
    box(t, x + 2, y + 2, w - 4, Math.floor(h / 2) - 2, -1, shade);
    box(t, x + 2, y + Math.floor(h / 2) + 1, w - 4, h - Math.floor(h / 2) - 3, -1, shade);
  }
  put(t, x + w - 3, y + Math.floor(h / 2), o.handle ?? C.yellow);
}

/** Double doors with a centre mullion. */
export function doorDouble(t: Target, x: number, y: number, w: number, h: number, o: DoorOptions = {}): void {
  const ink = o.ink ?? C.ink;
  const face = o.face ?? C.wood;
  const shade = o.shade ?? C.woodDark;
  if (o.frame !== undefined) box(t, x - 1, y - 1, w + 2, h + 1, o.frame, ink);
  rect(t, x, y, w, h, face);
  hline(t, x, y, w, shade);
  const mid = x + (w >> 1);
  vline(t, mid, y, h, shade);
  vline(t, mid - 1, y, h, ink);
  vline(t, x + w - 1, y, h, shade);
  box(t, x, y, w, h, -1, ink);
  const hy = y + Math.floor(h / 2);
  put(t, mid - 3, hy, o.handle ?? C.yellow);
  put(t, mid + 2, hy, o.handle ?? C.yellow);
}

/** Glazed shop doors: glass leaves in a frame, with a kickplate. */
export function doorGlass(t: Target, x: number, y: number, w: number, h: number, o: DoorOptions = {}): void {
  const ink = o.ink ?? C.ink;
  const frame = o.frame ?? C.metal;
  const glass = o.face ?? C.glass;
  const dark = o.shade ?? C.glassDark;
  box(t, x, y, w, h, frame, ink);
  const gw = (w >> 1) - 2;
  const gh = h - 5;
  for (let k = 0; k < 2; k++) {
    const gx = x + 2 + k * (gw + 1);
    rect(t, gx, y + 2, gw, gh, glass);
    for (let j = 0; j < gh; j++) {
      const start = Math.max(0, Math.round(gw - (j / Math.max(1, gh - 1)) * gw));
      if (start < gw) rect(t, gx + start, y + 2 + j, gw - start, 1, dark);
    }
    box(t, gx, y + 2, gw, gh, -1, ink);
    put(t, gx + 1, y + 3, C.white);
  }
  // kickplate
  rect(t, x + 1, y + h - 3, w - 2, 2, frame);
  hline(t, x + 1, y + h - 3, w - 2, C.white);
  const hy = y + Math.floor(h / 2);
  put(t, x + (w >> 1) - 2, hy, C.ink);
  put(t, x + (w >> 1) + 1, hy, C.ink);
}

/** An arched entrance recessed into the wall — universities, banks, churches. */
export function doorArched(t: Target, x: number, y: number, w: number, h: number, o: DoorOptions = {}): void {
  const ink = o.ink ?? C.ink;
  const face = o.face ?? C.woodDark;
  const shade = o.shade ?? C.ink;
  const r = w >> 1;
  const cx = x + r;
  // arch head
  for (let j = 0; j < r; j++) {
    const span = Math.floor(Math.sqrt(Math.max(0, r * r - (r - 1 - j) * (r - 1 - j))));
    rect(t, cx - span, y + j, span * 2 + 1, 1, face);
    put(t, cx - span - 1, y + j, ink);
    put(t, cx + span + 1, y + j, ink);
  }
  rect(t, x, y + r, w, h - r, face);
  vline(t, x + w - 1, y + r, h - r, shade);
  vline(t, x, y + r, h - r, ink);
  vline(t, x + w - 1, y + r, h - r, ink);
  hline(t, x, y + h - 1, w, ink);
  // double leaf split
  vline(t, cx, y + 2, h - 3, shade);
  put(t, cx - 2, y + h - Math.floor(h / 3), o.handle ?? C.yellow);
  put(t, cx + 2, y + h - Math.floor(h / 3), o.handle ?? C.yellow);
}

/** A garage door: horizontal ribs, sitting flush with the ground. */
export function doorGarage(t: Target, x: number, y: number, w: number, h: number, o: DoorOptions = {}): void {
  const ink = o.ink ?? C.ink;
  const face = o.face ?? C.white;
  const shade = o.shade ?? C.creamShade;
  rect(t, x, y, w, h, face);
  for (let j = 2; j < h; j += 3) hline(t, x, y + j, w, shade);
  vline(t, x + w - 1, y, h, shade);
  box(t, x, y, w, h, -1, ink);
}

/** Wide steps leading up to a door; `count` treads, light from the top-left. */
export function steps(t: Target, cx: number, baseY: number, w: number, count: number, face = C.stone, shade = C.stoneDark, ink = C.ink): void {
  for (let k = 0; k < count; k++) {
    const sw = w + k * 4;
    const sy = baseY - k;
    rect(t, cx - (sw >> 1), sy, sw, 1, k === count - 1 ? face : face);
    put(t, cx - (sw >> 1) - 1, sy, ink);
    put(t, cx + (sw >> 1), sy, ink);
    if (k > 0) hline(t, cx - (sw >> 1) + 1, sy, sw - 2, k % 2 === 0 ? face : shade);
  }
  hline(t, cx - ((w + (count - 1) * 4) >> 1), baseY + 1, w + (count - 1) * 4, ink);
}
