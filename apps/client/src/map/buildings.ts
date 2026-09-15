/**
 * One building from a `BuildingRecipe`: box, roof, door, sign and a landmark
 * prop. Local space is width along X, depth along Z, the door on +Z; the group
 * itself is rotated here for `facing`.
 */
import * as THREE from 'three';
import type { BuildingRecipe } from '@jones2/town';
import { MaterialCache, PALETTE, darken, own } from './palette';
import { makeBadge, makeSign } from './labels';

export interface BuiltBuilding {
  group: THREE.Group;
  /** Height of the highest solid surface, for labels and pick meshes. */
  topY: number;
}

type Vec3 = [number, number, number];

/** A gable roof: a triangular prism whose ridge runs along the width (X). */
function gableGeometry(w: number, d: number, h: number): THREE.BufferGeometry {
  const hw = w / 2;
  const hd = d / 2;
  const v: number[] = [];
  const push = (...pts: Vec3[]) => {
    for (const p of pts) v.push(p[0], p[1], p[2]);
  };
  const a: Vec3 = [-hw, 0, -hd];
  const b: Vec3 = [hw, 0, -hd];
  const c: Vec3 = [hw, 0, hd];
  const e: Vec3 = [-hw, 0, hd];
  const r0: Vec3 = [-hw, h, 0];
  const r1: Vec3 = [hw, h, 0];
  push(e, c, r1, e, r1, r0); // front slope (+Z)
  push(b, a, r0, b, r0, r1); // back slope (-Z)
  push(a, e, r0); // west gable end
  push(c, b, r1); // east gable end
  push(a, b, c, a, c, e); // underside
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geom.computeVertexNormals();
  return geom;
}

function buildProp(
  kind: NonNullable<BuildingRecipe['prop']>,
  recipe: BuildingRecipe,
  topY: number,
  mats: MaterialCache,
): THREE.Object3D | null {
  const g = new THREE.Group();
  const w = recipe.width;
  const d = recipe.depth;
  const add = (geom: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geom, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  switch (kind) {
    case 'burger': {
      const bun = mats.solid('#e0b86a');
      const patty = mats.solid('#6b3f22');
      add(new THREE.CylinderGeometry(1.15, 1.15, 0.45, 12), bun, 0, topY + 0.22, 0);
      add(new THREE.CylinderGeometry(1.25, 1.25, 0.35, 12), patty, 0, topY + 0.62, 0);
      add(new THREE.CylinderGeometry(1.15, 0.85, 0.7, 12), bun, 0, topY + 1.14, 0);
      break;
    }
    case 'tree': {
      const x = w / 2 + 1.6;
      add(new THREE.CylinderGeometry(0.22, 0.32, 1.6, 6), mats.solid(PALETTE.trunk), x, 0.8, 0);
      add(new THREE.ConeGeometry(1.5, 3.2, 7), mats.solid(PALETTE.leaf), x, 3.2, 0);
      break;
    }
    case 'chimney': {
      add(new THREE.BoxGeometry(0.9, 2.6, 0.9), mats.solid('#5a4038'), w * 0.28, topY + 1.3, -d * 0.26);
      break;
    }
    case 'antenna': {
      add(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 6), mats.solid(PALETTE.pole), 0, topY + 2.1, 0);
      add(new THREE.SphereGeometry(0.35, 8, 6), mats.solid('#d94f4f'), 0, topY + 4.3, 0);
      break;
    }
    case 'fountain': {
      const x = -(w / 2 + 2.2);
      add(new THREE.CylinderGeometry(1.8, 1.8, 0.35, 14), mats.solid(PALETTE.water), x, 0.18, 0);
      add(new THREE.CylinderGeometry(0.28, 0.35, 1.3, 8), mats.solid('#cfd2cb'), x, 1, 0);
      add(new THREE.SphereGeometry(0.35, 8, 6), mats.solid('#bfe0f5'), x, 1.8, 0);
      break;
    }
    case 'car': {
      const x = w / 2 + 2.6;
      const body = mats.solid('#c0392b');
      add(new THREE.BoxGeometry(3.4, 0.9, 1.7), body, x, 0.8, 0);
      add(new THREE.BoxGeometry(1.7, 0.75, 1.4), body, x - 0.2, 1.55, 0);
      const wheel = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10);
      wheel.rotateX(Math.PI / 2);
      const tyre = mats.solid(PALETTE.tyre);
      for (const dx of [-1.1, 1.1]) {
        for (const dz of [-0.85, 0.85]) add(wheel, tyre, x + dx, 0.4, dz);
      }
      break;
    }
    case 'book': {
      const stand = add(new THREE.BoxGeometry(2.2, 0.25, 1.6), mats.solid('#7a5334'), 0, topY + 0.5, 0);
      stand.rotation.x = -0.45;
      const book = add(new THREE.BoxGeometry(2, 0.35, 1.5), mats.solid('#2f6fed'), 0, topY + 0.85, 0.12);
      book.rotation.x = -0.45;
      break;
    }
    case 'dumbbell': {
      const bar = new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8);
      bar.rotateZ(Math.PI / 2);
      add(bar, mats.solid('#9aa0a6'), 0, topY + 0.7, 0);
      for (const dx of [-1.3, 1.3]) {
        add(new THREE.SphereGeometry(0.62, 10, 8), mats.solid('#3a3f46'), dx, topY + 0.7, 0);
      }
      break;
    }
    case 'cross': {
      const red = mats.solid('#d43b34');
      add(new THREE.BoxGeometry(2.6, 0.8, 0.35), red, 0, topY + 1.4, 0);
      add(new THREE.BoxGeometry(0.8, 2.6, 0.35), red, 0, topY + 1.4, 0);
      break;
    }
    case 'dollar': {
      const disc = new THREE.CylinderGeometry(1.25, 1.25, 0.28, 18);
      disc.rotateX(Math.PI / 2);
      add(disc, mats.solid('#2f8f4e'), 0, topY + 1.5, 0);
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(1.1, 18),
        own(new THREE.MeshBasicMaterial({ map: makeBadge('$', '#2f8f4e', '#f4f9f4'), toneMapped: false })),
      );
      face.position.set(0, topY + 1.5, 0.16);
      g.add(face);
      break;
    }
    default:
      return null;
  }
  return g;
}

export function buildBuilding(recipe: BuildingRecipe, mats: MaterialCache, fallbackName: string): BuiltBuilding {
  const group = new THREE.Group();
  const w = Math.max(0.5, recipe.width);
  const d = Math.max(0.5, recipe.depth);
  const h = Math.max(0.2, recipe.height);
  const wall = mats.solid(recipe.color);
  const roofColor = recipe.roofColor ?? darken(recipe.color, 0.35);

  let topY: number;
  if (recipe.roof === 'none') {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), wall);
    pad.position.y = 0.125;
    group.add(pad);
    topY = 0.25;
  } else {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
    box.position.y = h / 2;
    group.add(box);
    topY = h;

    if (recipe.roof === 'flat') {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.3, d + 0.5), mats.solid(roofColor));
      cap.position.y = h + 0.15;
      group.add(cap);
      topY = h + 0.3;
    } else if (recipe.roof === 'gable') {
      const rh = Math.max(1, Math.min(d * 0.45, h * 0.6));
      const roof = new THREE.Mesh(gableGeometry(w + 0.4, d + 0.4, rh), mats.solid(roofColor));
      roof.position.y = h;
      group.add(roof);
      topY = h + rh;
    } else {
      const rh = Math.max(1.2, Math.min(d * 0.5, h * 0.6));
      const cone = new THREE.ConeGeometry(Math.SQRT1_2, rh, 4);
      cone.rotateY(Math.PI / 4);
      cone.scale(w + 0.5, 1, d + 0.5);
      const roof = new THREE.Mesh(cone, mats.solid(roofColor));
      roof.position.y = h + rh / 2;
      group.add(roof);
      topY = h + rh;
    }

    const doorH = Math.min(2.2, h * 0.75);
    const doorW = Math.min(1.8, w * 0.38);
    if (doorH > 0.6) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.14), mats.solid(darken(recipe.color, 0.55)));
      door.position.set(0, doorH / 2, d / 2 + 0.07);
      group.add(door);
    }
  }

  // Props sit on the roof, so they use the roof height, not the sign height.
  const roofY = topY;
  if (recipe.prop && recipe.prop !== 'none') {
    const p = buildProp(recipe.prop, recipe, roofY, mats);
    if (p) group.add(p);
  }

  const text = recipe.sign ?? fallbackName;
  if (text) {
    const signH = THREE.MathUtils.clamp(h * 0.3, 1.4, 2.4);
    const sign = makeSign(text, Math.max(4.5, w * 1.2), signH);
    const size = sign.userData.signSize as { w: number; h: number };
    const lowest = Math.min(2.2, h * 0.75) + 0.3 + size.h / 2;
    const preferred = h - size.h / 2 - 0.25;
    const y = recipe.roof === 'none' ? topY + size.h / 2 + 0.7 : Math.max(lowest, preferred);
    sign.position.set(0, y, d / 2 + 0.16);
    group.add(sign);
    topY = Math.max(topY, y + size.h / 2);
  }

  // `facing` counts quarter turns clockwise from south (+Z). A positive +Y
  // rotation is counter-clockwise seen from above, hence the negation.
  group.rotation.y = -((recipe.facing ?? 0) * Math.PI) / 2;

  return { group, topY };
}
