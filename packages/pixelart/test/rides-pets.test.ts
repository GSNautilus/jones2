import { describe, expect, it } from 'vitest';
import { C } from '../src/palette';
import { PET_IDS, PET_MOTION, petSprite } from '../src/props/pets';
import { RIDE_CAR_SIZE, bicycle, rideCar, skateboard } from '../src/props/rides';

const filled = (p: Uint8Array) => p.reduce((n, v) => n + (v ? 1 : 0), 0);
const count = (p: Uint8Array, idx: number) => p.reduce((n, v) => n + (v === idx ? 1 : 0), 0);

describe('rides', () => {
  it('draws a skateboard and a bicycle for every direction', () => {
    for (const d of ['n', 's', 'e', 'w'] as const) {
      expect(filled(skateboard(d).pixels)).toBeGreaterThan(4);
      expect(filled(bicycle(d).pixels)).toBeGreaterThan(8);
    }
  });

  it('mirrors the bicycle for west', () => {
    const e = bicycle('e');
    const w = bicycle('w');
    expect([w.width, w.height]).toEqual([e.width, e.height]);
    for (let y = 0; y < e.height; y++)
      for (let x = 0; x < e.width; x++) expect(w.pixels[y * w.width + (w.width - 1 - x)]).toBe(e.pixels[y * e.width + x]);
  });

  it('paints player cars in the given colour, centred, at any heading', () => {
    for (const kind of ['used_car', 'sports_car'] as const) {
      for (let h = 0; h < 16; h++) {
        const s = rideCar((h * Math.PI) / 8, kind, C.blue!, C.blueDark!);
        expect([s.width, s.height, s.anchorX, s.anchorY]).toEqual([RIDE_CAR_SIZE, RIDE_CAR_SIZE, 9, 9]);
        expect(count(s.pixels, C.blue!)).toBeGreaterThan(6);
      }
    }
    // The sports car carries a white stripe; the used car a rust patch.
    expect(count(rideCar(0, 'sports_car', C.red!, C.redDark!).pixels, C.white!)).toBeGreaterThan(2);
    expect(count(rideCar(0, 'used_car', C.blue!, C.blueDark!).pixels, C.orangeDark!)).toBeGreaterThan(0);
  });
});

describe('pets', () => {
  it('has all six, each facing both ways with two frames, outlined in ink', () => {
    expect([...PET_IDS]).toEqual(['goldfish', 'cat', 'dog', 'clownfish', 'owl', 'dragon']);
    for (const id of PET_IDS) {
      for (const dir of ['e', 'w'] as const) {
        for (const f of [0, 1]) {
          const s = petSprite(id, dir, f);
          expect(filled(s.pixels)).toBeGreaterThan(10);
          expect(count(s.pixels, C.ink!)).toBeGreaterThan(6);
          expect(s.width).toBeLessThanOrEqual(18);
        }
      }
    }
  });

  it('lets the fish swim and the owl and dragon fly', () => {
    expect(PET_MOTION.goldfish).toBe('swim');
    expect(PET_MOTION.clownfish).toBe('swim');
    expect(PET_MOTION.owl).toBe('fly');
    expect(PET_MOTION.dragon).toBe('fly');
    expect(PET_MOTION.dog).toBe('ground');
  });
});
