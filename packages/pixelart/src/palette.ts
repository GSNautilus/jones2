/**
 * The one palette for the whole game. Muted VGA: nothing is a pure primary,
 * everything shares one dark ink for outlines. Index 0 is transparent.
 */
import type { Palette, RGB } from './types';

interface Entry {
  name: string;
  rgb: RGB;
}

const ENTRIES: Entry[] = [
  { name: 'transparent', rgb: [0, 0, 0] },

  // structure
  { name: 'ink', rgb: [34, 28, 42] },
  { name: 'inkSoft', rgb: [62, 54, 70] },
  { name: 'white', rgb: [238, 236, 226] },
  { name: 'shadow', rgb: [70, 66, 86] },

  // ground
  { name: 'grass', rgb: [104, 158, 84] },
  { name: 'grassDark', rgb: [72, 122, 64] },
  { name: 'grassLight', rgb: [136, 186, 106] },
  { name: 'road', rgb: [84, 84, 94] },
  { name: 'roadEdge', rgb: [122, 122, 132] },
  { name: 'roadLine', rgb: [222, 190, 84] },
  { name: 'water', rgb: [84, 134, 180] },
  { name: 'waterDark', rgb: [54, 98, 146] },
  { name: 'waterLight', rgb: [136, 180, 214] },
  { name: 'sand', rgb: [206, 176, 122] },
  { name: 'sandDark', rgb: [168, 138, 92] },
  { name: 'paving', rgb: [182, 180, 178] },
  { name: 'pavingDark', rgb: [148, 146, 146] },

  // materials
  { name: 'cream', rgb: [230, 214, 174] },
  { name: 'creamShade', rgb: [192, 172, 132] },
  { name: 'brick', rgb: [158, 84, 68] },
  { name: 'brickDark', rgb: [112, 58, 50] },
  { name: 'wood', rgb: [148, 102, 62] },
  { name: 'woodDark', rgb: [104, 70, 44] },
  { name: 'stone', rgb: [172, 170, 162] },
  { name: 'stoneDark', rgb: [126, 124, 122] },
  { name: 'metal', rgb: [152, 156, 166] },
  { name: 'metalDark', rgb: [104, 108, 120] },
  { name: 'glass', rgb: [142, 180, 200] },
  { name: 'glassDark', rgb: [92, 130, 158] },

  // hues
  { name: 'red', rgb: [190, 60, 52] },
  { name: 'redDark', rgb: [138, 38, 40] },
  { name: 'yellow', rgb: [232, 194, 68] },
  { name: 'yellowDark', rgb: [190, 148, 44] },
  { name: 'orange', rgb: [218, 128, 52] },
  { name: 'orangeDark', rgb: [172, 92, 36] },
  { name: 'green', rgb: [88, 152, 72] },
  { name: 'greenDark', rgb: [54, 108, 54] },
  { name: 'blue', rgb: [70, 112, 176] },
  { name: 'blueDark', rgb: [44, 74, 130] },
  { name: 'purple', rgb: [122, 86, 150] },
  { name: 'purpleDark', rgb: [86, 58, 110] },
  { name: 'pink', rgb: [216, 144, 150] },
  { name: 'teal', rgb: [74, 150, 146] },

  // added in phase B for the shop catalogue
  { name: 'gold', rgb: [222, 182, 96] },
  { name: 'goldDark', rgb: [176, 134, 56] },
  { name: 'olive', rgb: [140, 140, 88] },
  { name: 'oliveDark', rgb: [98, 100, 62] },
  { name: 'slate', rgb: [104, 114, 138] },
  { name: 'slateDark', rgb: [66, 74, 96] },
  { name: 'maroon', rgb: [124, 48, 58] },

  // people
  { name: 'skin', rgb: [226, 178, 138] },
  { name: 'skinShade', rgb: [186, 138, 104] },
  { name: 'hair', rgb: [96, 64, 44] },
  { name: 'denim', rgb: [80, 102, 152] },
  { name: 'denimDark', rgb: [54, 72, 116] },
  { name: 'shirtKey', rgb: [226, 74, 158] },

  // nature
  { name: 'leaf', rgb: [92, 152, 76] },
  { name: 'leafDark', rgb: [56, 106, 56] },
  { name: 'leafLight', rgb: [136, 188, 100] },
  { name: 'trunk', rgb: [116, 80, 50] },
  { name: 'trunkDark', rgb: [80, 54, 36] },
];

const colors: RGB[] = ENTRIES.map((e) => e.rgb);
const names: Record<string, number> = {};
ENTRIES.forEach((e, i) => {
  names[e.name] = i;
});

export const PALETTE: Palette = { colors, names };

/** Shorthand index lookup used across the package. */
export const C = names as Readonly<Record<string, number>>;

/** Palette index reserved for a player's shirt colour before tinting. */
export const SHIRT_KEY = names.shirtKey;

/** Shirt colours players can be tinted to, in order. */
export const PLAYER_SHIRTS: number[] = [names.red, names.blue, names.green, names.yellow, names.purple, names.orange];
