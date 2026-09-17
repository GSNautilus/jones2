/** Every building generator, keyed by the `kind` used in `PixelBuildingRef`. */
import type { Sprite } from '../types';
import type { BuildingGenerator, Params } from './common';
import { monolith } from './monolith';
import { bank } from './bank';
import { zmart } from './zmart';
import { university } from './university';
import { factory } from './factory';
import { house } from './house';
import { busDepot } from './bus_depot';
import { employment } from './employment';
import { newsstand } from './newsstand';
import { clinic } from './clinic';
import { cafe } from './cafe';
import { qtClothing } from './qt_clothing';
import { socketCity } from './socket_city';
import { blacksMarket } from './blacks_market';
import { pawn } from './pawn';
import { auto } from './auto';
import { park } from './park';
import { gym } from './gym';
import { cinema } from './cinema';
import { lookout } from './lookout';
import { gildedFork } from './gilded_fork';
import { chezCholesterol } from './chez_cholesterol';
import { shadyAcres } from './shady_acres';
import { lowcost } from './lowcost';
import { securityApts } from './security_apts';
import { rentOffice } from './rent_office';
import { petStore } from './pet_store';
import { themePark } from './theme_park';
import { stadium } from './stadium';
import { corpo } from './corpo';
import { government } from './government';
import { researchLab } from './research_lab';

export const BUILDINGS: Record<string, BuildingGenerator> = {
  // phase A heroes
  monolith,
  bank,
  zmart,
  university,
  factory,
  house,
  // civic and transport
  bus_depot: busDepot,
  employment,
  rent_office: rentOffice,
  newsstand,
  clinic,
  // the parade
  cafe,
  qt_clothing: qtClothing,
  socket_city: socketCity,
  blacks_market: blacksMarket,
  pawn,
  auto,
  // leisure and outdoors
  park,
  gym,
  cinema,
  lookout,
  // restaurants
  gilded_fork: gildedFork,
  chez_cholesterol: chezCholesterol,
  // rentals
  shady_acres: shadyAcres,
  lowcost,
  security_apts: securityApts,
  // closed lots: no interior yet, but they stand on the map like everything else
  theme_park: themePark,
  stadium,
  corpo,
  government,
  research_lab: researchLab,
  pet_store: petStore,
};

/** Build a sprite from a town node's `pixel` recipe. Unknown kinds fall back to a house. */
export function buildFromRef(kind: string, params?: Params): Sprite {
  const gen = BUILDINGS[kind] ?? BUILDINGS.house;
  return gen(params);
}
