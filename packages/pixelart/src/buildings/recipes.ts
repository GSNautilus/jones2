/**
 * Which sprite every sim location gets.
 *
 * The town JSON stores a `location` id on each node; the renderer looks that id
 * up here to find the generator and its parameters. Keep this in step with
 * `packages/sim/src/content/locations.ts` — the tests assert that every id here
 * resolves to a registered kind.
 *
 * Signs are split into `sign` / `sign2` where a name is too wide for one line
 * of the 5x7 font at the building's width.
 */
import type { PixelBuildingRef } from '../types';

export const LOCATION_RECIPES: Record<string, PixelBuildingRef> = {
  // --- civic and transport -------------------------------------------------
  bus_depot: { kind: 'bus_depot', params: { sign: 'BUS' } },
  employment: { kind: 'employment', params: { sign: 'EMPLOYMENT' } },
  rent_office: { kind: 'rent_office', params: { sign: 'RENT', sign2: 'OFFICE' } },
  bank: { kind: 'bank', params: { sign: 'BANK' } },
  newsstand: { kind: 'newsstand', params: { sign: 'NEWS' } },
  university: { kind: 'university', params: { sign: 'HI-TECH U' } },
  clinic: { kind: 'clinic', params: { sign: 'CLINIC' } },

  // --- food ----------------------------------------------------------------
  monolith: { kind: 'monolith', params: { sign: 'MONOLITH' } },
  cafe: { kind: 'cafe', params: { sign: 'JAVA HUT' } },
  gilded_fork: { kind: 'gilded_fork', params: { sign: 'THE', sign2: 'GILDED FORK' } },
  chez_cholesterol: { kind: 'chez_cholesterol', params: { sign: 'CHEZ', sign2: 'CHOLESTEROL' } },

  // --- shops ---------------------------------------------------------------
  qt_clothing: { kind: 'qt_clothing', params: { sign: 'QT CLOTHING' } },
  socket_city: { kind: 'socket_city', params: { sign: 'SOCKET CITY' } },
  blacks_market: { kind: 'blacks_market', params: { sign: "BLACK'S", sign2: 'MARKET' } },
  zmart: { kind: 'zmart', params: { sign: 'MART' } },
  pawn: { kind: 'pawn', params: { sign: 'PAWN' } },
  auto: { kind: 'auto', params: { sign: "HONEST AL'S" } },

  // --- leisure -------------------------------------------------------------
  park: { kind: 'park', params: { sign: 'RIVERSIDE', sign2: 'PARK' } },
  gym: { kind: 'gym', params: { sign: 'FLEX FACTORY' } },
  cinema: { kind: 'cinema', params: { sign: 'BIJOU', sign2: 'NOW SHOWING' } },
  lookout: { kind: 'lookout', params: { sign: 'LOOKOUT' } },

  // --- work ----------------------------------------------------------------
  factory: { kind: 'factory', params: { sign: 'WIDGETS' } },

  // --- housing -------------------------------------------------------------
  shady_acres: { kind: 'shady_acres', params: { sign: 'SHADY ACRES' } },
  lowcost: { kind: 'lowcost', params: { sign: 'LOW-COST', sign2: 'HOUSING' } },
  security_apts: { kind: 'security_apts', params: { sign: 'SECURITY APTS' } },

  // The three owned houses are the one `house` generator, dressed differently.
  house_elm: {
    kind: 'house',
    params: { wall: 'cream', roof: 'brick', roofShape: 'gable', storeys: 1, garage: true, sign: '12' },
  },
  house_lake: {
    kind: 'house',
    params: { wall: 'white', roof: 'blue', roofShape: 'hip', storeys: 1, garage: false },
  },
  house_hill: {
    kind: 'house',
    params: { wall: 'white', roof: 'blueDark', roofShape: 'hip', storeys: 2, garage: true },
  },
};

/** The recipe for a location id, falling back to a plain house. */
export function recipeFor(locationId: string): PixelBuildingRef {
  return LOCATION_RECIPES[locationId] ?? { kind: 'house' };
}
