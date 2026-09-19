import { C, FRAME_INSETS } from '@jones2/pixelart';
import { describe, expect, it } from 'vitest';
import { BUTTON_H, MIN_BUTTON_W } from '../../src/classic/layout';
import { CHROME_PAD, hitChrome, layoutChrome, renderChrome, type ChromeModel } from '../../src/classic/chrome';

const BAR: ChromeModel = {
  arrange: 'row',
  buttons: [
    { key: 'goals', label: 'GOALS' },
    { key: 'stats', label: 'STATISTICS' },
    { key: 'options', label: 'OPTIONS' },
  ],
};

const READOUT: ChromeModel = {
  arrange: 'stack',
  display: ['$1,234', '57H LEFT'],
  buttons: [{ key: 'end', label: 'END TURN' }],
};

describe('chrome layout', () => {
  it('lays a row of buttons side by side, each at least the minimum width', () => {
    const l = layoutChrome(BAR);
    expect(l.display).toBeNull();
    expect(l.buttons).toHaveLength(3);
    for (const b of l.buttons) {
      expect(b.rect.h).toBe(BUTTON_H);
      expect(b.rect.w).toBeGreaterThanOrEqual(MIN_BUTTON_W);
      expect(b.rect.x).toBeGreaterThanOrEqual(CHROME_PAD);
    }
    expect(l.buttons[1]!.rect.x).toBeGreaterThan(l.buttons[0]!.rect.x + l.buttons[0]!.rect.w);
    expect(l.buttons[1]!.rect.w).toBeGreaterThan(l.buttons[0]!.rect.w); // STATISTICS is the long one
    expect(l.width).toBe(l.buttons[2]!.rect.x + l.buttons[2]!.rect.w + CHROME_PAD);
    expect(l.height).toBe(CHROME_PAD * 2 + BUTTON_H);
  });

  it('stacks a readout over a full-width button, the first line doubled', () => {
    const l = layoutChrome(READOUT);
    expect(l.display).not.toBeNull();
    expect(l.lines[0]!.scale).toBe(2);
    expect(l.lines[1]!.scale).toBe(1);
    expect(l.lines[0]!.y).toBeLessThan(l.lines[1]!.y);
    const btn = l.buttons[0]!.rect;
    expect(btn.w).toBe(l.display!.w);
    expect(btn.y).toBeGreaterThan(l.display!.y + l.display!.h);
    // lines are right-aligned inside the readout
    expect(l.lines[0]!.x).toBeLessThan(l.lines[1]!.x);
  });

  it('hits the button under a point and nothing beside it', () => {
    const l = layoutChrome(BAR);
    const b = l.buttons[1]!.rect;
    expect(hitChrome(l, b.x + 2, b.y + 2)).toBe(1);
    expect(hitChrome(l, b.x - 1, b.y + 2)).toBe(-1);
    expect(hitChrome(l, 1, 1)).toBe(-1);
  });
});

describe('chrome painting', () => {
  it('paints the gold frame, a dark readout with green digits, and the button labels', () => {
    const { surface, layout } = renderChrome(READOUT);
    expect(surface.width).toBe(layout.width);
    const count = (idx: number) => {
      let n = 0;
      for (const p of surface.pixels) if (p === idx) n++;
      return n;
    };
    expect(count(C.leafLight!)).toBeGreaterThan(20); // the cash
    expect(count(C.cream!)).toBeGreaterThan(10); // the hours line and the frame
    // the readout box is dark inside
    const d = layout.display!;
    expect(surface.pixels[(d.y + 4) * surface.width + d.x + 3]).toBe(C.ink);
    // the frame border sits in the outer insets
    let border = 0;
    for (let x = 0; x < surface.width; x++) if (surface.pixels[x + surface.width * 2] !== 0) border++;
    expect(border).toBeGreaterThan(surface.width - FRAME_INSETS.left * 2);
  });

  it('draws a hovered and a pressed button differently from an idle one', () => {
    const idle = renderChrome(BAR).surface.pixels;
    const hover = renderChrome(BAR, { hover: 0, pressed: -1 }).surface.pixels;
    const pressed = renderChrome(BAR, { hover: 0, pressed: 0 }).surface.pixels;
    expect(hover).not.toEqual(idle);
    expect(pressed).not.toEqual(hover);
  });
});
