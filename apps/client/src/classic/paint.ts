/**
 * Painter for the centre window. Draws a `PanelModel` into a pixel-art
 * `Surface` at native resolution using the art package's own primitives, so the
 * result is the same pixels as the mock in `art/sheets/ui-classic.png`.
 *
 * Nothing here decides geometry: every rectangle comes from `layout.ts`.
 */
import {
  BUBBLE_INSETS,
  BUTTON_INSETS,
  C,
  FRAME_INSETS,
  GLYPH_H,
  PLATE_INSETS,
  PORTRAITS,
  UI,
  blit,
  box,
  createSurface,
  drawText,
  drawTextCentred,
  hasGlyph,
  put,
  rect,
  type SliceInsets,
  type Sprite,
  type Surface,
} from '@jones2/pixelart';
import { BAR_COLUMN, CHAR_W, LINE_H, fitText, type PanelLayout, type PanelModel, type Rect, textWidth } from './layout';

/** The 5x7 font has no lowercase and a short punctuation set. */
export function fontSafe(text: string): string {
  let out = '';
  for (const ch of text.toUpperCase()) out += hasGlyph(ch) ? ch : ' ';
  return out.replace(/\s+$/, '');
}

/** Nine-slice blit: corners fixed, edges tiled. Same rule as `tools/sheet.ts`. */
export function nine(dst: Surface, s: Sprite, ins: SliceInsets, x: number, y: number, w: number, h: number): void {
  const cw = s.width - ins.left - ins.right;
  const ch = s.height - ins.top - ins.bottom;
  for (let j = 0; j < h; j++) {
    const sy = j < ins.top ? j : j >= h - ins.bottom ? s.height - (h - j) : ins.top + ((j - ins.top) % ch);
    for (let i = 0; i < w; i++) {
      const sx = i < ins.left ? i : i >= w - ins.right ? s.width - (w - i) : ins.left + ((i - ins.left) % cw);
      const idx = s.pixels[sy * s.width + sx]!;
      if (idx !== 0) put(dst, x + i, y + j, idx);
    }
  }
}

export interface PaintState {
  /** Row index under the cursor, or -1. */
  hoverRow: number;
  /** Button index under the cursor, or -1. */
  hoverButton: number;
  /** Line shown above the buttons (a disabled row's reason, usually). */
  status: string;
  /** Draw the status in the warning colour. */
  warn: boolean;
}

export const NO_HOVER: PaintState = { hoverRow: -1, hoverButton: -1, status: '', warn: false };

function leader(s: Surface, from: number, to: number, y: number, colour: number): void {
  for (let x = from; x < to; x += 2) put(s, x, y, colour);
}

function drawRow(s: Surface, model: PanelModel, index: number, r: Rect, hovered: boolean): void {
  const row = model.rows[index];
  if (!row) return;
  const enabled = row.enabled !== false && !row.header;
  let ink = enabled ? C.ink : C.slateDark;
  if (row.header) ink = C.maroon;
  if (hovered) {
    rect(s, r.x, r.y, r.w, r.h, enabled ? C.gold : C.stoneDark);
    ink = enabled ? C.ink : C.white;
  }

  // Text sits centred in the row: one pixel down in a mouse row, more in a
  // taller touch row. The leader and bar follow the text, not the row.
  const y = r.y + Math.floor((r.h - GLYPH_H) / 2);
  // The right-hand columns are placed first so the name can be cut to fit the
  // gap that is left: several classic job titles are longer than the window.
  let right = r.x + r.w - 4;
  if (row.value !== undefined && row.value !== '') {
    const v = fontSafe(row.value);
    drawText(s, right - textWidth(v), y, v, ink, { spacing: 1 });
    right -= textWidth(v) + 6;
  }
  if (row.hours) {
    const h = fontSafe(row.hours);
    drawText(s, right - textWidth(h), y, h, enabled ? C.slateDark : ink, { spacing: 1 });
    right -= textWidth(h) + 6;
  }
  if (row.note) {
    const n = fontSafe(row.note);
    drawText(s, right - textWidth(n), y, n, enabled ? C.slateDark : ink, { spacing: 1 });
    right -= textWidth(n) + 6;
  }

  const text = fitText(fontSafe(row.text), right - (r.x + 4) - 4);
  drawText(s, r.x + 4, y, text, ink, { spacing: 1 });
  const textEnd = r.x + 4 + textWidth(text) + 3;
  if (row.bar !== undefined) {
    const bx = Math.max(textEnd, r.x + Math.round(r.w * BAR_COLUMN));
    const bw = Math.max(0, right - bx);
    if (bw > 4) {
      box(s, bx, y + 1, bw, 6, C.slateDark, C.ink);
      const fill = Math.round((bw - 2) * Math.max(0, Math.min(1, row.bar)));
      if (fill > 0) rect(s, bx + 1, y + 2, fill, 4, row.bar >= 1 ? C.green : C.gold);
    }
  } else if (!row.header && right > textEnd) {
    leader(s, textEnd, right, y + 5, hovered ? ink : C.creamShade);
  }
}

/** Draw the whole window. `surface` must be at least `layout.width x layout.height`. */
export function paintPanel(s: Surface, model: PanelModel, layout: PanelLayout, state: PaintState = NO_HOVER): void {
  nine(s, UI.window_frame!, FRAME_INSETS, 0, 0, layout.width, layout.height);

  const t = layout.title;
  nine(s, UI.title_plate!, PLATE_INSETS, t.x, t.y, t.w, t.h);
  drawTextCentred(s, t.x, t.y + Math.round((t.h - GLYPH_H) / 2), t.w, fontSafe(layout.titleText), C.cream, { spacing: 1 });

  if (layout.portrait && model.portrait) {
    const p = layout.portrait;
    const sprite = PORTRAITS[model.portrait];
    box(s, p.x - 2, p.y - 2, p.w + 4, p.h + 4, -1, C.ink);
    box(s, p.x - 1, p.y - 1, p.w + 2, p.h + 2, -1, C.goldDark);
    if (sprite) blit(s, sprite, p.x, p.y);
    else rect(s, p.x, p.y, p.w, p.h, C.slateDark);
  }

  if (layout.bubble) {
    const b = layout.bubble.rect;
    nine(s, UI.bubble!, BUBBLE_INSETS, b.x, b.y, b.w, b.h);
    if (layout.portrait) blit(s, UI.bubble_tail_r!, b.x + b.w - 1, b.y + 6);
    layout.bubble.lines.forEach((line, i) => {
      drawText(s, b.x + 8, b.y + 7 + i * LINE_H, fontSafe(line), C.ink, { spacing: 1 });
    });
  }

  for (const r of layout.rows) drawRow(s, model, r.index, r.rect, r.index === state.hoverRow);

  if (layout.scrollbar) {
    const { track, thumb } = layout.scrollbar;
    rect(s, track.x, track.y, track.w, track.h, C.slateDark);
    rect(s, thumb.x, thumb.y, thumb.w, thumb.h, C.gold);
  }

  if (state.status) {
    drawText(s, layout.status.x, layout.status.y, fontSafe(state.status), state.warn ? C.redDark : C.slateDark, {
      spacing: 1,
    });
  }

  for (const b of layout.buttons) {
    const btn = model.buttons[b.index];
    if (!btn) continue;
    const enabled = btn.enabled !== false;
    const art = !enabled ? UI.button_normal! : b.index === state.hoverButton ? UI.button_hover! : UI.button_normal!;
    nine(s, art, BUTTON_INSETS, b.rect.x, b.rect.y, b.rect.w, b.rect.h);
    drawTextCentred(s, b.rect.x, b.rect.y + Math.round((b.rect.h - GLYPH_H) / 2), b.rect.w, fontSafe(btn.label), enabled ? C.ink : C.stoneDark, {
      spacing: 1,
    });
  }
}

/** Convenience for tools and tests: a fresh surface with the window painted on it. */
export function renderPanel(model: PanelModel, layout: PanelLayout, state: PaintState = NO_HOVER): Surface {
  const s = createSurface(layout.width, layout.height, 0);
  paintPanel(s, model, layout, state);
  return s;
}

export { CHAR_W };
