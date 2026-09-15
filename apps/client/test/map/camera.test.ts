import { describe, expect, it } from 'vitest';
import { PX_PER_UNIT } from '../../src/map/art';
import {
  type View,
  ZOOM_LEVELS,
  centreOrigin,
  fitZoom,
  originAfterZoomAt,
  screenToNative,
  screenToTown,
  stepZoom,
  townToScreen,
} from '../../src/map/camera';

function view(zoom: number, originX: number, originY: number, width = 800, height = 600): View {
  return { zoom, originX, originY, width, height };
}

describe('zoom levels', () => {
  it('are all integers', () => {
    for (const z of ZOOM_LEVELS) expect(Number.isInteger(z)).toBe(true);
  });
});

describe('fitZoom', () => {
  it('picks the largest level that fits', () => {
    expect(fitZoom(100, 100, 400, 400)).toBe(4);
    expect(fitZoom(100, 100, 350, 350)).toBe(3);
    expect(fitZoom(100, 100, 250, 250)).toBe(2);
  });

  it('is limited by the tighter axis', () => {
    expect(fitZoom(100, 100, 1000, 250)).toBe(2);
  });

  it('always returns an integer level', () => {
    for (const w of [37, 120, 640, 1913]) {
      for (const h of [41, 300, 900]) {
        const z = fitZoom(w, h, 1024, 768);
        expect(Number.isInteger(z)).toBe(true);
        expect(ZOOM_LEVELS).toContain(z);
      }
    }
  });

  it('picks level 1 for a town too big for level 2', () => {
    // A large town has to be viewable whole, even at native resolution.
    expect(fitZoom(900, 700, 1000, 800)).toBe(1);
  });

  it('falls back to the smallest level when nothing fits', () => {
    expect(fitZoom(5000, 5000, 100, 100)).toBe(1);
  });
});

describe('stepZoom', () => {
  it('goes one step in on a factor below 1 and one step out above', () => {
    expect(stepZoom(2, -1)).toBe(3);
    expect(stepZoom(3, -1)).toBe(4);
    expect(stepZoom(4, -1)).toBe(4);
    expect(stepZoom(4, 1)).toBe(3);
    expect(stepZoom(2, 1)).toBe(1);
    expect(stepZoom(1, 1)).toBe(1);
    expect(stepZoom(1, -1)).toBe(2);
  });
});

describe('screenToTown', () => {
  it('maps the canvas origin to the view origin', () => {
    const v = view(2, 60, 30);
    expect(screenToTown(0, 0, v)).toEqual({ x: 60 / PX_PER_UNIT, y: 30 / PX_PER_UNIT });
  });

  it('is correct at zoom 2 with a pan offset', () => {
    const v = view(2, 60, 30);
    const hit = screenToTown(100, 50, v);
    expect(hit.x).toBeCloseTo((60 + 100 / 2) / PX_PER_UNIT, 9);
    expect(hit.y).toBeCloseTo((30 + 50 / 2) / PX_PER_UNIT, 9);
  });

  it('is correct at zoom 3 with a pan offset', () => {
    const v = view(3, -12, 210);
    const hit = screenToTown(90, 33, v);
    expect(hit.x).toBeCloseTo((-12 + 90 / 3) / PX_PER_UNIT, 9);
    expect(hit.y).toBeCloseTo((210 + 33 / 3) / PX_PER_UNIT, 9);
  });

  it('round-trips through townToScreen at every zoom level', () => {
    for (const z of ZOOM_LEVELS) {
      const v = view(z, 77, -14);
      for (const [sx, sy] of [
        [0, 0],
        [13, 401],
        [799, 599],
      ]) {
        const t = screenToTown(sx!, sy!, v);
        const back = townToScreen(t.x, t.y, v);
        expect(back.x).toBeCloseTo(sx!, 6);
        expect(back.y).toBeCloseTo(sy!, 6);
      }
    }
  });

  it('agrees with screenToNative up to the unit scale', () => {
    const v = view(4, 5, 9);
    const t = screenToTown(63, 21, v);
    const n = screenToNative(63, 21, v);
    expect(n.x).toBeCloseTo(t.x * PX_PER_UNIT, 9);
    expect(n.y).toBeCloseTo(t.y * PX_PER_UNIT, 9);
  });
});

describe('centreOrigin', () => {
  it('puts the requested town point at the middle of the canvas', () => {
    const v = view(3, 0, 0, 800, 600);
    const o = centreOrigin(40, 25, v);
    const centred: View = { ...v, originX: o.x, originY: o.y };
    const screen = townToScreen(40, 25, centred);
    expect(screen.x).toBeCloseTo(400, 6);
    expect(screen.y).toBeCloseTo(300, 6);
  });
});

describe('originAfterZoomAt', () => {
  it('keeps the point under the cursor fixed across a zoom step', () => {
    const before = view(2, 60, 30);
    const town = screenToTown(250, 180, before);
    const next = stepZoom(before.zoom, -1);
    const o = originAfterZoomAt(250, 180, town, next);
    const after: View = { ...before, zoom: next, originX: o.x, originY: o.y };
    const back = screenToTown(250, 180, after);
    expect(back.x).toBeCloseTo(town.x, 9);
    expect(back.y).toBeCloseTo(town.y, 9);
  });
});
