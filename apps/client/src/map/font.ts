/**
 * A 3x5 pixel font. Deliberately tiny: it is used for node ids, figure name
 * labels and placeholder building signs, all of which have to stay readable at
 * 2x zoom without stealing space from the art.
 *
 * Glyphs are 3 wide, 5 tall, encoded row-major as 15 characters of '1'/'0'.
 * Unknown characters fall back to a blank. Uppercase only; `text()` upcases.
 */

const G: Record<string, string> = {
  A: '111101111101101',
  B: '110101110101110',
  C: '111100100100111',
  D: '110101101101110',
  E: '111100111100111',
  F: '111100111100100',
  G: '111100101101111',
  H: '101101111101101',
  I: '111010010010111',
  J: '001001001101111',
  K: '101101110101101',
  L: '100100100100111',
  M: '101111111101101',
  N: '110101101101101',
  O: '111101101101111',
  P: '111101111100100',
  Q: '111101101111001',
  R: '111101110101101',
  S: '111100111001111',
  T: '111010010010010',
  U: '101101101101111',
  V: '101101101101010',
  W: '101101111111101',
  X: '101101010101101',
  Y: '101101010010010',
  Z: '111001010100111',
  '0': '111101101101111',
  '1': '010110010010111',
  '2': '111001111100111',
  '3': '111001111001111',
  '4': '101101111001001',
  '5': '111100111001111',
  '6': '111100111101111',
  '7': '111001001001001',
  '8': '111101111101111',
  '9': '111101111001111',
  ' ': '000000000000000',
  '.': '000000000000010',
  ',': '000000000010100',
  '-': '000000111000000',
  _: '000000000000111',
  "'": '010010000000000',
  '!': '010010010000010',
  '?': '111001011000010',
  '/': '001001010100100',
  '\\': '100100010001001',
  '(': '001010010010001',
  ')': '100010010010100',
  ':': '000010000010000',
  '+': '000010111010000',
  '*': '101010111010101',
  '#': '101111101111101',
  '&': '110110111101111',
  '$': '011110011110010',
  '%': '101001010100101',
  '=': '000111000111000',
  '"': '101101000000000',
};

export const GLYPH_W = 3;
export const GLYPH_H = 5;
/** One blank column between glyphs. */
export const GLYPH_ADVANCE = GLYPH_W + 1;

export function glyph(ch: string): string | undefined {
  return G[ch];
}

/** Width in pixels of `text` rendered with `textInto` (no trailing gap). */
export function textWidth(text: string): number {
  const n = text.length;
  return n === 0 ? 0 : n * GLYPH_ADVANCE - 1;
}

export const TEXT_HEIGHT = GLYPH_H;
