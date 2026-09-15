/**
 * The one place the HUD meets the art package.
 *
 * Right now every HUD surface is drawn by hand: CSS bevels for the frames, a
 * hand-rasterised clock face (see `raster.ts`). When `@jones2/pixelart` grows a
 * UI catalogue (9-slice panel frame, button, 96x96 clock face, hands, 12x12
 * icons) it is picked up here — nothing else in `src/hud/` imports the art
 * package, so adopting sprites is a change to this file only.
 *
 * Detection is deliberately duck-typed: the catalogue is looked up by name on
 * the package's namespace object, so this module compiles and runs whether or
 * not the catalogue exists yet.
 */
import * as pixelart from '@jones2/pixelart';
import type { Palette, Sprite } from '@jones2/pixelart';
import { put, type PixelBuffer, type Rgba } from './raster';

/* ------------------------------------------------------------------ colours */

/** Chunky bevelled furniture: dark wood and brass, cream panel fill. */
export const HUD = {
  ink: '#1f1b24',
  inkSoft: '#3a3242',
  wood: '#6b4a2b',
  woodLight: '#8a6238',
  woodDark: '#43301c',
  brass: '#c9a04a',
  brassLight: '#e6c877',
  brassDark: '#8a6b2b',
  panel: '#f3e9c8',
  panelShade: '#d8c9a0',
  green: '#5f9e4a',
  amber: '#e0a52e',
  red: '#c4472f',
  led: '#7bf07b',
  ledDim: '#1b2d1b',
  ghost: '#ffffff',
} as const;

/* ------------------------------------------------- optional pixel UI sprites */

/** Names the clock looks for; the first match wins. */
const CATALOGUE_EXPORTS = ['UI', 'UI_SPRITES', 'uiSprites', 'UI_CATALOGUE', 'ui'];

const CLOCK_FACE_KEYS = ['clock_face', 'clockFace', 'clock_face_96', 'clock'];
const HOUR_HAND_KEYS = ['clock_hand_hour', 'hand_hour', 'hourHand'];
const MINUTE_HAND_KEYS = ['clock_hand_minute', 'hand_minute', 'minuteHand'];

function isSprite(v: unknown): v is Sprite {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<Sprite>;
  return typeof s.width === 'number' && typeof s.height === 'number' && !!s.pixels;
}

function catalogue(): Record<string, unknown> | null {
  const bag = pixelart as unknown as Record<string, unknown>;
  for (const key of CATALOGUE_EXPORTS) {
    const v = bag[key];
    if (v && typeof v === 'object') return v as Record<string, unknown>;
  }
  return null;
}

/** A UI sprite by name, or null while the catalogue does not exist. */
export function uiSprite(...names: string[]): Sprite | null {
  const c = catalogue();
  if (!c) return null;
  for (const n of names) {
    const v = c[n];
    if (isSprite(v)) return v;
  }
  return null;
}

export interface ClockSkin {
  face: Sprite | null;
  hourHand: Sprite | null;
  minuteHand: Sprite | null;
}

/** Sprites for the clock, all null until the art package ships them. */
export function clockSkin(): ClockSkin {
  return {
    face: uiSprite(...CLOCK_FACE_KEYS),
    hourHand: uiSprite(...HOUR_HAND_KEYS),
    minuteHand: uiSprite(...MINUTE_HAND_KEYS),
  };
}

/** True once a pixel UI catalogue is available (used only for diagnostics). */
export function hasPixelSkin(): boolean {
  return catalogue() !== null;
}

/* ---------------------------------------------------------- sprite painting */

const PALETTE = pixelart.PALETTE as Palette;

/**
 * Blit an indexed sprite into an RGBA buffer, resolving palette indices.
 * `x`/`y` are the sprite's top-left corner in buffer pixels.
 */
export function drawSprite(buf: PixelBuffer, sprite: Sprite, x: number, y: number): void {
  for (let sy = 0; sy < sprite.height; sy++) {
    for (let sx = 0; sx < sprite.width; sx++) {
      const idx = sprite.pixels[sy * sprite.width + sx]!;
      if (idx === 0) continue;
      const rgb = PALETTE.colors[idx];
      if (!rgb) continue;
      const c: Rgba = [rgb[0], rgb[1], rgb[2], 255];
      put(buf, x + sx, y + sy, c);
    }
  }
}
