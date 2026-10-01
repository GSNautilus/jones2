/**
 * Layout for the centre window, in NATIVE pixels (the art's own resolution; the
 * component blows the result up by an integer zoom). Pure: no canvas, no React,
 * so every rectangle the painter draws and the mouse hits is unit-testable.
 *
 * The shape is the mock in `art/sheets/ui-classic.png`: title plate across the
 * top, clerk portrait top-right, speech bubble to its left, a list of priced
 * lines below, a status line, and a row of buttons along the bottom.
 */
import { GLYPH_H, GLYPH_W } from '@jones2/pixelart';

/** 5x7 glyphs with one pixel of spacing. */
export const CHAR_W = GLYPH_W + 1;
export const LINE_H = GLYPH_H + 3;
export const ROW_H = 10;
/** Rows and buttons on a touch screen: tall enough for a finger at a phone's scale. */
export const TOUCH_ROW_H = 16;
export const TOUCH_BUTTON_H = 24;

export const PORTRAIT_W = 56;
export const PORTRAIT_H = 64;

/** Frame thickness (FRAME_INSETS) plus a little breathing room. */
export const PAD = 16;
export const TITLE_H = 20;
export const BUTTON_H = 20;
export const BUTTON_GAP = 6;
export const MIN_BUTTON_W = 52;
export const SCROLLBAR_W = 4;
/** Bars on the goals screen all start at the same column. */
export const BAR_COLUMN = 0.38;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PanelRow {
  key: string;
  text: string;
  /** Right-aligned value: a price, a stat, a count. */
  value?: string;
  /** Hours the action charges, drawn just left of the value. */
  hours?: string;
  /** Small parenthetical kept from the sim's label. */
  note?: string;
  /** 0..1 draws a bar in place of the dotted leader (the goals screen). */
  bar?: number;
  /** A section heading: not selectable. */
  header?: boolean;
  enabled?: boolean;
  reason?: string;
}

export interface PanelButton {
  key: string;
  label: string;
  enabled?: boolean;
  reason?: string;
}

export interface PanelModel {
  title: string;
  /** PORTRAITS key; omitted for cards and the goals/statistics screens. */
  portrait?: string;
  /** Speech-bubble text. */
  bubble?: string;
  rows: PanelRow[];
  buttons: PanelButton[];
}

export interface PanelOptions {
  width?: number;
  /** Rows visible at once before the list scrolls. */
  maxListRows?: number;
  /** First visible row. */
  scroll?: number;
  /** 'touch' lays rows and buttons out taller for a finger. */
  density?: Density;
}

export type Density = 'mouse' | 'touch';

export interface RowBox {
  /** Index into `model.rows`. */
  index: number;
  rect: Rect;
}

export interface ButtonBox {
  index: number;
  rect: Rect;
}

export interface PanelLayout {
  width: number;
  height: number;
  title: Rect;
  /** The title as it fits the plate (see `fitTitle`). */
  titleText: string;
  portrait: Rect | null;
  bubble: { rect: Rect; lines: string[] } | null;
  list: Rect;
  rowH: number;
  /** Rows actually laid out this frame (the visible window of the list). */
  rows: RowBox[];
  /** Scrollbar track, non-null only when the list overflows. */
  scrollbar: { track: Rect; thumb: Rect } | null;
  scroll: number;
  visible: number;
  status: Rect;
  buttons: ButtonBox[];
}

export function textWidth(s: string): number {
  return s.length === 0 ? 0 : s.length * CHAR_W - 1;
}

/** Characters that fit in `px` pixels of the 5x7 font. */
export function charsThatFit(px: number): number {
  return Math.max(1, Math.floor((px + 1) / CHAR_W));
}

/** Cut `text` to `px` pixels, marking the cut with a full stop. */
export function fitText(text: string, px: number): string {
  const max = Math.floor((px + 1) / CHAR_W);
  if (max <= 0) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}.`;
}

/**
 * A title cut to `px` by dropping words from the FRONT, so the noun survives:
 * "PACIFIC INTERNATIONAL GRAND GRATUITY YIELD BANK" becomes "GRATUITY YIELD
 * BANK" in a narrow window. A last word that alone is too long is cut.
 */
export function fitTitle(text: string, px: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  while (words.length > 1 && textWidth(words.join(' ')) > px) words.shift();
  return fitText(words.join(' '), px);
}

/** Greedy word wrap at a pixel width. Long words are hard-split. */
export function wrapText(text: string, px: number): string[] {
  const max = charsThatFit(px);
  const out: string[] = [];
  let line = '';
  for (const raw of text.split(/\s+/)) {
    let word = raw;
    if (word === '') continue;
    while (word.length > max) {
      if (line) {
        out.push(line);
        line = '';
      }
      out.push(word.slice(0, max));
      word = word.slice(max);
    }
    if (line === '') line = word;
    else if (line.length + 1 + word.length <= max) line += ` ${word}`;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Buttons flow left to right and wrap; returns their boxes and the total height. */
function layoutButtons(
  buttons: readonly PanelButton[],
  x: number,
  y: number,
  maxW: number,
  buttonH: number,
): { boxes: ButtonBox[]; height: number } {
  const boxes: ButtonBox[] = [];
  let cx = x;
  let cy = y;
  let rows = buttons.length ? 1 : 0;
  buttons.forEach((b, index) => {
    const w = Math.max(MIN_BUTTON_W, textWidth(b.label) + 16);
    if (cx > x && cx + w > x + maxW) {
      cx = x;
      cy += buttonH + BUTTON_GAP;
      rows += 1;
    }
    boxes.push({ index, rect: { x: cx, y: cy, w, h: buttonH } });
    cx += w + BUTTON_GAP;
  });
  return { boxes, height: rows === 0 ? 0 : rows * buttonH + (rows - 1) * BUTTON_GAP };
}

export function layoutPanel(model: PanelModel, opts: PanelOptions = {}): PanelLayout {
  const width = opts.width ?? 360;
  const maxListRows = opts.maxListRows ?? 12;
  const touch = opts.density === 'touch';
  const rowH = touch ? TOUCH_ROW_H : ROW_H;
  const buttonH = touch ? TOUCH_BUTTON_H : BUTTON_H;

  // A title too long for the plate widens it, then loses leading words.
  const wide = textWidth(model.title) + 16 > width - 80;
  const title: Rect = wide ? { x: 20, y: 4, w: width - 40, h: TITLE_H } : { x: 40, y: 4, w: width - 80, h: TITLE_H };
  const titleText = fitTitle(model.title, title.w - 12);

  const portrait: Rect | null = model.portrait
    ? { x: width - PAD - PORTRAIT_W, y: TITLE_H + 12, w: PORTRAIT_W, h: PORTRAIT_H }
    : null;

  let bubble: PanelLayout['bubble'] = null;
  if (model.bubble !== undefined) {
    const bx = PAD;
    const by = TITLE_H + 16;
    const bw = (portrait ? portrait.x - 10 : width - PAD) - bx;
    const lines = wrapText(model.bubble.toUpperCase(), bw - 16);
    // Beside a portrait the bubble squares up with it, as in the original.
    const floor = portrait ? portrait.y + portrait.h - by : 34;
    const bh = Math.max(floor, lines.length * LINE_H + 14);
    bubble = { rect: { x: bx, y: by, w: bw, h: bh }, lines };
  }

  const headBottom = Math.max(
    portrait ? portrait.y + portrait.h : 0,
    bubble ? bubble.rect.y + bubble.rect.h : 0,
    TITLE_H + 12,
  );

  const listX = PAD;
  const listY = headBottom + 8;
  const listW = width - PAD * 2;
  const visible = model.rows.length === 0 ? 0 : Math.min(model.rows.length, maxListRows);
  const listH = visible * rowH;
  const list: Rect = { x: listX, y: listY, w: listW, h: listH };

  const maxScroll = Math.max(0, model.rows.length - visible);
  const scroll = clamp(Math.round(opts.scroll ?? 0), 0, maxScroll);

  // A scrollbar takes its gutter out of the rows, so values never run under it.
  const rowW = listW - (maxScroll > 0 ? SCROLLBAR_W + 2 : 0);
  const rows: RowBox[] = [];
  for (let i = 0; i < visible; i++) {
    rows.push({ index: scroll + i, rect: { x: listX, y: listY + i * rowH, w: rowW, h: rowH } });
  }

  let scrollbar: PanelLayout['scrollbar'] = null;
  if (maxScroll > 0) {
    const track: Rect = { x: listX + listW - SCROLLBAR_W, y: listY, w: SCROLLBAR_W, h: listH };
    const thumbH = Math.max(6, Math.round((visible / model.rows.length) * listH));
    const thumbY = listY + Math.round((scroll / maxScroll) * (listH - thumbH));
    scrollbar = { track, thumb: { x: track.x, y: thumbY, w: SCROLLBAR_W, h: thumbH } };
  }

  const statusY = listY + listH + 4;
  const status: Rect = { x: PAD, y: statusY, w: width - PAD * 2, h: GLYPH_H + 2 };

  const buttonsY = statusY + status.h + 6;
  const laid = layoutButtons(model.buttons, PAD, buttonsY, width - PAD * 2, buttonH);
  const height = buttonsY + laid.height + 14;

  return {
    width,
    height,
    title,
    titleText,
    portrait,
    bubble,
    list,
    rowH,
    rows,
    scrollbar,
    scroll,
    visible,
    status,
    buttons: laid.boxes,
  };
}

export type PanelHit =
  | { kind: 'row'; index: number }
  | { kind: 'button'; index: number }
  | null;

function inside(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/** What is under a point in native window coordinates. */
export function hitPanel(layout: PanelLayout, model: PanelModel, x: number, y: number): PanelHit {
  for (const b of layout.buttons) if (inside(b.rect, x, y)) return { kind: 'button', index: b.index };
  for (const r of layout.rows) {
    if (!inside(r.rect, x, y)) continue;
    if (model.rows[r.index]?.header) return null;
    return { kind: 'row', index: r.index };
  }
  return null;
}

/**
 * The first visible row after dragging the list by `dy` native pixels from
 * `startScroll` (a drag down shows earlier rows, like any touch list).
 */
export function scrollAfterDrag(model: PanelModel, layout: PanelLayout, startScroll: number, dy: number): number {
  return clampScroll(model, layout, startScroll - dy / layout.rowH);
}

/** Clamp a scroll offset to the list's range. */
export function clampScroll(model: PanelModel, layout: PanelLayout, next: number): number {
  return clamp(Math.round(next), 0, Math.max(0, model.rows.length - layout.visible));
}
