import { describe, expect, it } from 'vitest';
import { layoutPanel, textWidth, TOUCH_BUTTON_H, TOUCH_ROW_H, ROW_H, scrollAfterDrag, type PanelModel } from '../../src/classic/layout';
import { layoutChrome } from '../../src/classic/chrome';
import {
  DESKTOP_SCALE,
  MIN_PANEL_W,
  crispScales,
  devicePixels,
  fitPanel,
  chooseLayout,
  placeFurniture,
  windowArea,
  REFERENCE_WINDOW,
  type Furniture,
  type ScreenInfo,
} from '../../src/classic/screen';

function model(rows: number): PanelModel {
  return {
    title: 'EMPLOYMENT OFFICE',
    portrait: 'employment',
    bubble: 'WHERE WOULD YOU LIKE TO WORK?',
    rows: Array.from({ length: rows }, (_, i) => ({ key: `r${i}`, text: `JOB ${i}`, value: '$5', hours: '1H' })),
    buttons: [
      { key: 'work', label: 'WORK' },
      { key: 'done', label: 'DONE' },
    ],
  };
}

const DESKTOP: ScreenInfo = { width: 1920, height: 1080, dpr: 1, touch: false };
const LAPTOP_125: ScreenInfo = { width: 1536, height: 864, dpr: 1.25, touch: false };
const PHONE: ScreenInfo = { width: 390, height: 664, dpr: 3, touch: true };
const PHONE_LANDSCAPE: ScreenInfo = { width: 844, height: 340, dpr: 3, touch: true };
const SMALL_ANDROID: ScreenInfo = { width: 360, height: 640, dpr: 2, touch: true };
const IPAD_PORTRAIT: ScreenInfo = { width: 820, height: 1180, dpr: 2, touch: true };

/** Every art pixel covers a whole number of device pixels. */
function crisp(scale: number, dpr: number): boolean {
  return Math.abs(scale * dpr - Math.round(scale * dpr)) < 1e-6;
}

describe('crispScales', () => {
  it('is ×2 then ×1 on an ordinary monitor', () => {
    expect(crispScales(1)).toEqual([2, 1]);
  });

  it('adds the in-between steps a phone can show crisply', () => {
    const s = crispScales(3);
    expect(s[0]).toBe(2);
    expect(s.at(-1)).toBe(1);
    expect(s.map((x) => Math.round(x * 3))).toEqual([6, 5, 4, 3]);
    for (const x of s) expect(crisp(x, 3)).toBe(true);
  });

  it('keeps ×2 first on a scaled laptop, so a desktop looks as it always has', () => {
    expect(crispScales(1.25)[0]).toBe(2);
  });

  it('survives a nonsense ratio', () => {
    expect(crispScales(0)).toEqual([2, 1]);
    expect(crispScales(Number.NaN)).toEqual([2, 1]);
  });

  it('sizes a backing store in whole device pixels', () => {
    expect(devicePixels(4 / 3, 3)).toBe(4);
    expect(devicePixels(2, 1)).toBe(2);
    expect(devicePixels(0.1, 1)).toBe(1);
  });
});

describe('touch density', () => {
  it('lays rows and buttons out taller for a finger', () => {
    const mouse = layoutPanel(model(5), { width: 300 });
    const touch = layoutPanel(model(5), { width: 300, density: 'touch' });
    expect(mouse.rowH).toBe(ROW_H);
    expect(touch.rowH).toBe(TOUCH_ROW_H);
    expect(touch.rows[1]!.rect.y - touch.rows[0]!.rect.y).toBe(TOUCH_ROW_H);
    expect(touch.buttons[0]!.rect.h).toBe(TOUCH_BUTTON_H);
    expect(touch.height).toBeGreaterThan(mouse.height);
  });

  it('scrolls a dragged list by whole rows, clamped to the list', () => {
    const m = model(30);
    const l = layoutPanel(m, { maxListRows: 10, density: 'touch' });
    // Dragging up by three rows shows three later rows.
    expect(scrollAfterDrag(m, l, 0, -3 * l.rowH)).toBe(3);
    expect(scrollAfterDrag(m, l, 5, 2 * l.rowH)).toBe(3);
    expect(scrollAfterDrag(m, l, 0, 50 * l.rowH)).toBe(0);
    expect(scrollAfterDrag(m, l, 0, -500 * l.rowH)).toBe(20);
  });
});

describe('fitPanel', () => {
  it('gives a desktop exactly the designed window', () => {
    const fit = fitPanel(model(11), { width: 380, maxListRows: 11 }, DESKTOP);
    expect(fit).toEqual({ scale: DESKTOP_SCALE, width: 380, maxListRows: 11, density: 'mouse', fits: true });
  });

  it('keeps ×2 on a 125% laptop', () => {
    expect(fitPanel(model(11), { width: 380, maxListRows: 11 }, LAPTOP_125).scale).toBe(2);
  });

  it('fits a portrait phone: crisp, inside the screen, still a usable list', () => {
    for (const screen of [PHONE, SMALL_ANDROID]) {
      const fit = fitPanel(model(39), { width: 380, maxListRows: 11 }, screen);
      expect(crisp(fit.scale, screen.dpr)).toBe(true);
      expect(fit.density).toBe('touch');
      expect(fit.width).toBeGreaterThanOrEqual(MIN_PANEL_W);
      const l = layoutPanel(model(39), { width: fit.width, maxListRows: fit.maxListRows, density: fit.density });
      expect(l.width * fit.scale).toBeLessThanOrEqual(screen.width);
      expect(l.height * fit.scale).toBeLessThanOrEqual(screen.height);
      expect(fit.maxListRows).toBeGreaterThanOrEqual(4);
    }
  });

  it('shows the art bigger than ×1 on a phone held upright', () => {
    expect(fitPanel(model(39), { width: 380, maxListRows: 11 }, PHONE).scale).toBeGreaterThan(1);
  });

  it('fits a phone on its side by shortening the list or the scale', () => {
    const fit = fitPanel(model(39), { width: 380, maxListRows: 11 }, PHONE_LANDSCAPE);
    const l = layoutPanel(model(39), { width: fit.width, maxListRows: fit.maxListRows, density: fit.density });
    expect(l.height * fit.scale).toBeLessThanOrEqual(PHONE_LANDSCAPE.height);
    expect(fit.maxListRows).toBeGreaterThanOrEqual(1);
  });

  it('handles a window with no list', () => {
    const empty = { ...model(0), portrait: undefined };
    const fit = fitPanel(empty, { width: 300, maxListRows: 4 }, PHONE);
    const l = layoutPanel(empty, { width: fit.width, maxListRows: fit.maxListRows, density: fit.density });
    expect(l.width * fit.scale).toBeLessThanOrEqual(PHONE.width);
  });
});

const FURNITURE: Furniture = (() => {
  const box = (m: Parameters<typeof layoutChrome>[0]) => {
    const l = layoutChrome(m);
    return { w: l.width, h: l.height };
  };
  const bar = [
    { key: 'goals', label: 'GOALS' },
    { key: 'stats', label: 'STATISTICS' },
    { key: 'options', label: 'OPTIONS' },
  ];
  return {
    bar: box({ arrange: 'row', buttons: bar }),
    barStack: box({ arrange: 'stack', buttons: bar }),
    readout: box({ arrange: 'stack', display: ['$9,999,999', '60H LEFT'], buttons: [{ key: 'end', label: 'END TURN' }] }),
    clock: 96,
  };
})();

describe('chooseLayout: nothing overlaps', () => {
  it('keeps a desktop in the original corners at ×2', () => {
    expect(chooseLayout(DESKTOP, FURNITURE)).toMatchObject({ mode: 'corners', scale: 2 });
    // A 1440x900 laptop's browser window, less its tabs and address bar.
    expect(chooseLayout({ width: 1440, height: 790, dpr: 1, touch: false }, FURNITURE)).toMatchObject({ mode: 'corners', scale: 2 });
  });

  it('moves the furniture to a rail on a short landscape screen', () => {
    expect(chooseLayout({ width: 1366, height: 650, dpr: 1, touch: false }, FURNITURE)).toMatchObject({ mode: 'rail', scale: 2 });
    expect(chooseLayout(PHONE_LANDSCAPE, FURNITURE).mode).toBe('rail');
  });

  it('docks a portrait screen', () => {
    expect(chooseLayout(PHONE, FURNITURE).mode).toBe('dock');
    expect(chooseLayout(IPAD_PORTRAIT, FURNITURE)).toMatchObject({ mode: 'dock', scale: 2 });
  });

  it('a stack of buttons is as wide as its widest button, not the row', () => {
    expect(FURNITURE.barStack.w).toBeLessThan(FURNITURE.bar.w);
  });

  it('across screen sizes: the furniture fits and the biggest window fits beside it', () => {
    const failures: string[] = [];
    for (const dpr of [1, 1.25, 1.5, 2, 3]) {
      for (const touch of [false, true]) {
        for (let width = 360; width <= 2560; width += 40) {
          for (let height = 360; height <= 1440; height += 40) {
            const screen = { width, height, dpr, touch };
            const layout = chooseLayout(screen, FURNITURE);
            const placed = placeFurniture(layout.mode, FURNITURE, layout.scale, screen);
            const area = windowArea(screen, layout.room);
            const fit = fitPanel(REFERENCE_WINDOW.model, REFERENCE_WINDOW.want, area);
            const l = layoutPanel(REFERENCE_WINDOW.model, { width: fit.width, maxListRows: fit.maxListRows, density: fit.density });
            const inside = l.width * fit.scale <= area.width && l.height * fit.scale <= area.height;
            if (!placed.fits || !inside) failures.push(`${width}x${height}@${dpr}${touch ? 't' : ''} ${layout.mode} x${layout.scale}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('fitTitle', () => {
  it('keeps a title that fits, and keeps the noun of one that does not', async () => {
    const { fitTitle, textWidth } = await import('../../src/classic/layout');
    const bank = 'PACIFIC INTERNATIONAL GRAND GRATUITY YIELD BANK';
    expect(fitTitle(bank, textWidth(bank))).toBe(bank);
    expect(fitTitle(bank, textWidth('GRATUITY YIELD BANK') + 2)).toBe('GRATUITY YIELD BANK');
    expect(fitTitle('SUPERCALIFRAGILISTIC', textWidth('SUPER'))).toBe('SUPE.');
  });

  it('widens the plate only for a title that needs it', () => {
    const narrow = layoutPanel({ ...model(2), title: 'PACIFIC INTERNATIONAL GRAND GRATUITY YIELD BANK' }, { width: 281 });
    expect(narrow.title.x).toBe(20);
    expect(textWidth(narrow.titleText)).toBeLessThanOrEqual(narrow.title.w);
    const desk = layoutPanel({ ...model(2), title: 'PACIFIC INTERNATIONAL GRAND GRATUITY YIELD BANK' }, { width: 380 });
    expect(desk.title.x).toBe(40);
    expect(desk.titleText).toBe('PACIFIC INTERNATIONAL GRAND GRATUITY YIELD BANK');
  });
});
