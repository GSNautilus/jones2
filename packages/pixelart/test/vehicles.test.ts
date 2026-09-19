import { describe, expect, it } from 'vitest';
import { C } from '../src/palette';
import { CAR_COLOURS, CAR_HEADINGS, CAR_SIZE, SKY, carTopDown } from '../src/props/vehicles';

function count(pixels: Uint8Array, idx: number): number {
  let n = 0;
  for (const p of pixels) if (p === idx) n++;
  return n;
}

describe('top-down car', () => {
  it('is a 16x16 sprite anchored at its centre with an ink outline and a coloured body', () => {
    const s = carTopDown(0, 0);
    expect([s.width, s.height]).toEqual([CAR_SIZE, CAR_SIZE]);
    expect([s.anchorX, s.anchorY]).toEqual([8, 8]);
    expect(count(s.pixels, C.ink!)).toBeGreaterThan(20);
    expect(count(s.pixels, CAR_COLOURS[0]![0])).toBeGreaterThan(8);
  });

  it('points its headlights along the heading', () => {
    const east = carTopDown(0, 1);
    const west = carTopDown(Math.PI, 1);
    // east-facing: yellow pixels sit on the right half; west-facing: on the left
    const yellowX = (s: typeof east) => {
      let sum = 0;
      let n = 0;
      for (let i = 0; i < s.pixels.length; i++) {
        if (s.pixels[i] === C.yellow) {
          sum += i % s.width;
          n++;
        }
      }
      return n ? sum / n : NaN;
    };
    expect(yellowX(east)).toBeGreaterThan(8);
    expect(yellowX(west)).toBeLessThan(8);
  });

  it('rasterises every heading and every colour without leaving the sprite', () => {
    for (let h = 0; h < CAR_HEADINGS; h++) {
      for (let c = 0; c < CAR_COLOURS.length; c++) {
        const s = carTopDown((h / CAR_HEADINGS) * Math.PI * 2, c);
        expect(count(s.pixels, 0)).toBeLessThan(s.pixels.length - 40);
        // the outline never touches the sprite's border rows and columns
        for (let x = 0; x < s.width; x++) {
          expect(s.pixels[x]).toBe(0);
          expect(s.pixels[(s.height - 1) * s.width + x]).toBe(0);
        }
      }
    }
  });
});

describe('sky sprites', () => {
  it('has both bird frames, the plane both ways, and the helicopter rotor frames both ways', () => {
    for (const k of ['bird_0', 'bird_1', 'plane_e', 'plane_w', 'heli_e_0', 'heli_e_1', 'heli_w_0', 'heli_w_1']) {
      expect(SKY[k], k).toBeDefined();
      expect(count(SKY[k]!.pixels, 0)).toBeLessThan(SKY[k]!.pixels.length);
    }
    expect(SKY.bird_0!.pixels).not.toEqual(SKY.bird_1!.pixels);
    expect(SKY.heli_e_0!.pixels).not.toEqual(SKY.heli_e_1!.pixels);
  });

  it('mirrors the plane so the west-bound one has its nose on the left', () => {
    const e = SKY.plane_e!;
    const w = SKY.plane_w!;
    expect(w.width).toBe(e.width);
    for (let y = 0; y < e.height; y++) {
      for (let x = 0; x < e.width; x++) expect(w.pixels[y * w.width + (w.width - 1 - x)]).toBe(e.pixels[y * e.width + x]);
    }
  });
});
