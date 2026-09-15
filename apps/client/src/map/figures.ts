/**
 * Player figures: a coloured capsule with a head and a floating name label,
 * optionally riding a car or a bike. Poses are set every frame during replay,
 * so movement is smoothed with a cheap exponential ease rather than tweens.
 */
import * as THREE from 'three';
import type { NodeId, TransportMode } from '@jones2/town';
import type { FigurePose, FigureStyle } from './api';
import { MaterialCache, PALETTE, disposeObject } from './palette';
import { makeLabel } from './labels';

/** Seconds; ~3 time constants (~150ms) to settle. */
const EASE_TAU = 0.05;
const SETTLED = 0.002;

export type NodePosLookup = (id: NodeId) => { x: number; y: number } | undefined;

class Figure {
  readonly root = new THREE.Group();
  readonly target = new THREE.Vector3();
  targetYaw = 0;

  private readonly rider = new THREE.Group();
  private readonly body: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private readonly car: THREE.Group;
  private readonly bike: THREE.Group;
  private readonly label: THREE.Sprite;
  private readonly bodyMat: THREE.Material;
  private readonly headMat: THREE.Material;
  private readonly ghostMat: THREE.Material;
  private ghost = false;
  private placed = false;

  constructor(readonly style: FigureStyle, mats: MaterialCache) {
    this.bodyMat = mats.solid(style.color);
    this.headMat = mats.solid(PALETTE.skin);
    this.ghostMat = mats.solid(PALETTE.ghost, { opacity: 0.4 });

    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.9, 3, 10), this.bodyMat);
    this.body.position.y = 0.9;
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), this.headMat);
    this.head.position.y = 2.05;
    this.rider.add(this.body, this.head);

    this.car = new THREE.Group();
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.85, 1.6), mats.solid(style.color));
    carBody.position.y = 0.75;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 1.35), mats.solid('#2b3a4a'));
    cabin.position.set(-0.2, 1.45, 0);
    const wheel = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10);
    wheel.rotateX(Math.PI / 2);
    this.car.add(carBody, cabin);
    for (const dx of [-1.05, 1.05]) {
      for (const dz of [-0.8, 0.8]) {
        const w = new THREE.Mesh(wheel, mats.solid(PALETTE.tyre));
        w.position.set(dx, 0.38, dz);
        this.car.add(w);
      }
    }
    this.car.visible = false;

    this.bike = new THREE.Group();
    const rim = new THREE.TorusGeometry(0.42, 0.07, 5, 12);
    for (const dx of [-0.72, 0.72]) {
      const w = new THREE.Mesh(rim, mats.solid(PALETTE.tyre));
      w.position.set(dx, 0.42, 0);
      this.bike.add(w);
    }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.09), mats.solid('#3a3f46'));
    frame.position.y = 0.72;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.09), mats.solid('#3a3f46'));
    post.position.set(-0.35, 0.95, 0);
    this.bike.add(frame, post);
    this.bike.visible = false;

    this.label = makeLabel(style.label, 1.1);
    this.label.position.y = 3.1;

    this.root.add(this.rider, this.car, this.bike, this.label);
  }

  setGhost(ghost: boolean): void {
    if (ghost === this.ghost) return;
    this.ghost = ghost;
    this.body.material = ghost ? this.ghostMat : this.bodyMat;
    this.head.material = ghost ? this.ghostMat : this.headMat;
    const mat = this.label.material;
    mat.opacity = ghost ? 0.45 : 1;
  }

  setMode(mode: TransportMode | undefined): void {
    const car = mode === 'car';
    const bike = mode === 'bike';
    this.car.visible = car;
    this.bike.visible = bike;
    this.rider.position.y = car ? 0.75 : bike ? 0.5 : 0;
    this.label.position.y = car ? 3.6 : 3.1;
  }

  /** Jump straight to the target the first time; ease afterwards. */
  place(): void {
    this.root.position.copy(this.target);
    this.root.rotation.y = this.targetYaw;
    this.placed = true;
  }

  step(dt: number): boolean {
    if (!this.placed) {
      this.place();
      return false;
    }
    const k = 1 - Math.exp(-dt / EASE_TAU);
    const before = this.root.position.distanceToSquared(this.target);
    this.root.position.lerp(this.target, k);
    let yawDelta = this.targetYaw - this.root.rotation.y;
    yawDelta = Math.atan2(Math.sin(yawDelta), Math.cos(yawDelta));
    this.root.rotation.y += yawDelta * k;
    return before > SETTLED || Math.abs(yawDelta) > 0.01;
  }

  dispose(): void {
    disposeObject(this.root);
  }
}

export class Figures {
  readonly group = new THREE.Group();
  private readonly figures = new Map<string, Figure>();

  constructor(
    private readonly mats: MaterialCache,
    private lookup: NodePosLookup,
  ) {
    this.group.name = 'figures';
  }

  setLookup(lookup: NodePosLookup): void {
    this.lookup = lookup;
  }

  /** Declare the roster. Figures not listed are removed; restyled ones rebuild. */
  setStyles(styles: Record<string, FigureStyle>): void {
    for (const [id, fig] of [...this.figures]) {
      const next = styles[id];
      if (!next || next.color !== fig.style.color || next.label !== fig.style.label) {
        this.group.remove(fig.root);
        fig.dispose();
        this.figures.delete(id);
      }
    }
    for (const [id, style] of Object.entries(styles)) {
      if (this.figures.has(id)) continue;
      const fig = new Figure(style, this.mats);
      this.figures.set(id, fig);
      this.group.add(fig.root);
    }
  }

  setPoses(poses: Record<string, FigurePose>): void {
    for (const [id, pose] of Object.entries(poses)) {
      const fig = this.figures.get(id);
      if (!fig) continue;
      fig.setGhost(pose.ghost === true);
      fig.setMode(pose.mode);
      if (pose.kind === 'at') {
        const p = this.lookup(pose.node);
        if (p) fig.target.set(p.x, 0, p.y);
      } else {
        const a = this.lookup(pose.from);
        const b = this.lookup(pose.to);
        if (a && b) {
          const t = THREE.MathUtils.clamp(pose.t, 0, 1);
          fig.target.set(a.x + (b.x - a.x) * t, 0, a.y + (b.y - a.y) * t);
          const dx = b.x - a.x;
          const dz = b.y - a.y;
          if (dx !== 0 || dz !== 0) fig.targetYaw = Math.atan2(-dz, dx);
        }
      }
    }
  }

  /** True while any figure is still easing toward its target. */
  step(dt: number): boolean {
    let moving = false;
    for (const fig of this.figures.values()) if (fig.step(dt)) moving = true;
    return moving;
  }

  /** Current (eased) world position of a figure, if it exists. */
  positionOf(id: string): THREE.Vector3 | null {
    return this.figures.get(id)?.root.position ?? null;
  }

  dispose(): void {
    for (const fig of this.figures.values()) {
      this.group.remove(fig.root);
      fig.dispose();
    }
    this.figures.clear();
  }
}
