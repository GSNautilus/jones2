/**
 * The board's corner furniture as pixel art: a framed box with an optional
 * dark readout (cash, hours left) and a row or a stack of buttons. Pure
 * layout and painting, so it can be tested without a DOM and the canvas
 * component (`PixelChrome.tsx`) tests the mouse against the same rectangles
 * it painted, like the centre window does.
 */
import {
  BUTTON_INSETS,
  C,
  FRAME_INSETS,
  GLYPH_H,
  UI,
  box,
  createSurface,
  drawTextCentred,
  drawTextScaled,
  measureTextScaled,
  rect,
  type Surface,
} from '@jones2/pixelart';
import { BUTTON_GAP, BUTTON_H, MIN_BUTTON_W, textWidth, type Rect } from './layout';
import { fontSafe, nine } from './paint';

export interface ChromeButton {
  key: string;
  label: string;
  enabled?: boolean;
}

export interface ChromeModel {
  /** Lines of a dark readout above the buttons: the first big, the rest small. */
  display?: string[];
  buttons: ChromeButton[];
  /** Buttons side by side, or stacked full width under the readout. */
  arrange: 'row' | 'stack';
}

export interface ChromeLayout {
  width: number;
  height: number;
  display: Rect | null;
  lines: Array<{ text: string; x: number; y: number; scale: number }>;
  buttons: Array<{ index: number; rect: Rect }>;
}

/** Content inset from the outer edge: the frame's border plus a little air. */
export const CHROME_PAD = FRAME_INSETS.left + 4;
export const DISPLAY_PAD = 5;
export const BIG_SCALE = 2;
const LINE_GAP = 3;
const DISPLAY_GAP = 5;

function buttonWidth(label: string): number {
  return Math.max(MIN_BUTTON_W, textWidth(fontSafe(label)) + 16);
}

export function layoutChrome(model: ChromeModel): ChromeLayout {
  const lines = (model.display ?? []).map((text, i) => ({ text: fontSafe(text), scale: i === 0 ? BIG_SCALE : 1 }));
  const lineWidths = lines.map((l) => measureTextScaled(l.text, l.scale, { spacing: 1 }));
  const displayInnerW = lines.length ? Math.max(...lineWidths) : 0;
  const rowW = model.buttons.reduce((w, b, i) => w + buttonWidth(b.label) + (i ? BUTTON_GAP : 0), 0);
  const contentW = Math.max(model.arrange === 'row' ? rowW : Math.max(rowW, 96), lines.length ? displayInnerW + DISPLAY_PAD * 2 : 0);

  let y = CHROME_PAD;
  let display: Rect | null = null;
  const placed: ChromeLayout['lines'] = [];
  if (lines.length) {
    const h = lines.reduce((sum, l, i) => sum + GLYPH_H * l.scale + (i ? LINE_GAP : 0), 0) + DISPLAY_PAD * 2;
    display = { x: CHROME_PAD, y, w: contentW, h };
    let ly = y + DISPLAY_PAD;
    lines.forEach((l, i) => {
      // right-aligned, like a till
      placed.push({ text: l.text, x: display!.x + display!.w - DISPLAY_PAD - lineWidths[i]!, y: ly, scale: l.scale });
      ly += GLYPH_H * l.scale + LINE_GAP;
    });
    y += h + DISPLAY_GAP;
  }

  const buttons: ChromeLayout['buttons'] = [];
  if (model.arrange === 'row') {
    let x = CHROME_PAD;
    model.buttons.forEach((b, index) => {
      const w = buttonWidth(b.label);
      buttons.push({ index, rect: { x, y, w, h: BUTTON_H } });
      x += w + BUTTON_GAP;
    });
    if (model.buttons.length) y += BUTTON_H;
  } else {
    model.buttons.forEach((_, index) => {
      buttons.push({ index, rect: { x: CHROME_PAD, y, w: contentW, h: BUTTON_H } });
      y += BUTTON_H + BUTTON_GAP;
    });
    if (model.buttons.length) y -= BUTTON_GAP;
  }

  return { width: contentW + CHROME_PAD * 2, height: y + CHROME_PAD, display, lines: placed, buttons };
}

export interface ChromeState {
  hover: number;
  pressed: number;
}

export const CHROME_IDLE: ChromeState = { hover: -1, pressed: -1 };

export function paintChrome(s: Surface, model: ChromeModel, layout: ChromeLayout, state: ChromeState = CHROME_IDLE): void {
  nine(s, UI.window_frame!, FRAME_INSETS, 0, 0, layout.width, layout.height);
  if (layout.display) {
    const d = layout.display;
    box(s, d.x, d.y, d.w, d.h, C.ink!, C.goldDark!);
    rect(s, d.x + 1, d.y + 1, d.w - 2, 1, C.inkSoft!);
    for (const l of layout.lines) {
      const colour = l.scale > 1 ? C.leafLight! : C.cream!;
      drawTextScaled(s, l.x, l.y, l.text, colour, l.scale, { spacing: 1 });
    }
  }
  for (const b of layout.buttons) {
    const btn = model.buttons[b.index];
    if (!btn) continue;
    const enabled = btn.enabled !== false;
    const art = !enabled
      ? UI.button_normal!
      : b.index === state.pressed
        ? UI.button_pressed!
        : b.index === state.hover
          ? UI.button_hover!
          : UI.button_normal!;
    nine(s, art, BUTTON_INSETS, b.rect.x, b.rect.y, b.rect.w, b.rect.h);
    const lift = b.index === state.pressed && enabled ? 1 : 0;
    drawTextCentred(s, b.rect.x, b.rect.y + Math.round((b.rect.h - GLYPH_H) / 2) + lift, b.rect.w, fontSafe(btn.label), enabled ? C.ink! : C.stoneDark!, {
      spacing: 1,
    });
  }
}

export function renderChrome(model: ChromeModel, state: ChromeState = CHROME_IDLE): { surface: Surface; layout: ChromeLayout } {
  const layout = layoutChrome(model);
  const surface = createSurface(layout.width, layout.height, 0);
  paintChrome(surface, model, layout, state);
  return { surface, layout };
}

/** Which button (index) a native-pixel point is over, or -1. */
export function hitChrome(layout: ChromeLayout, x: number, y: number): number {
  for (const b of layout.buttons) {
    const r = b.rect;
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return b.index;
  }
  return -1;
}
