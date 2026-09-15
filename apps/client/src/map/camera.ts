/**
 * Orthographic isometric camera rig.
 *
 * The camera always looks at `focus` (a point on the ground plane) from a fixed
 * elevation, at an azimuth that snaps to quarter turns. Zoom changes the
 * orthographic frustum height; nothing ever moves the camera along its own
 * axis, so the projection stays a clean isometric.
 */
import * as THREE from 'three';

/** Elevation above the ground plane, in radians. ~35deg reads as isometric. */
const ELEVATION = THREE.MathUtils.degToRad(35);
/** Distance from focus to camera. Irrelevant to scale (ortho), only to clipping. */
const DISTANCE = 600;
const MIN_VIEW = 8;
const MAX_VIEW = 320;
const ROTATE_MS = 250;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export interface TownBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  maxHeight: number;
}

export class IsoCamera {
  readonly camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 2000);
  readonly focus = new THREE.Vector3(0, 0, 0);
  azimuth = Math.PI / 4;
  /** Half-height of the orthographic frustum, in town units. */
  viewSize = 50;

  private aspect = 1;
  private tween: { from: number; to: number; start: number } | null = null;
  private readonly dir = new THREE.Vector3();

  constructor() {
    this.camera.up.set(0, 1, 0);
    this.apply();
  }

  setViewport(width: number, height: number): void {
    this.aspect = height > 0 ? width / height : 1;
    this.apply();
  }

  /** Recompute position and projection from focus/azimuth/viewSize. */
  apply(): void {
    const cosE = Math.cos(ELEVATION);
    this.dir.set(Math.sin(this.azimuth) * cosE, Math.sin(ELEVATION), Math.cos(this.azimuth) * cosE);
    this.camera.position.copy(this.focus).addScaledVector(this.dir, DISTANCE);
    this.camera.lookAt(this.focus);
    const halfW = this.viewSize * this.aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = this.viewSize;
    this.camera.bottom = -this.viewSize;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }

  /** Start a quarter-turn tween. Fractional turns are allowed. */
  rotate(quarterTurns: number, now: number): void {
    if (quarterTurns === 0) return;
    const from = this.tween ? this.tween.to : this.azimuth;
    this.tween = { from: this.azimuth, to: from + (quarterTurns * Math.PI) / 2, start: now };
  }

  /** Multiply the frustum size. factor > 1 shows more of the town. */
  zoom(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    this.viewSize = THREE.MathUtils.clamp(this.viewSize * factor, MIN_VIEW, MAX_VIEW);
    this.apply();
  }

  /** Move the focus point, in town units (x east, y south). */
  panTo(x: number, y: number): void {
    this.focus.set(x, 0, y);
    this.apply();
  }

  /** Frame the whole town at the current azimuth. */
  fit(bounds: TownBounds, margin = 1.1): void {
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    this.focus.set(cx, 0, cy);
    this.apply();

    const inv = this.camera.matrixWorldInverse;
    const v = new THREE.Vector3();
    let halfW = 1;
    let halfH = 1;
    for (const x of [bounds.minX, bounds.maxX]) {
      for (const y of [bounds.minY, bounds.maxY]) {
        for (const h of [0, Math.max(1, bounds.maxHeight)]) {
          v.set(x, h, y).applyMatrix4(inv);
          halfW = Math.max(halfW, Math.abs(v.x));
          halfH = Math.max(halfH, Math.abs(v.y));
        }
      }
    }
    const needed = Math.max(halfH, halfW / Math.max(0.0001, this.aspect)) * margin;
    this.viewSize = THREE.MathUtils.clamp(needed, MIN_VIEW, MAX_VIEW);
    this.apply();
  }

  /** Advance the rotation tween. Returns true while still animating. */
  update(now: number): boolean {
    if (!this.tween) return false;
    const t = Math.min(1, (now - this.tween.start) / ROTATE_MS);
    this.azimuth = THREE.MathUtils.lerp(this.tween.from, this.tween.to, easeInOut(t));
    if (t >= 1) {
      this.azimuth = this.tween.to;
      this.tween = null;
      this.apply();
      // One more frame so the settled orientation is drawn.
      return true;
    }
    this.apply();
    return true;
  }

  get animating(): boolean {
    return this.tween !== null;
  }
}
