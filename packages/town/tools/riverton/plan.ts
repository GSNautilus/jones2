/**
 * THE PLAN. Pure data: the river, the highway, the streets, where every
 * location stands, and the scenery. All the generator's geometry decisions
 * live here; `../riverton.ts` only assembles them.
 *
 * The scheme (docs/PLAN.md §1, decided 2026-09-16): a river on one diagonal
 * running top-left to bottom-right, a highway on the other running bottom-left
 * to top-right, crossing near the town centre. Four wedges meet at the
 * crossing: two rich above the river (uptown to the north, campus to the
 * east), two poor below it (mill to the west, strip to the south). The highway
 * is a barrier — streets pass under it, never onto it — and the river is
 * crossed by exactly three bridges.
 *
 * The hour ladder is geometry. Read distances as arc length in pixels, divided
 * by `PER_MINUTE` (9 px/min on a street):
 *   - a rich location is 270-470 px from the centre  (1h)
 *   - a poor location is 850-1040 px                 (2h)
 *   - so a cross-river pair is 1200-1510 px          (3h)
 *   - mill to strip runs through an underpass at 700-960 px (2h)
 */
import type { Pt } from '../geom';
import type { LocSpec, StreetSpec, WaterSpec } from './spec';

/* ------------------------------------------------------------------ water */

export const WATER: WaterSpec[] = [
  {
    // Enters at the top-left, meanders down to the bottom-right corner.
    id: 'river',
    points: [
      { x: 24, y: 104 },
      { x: 261, y: 356 },
      { x: 586, y: 336 },
      { x: 812, y: 560 },
      { x: 1079, y: 613 },
      { x: 1288, y: 782 },
      { x: 1578, y: 831 },
      { x: 1772, y: 946 },
      { x: 1904, y: 1096 },
    ],
    width: 48,
  },
  {
    // A pool in the woods on the west bank.
    id: 'pool_west',
    points: [
      { x: 178, y: 902 },
      { x: 250, y: 926 },
      { x: 322, y: 908 },
    ],
    width: 62,
  },
  {
    // A reservoir in the trees behind the campus.
    id: 'pool_east',
    points: [
      { x: 1782, y: 536 },
      { x: 1846, y: 556 },
      { x: 1898, y: 538 },
    ],
    width: 56,
  },
  {
    // A broad still lake off the river's last bend, in the south-east.
    id: 'lake',
    points: [
      { x: 1580, y: 1075 },
      { x: 1700, y: 1100 },
      { x: 1810, y: 1084 },
    ],
    width: 92,
  },
];

/* ---------------------------------------------------------------- streets */

/**
 * Streets are resolved in order: a side street names its parent and a point on
 * it, and the generator computes the junction and leaves along the parent's
 * normal. The highway and Main Street are the only roads in absolute
 * coordinates.
 */
export const STREETS: StreetSpec[] = [
  {
    // Bottom-left to top-right in one long sweep, flattening out to the west.
    id: 'highway',
    kind: 'highway',
    pts: [
      { x: 158, y: 1132 },
      { x: 560, y: 1078 },
      { x: 820, y: 1006 },
      { x: 1060, y: 918 },
      { x: 1270, y: 790 },
      { x: 1420, y: 620 },
      { x: 1580, y: 495 },
      { x: 1740, y: 400 },
      { x: 1898, y: 250 },
    ],
  },
  {
    // The high street, climbing gently west-north-west out of the centre and
    // rising again toward the north-east rim.
    id: 'main_st',
    kind: 'street',
    pts: [
      { x: 480, y: 250 },
      { x: 700, y: 330 },
      { x: 920, y: 400 },
      { x: 1100, y: 458 },
      { x: 1300, y: 520 },
      { x: 1460, y: 460 },
      { x: 1620, y: 340 },
      { x: 1740, y: 250 },
    ],
  },
  {
    // Up the hill into uptown.
    id: 'uptown_rd',
    kind: 'street',
    start: { street: 'main_st', s: { x: 1144, y: 472 }, side: -1, stub: 85, id: 'j_uptown' },
    pts: [
      { x: 1120, y: 280 },
      { x: 1030, y: 196 },
      { x: 910, y: 146 },
    ],
  },
  {
    // The ridge road along the top, out to the villas.
    id: 'hill_rd',
    kind: 'street',
    start: { street: 'uptown_rd', s: { x: 1030, y: 196 }, side: 1, stub: 80, id: 'j_hill' },
    pts: [
      { x: 1190, y: 124 },
      { x: 1300, y: 166 },
      { x: 1380, y: 236 },
    ],
  },
  {
    // Out of the centre, under the highway, into the campus pocket.
    id: 'campus_rd',
    kind: 'street',
    start: { street: 'main_st', s: 900, side: 1, stub: 90, id: 'j_campus' },
    pts: [
      { x: 1450, y: 760 },
      { x: 1570, y: 792 },
      { x: 1700, y: 798 },
      { x: 1800, y: 772 },
    ],
  },
  {
    /*
     * Bridge Street. It leaves the high street at `j_center` — the crossroads
     * IS the town centre — crosses the river on the town bridge and runs west
     * along the poor bank to the mill. Everything on the poor side hangs off
     * this road, so every trip between the two halves passes through the
     * centre, which is what makes the hour ladder add up.
     */
    id: 'mill_rd',
    kind: 'street',
    start: { street: 'main_st', s: { x: 1300, y: 520 }, side: 1, stub: 85, id: 'j_center' },
    pts: [
      { x: 1240, y: 700 },
      { x: 1150, y: 760 },
      { x: 1020, y: 790 },
      { x: 880, y: 800 },
      { x: 740, y: 800 },
      { x: 600, y: 790 },
      { x: 460, y: 762 },
      { x: 340, y: 724 },
    ],
  },
  {
    // South off the mill road, under the highway, down to the strip.
    id: 'strip_rd',
    kind: 'street',
    start: { street: 'mill_rd', s: 495, side: -1, stub: 90, id: 'j_strip' },
    pts: [
      { x: 1010, y: 980 },
      { x: 1080, y: 1060 },
      { x: 1180, y: 1110 },
      { x: 1300, y: 1122 },
      { x: 1420, y: 1104 },
    ],
  },
  {
    // The lane up to the water meadows on the poor bank.
    id: 'park_ln',
    kind: 'street',
    start: { street: 'mill_rd', s: 620, side: 1, stub: 80, id: 'j_park' },
    pts: [
      { x: 800, y: 700 },
      { x: 772, y: 620 },
      { x: 755, y: 560 },
    ],
  },
  {
    // The footbridge over the upper river and the climb to the bluff. A dead
    // end, so the far bank is never a short cut across the water.
    id: 'lookout_path',
    kind: 'path',
    start: { street: 'park_ln', s: { x: 800, y: 700 }, side: -1, stub: 70, id: 'j_bluff' },
    pts: [
      { x: 620, y: 700 },
      { x: 520, y: 620 },
      { x: 450, y: 500 },
      { x: 415, y: 390 },
      { x: 380, y: 280 },
      { x: 330, y: 190 },
    ],
  },
  {
    // The works road, under the highway to the yards on the far side.
    id: 'works_rd',
    kind: 'street',
    start: { street: 'mill_rd', s: 660, side: -1, stub: 80, id: 'j_works' },
    pts: [
      { x: 780, y: 980 },
      { x: 770, y: 1070 },
      { x: 780, y: 1120 },
    ],
  },
  {
    // A short residential lane at the west end of the mill road.
    id: 'elm_ln',
    kind: 'street',
    start: { street: 'mill_rd', s: 960, side: 1, stub: 70, id: 'j_elm' },
    pts: [
      { x: 460, y: 600 },
      { x: 410, y: 535 },
    ],
  },
  {
    // The ridge footpath: out of the campus pocket, under the highway, back up
    // to the high street. The rich half's second grade separation.
    id: 'ridge_path',
    kind: 'path',
    start: { street: 'campus_rd', s: 480, side: -1, stub: 70, id: 'j_ridge' },
    pts: [{ x: 1660, y: 600 }],
    end: { street: 'main_st', s: 1150, side: 1, stub: 70, id: 'j_fork' },
  },
  {
    // The lake lane: over the lower river to the cottage. A dead end.
    id: 'lake_ln',
    kind: 'street',
    start: { street: 'campus_rd', s: { x: 1700, y: 798 }, side: 1, stub: 90, id: 'j_lake' },
    pts: [
      { x: 1705, y: 960 },
      { x: 1712, y: 1000 },
    ],
  },
];

/* -------------------------------------------------------------- locations */

const HOUSE_PARAMS: Record<string, Record<string, string | number | boolean>> = {
  house_elm: { wall: 'cream', roof: 'brick' },
  house_lake: { roofShape: 'hip', wall: 'blue', roof: 'greenDark' },
  house_hill: { storeys: 2, garage: true, wall: 'white', roof: 'blueDark' },
};

function loc(
  id: string,
  name: string,
  street: string,
  side: -1 | 1,
  s?: number,
  at?: string,
  nudge?: number,
): LocSpec {
  return {
    id,
    name,
    street,
    s,
    at,
    nudge,
    side,
    pixel: HOUSE_PARAMS[id] ? { kind: 'house', params: HOUSE_PARAMS[id] } : { kind: id },
  };
}

/**
 * Every sim location. `bus_depot` and `employment` share `j_center`, the
 * crossroads at the heart of the centre wedge, because other packages hardcode
 * the two-edge walk bus_depot -> j_center -> employment.
 */
export const LOCATIONS: LocSpec[] = [
  // --- the centre wedge. The four buildings at the crossroads hang straight
  //     off `j_center`, so the centre is one address and the hour ladder does
  //     not care which of them a trip starts at. ---------------------------
  loc('employment', 'Employment Office', 'main_st', 1, undefined, 'j_center', -70),
  loc('bus_depot', 'Bus Depot', 'main_st', -1, undefined, 'j_center', -115),
  loc('monolith', 'Monolith Burgers', 'main_st', -1, undefined, 'j_center', 125),
  loc('rent_office', 'Rent Office', 'main_st', -1, undefined, 'j_center', 0),
  loc('cinema', 'Bijou Cinema', 'main_st', 1, 340),
  loc('gym', 'Flex Factory Gym', 'main_st', -1, 430),
  loc('newsstand', 'Corner Newsstand', 'main_st', 1, 560),
  loc('cafe', 'Java Hut', 'main_st', -1, 1250),
  loc('clinic', "Doc's Walk-In Clinic", 'main_st', -1, 1060),
  // --- uptown, up the hill (rich) ------------------------------------------
  loc('bank', 'First Jones Bank', 'uptown_rd', -1, 120),
  loc('qt_clothing', 'QT Clothing', 'uptown_rd', 1, 185),
  loc('socket_city', 'Socket City', 'uptown_rd', -1, 250),
  loc('shady_acres', 'Shady Acres', 'hill_rd', -1, 150),
  loc('house_hill', 'Hilltop Manor', 'hill_rd', 1, 380),
  // --- campus, under the highway (rich) ------------------------------------
  loc('university', 'Hi-Tech University', 'campus_rd', -1, 300),
  loc('security_apts', 'Security Apartments', 'campus_rd', -1, 420),
  loc('gilded_fork', 'The Gilded Fork', 'ridge_path', 1, 120),
  loc('house_lake', 'Lakeside Cottage', 'lake_ln', 1, 150),
  // --- the mill wedge, west across the bridge (poor) -----------------------
  loc('factory', 'Consolidated Widgets', 'mill_rd', -1, 780),
  loc('lowcost', 'Low-Cost Housing', 'mill_rd', -1, 900),
  loc('park', 'Riverside Park', 'park_ln', -1, 170),
  loc('lookout', 'Lookout Point', 'lookout_path', -1, 740),
  loc('auto', "Honest Al's Autos", 'works_rd', 1, 300),
  loc('house_elm', '12 Elm Street', 'elm_ln', -1, 160),
  // --- the strip, south under the highway (poor) ---------------------------
  loc('zmart', 'Z-Mart', 'strip_rd', -1, 270),
  loc('blacks_market', "Black's Market", 'strip_rd', 1, 350),
  loc('pawn', 'Pawn Shop', 'strip_rd', -1, 430),
  loc('chez_cholesterol', 'Chez Cholesterol', 'strip_rd', -1, 500),
];

/* ------------------------------------------------------------- bus routes */

/** Lines out of the depot; each is stroked as one continuous route. */
export const BUS_LINES: Array<{ id: string; to: string }> = [
  { id: 'bus_1', to: 'cinema' },
  { id: 'bus_1', to: 'clinic' },
  { id: 'bus_2', to: 'lowcost' },
  { id: 'bus_2', to: 'auto' },
  { id: 'bus_3', to: 'chez_cholesterol' },
  { id: 'bus_4', to: 'house_lake' },
  { id: 'bus_5', to: 'house_hill' },
];

/* ------------------------------------------------------------------ decor */

/** Small still ponds, drawn as rectangle decor rather than as courses. */
export const PONDS: Array<[number, number, number, number]> = [
  [612, 1084, 58, 36],
];

/** Paved squares and greens. */
export const AREAS: Array<{ kind: string; x: number; y: number; w: number; h: number }> = [
  { kind: 'plaza', x: 1246, y: 430, w: 116, h: 70 },
  { kind: 'plaza', x: 1078, y: 1044, w: 96, h: 58 },
  { kind: 'grass', x: 852, y: 226, w: 128, h: 84 },
  { kind: 'grass', x: 520, y: 900, w: 130, h: 82 },
  { kind: 'grass', x: 700, y: 520, w: 110, h: 70 },
  { kind: 'grass', x: 1520, y: 620, w: 110, h: 72 },
];

/** Clusters of trees on the ground the roads never reach. */
export const WOODS: Array<{ x: number; y: number; r: number; n: number }> = [
  { x: 170, y: 210, r: 96, n: 8 }, // the far bank above the upper river
  { x: 300, y: 170, r: 82, n: 6 },
  { x: 560, y: 180, r: 86, n: 7 }, // the common north of the high street
  { x: 760, y: 210, r: 78, n: 6 },
  { x: 1020, y: 340, r: 76, n: 6 },
  { x: 1560, y: 230, r: 92, n: 8 }, // the north-east rim
  { x: 1760, y: 160, r: 88, n: 7 },
  { x: 1810, y: 560, r: 84, n: 7 }, // the campus woods
  { x: 1300, y: 900, r: 92, n: 8 }, // between the strip and the river mouth
  { x: 1560, y: 960, r: 80, n: 6 },
  { x: 250, y: 520, r: 96, n: 8 }, // the empty west
  { x: 220, y: 700, r: 86, n: 7 },
  { x: 430, y: 960, r: 94, n: 8 },
  { x: 820, y: 900, r: 92, n: 8 },
  { x: 1000, y: 560, r: 74, n: 5 }, // the river meadow
  { x: 560, y: 660, r: 72, n: 5 },
  { x: 880, y: 1060, r: 76, n: 6 },
  { x: 380, y: 1090, r: 84, n: 7 },
  { x: 1660, y: 660, r: 70, n: 5 },
  { x: 120, y: 980, r: 92, n: 8 }, // the empty ground under the highway's west end
  { x: 640, y: 1100, r: 78, n: 6 },
  { x: 1000, y: 1140, r: 70, n: 5 },
  { x: 1860, y: 760, r: 66, n: 5 },
  { x: 1840, y: 980, r: 70, n: 5 },
  { x: 100, y: 460, r: 78, n: 6 },
  { x: 480, y: 130, r: 84, n: 7 },
  { x: 960, y: 160, r: 78, n: 6 },
  { x: 1180, y: 60, r: 72, n: 5 },
  { x: 1480, y: 120, r: 80, n: 6 },
  { x: 1120, y: 660, r: 64, n: 4 }, // the river meadow inside the bend
  { x: 940, y: 560, r: 68, n: 5 },
  { x: 60, y: 120, r: 70, n: 5 },
  { x: 90, y: 300, r: 72, n: 5 },
  { x: 60, y: 660, r: 76, n: 6 },
  { x: 330, y: 420, r: 80, n: 6 },
  { x: 420, y: 250, r: 76, n: 6 },
  { x: 250, y: 1120, r: 74, n: 5 },
  { x: 900, y: 660, r: 70, n: 5 },
  { x: 1180, y: 940, r: 78, n: 6 },
  { x: 1480, y: 950, r: 74, n: 5 },
  { x: 1780, y: 900, r: 68, n: 5 },
  { x: 1880, y: 680, r: 60, n: 4 },
  { x: 1300, y: 340, r: 62, n: 4 },
  { x: 700, y: 60, r: 70, n: 5 },
  { x: 1600, y: 1020, r: 62, n: 4 },
];

/** Hedgerows: street id, spacing, prop kind. */
export const HEDGES: Array<[string, number, string]> = [
  ['hill_rd', 74, 'bush'],
  ['mill_rd', 84, 'bush'],
  ['park_ln', 66, 'bush'],
  ['elm_ln', 62, 'bush'],
  ['works_rd', 70, 'bush'],
  ['lake_ln', 64, 'bush'],
  ['campus_rd', 82, 'bush'],
  ['lookout_path', 58, 'flowers'],
  ['ridge_path', 62, 'flowers'],
];

/** Streets that get lamp posts. */
export const LAMPED: string[] = ['main_st', 'strip_rd', 'uptown_rd'];

export const BENCHES: Pt[] = [
  { x: 1256, y: 586 },
  { x: 1300, y: 600 },
  { x: 890, y: 254 },
  { x: 1088, y: 1090 },
  { x: 668, y: 606 },
  { x: 1620, y: 828 },
  { x: 560, y: 930 },
];

export const PICNIC: Pt[] = [
  { x: 690, y: 548 },
  { x: 900, y: 262 },
];

export const CARS: Array<[string, number, number]> = [
  ['car_red', 726, 1084],
  ['car_blue', 760, 1096],
  ['car_green', 700, 1120],
  ['car_red', 1206, 1102],
  ['car_blue', 1010, 1010],
  ['car_green', 1080, 456],
  ['car_red', 1400, 508],
  ['car_blue', 1006, 214],
];

export const STREET_FURNITURE: Array<[string, number, number]> = [
  ['hydrant', 1246, 500],
  ['hydrant', 1000, 432],
  ['hydrant', 1090, 1082],
  ['mailbox', 1340, 542],
  ['mailbox', 856, 384],
  ['mailbox', 1508, 742],
  ['mailbox', 610, 800],
];
