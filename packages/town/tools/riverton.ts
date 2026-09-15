/**
 * Generator for Riverton — the source of truth is this script, not the JSON.
 * Run it to rebuild `src/towns/riverton.json`:
 *
 *   npx tsx packages/town/tools/riverton.ts
 *
 * STREETS FIRST. The town is authored as a dozen named streets (see
 * `STREETS`), each a smooth polyline of waypoints. A side street is never
 * given hand-placed endpoints: it declares its parent street and an
 * arc-length position on it, and the generator computes the junction point,
 * the parent's tangent there, and lays the side street's first control point
 * along the normal — so every branch leaves its parent at ~90 degrees and the
 * two roads meet the way real roads do. A street may also *end* on another
 * street, approaching it along that street's normal, which is how the
 * downtown spine meets the shopping strip and the mill road meets the
 * highway.
 *
 * Buildings are placed ALONG streets: a location declares its street, an
 * arc-length address and a kerb. The anchor is the street point pushed out
 * along the normal (and, if it has to be, slid a little along the street)
 * until the REAL catalogue sprite box from `buildFromRef` clears every road
 * corridor and every building already placed. Nothing is rotated — the
 * sprites are fixed facade-forward art — so a building on the downhill kerb
 * is pushed out far enough to stand clear of the carriageway instead of
 * straddling it.
 *
 * The graph falls out of that. Nodes are junctions, waypoint nodes (which
 * double as bus stops on long stretches) and the locations themselves. Edges
 * join consecutive nodes along a street and carry that street's own sample
 * points as their `curve`, so the renderer redraws exactly the authored road;
 * every edge carries a `street` id so a whole road strokes as one line.
 * Locations hang off their street on a short driveway edge (`dwy_<id>`).
 *
 * Town units are native pixels (1 unit = 1 px) on a 1280x768 canvas — double
 * the old geometry. Travel times keep their old feel because the per-pixel
 * rate is halved: streets 1 min / 8 px, paths 1 / 6, highway 1 / 12.
 *
 * `tools/overlaps.ts` must report zero problems; `tools/preview.ts` renders
 * `art/sheets/riverton-graph.png` for eyeballing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildFromRef } from '../../pixelart/src/index';
import type { Decor, RoadKind, Town, TownEdge, TownNode } from '../src/types';
import { type Pt, type Rect, frange, mulberry32, rectContains, resample, sampleCurve } from './geom';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(HERE, '../src/towns/riverton.json');

const W = 1280;
const H = 768;
const MARGIN = 16;

/** Half the drawn width of each road kind, in pixels. */
const HALF: Record<RoadKind, number> = { highway: 10, street: 7, busline: 7, path: 4 };
/** Pixels of arc length per minute on foot — half the old rate, for double geometry. */
const PER_MINUTE: Record<RoadKind, number> = { street: 8, busline: 8, path: 6, highway: 12 };
/** Kerb-to-facade gap: an anchor starts at half the road width plus this. */
const SETBACK = 12;
/** Longest stretch of street without a node; longer runs get waypoint nodes. */
const MAX_GAP = 150;

const rng = mulberry32(20260914);

/* --------------------------------------------------------------- geometry */

function add(a: Pt, b: Pt, k = 1): Pt {
  return { x: a.x + b.x * k, y: a.y + b.y * k };
}

function unit(a: Pt): Pt {
  const len = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / len, y: a.y / len };
}

/** Left-hand normal of a tangent, flipped by `side` (-1 picks the other kerb). */
function normalOf(tan: Pt, side: -1 | 1): Pt {
  return { x: -tan.y * side, y: tan.x * side };
}

function inflate(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/* ---------------------------------------------------------------- streets */

/** Where a street attaches to another: an arc position, a kerb, a stub length. */
interface Attach {
  street: string;
  /** Arc length along the other street, in pixels from its start. */
  s: number;
  side: -1 | 1;
  /** How far the perpendicular departure runs before the street bends away. */
  stub?: number;
  /** Junction node id. */
  id: string;
}

/** A named node planted on a street at a fixed arc position. */
interface Mark {
  id: string;
  s: number;
}

interface StreetSpec {
  id: string;
  kind: RoadKind;
  /** Free waypoints, in order. Attachment points are spliced on either end. */
  pts?: Pt[];
  start?: Attach;
  end?: Attach;
  marks?: Mark[];
}

interface Street {
  id: string;
  kind: RoadKind;
  spec: StreetSpec;
  poly: Pt[];
  cum: number[];
  len: number;
}

const streets = new Map<string, Street>();

function streetAt(id: string, s: number): { p: Pt; tan: Pt } {
  const st = streets.get(id);
  if (!st) throw new Error(`Unknown street ${id}`);
  const want = Math.max(0, Math.min(st.len, s));
  let i = 1;
  while (i < st.cum.length - 1 && st.cum[i]! < want) i++;
  const a = st.poly[i - 1]!;
  const b = st.poly[i]!;
  const segLen = st.cum[i]! - st.cum[i - 1]! || 1;
  const t = (want - st.cum[i - 1]!) / segLen;
  const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  // Tangent over a short window so a single 3px sample never dominates.
  const lo = st.poly[Math.max(0, i - 4)]!;
  const hi = st.poly[Math.min(st.poly.length - 1, i + 3)]!;
  return { p, tan: unit({ x: hi.x - lo.x, y: hi.y - lo.y }) };
}

function resolveStreet(spec: StreetSpec): Street {
  const wps: Pt[] = [];
  if (spec.start) {
    const { p, tan } = streetAt(spec.start.street, spec.start.s);
    wps.push(p, add(p, normalOf(tan, spec.start.side), spec.start.stub ?? 56));
  }
  for (const p of spec.pts ?? []) wps.push(p);
  if (spec.end) {
    const { p, tan } = streetAt(spec.end.street, spec.end.s);
    wps.push(add(p, normalOf(tan, spec.end.side), spec.end.stub ?? 56), p);
  }
  if (wps.length < 2) throw new Error(`Street ${spec.id} needs at least two waypoints`);
  const poly = sampleCurve(wps[0]!, wps.slice(1, -1), wps[wps.length - 1]!, 3);
  const cum = [0];
  for (let i = 1; i < poly.length; i++) {
    cum.push(cum[i - 1]! + Math.hypot(poly[i]!.x - poly[i - 1]!.x, poly[i]!.y - poly[i - 1]!.y));
  }
  return { id: spec.id, kind: spec.kind, spec, poly, cum, len: cum[cum.length - 1]! };
}

/**
 * The street plan. Two roads are drawn in absolute coordinates: the `highway`
 * skirting the north and east rim, and `strip_rd`, the out-of-town shopping
 * strip curving down the east side. Everything else hangs off a parent at a
 * computed right-angle junction.
 *
 * West to east: `main_st` is downtown, a gentle S through the middle of the
 * map. `river_ln` drops south from its west end into the leisure lane;
 * `elm_ln` runs west off that across the river bridge, and `park_path` then
 * the long switchbacking `lookout_path` climb the far west bank. `mill_rd`
 * runs north out of downtown to the factory and on to a highway junction;
 * `hill_rd` branches east off it across the top of the map to the manor drive
 * and the head of the strip. `campus_ln` is the university's set-back spur.
 * `lake_rd` leaves the east end of downtown for the lake and the cottage.
 */
const STREETS: StreetSpec[] = [
  {
    id: 'highway',
    kind: 'highway',
    pts: [
      { x: 300, y: 26 },
      { x: 560, y: 20 },
      { x: 820, y: 30 },
      { x: 1032, y: 74 },
      { x: 1160, y: 190 },
      { x: 1232, y: 372 },
      { x: 1240, y: 560 },
      { x: 1214, y: 664 },
    ],
  },
  {
    id: 'strip_rd',
    kind: 'street',
    pts: [
      { x: 982, y: 206 },
      { x: 1046, y: 288 },
      { x: 1090, y: 380 },
      { x: 1100, y: 476 },
      { x: 1068, y: 562 },
      { x: 1016, y: 600 },
    ],
  },
  {
    id: 'main_st',
    kind: 'street',
    pts: [
      { x: 268, y: 604 },
      { x: 360, y: 566 },
      { x: 452, y: 528 },
      { x: 548, y: 496 },
      { x: 648, y: 470 },
      { x: 752, y: 456 },
      { x: 856, y: 448 },
      { x: 948, y: 436 },
    ],
    end: { street: 'strip_rd', s: 250, side: 1, stub: 66, id: 'j_east' },
    marks: [{ id: 'j_center', s: 260 }],
  },
  {
    id: 'river_ln',
    kind: 'street',
    start: { street: 'main_st', s: 60, side: 1, stub: 62, id: 'j_west' },
    pts: [
      { x: 400, y: 692 },
      { x: 496, y: 724 },
      { x: 604, y: 734 },
      { x: 712, y: 722 },
      { x: 800, y: 698 },
    ],
  },
  {
    id: 'elm_ln',
    kind: 'street',
    start: { street: 'river_ln', s: 80, side: 1, stub: 58, id: 'j_elm' },
    pts: [
      { x: 240, y: 678 },
      { x: 168, y: 650 },
      { x: 110, y: 612 },
    ],
  },
  {
    id: 'park_path',
    kind: 'path',
    start: { street: 'elm_ln', s: 140, side: 1, stub: 48, id: 'j_park' },
    pts: [
      { x: 186, y: 576 },
      { x: 150, y: 502 },
      { x: 128, y: 452 },
    ],
  },
  {
    id: 'lookout_path',
    kind: 'path',
    start: { street: 'park_path', s: 238, side: 1, stub: 46, id: 'j_bluff' },
    pts: [
      { x: 176, y: 372 },
      { x: 138, y: 300 },
      { x: 118, y: 228 },
    ],
  },
  {
    id: 'mill_rd',
    kind: 'street',
    start: { street: 'main_st', s: 350, side: -1, stub: 66, id: 'j_mill' },
    pts: [
      { x: 620, y: 340 },
      { x: 590, y: 250 },
      { x: 586, y: 170 },
    ],
    end: { street: 'highway', s: 250, side: 1, stub: 70, id: 'j_hwy_mill' },
  },
  {
    id: 'campus_ln',
    kind: 'street',
    start: { street: 'main_st', s: 470, side: -1, stub: 64, id: 'j_campus' },
    pts: [{ x: 748, y: 372 }],
  },
  {
    id: 'hill_rd',
    kind: 'street',
    start: { street: 'mill_rd', s: 226, side: 1, stub: 66, id: 'j_hill' },
    pts: [
      { x: 780, y: 264 },
      { x: 892, y: 248 },
    ],
    end: { street: 'strip_rd', s: 26, side: 1, stub: 62, id: 'j_strip_n' },
  },
  {
    id: 'manor_dr',
    kind: 'street',
    start: { street: 'hill_rd', s: 205, side: -1, stub: 56, id: 'j_manor' },
    pts: [{ x: 800, y: 156 }],
  },
  {
    id: 'hwy_hill_ramp',
    kind: 'highway',
    start: { street: 'hill_rd', s: 330, side: -1, stub: 74, id: 'j_hill_ramp' },
    end: { street: 'highway', s: 620, side: 1, stub: 74, id: 'j_hwy_hill' },
  },
  {
    id: 'lake_rd',
    kind: 'street',
    start: { street: 'main_st', s: 690, side: 1, stub: 66, id: 'j_lake_w' },
    pts: [
      { x: 972, y: 584 },
      { x: 1022, y: 660 },
      { x: 1110, y: 702 },
      { x: 1200, y: 706 },
    ],
  },
];

for (const spec of STREETS) streets.set(spec.id, resolveStreet(spec));

/* ------------------------------------------------------------- road masks */

/**
 * A 1px occupancy bitmap of the road corridors plus a summed-area table, so
 * "does this sprite box stand on a road?" is a constant-time query however
 * many setbacks the placement search tries.
 */
function buildRoadMask(pad: number): (box: Rect) => boolean {
  const mask = new Uint8Array(W * H);
  for (const st of streets.values()) {
    const r = HALF[st.kind] + pad;
    for (const p of st.poly) {
      const x0 = Math.max(0, Math.floor(p.x - r));
      const x1 = Math.min(W - 1, Math.ceil(p.x + r));
      const y0 = Math.max(0, Math.floor(p.y - r));
      const y1 = Math.min(H - 1, Math.ceil(p.y + r));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if ((x - p.x) ** 2 + (y - p.y) ** 2 <= r * r) mask[y * W + x] = 1;
        }
      }
    }
  }
  // summed-area table, (W+1) x (H+1)
  const sat = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let rowSum = 0;
    for (let x = 0; x < W; x++) {
      rowSum += mask[y * W + x]!;
      sat[(y + 1) * (W + 1) + (x + 1)] = sat[y * (W + 1) + (x + 1)]! + rowSum;
    }
  }
  return (box: Rect): boolean => {
    const x0 = Math.max(0, Math.floor(box.x));
    const y0 = Math.max(0, Math.floor(box.y));
    const x1 = Math.min(W, Math.ceil(box.x + box.w));
    const y1 = Math.min(H, Math.ceil(box.y + box.h));
    if (x1 <= x0 || y1 <= y0) return false;
    const total =
      sat[y1 * (W + 1) + x1]! - sat[y0 * (W + 1) + x1]! - sat[y1 * (W + 1) + x0]! + sat[y0 * (W + 1) + x0]!;
    return total > 0;
  };
}

const boxOnRoad = buildRoadMask(6);
const pointNearRoad = buildRoadMask(4);

/* -------------------------------------------------------------- locations */

interface LocSpec {
  id: string;
  name: string;
  street: string;
  /** Arc-length address along the street. Ignored when `at` names a junction. */
  s?: number;
  /** Attach straight to an existing named node instead of minting an address. */
  at?: string;
  side: -1 | 1;
  pixel: { kind: string; params?: Record<string, string | number | boolean> };
}

const HOUSE_PARAMS: Record<string, Record<string, string | number | boolean>> = {
  house_elm: { wall: 'cream', roof: 'brick' },
  house_lake: { roofShape: 'hip', wall: 'blue', roof: 'greenDark' },
  house_hill: { storeys: 2, garage: true, wall: 'white', roof: 'blueDark' },
};

function loc(id: string, name: string, street: string, side: -1 | 1, s?: number, at?: string): LocSpec {
  return {
    id,
    name,
    street,
    s,
    at,
    side,
    pixel: HOUSE_PARAMS[id] ? { kind: 'house', params: HOUSE_PARAMS[id] } : { kind: id },
  };
}

/**
 * Every sim location, hung off a street. `bus_depot` and `employment` share
 * `j_center`, the downtown crossroads, because other packages hardcode the
 * two-edge walk bus_depot -> j_center -> employment.
 */
const LOCATIONS: LocSpec[] = [
  // --- downtown, along main_st ---------------------------------------------
  loc('bank', 'First Jones Bank', 'main_st', -1, 150),
  loc('bus_depot', 'Bus Depot', 'main_st', -1, undefined, 'j_center'),
  loc('employment', 'Employment Office', 'main_st', 1, undefined, 'j_center'),
  loc('newsstand', 'Corner Newsstand', 'main_st', -1, 400),
  loc('monolith', 'Monolith Burgers', 'main_st', 1, 505),
  loc('clinic', "Doc's Walk-In Clinic", 'main_st', -1, 580),
  loc('cafe', 'Java Hut', 'main_st', 1, 630),
  loc('university', 'Hi-Tech University', 'campus_ln', -1, 75),
  // --- industrial north, up mill_rd ----------------------------------------
  loc('lowcost', 'Low-Cost Housing', 'mill_rd', -1, 130),
  loc('factory', 'Consolidated Widgets', 'mill_rd', -1, 330),
  // --- the ridge road, east across the top ---------------------------------
  loc('shady_acres', 'Shady Acres', 'hill_rd', -1, 120),
  loc('house_hill', 'Hilltop Manor', 'manor_dr', 1, 84),
  // --- the shopping strip, east --------------------------------------------
  loc('qt_clothing', 'QT Clothing', 'strip_rd', -1, 95),
  loc('socket_city', 'Socket City', 'strip_rd', 1, 150),
  loc('zmart', 'Z-Mart', 'strip_rd', -1, 215),
  loc('auto', "Honest Al's Autos", 'strip_rd', -1, 348),
  loc('blacks_market', "Black's Market", 'strip_rd', 1, 380),
  loc('pawn', 'Pawn Shop', 'strip_rd', -1, 400),
  // --- the leisure lane, south ---------------------------------------------
  loc('cinema', 'Bijou Cinema', 'river_ln', -1, 180),
  loc('gym', 'Flex Factory Gym', 'river_ln', -1, 290),
  loc('gilded_fork', 'The Gilded Fork', 'river_ln', -1, 400),
  loc('chez_cholesterol', 'Chez Cholesterol', 'river_ln', -1, 505),
  // --- across the river, west ----------------------------------------------
  loc('house_elm', '12 Elm Street', 'elm_ln', -1, 250),
  loc('park', 'Riverside Park', 'park_path', -1, 168),
  loc('lookout', 'Lookout Point', 'lookout_path', -1, 240),
  // --- south-east, out to the lake -----------------------------------------
  loc('security_apts', 'Security Apartments', 'lake_rd', 1, 170),
  loc('house_lake', 'Lakeside Cottage', 'lake_rd', -1, 400),
];

/* ---------------------------------------------- placing the real sprite box */

function spriteFor(l: LocSpec) {
  return buildFromRef(l.pixel.kind, l.pixel.params);
}

function boxAt(anchor: Pt, l: LocSpec): Rect {
  const s = spriteFor(l);
  return { x: anchor.x - s.anchorX, y: anchor.y - s.anchorY, w: s.width, h: s.height };
}

function boxInCanvas(box: Rect): boolean {
  return box.x >= 6 && box.y >= 6 && box.x + box.w <= W - 6 && box.y + box.h <= H - 6;
}

const placed: Array<{ id: string; box: Rect }> = [];

/**
 * Push the anchor out along the kerb normal until the real sprite box clears
 * every road corridor and every building already placed, sliding the address
 * along the street only if the straight push cannot be made to work. The
 * downhill kerb always needs a long push: a sprite grows upward from its
 * anchor and would otherwise stand in the carriageway.
 */
const warnings: string[] = [];

function placeBuilding(l: LocSpec, s: number): { anchor: Pt; s: number } {
  const street = streets.get(l.street)!;
  const base = HALF[street.kind] + SETBACK;
  const slides = [0];
  for (let d = 6; d <= 120; d += 6) slides.push(d, -d);
  let fallback: { anchor: Pt; s: number } | null = null;
  for (const ds of slides) {
    const sAt = Math.max(8, Math.min(street.len - 8, s + ds));
    const at = streetAt(l.street, sAt);
    const n = normalOf(at.tan, l.side);
    for (let t = base; t <= 340; t += 2) {
      const anchor = { x: Math.round(at.p.x + n.x * t), y: Math.round(at.p.y + n.y * t) };
      if (anchor.x < MARGIN || anchor.x > W - MARGIN || anchor.y < MARGIN || anchor.y > H - MARGIN) continue;
      const box = boxAt(anchor, l);
      if (!boxInCanvas(box)) continue;
      if (boxOnRoad(box)) continue;
      if (!fallback) fallback = { anchor, s: sAt };
      if (placed.some((q) => rectsOverlap(inflate(q.box, 5), box))) continue;
      return { anchor, s: sAt };
    }
  }
  const at = streetAt(l.street, s);
  const n = normalOf(at.tan, l.side);
  warnings.push(
    `${l.id} on ${l.street}@${s} (${at.p.x.toFixed(0)},${at.p.y.toFixed(0)} n ${n.x.toFixed(2)},${n.y.toFixed(2)}, len ${street.len.toFixed(0)}) — no clear spot`,
  );
  return fallback ?? { anchor: { x: Math.round(at.p.x + n.x * base), y: Math.round(at.p.y + n.y * base) }, s };
}

/* ------------------------------------------------------------ street stops */

type StopKind = 'junction' | 'address' | 'waypoint';

interface Stop {
  s: number;
  node: string;
  kind: StopKind;
}

const stops = new Map<string, Stop[]>();
const nodePos = new Map<string, Pt>();
/** Junctions where two streets meet — the angle check and the signposts use these. */
const junctions = new Map<string, { parent: string; child: string; s: number }>();

for (const spec of STREETS) stops.set(spec.id, []);

function addStop(street: string, s: number, node: string, kind: StopKind): void {
  stops.get(street)!.push({ s, node, kind });
}

// 1. attachment junctions — one node shared by both streets
for (const spec of STREETS) {
  const st = streets.get(spec.id)!;
  if (spec.start) {
    nodePos.set(spec.start.id, streetAt(spec.start.street, spec.start.s).p);
    addStop(spec.start.street, spec.start.s, spec.start.id, 'junction');
    addStop(spec.id, 0, spec.start.id, 'junction');
    junctions.set(spec.start.id, { parent: spec.start.street, child: spec.id, s: spec.start.s });
  } else {
    const id = `${spec.id}_w`;
    nodePos.set(id, st.poly[0]!);
    addStop(spec.id, 0, id, 'waypoint');
  }
  if (spec.end) {
    nodePos.set(spec.end.id, streetAt(spec.end.street, spec.end.s).p);
    addStop(spec.end.street, spec.end.s, spec.end.id, 'junction');
    addStop(spec.id, st.len, spec.end.id, 'junction');
    junctions.set(spec.end.id, { parent: spec.end.street, child: spec.id, s: spec.end.s });
  } else {
    const id = `${spec.id}_e`;
    nodePos.set(id, st.poly[st.poly.length - 1]!);
    addStop(spec.id, st.len, id, 'waypoint');
  }
  for (const m of spec.marks ?? []) {
    nodePos.set(m.id, streetAt(spec.id, m.s).p);
    addStop(spec.id, m.s, m.id, 'junction');
  }
}

// 2. one address node per location (unless it hangs off a named junction),
//    then the building itself, pushed off the kerb
interface PlacedLoc extends LocSpec {
  anchor: Pt;
  address: string;
}

const locNodes: PlacedLoc[] = [];

for (const l of LOCATIONS) {
  let addressId: string;
  let s: number;
  if (l.at) {
    addressId = l.at;
    const owner = stops.get(l.street)!.find((q) => q.node === l.at);
    if (!owner) throw new Error(`${l.id} attaches to ${l.at}, which is not a stop on ${l.street}`);
    s = owner.s;
    const hit = placeBuilding(l, s);
    nodePos.set(l.id, hit.anchor);
    placed.push({ id: l.id, box: boxAt(hit.anchor, l) });
    locNodes.push({ ...l, anchor: hit.anchor, address: addressId });
    continue;
  }
  if (l.s === undefined) throw new Error(`${l.id} needs an address`);
  const hit = placeBuilding(l, l.s);
  addressId = `a_${l.id}`;
  s = hit.s;
  nodePos.set(addressId, streetAt(l.street, s).p);
  addStop(l.street, s, addressId, 'address');
  nodePos.set(l.id, hit.anchor);
  placed.push({ id: l.id, box: boxAt(hit.anchor, l) });
  locNodes.push({ ...l, anchor: hit.anchor, address: addressId });
}

// 3. tidy each street's stops: sort, merge near-duplicates, break long gaps
/** Stops swallowed by a neighbour, so driveways can follow them. */
const mergedTo = new Map<string, string>();

function resolveNode(id: string): string {
  let cur = id;
  const seen = new Set<string>();
  while (mergedTo.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    cur = mergedTo.get(cur)!;
  }
  return cur;
}

for (const spec of STREETS) {
  const list = stops.get(spec.id)!;
  list.sort((a, b) => a.s - b.s);
  const merged: Stop[] = [];
  for (const stop of list) {
    const last = merged[merged.length - 1];
    if (last && stop.s - last.s < 22) {
      // Two stops that close would draw a stub edge; keep the more structural
      // one and point everything that referenced the other at it.
      if (last.kind === 'junction' || (last.kind === 'address' && stop.kind !== 'junction')) {
        mergedTo.set(stop.node, last.node);
        continue;
      }
      mergedTo.set(last.node, stop.node);
      merged.pop();
    }
    merged.push(stop);
  }
  const filled: Stop[] = [];
  for (let i = 0; i < merged.length; i++) {
    filled.push(merged[i]!);
    const next = merged[i + 1];
    if (!next) continue;
    const gap = next.s - merged[i]!.s;
    if (gap <= MAX_GAP) continue;
    const parts = Math.ceil(gap / MAX_GAP);
    for (let k = 1; k < parts; k++) {
      const s = merged[i]!.s + (gap * k) / parts;
      const id = `w_${spec.id}_${i}_${k}`;
      nodePos.set(id, streetAt(spec.id, s).p);
      filled.push({ s, node: id, kind: 'waypoint' });
    }
  }
  filled.sort((a, b) => a.s - b.s);
  stops.set(spec.id, filled);
}

/* ------------------------------------------------------------ nodes, edges */

const nodes: TownNode[] = [];
const seenNode = new Set<string>();

for (const l of locNodes) {
  nodes.push({ id: l.id, name: l.name, x: l.anchor.x, y: l.anchor.y, location: l.id, pixel: l.pixel });
  seenNode.add(l.id);
}
const usedJunctions = new Set<string>();
for (const list of stops.values()) for (const stop of list) usedJunctions.add(stop.node);
for (const [id, p] of nodePos) {
  if (seenNode.has(id) || !usedJunctions.has(id)) continue;
  nodes.push({ id, x: Math.round(p.x), y: Math.round(p.y) });
  seenNode.add(id);
}

const edges: TownEdge[] = [];
/** Sampled polyline per edge — decor occupancy and the overlap report use these. */
const edgePolys: Array<{ edge: TownEdge; poly: Pt[] }> = [];

function minutesFor(kind: RoadKind, length: number): number {
  return Math.max(2, Math.round(length / PER_MINUTE[kind]));
}

/** The street's own samples between two arc positions, thinned to control points. */
function curveBetween(streetId: string, s0: number, s1: number): Pt[] {
  const st = streets.get(streetId)!;
  const inner: Pt[] = [];
  for (let i = 1; i < st.poly.length - 1; i++) {
    if (st.cum[i]! <= s0 + 3 || st.cum[i]! >= s1 - 3) continue;
    inner.push(st.poly[i]!);
  }
  if (inner.length === 0) return [];
  const want = Math.max(1, Math.min(8, Math.round((s1 - s0) / 24)));
  const out: Pt[] = [];
  for (let k = 1; k <= want; k++) {
    const idx = Math.round(((inner.length - 1) * k) / (want + 1));
    const p = inner[idx]!;
    const last = out[out.length - 1];
    const q = { x: Math.round(p.x), y: Math.round(p.y) };
    if (!last || last.x !== q.x || last.y !== q.y) out.push(q);
  }
  return out;
}

function pushEdge(a: string, b: string, kind: RoadKind, streetId: string, curve: Pt[], length: number): TownEdge {
  const edge: TownEdge = { a, b, minutes: minutesFor(kind, length), kind, street: streetId };
  if (curve.length) edge.curve = curve;
  edges.push(edge);
  edgePolys.push({ edge, poly: sampleCurve(nodePos.get(a)!, curve, nodePos.get(b)!, 3) });
  return edge;
}

// spine edges: consecutive stops along each street
for (const spec of STREETS) {
  const list = stops.get(spec.id)!;
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1]!;
    const b = list[i]!;
    if (a.node === b.node) continue;
    pushEdge(a.node, b.node, spec.kind, spec.id, curveBetween(spec.id, a.s, b.s), b.s - a.s);
  }
}

// driveways: address node -> the building's door
for (const l of locNodes) {
  l.address = resolveNode(l.address);
  const from = nodePos.get(l.address)!;
  const kind = streets.get(l.street)!.kind;
  pushEdge(l.address, l.id, kind, `dwy_${l.id}`, [], Math.hypot(l.anchor.x - from.x, l.anchor.y - from.y));
}

/* ------------------------------------------------------------- bus routes */

/** Cheapest walkable chain of nodes, used to lay bus lines over real streets. */
function walkPath(from: string, to: string): string[] {
  const adj = new Map<string, Array<{ to: string; minutes: number }>>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (e.kind !== 'street') continue;
    adj.get(e.a)!.push({ to: e.b, minutes: e.minutes });
    adj.get(e.b)!.push({ to: e.a, minutes: e.minutes });
  }
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const todo = new Set<string>(nodes.map((n) => n.id));
  while (todo.size) {
    let best: string | null = null;
    for (const id of todo) {
      const d = dist.get(id);
      if (d === undefined) continue;
      if (best === null || d < dist.get(best)!) best = id;
    }
    if (best === null) break;
    todo.delete(best);
    if (best === to) break;
    for (const step of adj.get(best) ?? []) {
      if (!todo.has(step.to)) continue;
      const alt = dist.get(best)! + step.minutes;
      if (dist.get(step.to) === undefined || alt < dist.get(step.to)!) {
        dist.set(step.to, alt);
        prev.set(step.to, best);
      }
    }
  }
  if (!dist.has(to)) throw new Error(`No street route from ${from} to ${to}`);
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]!)!);
  return path;
}

const edgeByPair = new Map<string, TownEdge>();
for (const e of edges) {
  edgeByPair.set(`${e.a}|${e.b}`, e);
  edgeByPair.set(`${e.b}|${e.a}`, e);
}

/**
 * Four lines out of the depot, each stroked as its own continuous route.
 * `bus_1` runs the length of main street and `bus_3` the length of the strip,
 * so each is listed twice — once for either terminus.
 */
const BUS_LINES: Array<{ id: string; to: string }> = [
  { id: 'bus_1', to: 'cafe' },
  { id: 'bus_1', to: 'bank' },
  { id: 'bus_2', to: 'factory' },
  { id: 'bus_3', to: 'pawn' },
  { id: 'bus_3', to: 'qt_clothing' },
  { id: 'bus_4', to: 'house_lake' },
];

const busDone = new Set<string>();
/** Which line serves each stop, so a location's driveway joins the right route. */
const lineAtNode = new Map<string, string>();

function layBus(a: string, b: string, lineId: string): void {
  const key = `${a}|${b}`;
  if (busDone.has(key)) return;
  busDone.add(key);
  busDone.add(`${b}|${a}`);
  const base = edgeByPair.get(key)!;
  const edge: TownEdge = { a: base.a, b: base.b, minutes: base.minutes, kind: 'busline', street: lineId };
  if (base.curve) edge.curve = base.curve;
  edges.push(edge);
}

for (const line of BUS_LINES) {
  const path = walkPath('bus_depot', line.to);
  for (const node of path) if (!lineAtNode.has(node)) lineAtNode.set(node, line.id);
  for (let i = 1; i < path.length; i++) layBus(path[i - 1]!, path[i]!, line.id);
}

// The bus also pulls in at every building it drives past: a location whose
// address sits on a line gets its driveway as a busline stop. Places off the
// lines — the campus, the leisure lane, the west bank, the lookout — stay a
// walk or a drive, which is the point of owning a car.
for (const l of locNodes) {
  const lineId = lineAtNode.get(l.address);
  if (!lineId || streets.get(l.street)!.kind !== 'street') continue;
  layBus(l.address, l.id, lineId);
}

/* -------------------------------------------------------------- occupancy */

const BUILDING_BOXES: Rect[] = placed.map((p) => p.box);

/**
 * The river: a chain of small rectangles that reads as a meander rather than
 * one fat channel. It enters from the north and runs down the west side; road
 * bridges are found automatically wherever a road crosses it.
 */
const RIVER: Array<[number, number, number, number]> = [
  [288, 0, 58, 66],
  [276, 44, 58, 68],
  [260, 92, 60, 70],
  [244, 142, 60, 68],
  [230, 192, 58, 70],
  [218, 244, 58, 72],
  [210, 298, 58, 72],
  [206, 352, 58, 72],
  [206, 406, 60, 70],
  [208, 456, 62, 68],
  [206, 506, 62, 70],
  [180, 556, 62, 70],
  [162, 606, 60, 70],
  [140, 656, 60, 70],
  [116, 704, 62, 64],
];

/** The lake, south-east, beside the cottage. */
const LAKE: Array<[number, number, number, number]> = [
  [996, 722, 110, 46],
  [1092, 714, 104, 54],
  [1182, 720, 82, 48],
  [1044, 710, 130, 24],
];

const WATER: Rect[] = [...RIVER, ...LAKE].map(([x, y, w, h]) => ({ x, y, w, h }));

function inCanvas(p: Pt, pad = 8): boolean {
  return p.x >= pad && p.x <= W - pad && p.y >= pad && p.y <= H - pad;
}

function onBuilding(p: Pt): boolean {
  return BUILDING_BOXES.some((b) => rectContains(p, inflate(b, 4)));
}

function onWater(p: Pt): boolean {
  return WATER.some((r) => rectContains(p, r));
}

/** Driveways are short and end under a building, so only the streets matter here. */
function isFree(p: Pt): boolean {
  return inCanvas(p) && !pointNearRoad({ x: p.x, y: p.y, w: 1, h: 1 }) && !onBuilding(p) && !onWater(p);
}

function nearestFree(p: Pt, maxRadius = 56): Pt | null {
  if (isFree(p)) return p;
  for (let r = 4; r <= maxRadius; r += 4) {
    for (let a = 0; a < 360; a += 20) {
      const rad = (a * Math.PI) / 180;
      const cand = { x: p.x + Math.cos(rad) * r, y: p.y + Math.sin(rad) * r };
      if (isFree(cand)) return cand;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ decor */

const decor: Decor[] = [];

for (const w of WATER) decor.push({ kind: 'water', x: w.x, y: w.y, w: w.w, h: w.h });

// paved squares downtown and by the strip head, grass on the open common
decor.push({ kind: 'plaza', x: 612, y: 498, w: 92, h: 56 });
decor.push({ kind: 'plaza', x: 976, y: 148, w: 84, h: 56 });
decor.push({ kind: 'grass', x: 372, y: 300, w: 100, h: 72 });
decor.push({ kind: 'grass', x: 60, y: 560, w: 92, h: 66 });

function pushProp(kind: string, x: number, y: number): boolean {
  const p = nearestFree({ x, y });
  if (!p) return false;
  decor.push({ kind, x: Math.round(p.x), y: Math.round(p.y) });
  return true;
}

/** Wherever a road crosses the water, drop a bridge deck at the midpoint. */
let bridges = 0;
for (const { edge, poly } of edgePolys) {
  if (edge.kind === 'busline') continue;
  let run: Pt[] = [];
  const flush = (): void => {
    if (run.length >= 3) {
      const mid = run[Math.floor(run.length / 2)]!;
      decor.push({ kind: 'bridge', x: Math.round(mid.x), y: Math.round(mid.y) });
      bridges++;
    }
    run = [];
  };
  for (const p of poly) {
    if (onWater(p)) run.push(p);
    else flush();
  }
  flush();
}

// --- the lake dock ---------------------------------------------------------
decor.push({ kind: 'dock', x: 1052, y: 712 });

/** Lamp posts every ~48px down a street, alternating kerbs. */
function lampsAlong(streetId: string, spacing = 48): void {
  const st = streets.get(streetId)!;
  const samples = resample(st.poly, spacing);
  samples.forEach((p, i) => {
    const prev = samples[i - 1] ?? p;
    const next = samples[i + 1] ?? p;
    const n = normalOf(unit({ x: next.x - prev.x, y: next.y - prev.y }), i % 2 === 0 ? 1 : -1);
    pushProp('lamp', p.x + n.x * (HALF[st.kind] + 7), p.y + n.y * (HALF[st.kind] + 7));
  });
}

lampsAlong('main_st');
lampsAlong('strip_rd');

/** Bushes threaded along a road shoulder — hedgerows, not a random scatter. */
function hedgeAlong(streetId: string, spacing: number, kind = 'bush'): void {
  const st = streets.get(streetId)!;
  const samples = resample(st.poly, spacing);
  samples.forEach((p, i) => {
    const prev = samples[i - 1] ?? p;
    const next = samples[i + 1] ?? p;
    const n = normalOf(unit({ x: next.x - prev.x, y: next.y - prev.y }), i % 3 === 0 ? -1 : 1);
    const off = HALF[st.kind] + frange(rng, 9, 17);
    pushProp(kind, p.x + n.x * off, p.y + n.y * off);
  });
}

hedgeAlong('hill_rd', 70);
hedgeAlong('river_ln', 66);
hedgeAlong('lake_rd', 74);
hedgeAlong('mill_rd', 76);
hedgeAlong('elm_ln', 64);
hedgeAlong('campus_ln', 52);
hedgeAlong('lookout_path', 56, 'flowers');
hedgeAlong('park_path', 56, 'flowers');

// --- woods: clusters on the land the roads never reach --------------------
const WOODS: Array<{ x: number; y: number; r: number; n: number }> = [
  { x: 152, y: 140, r: 86, n: 8 }, // the bluff behind the lookout
  { x: 320, y: 232, r: 88, n: 8 }, // the north-west river bank
  { x: 366, y: 408, r: 80, n: 7 }, // the empty common west of downtown
  { x: 440, y: 150, r: 80, n: 7 }, // between the highway and the mill road
  { x: 700, y: 118, r: 84, n: 7 },
  { x: 1024, y: 104, r: 74, n: 6 },
  { x: 1198, y: 292, r: 60, n: 5 }, // the highway verge
  { x: 636, y: 578, r: 68, n: 6 }, // the gap south of downtown
  { x: 884, y: 618, r: 74, n: 6 },
  { x: 1188, y: 552, r: 56, n: 4 },
  { x: 106, y: 698, r: 58, n: 5 },
  { x: 92, y: 384, r: 56, n: 5 },
];

let woodPieces = 0;
for (const cluster of WOODS) {
  for (let i = 0; i < cluster.n; i++) {
    const a = frange(rng, 0, Math.PI * 2);
    const r = cluster.r * Math.sqrt(rng());
    const kind = rng() < 0.55 ? 'tree_pine' : rng() < 0.6 ? 'tree_oak' : 'tree_round';
    if (pushProp(kind, cluster.x + Math.cos(a) * r, cluster.y + Math.sin(a) * r)) woodPieces++;
  }
}

// --- benches: downtown, the park, the lake shore --------------------------
for (const [x, y] of [
  [520, 520],
  [566, 508],
  [178, 520],
  [196, 486],
  [1040, 420],
  [1124, 664],
  [700, 640],
] as const) {
  pushProp('bench', x, y);
}

pushProp('picnic_table', 214, 508);
pushProp('picnic_table', 664, 606);

// --- parked cars: the auto lot, the strip, a couple downtown --------------
for (const [kind, x, y] of [
  ['car_red', 1156, 398],
  ['car_blue', 1160, 434],
  ['car_green', 1154, 466],
  ['car_red', 1030, 328],
  ['car_blue', 1024, 540],
  ['car_green', 470, 512],
  ['car_red', 742, 486],
  ['car_blue', 900, 466],
] as const) {
  pushProp(kind, x, y);
}

// --- the bus, parked at the depot -----------------------------------------
{
  const depot = nodePos.get('bus_depot')!;
  pushProp('bus', depot.x + 62, depot.y + 8);
}

// --- signposts at the junctions -------------------------------------------
for (const id of junctions.keys()) {
  const p = nodePos.get(id);
  if (!p) continue;
  pushProp('signpost', p.x + frange(rng, -24, 24), p.y + frange(rng, -24, 24));
}

// --- hydrants and mailboxes downtown --------------------------------------
for (const [kind, x, y] of [
  ['hydrant', 486, 528],
  ['hydrant', 690, 470],
  ['hydrant', 1060, 350],
  ['mailbox', 604, 494],
  ['mailbox', 836, 452],
  ['mailbox', 402, 640],
] as const) {
  pushProp(kind, x, y);
}

// --- a fence around Hilltop Manor -----------------------------------------
{
  const manor = nodePos.get('house_hill')!;
  for (let i = -2; i <= 2; i++) {
    pushProp('fence_h', manor.x + i * 22, manor.y - 74);
    pushProp('fence_h', manor.x + i * 22, manor.y + 14);
  }
  for (let i = -1; i <= 1; i++) {
    pushProp('fence_v', manor.x - 52, manor.y - 30 + i * 24);
    pushProp('fence_v', manor.x + 52, manor.y - 30 + i * 24);
  }
}

// --- flowers, rocks and scrub filling the remaining open ground -----------
const FILLERS = ['flowers', 'rock', 'bush', 'tree_round'] as const;
const FILLER_WEIGHTS = [5, 3, 4, 2];
const fillerTotal = FILLER_WEIGHTS.reduce((a, b) => a + b, 0);
function pickFiller(): string {
  let r = rng() * fillerTotal;
  for (let i = 0; i < FILLERS.length; i++) {
    r -= FILLER_WEIGHTS[i]!;
    if (r <= 0) return FILLERS[i]!;
  }
  return FILLERS[0]!;
}

const FILLER_TARGET = 14;
let fillers = 0;
let attempts = 0;
while (fillers < FILLER_TARGET && attempts < FILLER_TARGET * 60) {
  attempts++;
  const p = { x: frange(rng, MARGIN, W - MARGIN), y: frange(rng, MARGIN, H - MARGIN) };
  if (!isFree(p)) continue;
  decor.push({ kind: pickFiller(), x: Math.round(p.x), y: Math.round(p.y) });
  fillers++;
}

/* ------------------------------------------------------------------- town */

const town: Town = {
  id: 'riverton',
  name: 'Riverton',
  startNode: 'bus_depot',
  nodes,
  edges,
  decor,
};

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(town, null, 2) + '\n');

const AREA = new Set(['water', 'grass', 'plaza', 'path']);
const spine = edges.filter((e) => e.kind !== 'busline' && !e.street!.startsWith('dwy_'));
const spineMinutes = spine.map((e) => e.minutes).sort((a, b) => a - b);

console.log(`Riverton written to ${OUT_FILE}`);
console.log(`  canvas: ${W}x${H}`);
for (const st of streets.values()) {
  console.log(`    ${st.id.padEnd(14)} ${st.kind.padEnd(8)} len ${st.len.toFixed(0).padStart(5)}  stops ${stops.get(st.id)!.length}`);
}
console.log(`  streets: ${STREETS.length} (+${new Set(BUS_LINES.map((b) => b.id)).size} bus lines, ${locNodes.length} driveways)`);
console.log(`  nodes: ${nodes.length} (${locNodes.length} locations + ${nodes.length - locNodes.length} junctions/waypoints)`);
console.log(`  edges: ${edges.length} (${spine.length} spine, ${locNodes.length} driveway, ${edges.filter((e) => e.kind === 'busline').length} busline)`);
console.log(`  decor: ${decor.length} (${decor.filter((d) => !AREA.has(d.kind)).length} props, ${woodPieces} in woods, ${bridges} bridges)`);
console.log(`  spine minutes: min ${spineMinutes[0]} median ${spineMinutes[Math.floor(spineMinutes.length / 2)]} max ${spineMinutes[spineMinutes.length - 1]}`);
for (const w of warnings) console.log(`  WARN ${w}`);
