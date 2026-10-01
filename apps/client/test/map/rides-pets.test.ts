import { describe, expect, it } from 'vitest';
import { riverton, type Town } from '@jones2/town';
import { getArt } from '../../src/map/art';
import { drawFigure, resolveFigure, shadeHex } from '../../src/map/figures';
import { RenderPalette, createSurface, get } from '../../src/map/surface';

const town = riverton as Town;
const art = getArt();

/** Draw one token figure on a blank 200x200 surface centred on its position; count each colour. */
function draw(style: { pet?: string }, pose: Parameters<typeof resolveFigure>[1]['pose']) {
  const pal = new RenderPalette(art.palette);
  const f = resolveFigure(town, { id: 'p', style: { color: '#c8452f', label: '#1 Ann', ...style }, pose }, 1000)!;
  const s = createSurface(200, 200, 0);
  drawFigure(s, art, pal, f, f.nx - 100, f.ny - 100);
  const counts = new Map<number, number>();
  for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) counts.set(get(s, x, y), (counts.get(get(s, x, y)) ?? 0) + 1);
  return { f, pal, counts };
}

describe('Wheels & Whiskers on the map', () => {
  it('carries the vehicle on a moving pose and the pet on the style', () => {
    const { f } = draw({ pet: 'dog' }, { kind: 'between', from: 'bus_depot', to: 'lowcost', t: 0.5, vehicle: 'bicycle' });
    expect(f.vehicle).toBe('bicycle');
    expect(f.pet).toBe('dog');
    const at = resolveFigure(town, { id: 'p', style: { color: '#fff', label: '#1 A' }, pose: { kind: 'at', node: 'lowcost' } }, 0)!;
    expect(at.vehicle).toBeUndefined();
  });

  it('draws a car in the player\'s colour instead of the walker', () => {
    const pose = { kind: 'between' as const, from: 'bus_depot', to: 'lowcost', t: 0.5 };
    const walking = draw({}, pose);
    const driving = draw({}, { ...pose, vehicle: 'sports_car' });
    const red = driving.pal.hex('#c8452f');
    const dark = driving.pal.hex(shadeHex('#c8452f'));
    // The car body is mostly the player's colour and its darker sills.
    expect((driving.counts.get(red) ?? 0) + (driving.counts.get(dark) ?? 0)).toBeGreaterThan(30);
    expect(driving.counts.get(dark) ?? 0).toBeGreaterThan(walking.counts.get(dark) ?? 0);
  });

  it('adds the pet beside the token', () => {
    const plain = draw({}, { kind: 'at', node: 'lowcost' });
    const withPet = draw({ pet: 'clownfish' }, { kind: 'at', node: 'lowcost' });
    const filled = (c: Map<number, number>) => [...c.entries()].filter(([k]) => k !== 0).reduce((n, [, v]) => n + v, 0);
    expect(filled(withPet.counts)).toBeGreaterThan(filled(plain.counts) + 15);
  });

  it('darkens a hex colour', () => {
    expect(shadeHex('#ffffff', 0.5)).toBe('#808080');
    expect(shadeHex('#c8452f')).toBe('#8c3021');
  });
});
