import { describe, expect, it } from 'vitest';
import { getArt } from '../../src/map/art';
import { drawFigureCaption, drawFigureLabel, resolveFigure } from '../../src/map/figures';
import { RenderPalette, createSurface, get } from '../../src/map/surface';
import { riverton, type Town } from '@jones2/town';

describe('caption bubble', () => {
  it('draws white above the name plate for a captioned token', () => {
    const art = getArt();
    const pal = new RenderPalette(art.palette);
    const town = riverton as Town;
    const node = town.nodes.find((n) => n.id === 'lowcost')!;
    const f = resolveFigure(town, { id: 'p', style: { color: '#ff0000', label: '#1 Ann', caption: 'Walked to Low-Cost Housing' }, pose: { kind: 'at', node: 'lowcost' } }, 0)!;
    expect(f.caption).toBe('Walked to Low-Cost Housing');
    const ox = node.x - 100;
    const oy = node.y - 100;
    const s = createSurface(200, 200, 0);
    drawFigureLabel(s, pal, f, 16, ox, oy);
    drawFigureCaption(s, pal, f, 16, ox, oy);
    const white = pal.index('white', [242, 242, 238]);
    let whites = 0;
    for (let y = 0; y < 100; y++) for (let x = 0; x < 200; x++) if (get(s, x, y) === white) whites++;
    expect(whites).toBeGreaterThan(100);
  });
});

describe('caption bubble zoomed out', () => {
  it('draws the text doubled, in a bubble about twice as wide', () => {
    const art = getArt();
    const pal = new RenderPalette(art.palette);
    const town = riverton as Town;
    const node = town.nodes.find((n) => n.id === 'lowcost')!;
    const f = resolveFigure(town, { id: 'p', style: { color: '#ff0000', label: '#1 Ann', caption: 'Worked a shift' }, pose: { kind: 'at', node: 'lowcost' } }, 0)!;
    const ox = node.x - 150;
    const oy = node.y - 100;
    const ink = pal.index('ink', [29, 26, 36]);
    const widthOfInk = (scale: number) => {
      const s = createSurface(300, 200, 0);
      drawFigureCaption(s, pal, f, 16, ox, oy, [], scale);
      let minX = 300;
      let maxX = -1;
      for (let y = 0; y < 100; y++) for (let x = 0; x < 300; x++) if (get(s, x, y) === ink) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
      return maxX - minX + 1;
    };
    const w1 = widthOfInk(1);
    const w2 = widthOfInk(2);
    expect(w2).toBeGreaterThan(w1 * 1.7);
    expect(w2).toBeLessThan(w1 * 2.2);
  });
});
