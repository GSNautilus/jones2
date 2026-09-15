/**
 * Scenery. Point decor (tree, bush, lamp, bench) is a couple of primitives;
 * area decor (water, grass, plaza) is a flat rectangle just above the ground.
 */
import * as THREE from 'three';
import type { Decor } from '@jones2/town';
import { MaterialCache, PALETTE } from './palette';

const AREA_Y: Record<string, number> = { grass: 0.01, plaza: 0.015, water: 0.02 };

function area(d: Decor, color: string, y: number, mats: MaterialCache, opacity = 1): THREE.Mesh {
  const geom = new THREE.PlaneGeometry(Math.max(0.5, d.w ?? 4), Math.max(0.5, d.h ?? 4));
  geom.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geom, mats.unlit(color, { opacity, depthWrite: true }));
  mesh.position.set(d.x, y, d.y);
  return mesh;
}

export function buildDecor(items: readonly Decor[] | undefined, mats: MaterialCache): THREE.Group {
  const group = new THREE.Group();
  group.name = 'decor';
  if (!items) return group;

  for (const d of items) {
    switch (d.kind) {
      case 'water':
        group.add(area(d, PALETTE.water, AREA_Y.water ?? 0.02, mats, 0.82));
        break;
      case 'grass':
        group.add(area(d, PALETTE.grass, AREA_Y.grass ?? 0.01, mats));
        break;
      case 'plaza':
        group.add(area(d, PALETTE.plaza, AREA_Y.plaza ?? 0.015, mats));
        break;
      case 'tree': {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.7, 6), mats.solid(PALETTE.trunk));
        trunk.position.y = 0.85;
        const crown = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.6, 7), mats.solid(PALETTE.leaf));
        crown.position.y = 3.4;
        g.add(trunk, crown);
        g.position.set(d.x, 0, d.y);
        group.add(g);
        break;
      }
      case 'bush': {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mats.solid(PALETTE.bush));
        bush.scale.set(1, 0.7, 1);
        bush.position.set(d.x, 0.65, d.y);
        group.add(bush);
        break;
      }
      case 'lamp': {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.4, 6), mats.solid(PALETTE.pole));
        pole.position.y = 1.7;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mats.unlit(PALETTE.lamp));
        bulb.position.y = 3.5;
        g.add(pole, bulb);
        g.position.set(d.x, 0, d.y);
        group.add(g);
        break;
      }
      case 'bench': {
        const g = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.22, 0.7), mats.solid(PALETTE.bench));
        seat.position.y = 0.55;
        const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.16), mats.solid(PALETTE.bench));
        back.position.set(0, 0.9, -0.3);
        g.add(seat, back);
        g.position.set(d.x, 0, d.y);
        group.add(g);
        break;
      }
      default:
        break;
    }
  }
  return group;
}
