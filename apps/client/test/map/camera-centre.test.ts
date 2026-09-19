import { describe, expect, it } from 'vitest';
import { centreOrigin, clampOrigin, type View } from '../../src/map/camera';

describe('clampOrigin with a layer smaller than the screen', () => {
  // The classic ring: 736x496 ground at zoom 2 on a 1700x1060 viewport.
  const small = (): View => ({ zoom: 2, originX: 0, originY: 0, width: 1700, height: 1060 });

  it('keeps a centred origin where it is', () => {
    const view = small();
    const o = centreOrigin(736 / 2, 496 / 2, view);
    view.originX = Math.round(o.x);
    view.originY = Math.round(o.y);
    const before = { x: view.originX, y: view.originY };
    clampOrigin(view, 736, 496);
    expect({ x: view.originX, y: view.originY }).toEqual(before);
    expect(view.originX).toBeLessThan(0);
  });

  it('lets the layer be dragged anywhere inside the screen, never off it', () => {
    const view = small();
    view.originX = -20; // the layer's left edge 20 px in from the screen's
    view.originY = -10;
    clampOrigin(view, 736, 496);
    expect(view.originX).toBe(-20);
    expect(view.originY).toBe(-10);
    view.originX = 50; // would push the layer off the left
    view.originY = -5000; // would push it off the bottom
    clampOrigin(view, 736, 496);
    expect(view.originX).toBe(0);
    expect(view.originY).toBe(496 - 530);
  });

  it('still pins a big layer inside the screen', () => {
    const view: View = { zoom: 1, originX: -500, originY: 5000, width: 800, height: 600 };
    clampOrigin(view, 2000, 1200);
    expect(Math.abs(view.originX)).toBe(0);
    expect(view.originY).toBe(600);
  });
});
