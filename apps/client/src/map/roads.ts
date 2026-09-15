/**
 * Road ribbons. Each edge is a flat quad just above the ground, with a disc at
 * every node so ribbons of different widths meet cleanly. Bus lines are not
 * ribbons at all: they are a dashed overlay drawn on top of the streets.
 */
import * as THREE from 'three';
import type { NodeId, RoadKind, Town } from '@jones2/town';
import { MaterialCache, PALETTE, disposeObject } from './palette';

interface RoadStyle {
  width: number;
  color: string;
  /** Stacking height; wider roads sit lower so narrow ones read on top. */
  y: number;
}

const ROAD_STYLE: Record<RoadKind, RoadStyle> = {
  highway: { width: 5, color: PALETTE.highway, y: 0.04 },
  street: { width: 3, color: PALETTE.street, y: 0.05 },
  path: { width: 1.6, color: PALETTE.path, y: 0.06 },
  busline: { width: 0, color: PALETTE.busline, y: 0.12 },
};

export type NodePos = { x: number; y: number };

/** A flat quad from (ax,az) to (bx,bz), `width` across, lying at height `y`. */
export function ribbon(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  width: number,
  y: number,
  material: THREE.Material,
): THREE.Mesh {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.max(0.001, Math.hypot(dx, dz));
  const geom = new THREE.PlaneGeometry(len, width);
  geom.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geom, material);
  mesh.position.set((ax + bx) / 2, y, (az + bz) / 2);
  mesh.rotation.y = Math.atan2(-dz, dx);
  return mesh;
}

export class Roads {
  readonly group = new THREE.Group();

  private town: Town | null = null;
  private pos = new Map<NodeId, NodePos>();
  /** Parallel to `town.edges`; null for busline edges (no ribbon). */
  private ribbons: (THREE.Mesh | null)[] = [];
  private joints = new Map<NodeId, THREE.Mesh>();
  private busLine: THREE.LineSegments | null = null;
  private laneLine: THREE.LineSegments | null = null;
  private edgesByNode = new Map<NodeId, number[]>();

  constructor(private readonly materials: MaterialCache) {
    this.group.name = 'roads';
  }

  build(town: Town, pos: Map<NodeId, NodePos>): void {
    this.clear();
    this.town = town;
    this.pos = pos;

    for (const [i, edge] of town.edges.entries()) {
      for (const id of [edge.a, edge.b]) {
        const list = this.edgesByNode.get(id);
        if (list) list.push(i);
        else this.edgesByNode.set(id, [i]);
      }
      const mesh = this.makeRibbon(i);
      this.ribbons.push(mesh);
      if (mesh) this.group.add(mesh);
    }

    // Widest non-busline road touching each node decides the joint disc size.
    const widest = new Map<NodeId, number>();
    for (const edge of town.edges) {
      const w = ROAD_STYLE[edge.kind].width;
      if (w <= 0) continue;
      for (const id of [edge.a, edge.b]) widest.set(id, Math.max(widest.get(id) ?? 0, w));
    }
    for (const [id, w] of widest) {
      const p = pos.get(id);
      if (!p) continue;
      const geom = new THREE.CircleGeometry(w / 2, 12);
      geom.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geom, this.materials.unlit(PALETTE.street));
      mesh.position.set(p.x, 0.03, p.y);
      this.joints.set(id, mesh);
      this.group.add(mesh);
    }

    this.rebuildOverlays();
  }

  /** One node moved: refresh its joint disc and the ribbons that touch it. */
  updateNode(id: NodeId): void {
    const p = this.pos.get(id);
    if (!p) return;
    const joint = this.joints.get(id);
    if (joint) joint.position.set(p.x, 0.03, p.y);
    for (const i of this.edgesByNode.get(id) ?? []) {
      const old = this.ribbons[i];
      if (old) {
        this.group.remove(old);
        disposeObject(old);
      }
      const next = this.makeRibbon(i);
      this.ribbons[i] = next;
      if (next) this.group.add(next);
    }
    this.rebuildOverlays();
  }

  clear(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      disposeObject(child);
    }
    this.ribbons = [];
    this.joints.clear();
    this.edgesByNode.clear();
    this.busLine = null;
    this.laneLine = null;
    this.town = null;
  }

  private makeRibbon(index: number): THREE.Mesh | null {
    const edge = this.town?.edges[index];
    if (!edge) return null;
    const style = ROAD_STYLE[edge.kind];
    if (style.width <= 0) return null;
    const a = this.pos.get(edge.a);
    const b = this.pos.get(edge.b);
    if (!a || !b) return null;
    return ribbon(a.x, a.y, b.x, b.y, style.width, style.y, this.materials.unlit(style.color));
  }

  /** Bus lines (yellow dashes at 0.12) and highway centre lines (0.07). */
  private rebuildOverlays(): void {
    for (const old of [this.busLine, this.laneLine]) {
      if (!old) continue;
      this.group.remove(old);
      disposeObject(old);
    }
    this.busLine = null;
    this.laneLine = null;
    const town = this.town;
    if (!town) return;

    const bus: number[] = [];
    const lane: number[] = [];
    for (const edge of town.edges) {
      const a = this.pos.get(edge.a);
      const b = this.pos.get(edge.b);
      if (!a || !b) continue;
      if (edge.kind === 'busline') {
        bus.push(a.x, ROAD_STYLE.busline.y, a.y, b.x, ROAD_STYLE.busline.y, b.y);
      } else if (edge.kind === 'highway') {
        lane.push(a.x, 0.07, a.y, b.x, 0.07, b.y);
      }
    }
    this.busLine = this.makeDashed(bus, PALETTE.busline, 2.2, 1.6, 6);
    this.laneLine = this.makeDashed(lane, PALETTE.highwayLine, 1.6, 1.6, 5);
  }

  private makeDashed(
    points: number[],
    color: string,
    dash: number,
    gap: number,
    renderOrder: number,
  ): THREE.LineSegments | null {
    if (points.length === 0) return null;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const line = new THREE.LineSegments(geom, this.materials.dashedLine(color, dash, gap));
    line.computeLineDistances();
    line.renderOrder = renderOrder;
    this.group.add(line);
    return line;
  }
}

export { ROAD_STYLE };
