import { describe, expect, it } from 'vitest';
import { classic, riverton } from '@jones2/town';
import type { Town } from '@jones2/town';
import { AmbientSim, alongRoad, carPose, carsFor, drivable, rng32, stepCar, type Road } from '../../src/map/ambient';
import { chainsFor } from '../../src/map/streets';

const RIVERTON = riverton as unknown as Town;
const CLASSIC = classic as unknown as Town;
const BOUNDS = { x: -48, y: -48, w: 2016, h: 1248 };

describe('traffic', () => {
  it('drives on Riverton streets and the highway, never on driveways, paths or bus lines', () => {
    const roads = chainsFor(RIVERTON) as Road[];
    const cars = carsFor(roads, rng32(1));
    expect(cars.length).toBeGreaterThan(8);
    for (const c of cars) {
      const r = roads[c.road]!;
      expect(drivable(r)).toBe(true);
      expect(['street', 'highway']).toContain(r.kind);
      expect(r.street?.startsWith('dwy_')).toBe(false);
    }
    expect(cars.some((c) => roads[c.road]!.kind === 'highway')).toBe(true);
  });

  it('leaves the classic ring, a walkway, without cars', () => {
    const cars = carsFor(chainsFor(CLASSIC) as Road[], rng32(1));
    expect(cars).toHaveLength(0);
  });

  it('keeps a car on its road, a lane to the right of the centre line', () => {
    const roads = chainsFor(RIVERTON) as Road[];
    const road = roads.find((r) => r.kind === 'highway')!;
    const car = { road: roads.indexOf(road), s: road.length / 2, dir: 1 as const, speed: 60, colour: 0 };
    const pose = carPose(road, car);
    const { p } = alongRoad(road, car.s);
    expect(Math.hypot(pose.x - p.x, pose.y - p.y)).toBeCloseTo(5, 1);
    // flipping direction puts the car on the other side of the road
    const back = carPose(road, { ...car, dir: -1 });
    expect(Math.hypot(back.x - pose.x, back.y - pose.y)).toBeCloseTo(10, 1);
    expect(Math.abs(back.angle - pose.angle)).toBeCloseTo(Math.PI, 1);
  });

  it('turns round at a dead end and wraps on a ring', () => {
    const straight: Road = { kind: 'street', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }], acc: [0, 100], length: 100, closed: false };
    const car = { road: 0, s: 90, dir: 1 as const, speed: 20, colour: 0 };
    stepCar(straight, car, 1);
    expect(car.dir).toBe(-1);
    expect(car.s).toBeCloseTo(90);
    const ring: Road = { ...straight, closed: true };
    const c2 = { road: 0, s: 90, dir: 1 as const, speed: 20, colour: 0 };
    stepCar(ring, c2, 1);
    expect(c2.dir).toBe(1);
    expect(c2.s).toBeCloseTo(10);
  });
});

describe('the sky', () => {
  it('sends birds across the map and then rests them, and is deterministic for a seed', () => {
    const roads = chainsFor(RIVERTON) as Road[];
    const a = new AmbientSim(roads, BOUNDS, 7);
    const b = new AmbientSim(roads, BOUNDS, 7);
    let sawBirds = false;
    let sawRest = false;
    for (let i = 0; i < 60 * 120; i++) {
      a.step(1 / 60);
      b.step(1 / 60);
      if (a.flocks[0]!.active) sawBirds = true;
      else if (sawBirds) sawRest = true;
    }
    expect(sawBirds).toBe(true);
    expect(sawRest).toBe(true);
    expect(a.flocks[0]!.x).toBeCloseTo(b.flocks[0]!.x);
    expect(a.cars[0]!.s).toBeCloseTo(b.cars[0]!.s);
  });

  it('flies the plane straight across and brings the helicopter through the middle', () => {
    const sim = new AmbientSim([], BOUNDS, 3);
    let planeSeen = false;
    let heliInside = false;
    for (let i = 0; i < 60 * 240; i++) {
      sim.step(1 / 60);
      const plane = sim.fliers[0]!;
      const heli = sim.fliers[1]!;
      if (plane.active) {
        planeSeen = true;
        expect(Math.abs(plane.vx)).toBeGreaterThan(Math.abs(plane.vy));
      }
      if (heli.active && heli.x > 200 && heli.x < 1800 && heli.y > 200 && heli.y < 1000) heliInside = true;
    }
    expect(planeSeen).toBe(true);
    expect(heliInside).toBe(true);
  });

  it('ignores a non-positive time step', () => {
    const sim = new AmbientSim([], BOUNDS, 3);
    sim.step(0);
    sim.step(-1);
    sim.step(Number.NaN);
    expect(sim.time).toBe(0);
  });
});
