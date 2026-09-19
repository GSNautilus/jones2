/**
 * Ambient life on the map: cars driving the roads, flocks of birds, the odd
 * plane and helicopter crossing the sky. Pure simulation, no DOM and no
 * clock: the scene feeds it seconds and draws whatever it reports.
 *
 * Cars follow the renderer's street chains (`streets.ts`), so they take the
 * same curves the road is drawn with, keep to the right, and turn back at a
 * dead end (off the map, where the exit stubs end, nobody sees the U-turn).
 * Paths, bus lines and driveways carry no traffic, so the classic ring stays
 * a walkway.
 */
import type { RoadKind } from '@jones2/town';

export interface Pt {
  x: number;
  y: number;
}

/** The subset of a street chain the simulation needs. */
export interface Road {
  kind: RoadKind;
  street?: string;
  pts: Pt[];
  acc: number[];
  length: number;
  closed: boolean;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Car {
  road: number;
  /** Arc position along the road, town units. */
  s: number;
  dir: 1 | -1;
  /** Town units per second. */
  speed: number;
  colour: number;
}

export interface Bird {
  dx: number;
  dy: number;
  /** Wing-beat phase offset in frames. */
  phase: number;
}

export interface Flock {
  active: boolean;
  /** Seconds until the next crossing while inactive. */
  wait: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  birds: Bird[];
  age: number;
}

export interface Flier {
  kind: 'plane' | 'heli';
  active: boolean;
  wait: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Remaining waypoints; the last one is off the map. */
  route: Pt[];
  age: number;
}

/** Town units per second by road kind; nothing drives on paths or bus lines. */
export const CAR_SPEED: Partial<Record<RoadKind, number>> = { street: 30, highway: 66 };
/** How far from the centre line a car drives, by road kind. */
export const LANE: Partial<Record<RoadKind, number>> = { street: 3.5, highway: 5 };
/** One car per this many units of road, at least one on any road long enough. */
export const CAR_PER_UNITS: Partial<Record<RoadKind, number>> = { street: 320, highway: 230 };
export const MIN_ROAD_FOR_CARS = 150;
export const BIRD_SPEED = 24;
export const BIRD_FLAP_FPS = 7;
export const PLANE_SPEED = 72;
export const HELI_SPEED = 30;
export const HELI_ROTOR_FPS = 18;

/** Small deterministic generator (mulberry32) so tests can pin the traffic. */
export function rng32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Roads that carry traffic: streets and the highway, not driveways. */
export function drivable(road: Road): boolean {
  if (!CAR_SPEED[road.kind]) return false;
  if (road.street?.startsWith('dwy_')) return false;
  return road.length >= MIN_ROAD_FOR_CARS;
}

export function carsFor(roads: Road[], rand: () => number): Car[] {
  const cars: Car[] = [];
  roads.forEach((road, i) => {
    if (!drivable(road)) return;
    const per = CAR_PER_UNITS[road.kind] ?? 320;
    const n = Math.max(1, Math.round(road.length / per));
    const base = CAR_SPEED[road.kind] ?? 30;
    for (let k = 0; k < n; k++) {
      cars.push({
        road: i,
        s: rand() * road.length,
        dir: rand() < 0.5 ? 1 : -1,
        speed: base * (0.85 + rand() * 0.3),
        colour: Math.floor(rand() * 6),
      });
    }
  });
  return cars;
}

/** Point and tangent at arc position `s` along a road (clamped to its ends). */
export function alongRoad(road: Road, s: number): { p: Pt; t: Pt } {
  const acc = road.acc;
  const pts = road.pts;
  if (pts.length < 2) return { p: pts[0] ?? { x: 0, y: 0 }, t: { x: 1, y: 0 } };
  const target = Math.max(0, Math.min(road.length, s));
  let lo = 0;
  let hi = acc.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (acc[mid]! <= target) lo = mid;
    else hi = mid;
  }
  const a = pts[lo]!;
  const b = pts[Math.min(pts.length - 1, lo + 1)]!;
  const span = (acc[lo + 1] ?? acc[lo]!) - acc[lo]!;
  const f = span > 0 ? (target - acc[lo]!) / span : 0;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { p: { x: a.x + dx * f, y: a.y + dy * f }, t: { x: dx / len, y: dy / len } };
}

/** Where a car is drawn and which way it points: on its side of the road. */
export function carPose(road: Road, car: Car): { x: number; y: number; angle: number } {
  const { p, t } = alongRoad(road, car.s);
  const lane = LANE[road.kind] ?? 3;
  // heading is the tangent in the direction of travel; the right-hand side of
  // (tx, ty) on a y-down screen is (-ty, tx)
  const hx = t.x * car.dir;
  const hy = t.y * car.dir;
  return { x: p.x - hy * lane, y: p.y + hx * lane, angle: Math.atan2(hy, hx) };
}

/** Advance one car; at a dead end it turns round, on a ring road it wraps. */
export function stepCar(road: Road, car: Car, dt: number): void {
  let s = car.s + car.dir * car.speed * dt;
  if (road.closed) {
    s = ((s % road.length) + road.length) % road.length;
  } else if (s > road.length) {
    s = road.length - (s - road.length);
    car.dir = -1;
  } else if (s < 0) {
    s = -s;
    car.dir = 1;
  }
  car.s = Math.max(0, Math.min(road.length, s));
}

function sidePoint(b: Bounds, side: number, rand: () => number, out: number): Pt {
  switch (side & 3) {
    case 0:
      return { x: b.x - out, y: b.y + rand() * b.h };
    case 1:
      return { x: b.x + b.w + out, y: b.y + rand() * b.h };
    case 2:
      return { x: b.x + rand() * b.w, y: b.y - out };
    default:
      return { x: b.x + rand() * b.w, y: b.y + b.h + out };
  }
}

function outside(b: Bounds, x: number, y: number, by: number): boolean {
  return x < b.x - by || x > b.x + b.w + by || y < b.y - by || y > b.y + b.h + by;
}

export class AmbientSim {
  readonly cars: Car[];
  readonly flocks: Flock[] = [];
  readonly fliers: Flier[] = [];
  /** Simulated seconds so far; drives the wing beats and the rotor. */
  time = 0;
  private readonly rand: () => number;

  constructor(
    readonly roads: Road[],
    readonly bounds: Bounds,
    seed = 1,
  ) {
    this.rand = rng32(seed);
    this.cars = carsFor(roads, this.rand);
    const flocks = bounds.w * bounds.h > 600 * 400 ? 2 : 1;
    for (let i = 0; i < flocks; i++) {
      this.flocks.push({ active: false, wait: 2 + this.rand() * 10 * (i + 1), x: 0, y: 0, vx: 0, vy: 0, birds: [], age: 0 });
    }
    this.fliers.push({ kind: 'plane', active: false, wait: 20 + this.rand() * 40, x: 0, y: 0, vx: 0, vy: 0, route: [], age: 0 });
    this.fliers.push({ kind: 'heli', active: false, wait: 45 + this.rand() * 40, x: 0, y: 0, vx: 0, vy: 0, route: [], age: 0 });
  }

  step(dt: number): void {
    if (!(dt > 0)) return;
    this.time += dt;
    for (const car of this.cars) stepCar(this.roads[car.road]!, car, dt);
    for (const f of this.flocks) this.stepFlock(f, dt);
    for (const f of this.fliers) this.stepFlier(f, dt);
  }

  private launchFlock(f: Flock): void {
    const b = this.bounds;
    const side = Math.floor(this.rand() * 4);
    const from = sidePoint(b, side, this.rand, 30);
    const to = sidePoint(b, side ^ 1, this.rand, 30);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    f.x = from.x;
    f.y = from.y;
    f.vx = (dx / len) * BIRD_SPEED;
    f.vy = (dy / len) * BIRD_SPEED;
    f.birds = [];
    const n = 3 + Math.floor(this.rand() * 4);
    for (let i = 0; i < n; i++) {
      f.birds.push({ dx: Math.round((this.rand() - 0.5) * 36), dy: Math.round((this.rand() - 0.5) * 22), phase: Math.floor(this.rand() * 2) });
    }
    f.active = true;
    f.age = 0;
  }

  private stepFlock(f: Flock, dt: number): void {
    if (!f.active) {
      f.wait -= dt;
      if (f.wait <= 0) this.launchFlock(f);
      return;
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.age += dt;
    if (f.age > 3 && outside(this.bounds, f.x, f.y, 60)) {
      f.active = false;
      f.wait = 8 + this.rand() * 18;
    }
  }

  private launchFlier(f: Flier): void {
    const b = this.bounds;
    if (f.kind === 'plane') {
      const eastward = this.rand() < 0.5;
      const y = b.y + 40 + this.rand() * Math.max(1, b.h - 80);
      f.x = eastward ? b.x - 40 : b.x + b.w + 40;
      f.y = y;
      f.vx = (eastward ? 1 : -1) * PLANE_SPEED;
      f.vy = (this.rand() - 0.5) * 8;
      f.route = [{ x: eastward ? b.x + b.w + 60 : b.x - 60, y: y + f.vy * 20 }];
    } else {
      const side = Math.floor(this.rand() * 4);
      const from = sidePoint(b, side, this.rand, 30);
      const mid = { x: b.x + b.w * (0.25 + this.rand() * 0.5), y: b.y + b.h * (0.25 + this.rand() * 0.5) };
      const to = sidePoint(b, Math.floor(this.rand() * 4), this.rand, 40);
      f.x = from.x;
      f.y = from.y;
      f.route = [mid, to];
      this.aim(f, HELI_SPEED);
    }
    f.active = true;
    f.age = 0;
  }

  private aim(f: Flier, speed: number): void {
    const target = f.route[0];
    if (!target) return;
    const dx = target.x - f.x;
    const dy = target.y - f.y;
    const len = Math.hypot(dx, dy) || 1;
    f.vx = (dx / len) * speed;
    f.vy = (dy / len) * speed;
  }

  private stepFlier(f: Flier, dt: number): void {
    if (!f.active) {
      f.wait -= dt;
      if (f.wait <= 0) this.launchFlier(f);
      return;
    }
    const speed = f.kind === 'plane' ? PLANE_SPEED : HELI_SPEED;
    const target = f.route[0];
    if (target) {
      const remaining = Math.hypot(target.x - f.x, target.y - f.y);
      if (remaining <= speed * dt) {
        f.x = target.x;
        f.y = target.y;
        f.route.shift();
        this.aim(f, speed);
      }
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.age += dt;
    if (f.age > 2 && (f.route.length === 0 || outside(this.bounds, f.x, f.y, 80))) {
      f.active = false;
      f.wait = f.kind === 'plane' ? 40 + this.rand() * 50 : 60 + this.rand() * 60;
    }
  }

  /** Wing-beat frame (0/1) for a bird with the given phase. */
  birdFrame(phase: number): number {
    return (Math.floor(this.time * BIRD_FLAP_FPS) + phase) % 2;
  }

  rotorFrame(): number {
    return Math.floor(this.time * HELI_ROTOR_FPS) % 2;
  }
}
