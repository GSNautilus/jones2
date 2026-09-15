/**
 * Fixed palette plus the resource bookkeeping every other map module uses.
 *
 * Materials are shared by colour through `MaterialCache` (one material per
 * colour/variant, alive for the lifetime of the scene). Per-object resources
 * (geometries, and the canvas-textured materials used for signs and labels)
 * are freed by `disposeSubtree()`, which every rebuild path calls first.
 */
import * as THREE from 'three';

export const PALETTE = {
  ground: '#b9c4a8',
  street: '#6b6f76',
  highway: '#4a4d54',
  highwayLine: '#c9ccd2',
  path: '#b8a77a',
  busline: '#e0b000',
  junction: '#f08c22',
  highlight: '#2f6fed',
  route: '#ffd24a',
  water: '#4f86c6',
  grass: '#93ad77',
  plaza: '#cfd2cb',
  trunk: '#6b4a2f',
  leaf: '#4f8a3d',
  bush: '#5c9b46',
  lamp: '#ffd98a',
  pole: '#4c5158',
  bench: '#7a5334',
  skin: '#e8b98f',
  ghost: '#9aa0a6',
  tyre: '#26282c',
} as const;

/**
 * Shared materials keyed by colour + variant. Never disposed by a rebuild, only
 * by `scene.dispose()`, so town edits do not churn shader programs.
 */
export class MaterialCache {
  private readonly cache = new Map<string, THREE.Material>();

  /** Lambert, flat shaded. The workhorse for buildings, props and decor. */
  solid(color: string, opts?: { opacity?: number; flat?: boolean }): THREE.MeshLambertMaterial {
    const opacity = opts?.opacity ?? 1;
    const flat = opts?.flat ?? true;
    const key = `solid|${color}|${opacity}|${flat}`;
    const hit = this.cache.get(key);
    if (hit) return hit as THREE.MeshLambertMaterial;
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(color),
      flatShading: flat,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    });
    this.cache.set(key, mat);
    return mat;
  }

  /** Unlit. Ground overlays, highlights, route ribbons, sign backing. */
  unlit(
    color: string,
    opts?: { opacity?: number; side?: THREE.Side; depthWrite?: boolean; depthTest?: boolean },
  ): THREE.MeshBasicMaterial {
    const opacity = opts?.opacity ?? 1;
    const side = opts?.side ?? THREE.FrontSide;
    const depthWrite = opts?.depthWrite ?? opacity >= 1;
    const depthTest = opts?.depthTest ?? true;
    const key = `unlit|${color}|${opacity}|${String(side)}|${depthWrite}|${depthTest}`;
    const hit = this.cache.get(key);
    if (hit) return hit as THREE.MeshBasicMaterial;
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: opacity < 1,
      opacity,
      side,
      depthWrite,
      depthTest,
    });
    this.cache.set(key, mat);
    return mat;
  }

  dashedLine(color: string, dashSize: number, gapSize: number): THREE.LineDashedMaterial {
    const key = `dash|${color}|${dashSize}|${gapSize}`;
    const hit = this.cache.get(key);
    if (hit) return hit as THREE.LineDashedMaterial;
    const mat = new THREE.LineDashedMaterial({ color: new THREE.Color(color), dashSize, gapSize });
    this.cache.set(key, mat);
    return mat;
  }

  dispose(): void {
    for (const m of this.cache.values()) m.dispose();
    this.cache.clear();
  }
}

/** Mark a material as owned by one object so `disposeSubtree` frees it. */
export function own<T extends THREE.Material>(material: T): T {
  material.userData.owned = true;
  return material;
}

function disposeMaterial(material: THREE.Material): void {
  if (!material.userData.owned) return;
  const map = (material as THREE.Material & { map?: THREE.Texture | null }).map;
  if (map) map.dispose();
  material.dispose();
}

/**
 * Detach every child of `root` and free the GPU resources it owns: all
 * geometries, plus materials explicitly marked with `own()`. Shared cache
 * materials are left alone.
 */
export function disposeSubtree(root: THREE.Object3D): void {
  for (let i = root.children.length - 1; i >= 0; i--) {
    const child = root.children[i];
    if (!child) continue;
    root.remove(child);
    disposeObject(child);
  }
}

/** Free one detached object and everything below it. */
export function disposeObject(object: THREE.Object3D): void {
  object.traverse((obj) => {
    const withGeom = obj as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (withGeom.geometry) withGeom.geometry.dispose();
    const mat = withGeom.material;
    if (Array.isArray(mat)) for (const m of mat) disposeMaterial(m);
    else if (mat) disposeMaterial(mat);
  });
  object.clear();
}

/** Multiply a hex colour toward black. Used for roof caps and door recesses. */
export function darken(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(Math.max(0, 1 - amount));
  return `#${c.getHexString()}`;
}
