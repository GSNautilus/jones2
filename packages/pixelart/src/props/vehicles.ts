/**
 * The things that move on their own: top-down cars for the roads, birds,
 * a plane and a helicopter for the sky. Unlike the parked cars in the props
 * catalogue (three-quarter side views), a driving car is drawn TRUE top-down
 * so it can be rasterised at any heading: the body is a rounded box in the
 * car's own frame and every sprite pixel is rotated back into it.
 *
 * All of these anchor at their centre, not at a footprint, because they are
 * overlays the renderer drops at a world point rather than inhabitants that
 * stand on the ground.
 */
import { C } from '../palette';
import type { Sprite, SpriteMap } from '../types';
import { box, createSprite, fillEllipse, hline, put, rect, vline } from '../surface';

/** Body colours a car may have, as [face, shade] palette pairs. */
export const CAR_COLOURS: ReadonlyArray<readonly [number, number]> = [
  [C.red!, C.redDark!],
  [C.blue!, C.blueDark!],
  [C.cream!, C.creamShade!],
  [C.green!, C.greenDark!],
  [C.yellow!, C.yellowDark!],
  [C.metal!, C.metalDark!],
];

export const CAR_SIZE = 16;
/** Headings a car sprite is rasterised at; the renderer picks the nearest. */
export const CAR_HEADINGS = 16;

/**
 * A top-down car pointing along `angle` (radians, 0 = east, clockwise on
 * screen because y runs down). 16x16, anchored at the centre.
 */
export function carTopDown(angle: number, colour = 0): Sprite {
  const [face, shade] = CAR_COLOURS[((colour % CAR_COLOURS.length) + CAR_COLOURS.length) % CAR_COLOURS.length]!;
  const t = createSprite(CAR_SIZE, CAR_SIZE, CAR_SIZE >> 1, CAR_SIZE >> 1, 12, 8);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const half = CAR_SIZE / 2;
  const body: boolean[] = new Array(CAR_SIZE * CAR_SIZE).fill(false);
  // local frame: u along the car (nose at +u), v across it
  const local = (px: number, py: number): { u: number; v: number } => {
    const cx = px + 0.5 - half;
    const cy = py + 0.5 - half;
    return { u: cx * cos + cy * sin, v: -cx * sin + cy * cos };
  };
  for (let py = 0; py < CAR_SIZE; py++) {
    for (let px = 0; px < CAR_SIZE; px++) {
      const { u, v } = local(px, py);
      // a box with rounded corners
      const inBody = Math.abs(u) <= 6.2 && Math.abs(v) <= 3.4 && !(Math.abs(u) > 5.2 && Math.abs(v) > 2.6);
      body[py * CAR_SIZE + px] = inBody;
    }
  }
  for (let py = 0; py < CAR_SIZE; py++) {
    for (let px = 0; px < CAR_SIZE; px++) {
      if (!body[py * CAR_SIZE + px]) continue;
      const { u, v } = local(px, py);
      const edge =
        px === 0 || py === 0 || px === CAR_SIZE - 1 || py === CAR_SIZE - 1 ||
        !body[py * CAR_SIZE + px - 1] || !body[py * CAR_SIZE + px + 1] ||
        !body[(py - 1) * CAR_SIZE + px] || !body[(py + 1) * CAR_SIZE + px];
      let idx = face;
      if (edge) idx = C.ink!;
      else if (Math.abs(u) <= 3.4 && Math.abs(v) <= 2.4) idx = Math.abs(u) <= 1.6 ? face : C.glassDark!; // roof between the screens
      else if (Math.abs(v) > 2.4) idx = shade; // the sills
      else if (u > 4.0 && Math.abs(v) > 0.9) idx = C.yellow!; // headlights
      else if (u < -4.0 && Math.abs(v) > 0.9) idx = C.red!; // tail lights
      put(t, px, py, idx);
    }
  }
  return t;
}

function bird(frame: number): Sprite {
  const t = createSprite(5, 3, 2, 1, 5, 3);
  if (frame === 0) {
    // wings up: a shallow V
    put(t, 0, 0, C.ink!);
    put(t, 4, 0, C.ink!);
    put(t, 1, 1, C.ink!);
    put(t, 3, 1, C.ink!);
    put(t, 2, 2, C.ink!);
  } else {
    // wings down
    put(t, 2, 0, C.ink!);
    put(t, 1, 1, C.ink!);
    put(t, 3, 1, C.ink!);
    put(t, 0, 2, C.ink!);
    put(t, 4, 2, C.ink!);
  }
  return t;
}

/** A small airliner seen from above, nose to the east. */
function plane(): Sprite {
  const t = createSprite(16, 12, 8, 6, 16, 12);
  box(t, 1, 4, 13, 4, C.white!, C.ink!); // fuselage
  box(t, 6, 0, 3, 12, C.stone!, C.ink!); // wings
  box(t, 0, 2, 2, 8, C.stone!, C.ink!); // tail plane
  rect(t, 7, 1, 1, 10, C.white!); // wing highlight
  put(t, 14, 5, C.ink!);
  put(t, 14, 6, C.ink!);
  put(t, 12, 5, C.glass!); // cockpit
  put(t, 12, 6, C.glass!);
  return t;
}

/** A helicopter from above, nose to the east; `frame` turns the rotor. */
function helicopter(frame: number): Sprite {
  const t = createSprite(20, 16, 10, 8, 20, 16);
  // tail boom and fin
  hline(t, 1, 8, 8, C.ink!);
  hline(t, 1, 7, 8, C.metal!);
  hline(t, 1, 6, 8, C.ink!);
  vline(t, 1, 4, 7, C.ink!);
  vline(t, 2, 5, 5, C.metalDark!);
  // cabin
  fillEllipse(t, 13, 7, 6, 4, C.ink!);
  fillEllipse(t, 13, 7, 5, 3, C.red!);
  fillEllipse(t, 15, 7, 2, 2, C.glass!);
  // skids
  hline(t, 9, 12, 8, C.inkSoft!);
  hline(t, 9, 2, 8, C.inkSoft!);
  // rotor: two blades, turning
  if (frame % 2 === 0) {
    hline(t, 4, 7, 18, C.inkSoft!);
  } else {
    vline(t, 13, 0, 16, C.inkSoft!);
  }
  put(t, 13, 7, C.ink!); // hub
  return t;
}

function mirrorX(s: Sprite): Sprite {
  const m = createSprite(s.width, s.height, s.width - 1 - s.anchorX, s.anchorY, s.footprintW, s.footprintH);
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) m.pixels[y * s.width + (s.width - 1 - x)] = s.pixels[y * s.width + x]!;
  }
  return m;
}

/** Sky sprites by name: `bird_0/1`, `plane_e/w`, `heli_e_0/1`, `heli_w_0/1`. */
export const SKY: SpriteMap = {
  bird_0: bird(0),
  bird_1: bird(1),
  plane_e: plane(),
  plane_w: mirrorX(plane()),
  heli_e_0: helicopter(0),
  heli_e_1: helicopter(1),
  heli_w_0: mirrorX(helicopter(0)),
  heli_w_1: mirrorX(helicopter(1)),
};
