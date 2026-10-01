/**
 * What a player rides on the map while travelling (the Wheels & Whiskers expansion): a skateboard
 * or a bicycle under the walker, or a car the walker gets into. The skateboard and bicycle face
 * the four walking directions like the characters; the cars are true top-down like the road
 * traffic (`carTopDown`), painted in the player's colour, and rasterised at any heading.
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { createSprite, put, spriteFromRows } from '../surface';

export type RideDir = 'n' | 's' | 'e' | 'w';

const BOARD: Record<string, number> = { d: C.red!, D: C.redDark!, w: C.ink! };

/** A skateboard, anchored at the middle of its deck top: the walker's feet go there. */
export function skateboard(dir: RideDir): Sprite {
  const side = dir === 'e' || dir === 'w';
  const rows = side ? ['dddddddddd', 'DDDDDDDDDD', '.w......w.'] : ['dddd', 'DDDD', 'w..w'];
  return spriteFromRows(rows, BOARD, { anchorY: 0 });
}

const BIKE: Record<string, number> = { o: C.ink!, f: C.teal!, s: C.inkSoft!, h: C.metal!, x: C.metalDark! };

const BIKE_EAST = [
  '....ss....hh...',
  '.....f....f....',
  '..ooo.ffff.ooo.',
  '.o...offf.o...o',
  '.o.x.o...fo.x.o',
  '.o...o....o...o',
  '..ooo......ooo.',
];
const BIKE_END = ['hhhhh', '..f..', '..o..', '..o..', '..o..', '..o..', '..o..'];

/**
 * A bicycle, anchored at the ground under its middle; the walker stands a little raised over it,
 * legs on the frame. East-facing art mirrored for west; end-on for north and south.
 */
export function bicycle(dir: RideDir): Sprite {
  if (dir === 'n' || dir === 's') return spriteFromRows(BIKE_END, BIKE);
  const rows = dir === 'e' ? BIKE_EAST : BIKE_EAST.map((r) => [...r].reverse().join(''));
  return spriteFromRows(rows, BIKE, { anchorX: 7 });
}

export const RIDE_CAR_SIZE = 18;

/**
 * A player's car from above, nose along `angle` (radians, 0 = east), 18x18 anchored at the
 * centre. `face`/`shade` are palette indices (the player's colour and a darker one). The used car
 * is short and boxy with a rust patch; the sports car is long and low with a racing stripe and a
 * spoiler.
 */
export function rideCar(angle: number, kind: 'used_car' | 'sports_car', face: number, shade: number): Sprite {
  const N = RIDE_CAR_SIZE;
  const sports = kind === 'sports_car';
  const len = sports ? 7.6 : 6.2;
  const wid = 3.6;
  const t = createSprite(N, N, N >> 1, N >> 1, 14, 8);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const local = (px: number, py: number) => {
    const cx = px + 0.5 - N / 2;
    const cy = py + 0.5 - N / 2;
    return { u: cx * cos + cy * sin, v: -cx * sin + cy * cos };
  };
  const inBody = (u: number, v: number) =>
    Math.abs(u) <= len && Math.abs(v) <= wid && !(Math.abs(u) > len - 1 && Math.abs(v) > wid - 0.8);
  const body = (px: number, py: number) => px >= 0 && py >= 0 && px < N && py < N && inBody(local(px, py).u, local(px, py).v);
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      if (!body(px, py)) continue;
      const { u, v } = local(px, py);
      const edge = !body(px - 1, py) || !body(px + 1, py) || !body(px, py - 1) || !body(px, py + 1);
      let idx = face;
      if (edge) idx = C.ink!;
      else if (sports && u < -len + 1.6) idx = C.ink!; // the spoiler
      else if (sports && Math.abs(v) <= 0.6 && Math.abs(u + 0.6) > 2.2) idx = C.white!; // racing stripe, bonnet and boot
      else if (Math.abs(u - (sports ? -0.6 : 0)) <= (sports ? 2.2 : 3.2) && Math.abs(v) <= wid - 1)
        idx = Math.abs(u - (sports ? -0.6 : 0)) <= (sports ? 0.8 : 1.4) ? face : C.glassDark!; // cabin
      else if (Math.abs(v) > wid - 1) idx = shade; // sills
      else if (u > len - 2 && Math.abs(v) > 0.9) idx = C.yellow!; // headlights
      else if (u < -len + 2 && Math.abs(v) > 0.9) idx = C.red!; // tail lights
      if (!sports && !edge && u > 1.6 && u < 3 && v > 1.2 && v < 2.6) idx = C.orangeDark!; // rust
      put(t, px, py, idx);
    }
  }
  return t;
}
