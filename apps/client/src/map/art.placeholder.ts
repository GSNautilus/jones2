/**
 * Placeholder art. Stands in for `@jones2/pixelart` until the real catalogue
 * exists, so the renderer is testable and the demo is eyeballable today.
 *
 * Everything here is generated once, deterministically, into palette-indexed
 * sprites with the same shape as the art package's `Sprite`: outlined boxes, a
 * roof band above a facade, a 3x5 text label. Simple, but not ugly.
 *
 * Nothing outside `art.ts` imports this file.
 */
import type { Palette, PixelBuildingRef, RGB, Sprite } from './pixelart';
import type { BuildingRecipe, TownNode } from '@jones2/town';
import type { ArtSet, Direction, TileKind } from './art';
import { textWidth } from './font';
import {
  type Surface,
  createSurface,
  ditherRect,
  fillRect,
  line,
  mix,
  parseHex,
  put,
  strokeRect,
  text,
} from './surface';

/* ------------------------------------------------------------------ palette */

const BASE: [string, string][] = [
  ['ink', '#1d1a24'],
  ['grass', '#6a9c4a'],
  ['grassDark', '#54833a'],
  ['grassLight', '#7cb058'],
  ['water', '#3f6fa8'],
  ['waterDark', '#2f5688'],
  ['waterLight', '#5f92cc'],
  ['path', '#b8a06a'],
  ['pathDark', '#9a8354'],
  ['plaza', '#b6b1a3'],
  ['plazaDark', '#9c978a'],
  ['road', '#4a4e56'],
  ['roadDark', '#383c43'],
  ['roadEdge', '#6d727b'],
  ['roadLine', '#c6cad2'],
  ['busline', '#e8c22a'],
  ['highlight', '#3f8fe8'],
  ['route', '#ffd24a'],
  ['junction', '#f08c22'],
  ['shadow', '#3f4a38'],
  ['wall', '#cfc6b0'],
  ['wallDark', '#a99d84'],
  ['roof', '#8a5a44'],
  ['roofDark', '#6a4433'],
  ['window', '#79b0cf'],
  ['windowDark', '#4d7d99'],
  ['door', '#57402f'],
  ['sign', '#f2ece0'],
  ['trunk', '#6b4a2f'],
  ['leaf', '#4f8a3d'],
  ['leafDark', '#3a6a2c'],
  ['stone', '#8d8a86'],
  ['skin', '#e8b98f'],
  ['skinDark', '#c08e66'],
  ['white', '#f2f2ee'],
  ['panel', '#241f2b'],
  ['metal', '#7f858d'],
];

function buildPalette(): Palette {
  const colors: RGB[] = [[0, 0, 0]];
  const names: Record<string, number> = {};
  for (const [name, hex] of BASE) {
    names[name] = colors.length;
    colors.push(parseHex(hex));
  }
  return { colors, names };
}

/* ------------------------------------------------------------- tiny helpers */

function sprite(s: Surface, anchorX: number, anchorY: number, fw: number, fh: number): Sprite {
  return {
    width: s.width,
    height: s.height,
    pixels: s.pixels,
    anchorX,
    anchorY,
    footprintW: fw,
    footprintH: fh,
  };
}

/** Deterministic 2D hash in [0,1). Used for tile variants and speckles. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + seed * 1442695040;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Box with a 1px ink outline, a flat fill and a one-pixel shade band. */
function boxShaded(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
  shade: number,
  ink: number,
): void {
  if (w < 2 || h < 2) {
    fillRect(s, x, y, Math.max(1, w), Math.max(1, h), fill);
    return;
  }
  fillRect(s, x, y, w, h, fill);
  fillRect(s, x, y + h - 2, w, 1, shade);
  fillRect(s, x + w - 2, y, 1, h, shade);
  strokeRect(s, x, y, w, h, ink);
}

/* ---------------------------------------------------------------- buildings */

const ROOF_TINT: Record<string, number> = { flat: 0, gable: 1, hip: 2, none: 3 };

interface Idx {
  ink: number;
  wall: number;
  wallDark: number;
  roof: number;
  roofDark: number;
  window: number;
  windowDark: number;
  door: number;
  sign: number;
  trunk: number;
  leaf: number;
  leafDark: number;
  stone: number;
  skin: number;
  skinDark: number;
  white: number;
  metal: number;
  grass: number;
  grassDark: number;
  grassLight: number;
  water: number;
  waterDark: number;
  waterLight: number;
  path: number;
  pathDark: number;
  plaza: number;
  plazaDark: number;
}

function indices(p: Palette): Idx {
  const g = (n: string) => p.names[n] ?? 1;
  return {
    ink: g('ink'),
    wall: g('wall'),
    wallDark: g('wallDark'),
    roof: g('roof'),
    roofDark: g('roofDark'),
    window: g('window'),
    windowDark: g('windowDark'),
    door: g('door'),
    sign: g('sign'),
    trunk: g('trunk'),
    leaf: g('leaf'),
    leafDark: g('leafDark'),
    stone: g('stone'),
    skin: g('skin'),
    skinDark: g('skinDark'),
    white: g('white'),
    metal: g('metal'),
    grass: g('grass'),
    grassDark: g('grassDark'),
    grassLight: g('grassLight'),
    water: g('water'),
    waterDark: g('waterDark'),
    waterLight: g('waterLight'),
    path: g('path'),
    pathDark: g('pathDark'),
    plaza: g('plaza'),
    plazaDark: g('plazaDark'),
  };
}

const DEFAULT_RECIPE: BuildingRecipe = {
  width: 8,
  depth: 6,
  height: 4,
  color: '#cfc6b0',
  roof: 'flat',
  facing: 0,
};

export function placeholderArt(pxPerUnit = 1): ArtSet {
  const palette = buildPalette();
  const ix = indices(palette);
  /** Colours added on demand for per-building wall/roof hexes. */
  const extra = new Map<string, number>();

  function colour(hex: string): number {
    const hit = extra.get(hex);
    if (hit !== undefined) return hit;
    if (palette.colors.length >= 250) return ix.wall;
    const i = palette.colors.length;
    palette.colors.push(parseHex(hex));
    extra.set(hex, i);
    return i;
  }

  function shadeOf(hex: string, amount: number): number {
    const key = `${hex}|${amount}`;
    const hit = extra.get(key);
    if (hit !== undefined) return hit;
    if (palette.colors.length >= 250) return ix.wallDark;
    const i = palette.colors.length;
    palette.colors.push(mix(parseHex(hex), [20, 16, 26], amount));
    extra.set(key, i);
    return i;
  }

  /* -------------------------------------------------------------- building */

  const buildingCache = new Map<string, Sprite>();

  function makeBuilding(recipe: BuildingRecipe, label: string, seed: number): Sprite {
    const fw = Math.max(10, Math.round(recipe.width * pxPerUnit));
    // The footprint is the ground the building stands on. It is never drawn as
    // a slab - the bottom edge of the facade IS the ground line - but picking
    // and the shadow both need it.
    const fh = Math.max(4, Math.round(recipe.depth * pxPerUnit * 0.55));
    const roofH = recipe.roof === 'none' ? 0 : Math.max(4, Math.round(recipe.height * pxPerUnit * 0.7));
    const faceH = Math.max(10, Math.round(recipe.height * pxPerUnit * 1.4));
    const w = fw;
    const h = roofH + faceH;
    const s = createSurface(w, h);

    const wall = colour(recipe.color);
    const wallShade = shadeOf(recipe.color, 0.28);
    const roofHex = recipe.roofColor ?? recipe.color;
    const roof = recipe.roofColor ? colour(recipe.roofColor) : shadeOf(recipe.color, 0.42);
    const roofShade = shadeOf(roofHex, 0.6);

    // Facade, sitting directly on the ground line at the bottom of the sprite.
    const faceY = roofH;
    boxShaded(s, 0, faceY, w, faceH, wall, wallShade, ix.ink);

    // Roof band above the facade.
    if (roofH > 0) {
      const inset = recipe.roof === 'hip' ? Math.min(3, Math.floor(w / 6)) : 0;
      for (let ry = 0; ry < roofH; ry++) {
        const t = roofH <= 1 ? 0 : ry / (roofH - 1);
        const cut = Math.round(inset * (1 - t));
        fillRect(s, cut, ry, w - cut * 2, 1, ry < roofH - 1 ? roof : roofShade);
        put(s, cut, ry, ix.ink);
        put(s, w - cut - 1, ry, ix.ink);
      }
      fillRect(s, inset, 0, w - inset * 2, 1, ix.ink);
      if (recipe.roof === 'gable' && w > 8) {
        line(s, Math.floor(w / 2), 1, Math.floor(w / 2), roofH - 1, roofShade);
      }
      if (ROOF_TINT[recipe.roof] === 0 && w > 10) {
        // Flat roofs get a parapet lip.
        fillRect(s, 1, roofH - 1, w - 2, 1, ix.ink);
      }
    }

    // Windows: one row, evenly spaced, skipped when the facade is tiny.
    const winY = faceY + 2;
    if (faceH >= 8 && w >= 12) {
      const cell = 5;
      const count = Math.max(1, Math.floor((w - 4) / cell));
      const pad = Math.max(1, Math.floor((w - count * cell) / 2));
      for (let i = 0; i < count; i++) {
        const wx = pad + i * cell;
        fillRect(s, wx, winY, 3, 3, ix.window);
        fillRect(s, wx, winY + 2, 3, 1, ix.windowDark);
        strokeRect(s, wx - 1, winY - 1, 5, 5, ix.ink);
      }
    }

    // Door on the facing side (facing 0 = south = toward the viewer).
    const doorW = Math.min(5, Math.max(3, Math.floor(w / 5)));
    const doorH = Math.min(faceH - 2, 6);
    if (doorH > 2) {
      const doorX =
        recipe.facing === 1 ? 1 : recipe.facing === 3 ? w - doorW - 1 : Math.floor((w - doorW) / 2);
      const doorY = faceY + faceH - doorH + 1;
      fillRect(s, doorX, doorY, doorW, doorH, ix.door);
      strokeRect(s, doorX, doorY, doorW, doorH, ix.ink);
      put(s, doorX + doorW - 2, doorY + Math.floor(doorH / 2), ix.sign);
    }

    // Sign: a light strip with as much of the label as fits.
    const clean = label.toUpperCase().replace(/[^A-Z0-9 .'&-]/g, '');
    if (w >= 12 && faceH >= 12) {
      let shown = clean;
      while (shown.length > 0 && textWidth(shown) > w - 4) shown = shown.slice(0, -1);
      if (shown.length >= 2) {
        const tw = textWidth(shown);
        const sx = Math.floor((w - tw) / 2);
        const sy = faceY + faceH - 9;
        fillRect(s, sx - 2, sy - 1, tw + 4, 7, ix.sign);
        strokeRect(s, sx - 2, sy - 1, tw + 4, 7, ix.ink);
        text(s, shown, sx, sy, ix.ink);
      }
    }

    // A landmark prop, so recipes with a prop are visually distinct.
    if (recipe.prop && recipe.prop !== 'none' && roofH > 0) {
      const px = w - 4;
      if (recipe.prop === 'chimney' || recipe.prop === 'antenna') {
        fillRect(s, px - 1, Math.max(0, roofH - 6), 2, 6, recipe.prop === 'antenna' ? ix.metal : ix.roofDark);
      } else if (recipe.prop === 'tree') {
        fillRect(s, 1, h - 6, 2, 5, ix.trunk);
        fillRect(s, 0, h - 10, 4, 5, ix.leaf);
      } else {
        fillRect(s, px - 2, 1, 3, 3, ix.sign);
        put(s, px - 1, 2, ix.ink);
      }
    }

    // A pixel of grit so identical recipes are not pixel-identical.
    if (hash2(seed, 7) > 0.5) put(s, 1, h - 3, wallShade);

    // Anchor: bottom-centre of the footprint, matching the art contract.
    return sprite(s, Math.floor(w / 2), h - 1, fw, fh);
  }

  function building(ref: PixelBuildingRef | undefined, node: TownNode): Sprite {
    const recipe = node.building ?? DEFAULT_RECIPE;
    const label = recipe.sign ?? node.name ?? node.id;
    const key = `${ref?.kind ?? 'recipe'}|${recipe.width}|${recipe.depth}|${recipe.height}|${recipe.color}|${recipe.roof}|${recipe.roofColor ?? ''}|${recipe.facing}|${recipe.prop ?? ''}|${label}`;
    let hit = buildingCache.get(key);
    if (!hit) {
      hit = makeBuilding(recipe, label, key.length);
      buildingCache.set(key, hit);
    }
    return hit;
  }

  /* ------------------------------------------------------------------ tiles */

  const TILE = 16;
  const tileCache = new Map<string, Sprite>();

  function makeTile(kind: TileKind, variant: number): Sprite {
    const s = createSurface(TILE, TILE);
    const v = variant & 3;
    if (kind === 'grass') {
      fillRect(s, 0, 0, TILE, TILE, ix.grass);
      for (let i = 0; i < 10; i++) {
        const r = hash2(i * 13 + v * 101, i * 7 + 3);
        const x = Math.floor(r * TILE);
        const y = Math.floor(hash2(i * 29 + v * 17, i * 11) * TILE);
        put(s, x, y, r > 0.5 ? ix.grassDark : ix.grassLight);
        if (r > 0.82) put(s, x, y + 1, ix.grassDark);
      }
    } else if (kind === 'water') {
      fillRect(s, 0, 0, TILE, TILE, ix.water);
      for (let y = (v * 3) % 4; y < TILE; y += 4) {
        const off = Math.floor(hash2(y, v) * 6);
        fillRect(s, off, y, 5, 1, ix.waterLight);
        fillRect(s, (off + 9) % TILE, y + 2, 4, 1, ix.waterDark);
      }
    } else if (kind === 'path') {
      fillRect(s, 0, 0, TILE, TILE, ix.path);
      for (let i = 0; i < 14; i++) {
        const x = Math.floor(hash2(i * 3 + v * 61, i) * TILE);
        const y = Math.floor(hash2(i * 5 + v * 13, i * 2) * TILE);
        put(s, x, y, ix.pathDark);
      }
    } else {
      fillRect(s, 0, 0, TILE, TILE, ix.plaza);
      fillRect(s, 0, 0, TILE, 1, ix.plazaDark);
      fillRect(s, 0, 0, 1, TILE, ix.plazaDark);
      if (v & 1) fillRect(s, 8, 0, 1, TILE, ix.plazaDark);
      if (v & 2) fillRect(s, 0, 8, TILE, 1, ix.plazaDark);
    }
    return sprite(s, 0, 0, TILE, TILE);
  }

  function tile(kind: TileKind, variant: number): Sprite {
    const key = `${kind}|${variant & 3}`;
    let hit = tileCache.get(key);
    if (!hit) {
      hit = makeTile(kind, variant);
      tileCache.set(key, hit);
    }
    return hit;
  }

  /* ----------------------------------------------------------------- nature */

  const natureCache = new Map<string, Sprite>();

  function makeNature(kind: string): Sprite {
    const scale = Math.max(1, Math.round(pxPerUnit * 0.8));
    if (kind === 'tree') {
      const w = 5 * scale + 4;
      const h = 9 * scale + 4;
      const s = createSurface(w, h);
      const tw = Math.max(2, scale);
      fillRect(s, Math.floor((w - tw) / 2), h - 4 * scale, tw, 4 * scale, ix.trunk);
      const cw = w - 2;
      const ch = h - 4 * scale - 1;
      fillRect(s, 1, 1, cw, ch, ix.leaf);
      fillRect(s, 1, 1 + ch - Math.max(1, scale), cw, Math.max(1, scale), ix.leafDark);
      strokeRect(s, 1, 1, cw, ch, ix.ink);
      put(s, 1, 1, 0);
      put(s, cw, 1, 0);
      return sprite(s, Math.floor(w / 2), h - 1, cw, Math.max(2, scale * 2));
    }
    if (kind === 'bush') {
      const w = 4 * scale + 2;
      const h = 3 * scale + 2;
      const s = createSurface(w, h);
      fillRect(s, 0, 0, w, h, ix.leaf);
      fillRect(s, 0, h - 1, w, 1, ix.leafDark);
      strokeRect(s, 0, 0, w, h, ix.ink);
      return sprite(s, Math.floor(w / 2), h - 1, w, 2);
    }
    if (kind === 'lamp') {
      const h = 8 * scale;
      const s = createSurface(5, h);
      fillRect(s, 2, 3, 1, h - 3, ix.ink);
      fillRect(s, 1, 0, 3, 3, ix.sign);
      strokeRect(s, 0, 0, 5, 4, ix.ink);
      return sprite(s, 2, h - 1, 3, 2);
    }
    if (kind === 'bench') {
      const w = 5 * scale;
      const s = createSurface(w, 6);
      fillRect(s, 0, 0, w, 3, ix.trunk);
      fillRect(s, 0, 3, w, 1, ix.ink);
      fillRect(s, 1, 4, 1, 2, ix.ink);
      fillRect(s, w - 2, 4, 1, 2, ix.ink);
      strokeRect(s, 0, 0, w, 4, ix.ink);
      return sprite(s, Math.floor(w / 2), 5, w, 3);
    }
    // rock / unknown
    const s = createSurface(6, 5);
    fillRect(s, 1, 1, 4, 4, ix.stone);
    fillRect(s, 1, 4, 4, 1, ix.ink);
    strokeRect(s, 0, 0, 6, 5, ix.ink);
    return sprite(s, 3, 4, 5, 3);
  }

  function nature(kind: string): Sprite {
    let hit = natureCache.get(kind);
    if (!hit) {
      hit = makeNature(kind);
      natureCache.set(kind, hit);
    }
    return hit;
  }

  /* -------------------------------------------------------------- character */

  const charCache = new Map<string, Sprite>();

  function makeCharacter(dir: Direction, frame: number, tint: number): Sprite {
    const u = Math.max(1, Math.round(pxPerUnit * 0.6));
    const w = 6 * u;
    const h = 10 * u;
    const s = createSurface(w, h);
    const headH = 3 * u;
    const bodyY = headH;
    const bodyH = 4 * u;
    const legY = bodyY + bodyH;
    const legH = h - legY;

    // Legs: frame 0 together, 1 left forward, 2 right forward.
    const f = ((frame % 3) + 3) % 3;
    const swing = f === 0 ? 0 : u;
    const legW = Math.max(1, u * 2 - 1);
    const leftX = u;
    const rightX = w - u - legW;
    fillRect(s, leftX, legY + (f === 1 ? 0 : swing), legW, legH - (f === 1 ? 0 : swing), ix.ink);
    fillRect(s, rightX, legY + (f === 2 ? 0 : swing), legW, legH - (f === 2 ? 0 : swing), ix.ink);

    // Body in the player tint, outlined.
    fillRect(s, 0, bodyY, w, bodyH, tint);
    strokeRect(s, 0, bodyY, w, bodyH, ix.ink);
    if (dir === 'e') fillRect(s, w - u - 1, bodyY + u, u, bodyH - u - 1, ix.skin);
    if (dir === 'w') fillRect(s, 1, bodyY + u, u, bodyH - u - 1, ix.skin);

    // Head.
    const hx = u;
    const hw = w - 2 * u;
    fillRect(s, hx, 0, hw, headH, ix.skin);
    fillRect(s, hx, 0, hw, Math.max(1, u), dir === 'n' ? ix.ink : ix.skinDark);
    strokeRect(s, hx, 0, hw, headH, ix.ink);
    if (dir === 's') {
      put(s, hx + 1, headH - 2, ix.ink);
      put(s, hx + hw - 2, headH - 2, ix.ink);
    } else if (dir === 'e') {
      put(s, hx + hw - 2, headH - 2, ix.ink);
    } else if (dir === 'w') {
      put(s, hx + 1, headH - 2, ix.ink);
    }

    return sprite(s, Math.floor(w / 2), h - 1, w, Math.max(2, u * 2));
  }

  function character(dir: Direction, frame: number, tintIndex: number): Sprite {
    const key = `${dir}|${((frame % 3) + 3) % 3}|${tintIndex}`;
    let hit = charCache.get(key);
    if (!hit) {
      hit = makeCharacter(dir, frame, tintIndex);
      charCache.set(key, hit);
    }
    return hit;
  }

  const art: ArtSet & { placeholder: true } = {
    placeholder: true,
    palette,
    building,
    tile,
    nature,
    character,
  };
  return art;
}

/** Re-exported so the ground layer can dither shadows with the same helper. */
export { ditherRect };
