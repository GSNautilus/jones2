import { describe, expect, it } from 'vitest';
import {
  CHAR_W,
  PORTRAIT_H,
  PORTRAIT_W,
  ROW_H,
  charsThatFit,
  clampScroll,
  fitText,
  hitPanel,
  layoutPanel,
  textWidth,
  wrapText,
  type PanelModel,
} from '../../src/classic/layout';
import { fontSafe } from '../../src/classic/paint';

function model(rows: number, buttons = 2): PanelModel {
  return {
    title: 'MONOLITH BURGERS',
    portrait: 'monolith',
    bubble: 'WELCOME TO MONOLITH BURGER.',
    rows: Array.from({ length: rows }, (_, i) => ({ key: `r${i}`, text: `ITEM ${i}`, value: '$1' })),
    buttons: Array.from({ length: buttons }, (_, i) => ({ key: `b${i}`, label: i === buttons - 1 ? 'DONE' : 'WORK' })),
  };
}

describe('text measuring', () => {
  it('is a 5x7 monospace font with one pixel of spacing', () => {
    expect(CHAR_W).toBe(6);
    expect(textWidth('')).toBe(0);
    expect(textWidth('AB')).toBe(11);
    expect(charsThatFit(11)).toBe(2);
    expect(charsThatFit(1)).toBe(1);
  });

  it('cuts a line that will not fit and marks the cut', () => {
    expect(fitText('BANK', textWidth('BANK'))).toBe('BANK');
    expect(fitText('EMPLOYMENT', textWidth('EMPLO'))).toBe('EMPL.');
    expect(fitText('ANYTHING', 0)).toBe('');
  });

  it('wraps on words and hard-splits a word that cannot fit', () => {
    expect(wrapText('ONE TWO THREE', textWidth('ONE TWO'))).toEqual(['ONE TWO', 'THREE']);
    expect(wrapText('ABCDEFGH', textWidth('ABC'))).toEqual(['ABC', 'DEF', 'GH']);
    expect(wrapText('', 100)).toEqual(['']);
  });
});

describe('the font has no lowercase and a short punctuation set', () => {
  it('uppercases and blanks what it cannot draw', () => {
    expect(fontSafe('Bank')).toBe('BANK');
    expect(fontSafe('a (b) c')).toBe('A  B  C');
    expect(fontSafe('$1.30')).toBe('$1.30');
  });
});

describe('layoutPanel', () => {
  it('puts the portrait top-right and the bubble beside it', () => {
    const l = layoutPanel(model(4), { width: 360 });
    expect(l.portrait).toEqual({ x: 360 - 16 - PORTRAIT_W, y: 32, w: PORTRAIT_W, h: PORTRAIT_H });
    expect(l.bubble!.rect.x).toBe(16);
    expect(l.bubble!.rect.x + l.bubble!.rect.w).toBeLessThanOrEqual(l.portrait!.x);
    expect(l.title.x + l.title.w).toBe(360 - 40);
  });

  it('drops the portrait and widens the bubble when there is no clerk', () => {
    const m = model(2);
    delete m.portrait;
    const l = layoutPanel(m, { width: 360 });
    expect(l.portrait).toBeNull();
    expect(l.bubble!.rect.w).toBe(360 - 16 - 16);
  });

  it('lays out one row box per visible row, stacked', () => {
    const l = layoutPanel(model(5), { maxListRows: 12 });
    expect(l.rows).toHaveLength(5);
    expect(l.rows.map((r) => r.index)).toEqual([0, 1, 2, 3, 4]);
    expect(l.rows[1]!.rect.y - l.rows[0]!.rect.y).toBe(ROW_H);
    expect(l.scrollbar).toBeNull();
  });

  it('scrolls a long list and shows a scrollbar', () => {
    const m = model(40);
    const l = layoutPanel(m, { maxListRows: 10, scroll: 7 });
    expect(l.visible).toBe(10);
    expect(l.scroll).toBe(7);
    expect(l.rows[0]!.index).toBe(7);
    expect(l.rows[9]!.index).toBe(16);
    expect(l.scrollbar).not.toBeNull();
    expect(l.scrollbar!.thumb.h).toBeLessThan(l.scrollbar!.track.h);
  });

  it('clamps a scroll past the end', () => {
    const m = model(12);
    const l = layoutPanel(m, { maxListRows: 10, scroll: 99 });
    expect(l.scroll).toBe(2);
    expect(clampScroll(m, l, -5)).toBe(0);
    expect(clampScroll(m, l, 99)).toBe(2);
  });

  it('grows with the number of button rows', () => {
    const few = layoutPanel(model(4, 2), { width: 360 });
    const many = layoutPanel(model(4, 9), { width: 360 });
    expect(many.height).toBeGreaterThan(few.height);
    expect(many.buttons).toHaveLength(9);
    for (const b of many.buttons) expect(b.rect.x + b.rect.w).toBeLessThanOrEqual(360 - 16 + 1);
  });

  it('keeps everything inside the frame', () => {
    const l = layoutPanel(model(9, 4), { width: 380 });
    for (const r of l.rows) expect(r.rect.y + r.rect.h).toBeLessThan(l.height);
    for (const b of l.buttons) expect(b.rect.y + b.rect.h).toBeLessThan(l.height);
    expect(l.status.y).toBeGreaterThan(l.list.y + l.list.h - 1);
  });
});

describe('hitPanel', () => {
  it('finds the row under a point, allowing for the scroll offset', () => {
    const m = model(30);
    const l = layoutPanel(m, { maxListRows: 10, scroll: 3 });
    const r = l.rows[2]!;
    expect(hitPanel(l, m, r.rect.x + 4, r.rect.y + 4)).toEqual({ kind: 'row', index: 5 });
  });

  it('finds a button', () => {
    const m = model(4, 3);
    const l = layoutPanel(m);
    const b = l.buttons[1]!;
    expect(hitPanel(l, m, b.rect.x + 2, b.rect.y + 2)).toEqual({ kind: 'button', index: 1 });
  });

  it('ignores headings and empty space', () => {
    const m: PanelModel = {
      title: 'GOALS',
      rows: [
        { key: 'h', text: 'ANN', header: true },
        { key: 'a', text: 'WEALTH', bar: 0.5 },
      ],
      buttons: [{ key: 'done', label: 'DONE' }],
    };
    const l = layoutPanel(m);
    expect(hitPanel(l, m, l.rows[0]!.rect.x + 2, l.rows[0]!.rect.y + 2)).toBeNull();
    expect(hitPanel(l, m, l.rows[1]!.rect.x + 2, l.rows[1]!.rect.y + 2)).toEqual({ kind: 'row', index: 1 });
    expect(hitPanel(l, m, 2, 2)).toBeNull();
  });
});
