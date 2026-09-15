/**
 * Roofs, seen from slightly above. Every roof draws its own ink outline and
 * leaves a darker fascia band at the eave so the facade reads as being below
 * and behind it.
 */
import { C } from '../palette';
import type { Target } from '../surface';
import { box, hline, line, put, rect, vline } from '../surface';

export interface RoofOptions {
  /** Sunlit roof surface. */
  top: number;
  /** Shaded slope / fascia. */
  shade: number;
  ink?: number;
  /** How far the eave overhangs the wall on each side (default 2). */
  overhang?: number;
}

/** Flat roof with a parapet: a light deck with a darker coping band at the front. */
export function roofFlat(t: Target, x: number, y: number, w: number, h: number, o: RoofOptions): void {
  const ink = o.ink ?? C.ink;
  const oh = o.overhang ?? 2;
  const x0 = x - oh;
  const ww = w + oh * 2;
  const parapet = Math.max(3, Math.round(h * 0.4));
  const deckH = h - parapet;

  // deck, tapering slightly to suggest depth
  for (let j = 0; j < deckH; j++) {
    const inset = Math.round(((deckH - 1 - j) / Math.max(1, deckH - 1)) * 2);
    rect(t, x0 + inset, y + j, ww - inset * 2, 1, o.top);
  }
  // parapet front face
  rect(t, x0, y + deckH, ww, parapet, o.shade);
  hline(t, x0 + 1, y + deckH, ww - 2, o.top);
  hline(t, x0, y + h - 1, ww, ink);

  box(t, x0, y + deckH, ww, parapet, -1, ink);
  // silhouette of the deck
  for (let j = 0; j < deckH; j++) {
    const inset = Math.round(((deckH - 1 - j) / Math.max(1, deckH - 1)) * 2);
    put(t, x0 + inset, y + j, ink);
    put(t, x0 + ww - 1 - inset, y + j, ink);
  }
  hline(t, x0 + 2, y, ww - 4, ink);
}

/** Gable: a triangular end facing the viewer, with eaves flaring past the wall. */
export function roofGable(t: Target, x: number, y: number, w: number, h: number, o: RoofOptions): void {
  const ink = o.ink ?? C.ink;
  const oh = o.overhang ?? 2;
  const x0 = x - oh;
  const ww = w + oh * 2;
  const cx = x0 + (ww >> 1);
  const body = h - 2; // last two rows are the fascia

  for (let j = 0; j < body; j++) {
    const u = j / Math.max(1, body - 1);
    const half = Math.round((ww / 2) * u);
    rect(t, cx - half, y + j, half * 2 + 1, 1, o.top);
    // the right slope faces away from the light
    rect(t, cx + 1, y + j, half, 1, o.shade);
    put(t, cx - half, y + j, ink);
    put(t, cx + half, y + j, ink);
  }
  put(t, cx, y, ink);
  // ridge highlight down the centre
  vline(t, cx, y + 1, body - 1, o.top);

  // fascia
  rect(t, x0, y + body, ww, 2, o.shade);
  hline(t, x0, y + body, ww, o.top);
  box(t, x0, y + body, ww, 2, -1, ink);
}

/** Hipped roof: a trapezoid deck, wider at the eave than at the ridge. */
export function roofHip(t: Target, x: number, y: number, w: number, h: number, o: RoofOptions): void {
  const ink = o.ink ?? C.ink;
  const oh = o.overhang ?? 2;
  const x0 = x - oh;
  const ww = w + oh * 2;
  const cx = x0 + (ww >> 1);
  const body = h - 2;
  const ridge = Math.max(4, Math.round(ww * 0.42));

  for (let j = 0; j < body; j++) {
    const u = body <= 1 ? 1 : j / (body - 1);
    const width = Math.round(ridge + (ww - ridge) * u);
    const left = cx - (width >> 1);
    rect(t, left, y + j, width, 1, o.top);
    // the hip that turns away from the light is shaded, and so is the
    // right-hand half of the main plane
    const slope = Math.max(2, Math.round((width - ridge) / 2) + 1);
    rect(t, left + width - slope, y + j, slope, 1, o.shade);
    if (j > 1) rect(t, cx + Math.round(ridge * 0.2), y + j, Math.max(1, (width >> 1) - slope), 1, o.shade);
    // hip ridges running out to the corners
    put(t, left + slope - 1, y + j, o.shade);
    put(t, left + width - slope, y + j, o.top);
    put(t, left, y + j, ink);
    put(t, left + width - 1, y + j, ink);
  }
  hline(t, cx - (ridge >> 1), y, ridge, ink);
  hline(t, cx - (ridge >> 1) + 1, y + 1, ridge - 2, o.top);

  rect(t, x0, y + body, ww, 2, o.shade);
  hline(t, x0, y + body, ww, o.top);
  box(t, x0, y + body, ww, 2, -1, ink);
}

/**
 * Factory sawtooth. Each tooth is a vertical north-light glazed face that
 * rises to a peak, then a roof plane sloping away to the right — so the top
 * of the building is a proper zigzag silhouette, not a flat band.
 */
export function roofSawtooth(
  t: Target,
  x: number,
  y: number,
  w: number,
  h: number,
  teeth: number,
  o: RoofOptions & { glass?: number; glassDark?: number },
): void {
  const ink = o.ink ?? C.ink;
  const glass = o.glass ?? C.glass;
  const glassDark = o.glassDark ?? C.glassDark;
  const oh = o.overhang ?? 1;
  const x0 = x - oh;
  const ww = w + oh * 2;
  const fascia = 2;
  const body = h - fascia;
  const pitch = ww / teeth;

  for (let k = 0; k < teeth; k++) {
    const tx = Math.round(x0 + k * pitch);
    const nx = Math.round(x0 + (k + 1) * pitch);
    const tw = nx - tx;
    const glazeW = Math.max(3, Math.round(tw * 0.34));

    // glazed vertical face, full height of the tooth
    rect(t, tx, y, glazeW, body, glass);
    rect(t, tx, y + Math.floor(body / 2), glazeW, body - Math.floor(body / 2), glassDark);
    for (let g = 2; g < glazeW; g += 3) vline(t, tx + g, y, body, o.shade);
    hline(t, tx + 1, y + 1, glazeW - 2, C.white);

    // roof plane sloping down to the right
    const slopeW = tw - glazeW;
    for (let i = 0; i < slopeW; i++) {
      const u = slopeW <= 1 ? 1 : i / (slopeW - 1);
      const top = y + Math.round(u * (body - 1));
      vline(t, tx + glazeW + i, top, body - (top - y), o.top);
      put(t, tx + glazeW + i, top, ink);
      if (body - (top - y) > 3) vline(t, tx + glazeW + i, top + 1, 1, o.shade);
    }

    // ink the tooth silhouette
    vline(t, tx, y, body, ink);
    vline(t, tx + glazeW - 1, y, body, ink);
    hline(t, tx, y, glazeW, ink);
  }

  rect(t, x0, y + body, ww, fascia, o.shade);
  hline(t, x0, y + body, ww, o.top);
  box(t, x0, y + body, ww, fascia, -1, ink);
}

export interface TowerOptions extends RoofOptions {
  /** Wall colours of the tower shaft. */
  wall: number;
  wallShade: number;
  /** 'pyramid' | 'dome' | 'flat'. */
  cap?: 'pyramid' | 'dome' | 'flat';
  /** Optional clock face on the shaft. */
  clock?: boolean;
  clockFace?: number;
  clockHands?: number;
}

/**
 * A tower or turret: a shaft rising above the roofline with a cap. Draws from
 * `y` (top of the cap) down to `baseY`.
 */
export function tower(t: Target, cx: number, y: number, w: number, baseY: number, o: TowerOptions): void {
  const ink = o.ink ?? C.ink;
  const capH = o.cap === 'flat' ? 4 : Math.max(6, Math.round(w * 0.7));
  const x0 = cx - (w >> 1);
  const shaftY = y + capH;
  const shaftH = baseY - shaftY;

  // shaft
  rect(t, x0, shaftY, w, shaftH, o.wall);
  vline(t, x0 + w - 2, shaftY, shaftH, o.wallShade);
  vline(t, x0 + w - 1, shaftY, shaftH, o.wallShade);
  box(t, x0, shaftY, w, shaftH, -1, ink);

  // cap
  if (o.cap === 'flat') {
    rect(t, x0 - 1, y, w + 2, capH, o.top);
    hline(t, x0 - 1, y + capH - 2, w + 2, o.shade);
    box(t, x0 - 1, y, w + 2, capH, -1, ink);
  } else if (o.cap === 'dome') {
    for (let j = 0; j < capH; j++) {
      const u = (capH - 1 - j) / Math.max(1, capH - 1);
      const half = Math.round((w / 2 + 1) * Math.sqrt(Math.max(0, 1 - u * u)));
      rect(t, cx - half, y + j, half * 2 + 1, 1, o.top);
      rect(t, cx + 1, y + j, half, 1, o.shade);
      put(t, cx - half, y + j, ink);
      put(t, cx + half, y + j, ink);
    }
  } else {
    for (let j = 0; j < capH; j++) {
      const u = j / Math.max(1, capH - 1);
      const half = Math.round(((w + 2) / 2) * u);
      rect(t, cx - half, y + j, half * 2 + 1, 1, o.top);
      rect(t, cx + 1, y + j, half, 1, o.shade);
      put(t, cx - half, y + j, ink);
      put(t, cx + half, y + j, ink);
    }
    put(t, cx, y, ink);
  }
  hline(t, x0 - 1, shaftY, w + 2, o.shade);
  hline(t, x0 - 1, shaftY - 1, w + 2, ink);

  if (o.clock) {
    const r = Math.max(3, Math.min((w >> 1) - 3, Math.floor(shaftH / 2) - 3));
    const ccy = shaftY + Math.floor(shaftH / 2);
    clockFace(t, cx, ccy, r, o.clockFace ?? C.white, o.clockHands ?? ink, ink);
  }
}

/** A round clock face with hands at ten past ten. */
export function clockFace(t: Target, cx: number, cy: number, r: number, face: number, hands: number, ink: number): void {
  for (let j = -r; j <= r; j++) {
    const span = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.5 - j * j)));
    rect(t, cx - span, cy + j, span * 2 + 1, 1, face);
    put(t, cx - span - 1, cy + j, ink);
    put(t, cx + span + 1, cy + j, ink);
  }
  hline(t, cx - 1, cy - r - 1, 3, ink);
  hline(t, cx - 1, cy + r + 1, 3, ink);
  line(t, cx, cy, cx - r + 1, cy - r + 2, hands);
  line(t, cx, cy, cx + r - 2, cy - r + 2, hands);
  put(t, cx, cy, ink);
}

/** Chimney or smokestack rising from `y` to `baseY`, with a cap band. */
export function smokestack(
  t: Target,
  cx: number,
  y: number,
  w: number,
  baseY: number,
  body: number,
  shade: number,
  ink = C.ink,
  bandIndex = -1,
): void {
  const x0 = cx - (w >> 1);
  const h = baseY - y;
  rect(t, x0, y, w, h, body);
  vline(t, x0 + w - 1, y, h, shade);
  if (w > 3) vline(t, x0 + w - 2, y, h, shade);
  // cap
  rect(t, x0 - 1, y, w + 2, 2, shade);
  hline(t, x0 - 1, y, w + 2, body);
  box(t, x0 - 1, y, w + 2, 2, -1, ink);
  box(t, x0, y, w, h, -1, ink);
  if (bandIndex >= 0) {
    hline(t, x0 + 1, y + 5, w - 2, bandIndex);
    hline(t, x0 + 1, y + 6, w - 2, bandIndex);
  }
}

/** A puff of smoke: three overlapping blobs drifting up and to the right. */
export function smokePuff(t: Target, cx: number, cy: number, light: number, shade: number, ink = -1): void {
  const blobs: Array<[number, number, number]> = [
    [0, 0, 3],
    [3, -4, 4],
    [8, -8, 5],
  ];
  for (const [dx, dy, r] of blobs) {
    for (let j = -r; j <= r; j++) {
      const span = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.4 - j * j)));
      rect(t, cx + dx - span, cy + dy + j, span * 2 + 1, 1, light);
    }
    for (let j = 0; j <= r; j++) {
      const span = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.4 - j * j)));
      rect(t, cx + dx, cy + dy + j, span, 1, shade);
    }
    if (ink >= 0) {
      for (let j = -r; j <= r; j++) {
        const span = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.4 - j * j)));
        put(t, cx + dx - span - 1, cy + dy + j, ink);
        put(t, cx + dx + span + 1, cy + dy + j, ink);
      }
    }
  }
}
