/**
 * The town renderer. Implements the `TownScene` contract in `api.ts`.
 *
 * Scene graph (all under `scene`):
 *   ground      one flat quad covering the town bounds plus a margin
 *   decor       scenery from `town.decor`
 *   areas       highlight discs and the current route ribbon
 *   buildings   one group per location node, positioned in world units
 *   handles     editor-only junction discs
 *   labels      camera-facing name sprites
 *   figures     player characters
 *
 * Picking uses a separate `pickRoot` group that is never added to the scene:
 * one invisible cylinder per node, raycast directly. Nothing invisible is ever
 * submitted to the renderer, and the pick shapes stay independent of the art.
 */
import * as THREE from 'three';
import type { NodeId, Town, TownNode } from '@jones2/town';
import type { CreateTownScene, FigurePose, FigureStyle, PickResult, TownScene, TownSceneOptions } from './api';
import { IsoCamera, type TownBounds } from './camera';
import { MaterialCache, PALETTE, disposeSubtree } from './palette';
import { Roads, ribbon, type NodePos } from './roads';
import { buildBuilding } from './buildings';
import { buildDecor } from './decor';
import { Figures } from './figures';
import { makeLabel } from './labels';

const HOVER_INTERVAL_MS = 33;
const DRAG_SLOP_PX = 4;
/** Above this frustum half-height, name labels are hidden as clutter. */
const LABEL_MAX_VIEW = 70;
const GROUND_MARGIN = 40;

interface NodeVisual {
  node: TownNode;
  group: THREE.Object3D | null;
  label: THREE.Sprite | null;
  pick: THREE.Mesh;
  handle: THREE.Mesh | null;
  topY: number;
}

class TownSceneImpl implements TownScene {
  private readonly scene = new THREE.Scene();
  private readonly iso = new IsoCamera();
  private readonly mats = new MaterialCache();
  private readonly roads: Roads;
  private readonly figures: Figures;

  private readonly groundGroup = new THREE.Group();
  private readonly decorGroup = new THREE.Group();
  private readonly highlightGroup = new THREE.Group();
  private readonly routeGroup = new THREE.Group();
  private readonly buildingsGroup = new THREE.Group();
  private readonly handlesGroup = new THREE.Group();
  private readonly labelsGroup = new THREE.Group();
  /** Never added to the scene: raycast targets only. */
  private readonly pickRoot = new THREE.Group();
  private readonly pickMaterial = new THREE.MeshBasicMaterial({ visible: false });

  private renderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private raf = 0;
  private dirty = true;
  private lastFrame = 0;

  private town: Town | null = null;
  private readonly nodePos = new Map<NodeId, NodePos>();
  private readonly visuals = new Map<NodeId, NodeVisual>();
  private bounds: TownBounds = { minX: 0, maxX: 100, minY: 0, maxY: 100, maxHeight: 10 };
  private fitted = false;

  private highlighted: NodeId[] = [];
  private route: NodeId[] | null = null;
  private lastPoses: Record<string, FigurePose> = {};
  private followId: string | null = null;

  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly scratch = new THREE.Vector3();
  private readonly dragAnchor = new THREE.Vector3();
  private dragging = false;
  private dragPointer = -1;
  private dragMoved = 0;
  private nodeDragging = false;
  private downX = 0;
  private downY = 0;
  private lastHover = 0;

  constructor(private readonly options: TownSceneOptions) {
    this.scene.background = new THREE.Color('#dfe4d8');
    this.roads = new Roads(this.mats);
    this.figures = new Figures(this.mats, (id) => this.nodePos.get(id));

    const hemi = new THREE.HemisphereLight(0xffffff, 0x6d7a5e, 1.8);
    const sun = new THREE.DirectionalLight(0xfff4e2, 1.7);
    sun.position.set(60, 120, 40);
    this.scene.add(hemi, sun);

    this.labelsGroup.renderOrder = 20;
    this.scene.add(
      this.groundGroup,
      this.decorGroup,
      this.roads.group,
      this.highlightGroup,
      this.routeGroup,
      this.buildingsGroup,
      this.handlesGroup,
      this.labelsGroup,
      this.figures.group,
    );
  }

  // ---------------------------------------------------------------- lifecycle

  mount(canvas: HTMLCanvasElement): void {
    if (this.canvas === canvas && this.renderer) return;
    if (this.renderer) this.teardownRenderer();

    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);

    this.resize();
    this.dirty = true;
    this.lastFrame = 0;
    if (this.raf === 0) this.raf = requestAnimationFrame(this.tick);
  }

  unmount(): void {
    if (this.raf !== 0) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.teardownRenderer();
  }

  dispose(): void {
    this.unmount();
    this.clearTownVisuals();
    this.figures.dispose();
    disposeSubtree(this.highlightGroup);
    disposeSubtree(this.routeGroup);
    this.mats.dispose();
    // `pickMaterial` is never rendered, so it holds no GPU resources; keeping
    // it means a disposed scene can be mounted again (React StrictMode does
    // exactly that) without any half-initialised state.
  }

  private teardownRenderer(): void {
    const canvas = this.canvas;
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('pointermove', this.onPointerMove);
      canvas.removeEventListener('pointerup', this.onPointerUp);
      canvas.removeEventListener('pointercancel', this.onPointerUp);
      canvas.removeEventListener('wheel', this.onWheel);
      canvas.removeEventListener('contextmenu', this.onContextMenu);
      window.removeEventListener('keydown', this.onKeyDown);
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.canvas = null;
  }

  resize(): void {
    const canvas = this.canvas;
    if (!canvas || !this.renderer) return;
    const w = Math.max(1, canvas.clientWidth || canvas.width);
    const h = Math.max(1, canvas.clientHeight || canvas.height);
    this.renderer.setSize(w, h, false);
    this.iso.setViewport(w, h);
    this.dirty = true;
  }

  // -------------------------------------------------------------------- town

  setTown(town: Town): void {
    this.clearTownVisuals();
    this.town = town;

    for (const node of town.nodes) this.nodePos.set(node.id, { x: node.x, y: node.y });

    this.bounds = computeBounds(town);
    this.buildGround();
    this.decorGroup.add(buildDecor(town.decor, this.mats));
    this.roads.build(town, this.nodePos);

    for (const node of town.nodes) this.addNode(node);

    // Re-apply the transient layers on top of the new geometry.
    this.applyHighlight();
    this.applyRoute();
    this.figures.setPoses(this.lastPoses);

    if (!this.fitted) {
      this.fitted = true;
      this.fitAll();
    }
    this.dirty = true;
  }

  private clearTownVisuals(): void {
    disposeSubtree(this.groundGroup);
    disposeSubtree(this.decorGroup);
    disposeSubtree(this.buildingsGroup);
    disposeSubtree(this.handlesGroup);
    disposeSubtree(this.labelsGroup);
    disposeSubtree(this.pickRoot);
    this.roads.clear();
    this.visuals.clear();
    this.nodePos.clear();
    this.town = null;
  }

  private buildGround(): void {
    const w = this.bounds.maxX - this.bounds.minX + GROUND_MARGIN * 2;
    const h = this.bounds.maxY - this.bounds.minY + GROUND_MARGIN * 2;
    const geom = new THREE.PlaneGeometry(w, h);
    geom.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geom, this.mats.unlit(PALETTE.ground));
    mesh.position.set((this.bounds.minX + this.bounds.maxX) / 2, 0, (this.bounds.minY + this.bounds.maxY) / 2);
    this.groundGroup.add(mesh);
  }

  private addNode(node: TownNode): void {
    let group: THREE.Object3D | null = null;
    let label: THREE.Sprite | null = null;
    let handle: THREE.Mesh | null = null;
    let topY = 0;

    if (node.building) {
      const built = buildBuilding(node.building, this.mats, node.name ?? node.id);
      built.group.position.set(node.x, 0, node.y);
      this.buildingsGroup.add(built.group);
      group = built.group;
      topY = built.topY;

      if (node.name) {
        label = makeLabel(node.name, 1.6);
        label.position.set(node.x, topY + 2, node.y);
        this.labelsGroup.add(label);
      }
    } else if (this.options.editable) {
      const geom = new THREE.CircleGeometry(1.5, 16);
      geom.rotateX(-Math.PI / 2);
      handle = new THREE.Mesh(geom, this.mats.unlit(PALETTE.junction, { opacity: 0.9, depthWrite: false }));
      handle.position.set(node.x, 0.16, node.y);
      handle.renderOrder = 4;
      this.handlesGroup.add(handle);
    }

    const pickH = node.building ? topY + 2 : 1.2;
    const pick = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, pickH, 8), this.pickMaterial);
    pick.position.set(node.x, pickH / 2, node.y);
    pick.userData.nodeId = node.id;
    this.pickRoot.add(pick);

    this.visuals.set(node.id, { node, group, label, pick, handle, topY });
  }

  moveNode(id: NodeId, x: number, y: number): void {
    const pos = this.nodePos.get(id);
    const vis = this.visuals.get(id);
    if (!pos || !vis) return;
    pos.x = x;
    pos.y = y;

    if (vis.group) vis.group.position.set(x, 0, y);
    if (vis.label) vis.label.position.set(x, vis.topY + 2, y);
    if (vis.handle) vis.handle.position.set(x, 0.16, y);
    vis.pick.position.set(x, vis.pick.position.y, y);
    this.pickRoot.updateMatrixWorld(true);

    this.roads.updateNode(id);
    this.applyHighlight();
    this.applyRoute();
    this.figures.setPoses(this.lastPoses);
    this.dirty = true;
  }

  // ------------------------------------------------------------ overlay layers

  setHighlight(nodeIds: NodeId[]): void {
    this.highlighted = [...nodeIds];
    this.applyHighlight();
    this.dirty = true;
  }

  private applyHighlight(): void {
    disposeSubtree(this.highlightGroup);
    const mat = this.mats.unlit(PALETTE.highlight, { opacity: 0.32, depthWrite: false });
    for (const id of this.highlighted) {
      const p = this.nodePos.get(id);
      if (!p) continue;
      const geom = new THREE.CircleGeometry(4, 24);
      geom.rotateX(-Math.PI / 2);
      const disc = new THREE.Mesh(geom, mat);
      disc.position.set(p.x, 0.15, p.y);
      disc.renderOrder = 2;
      this.highlightGroup.add(disc);
    }
  }

  setRoute(path: NodeId[] | null): void {
    this.route = path && path.length > 1 ? [...path] : null;
    this.applyRoute();
    this.dirty = true;
  }

  private applyRoute(): void {
    disposeSubtree(this.routeGroup);
    const path = this.route;
    if (!path) return;
    const mat = this.mats.unlit(PALETTE.route, { opacity: 0.95, depthWrite: false });
    const width = 1.8;
    for (let i = 0; i + 1 < path.length; i++) {
      const aId = path[i];
      const bId = path[i + 1];
      if (aId === undefined || bId === undefined) continue;
      const a = this.nodePos.get(aId);
      const b = this.nodePos.get(bId);
      if (!a || !b) continue;
      const seg = ribbon(a.x, a.y, b.x, b.y, width, 0.2, mat);
      seg.renderOrder = 3;
      this.routeGroup.add(seg);
    }
    for (const id of path) {
      const p = this.nodePos.get(id);
      if (!p) continue;
      const geom = new THREE.CircleGeometry(width / 2, 12);
      geom.rotateX(-Math.PI / 2);
      const cap = new THREE.Mesh(geom, mat);
      cap.position.set(p.x, 0.2, p.y);
      cap.renderOrder = 3;
      this.routeGroup.add(cap);
    }
  }

  // ----------------------------------------------------------------- figures

  setFigures(figures: Record<string, FigureStyle>): void {
    this.figures.setStyles(figures);
    this.figures.setPoses(this.lastPoses);
    this.dirty = true;
  }

  setPoses(poses: Record<string, FigurePose>): void {
    this.lastPoses = { ...this.lastPoses, ...poses };
    this.figures.setPoses(poses);
    this.dirty = true;
  }

  follow(figureId: string | null): void {
    this.followId = figureId;
    this.dirty = true;
  }

  // ------------------------------------------------------------------ camera

  rotate(quarterTurns: number): void {
    this.iso.rotate(quarterTurns, now());
    this.dirty = true;
  }

  zoom(factor: number): void {
    this.iso.zoom(factor);
    this.dirty = true;
  }

  panTo(x: number, y: number): void {
    this.followId = null;
    this.iso.panTo(x, y);
    this.dirty = true;
  }

  fitAll(): void {
    this.followId = null;
    this.iso.fit(this.bounds);
    this.dirty = true;
  }

  // ------------------------------------------------------------------- input

  private readonly onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    const canvas = this.canvas;
    if (!canvas) return;
    canvas.setPointerCapture?.(e.pointerId);
    this.dragPointer = e.pointerId;
    this.dragMoved = 0;
    this.downX = e.clientX;
    this.downY = e.clientY;
    // Editor: a drag starting on a node moves the node instead of the camera.
    if (this.options.editable && this.options.onDragStart) {
      const hit = this.pick(e.clientX, e.clientY);
      if (hit?.node) {
        this.nodeDragging = true;
        this.options.onDragStart(hit);
        return;
      }
    }
    this.dragging = true;
    const p = this.groundAt(e.clientX, e.clientY);
    if (p) this.dragAnchor.copy(p);
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (this.nodeDragging && e.pointerId === this.dragPointer) {
      this.dragMoved = Math.max(this.dragMoved, Math.hypot(e.clientX - this.downX, e.clientY - this.downY));
      if (this.dragMoved > DRAG_SLOP_PX) {
        const hit = this.pick(e.clientX, e.clientY);
        if (hit) this.options.onDrag?.(hit);
      }
      return;
    }
    if (this.dragging && e.pointerId === this.dragPointer) {
      this.dragMoved = Math.max(this.dragMoved, Math.hypot(e.clientX - this.downX, e.clientY - this.downY));
      const p = this.groundAt(e.clientX, e.clientY);
      if (p) {
        this.followId = null;
        this.iso.focus.x += this.dragAnchor.x - p.x;
        this.iso.focus.z += this.dragAnchor.z - p.z;
        this.iso.apply();
        this.dirty = true;
      }
      return;
    }
    const onHover = this.options.onHover;
    if (!onHover) return;
    const t = now();
    if (t - this.lastHover < HOVER_INTERVAL_MS) return;
    this.lastHover = t;
    const hit = this.pick(e.clientX, e.clientY);
    if (hit) onHover(hit);
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.dragPointer) return;
    this.canvas?.releasePointerCapture?.(e.pointerId);
    const wasDrag = this.dragMoved > DRAG_SLOP_PX;
    this.dragging = false;
    this.dragPointer = -1;
    if (this.nodeDragging) {
      this.nodeDragging = false;
      this.options.onDragEnd?.();
    }
    if (wasDrag) return;
    const onPick = this.options.onPick;
    if (!onPick) return;
    const hit = this.pick(e.clientX, e.clientY);
    if (hit) onPick(hit);
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    this.iso.zoom(Math.exp(THREE.MathUtils.clamp(dy, -400, 400) * 0.0014));
    this.dirty = true;
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
    if (e.key === 'q' || e.key === 'Q') this.rotate(-1);
    else if (e.key === 'e' || e.key === 'E') this.rotate(1);
  };

  /** Ray from the pointer to the ground plane, in world space. */
  private groundAt(clientX: number, clientY: number): THREE.Vector3 | null {
    const canvas = this.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
    this.raycaster.setFromCamera(this.ndc, this.iso.camera);
    return this.raycaster.ray.intersectPlane(this.groundPlane, this.scratch) ? this.scratch : null;
  }

  private pick(clientX: number, clientY: number): PickResult | null {
    const ground = this.groundAt(clientX, clientY);
    if (!ground) return null;
    const x = ground.x;
    const y = ground.z;
    this.pickRoot.updateMatrixWorld(true);
    const hits = this.raycaster.intersectObjects(this.pickRoot.children, false);
    const first = hits[0];
    const node = first ? ((first.object.userData.nodeId as NodeId | undefined) ?? null) : null;
    return { node, x, y };
  }

  // -------------------------------------------------------------- render loop

  private readonly tick = (time: number): void => {
    this.raf = requestAnimationFrame(this.tick);
    const renderer = this.renderer;
    if (!renderer) return;

    const dt = this.lastFrame === 0 ? 0 : Math.min(0.1, (time - this.lastFrame) / 1000);
    this.lastFrame = time;

    let active = this.iso.update(time);
    if (this.figures.step(dt)) active = true;

    if (this.followId) {
      const p = this.figures.positionOf(this.followId);
      if (p && (Math.abs(p.x - this.iso.focus.x) > 0.001 || Math.abs(p.z - this.iso.focus.z) > 0.001)) {
        this.iso.focus.set(p.x, 0, p.z);
        this.iso.apply();
        active = true;
      }
    }

    const showLabels = this.iso.viewSize <= LABEL_MAX_VIEW;
    if (this.labelsGroup.visible !== showLabels) {
      this.labelsGroup.visible = showLabels;
      this.dirty = true;
    }

    if (!this.dirty && !active) return;
    this.dirty = false;
    renderer.render(this.scene, this.iso.camera);
  };
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function computeBounds(town: Town): TownBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let maxHeight = 6;
  for (const node of town.nodes) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
    if (node.building) maxHeight = Math.max(maxHeight, node.building.height + 4);
  }
  for (const d of town.decor ?? []) {
    const hw = (d.w ?? 2) / 2;
    const hh = (d.h ?? 2) / 2;
    minX = Math.min(minX, d.x - hw);
    maxX = Math.max(maxX, d.x + hw);
    minY = Math.min(minY, d.y - hh);
    maxY = Math.max(maxY, d.y + hh);
  }
  if (!Number.isFinite(minX)) return { minX: 0, maxX: 100, minY: 0, maxY: 100, maxHeight };
  // A little air around the outermost buildings and their signs.
  const pad = 8;
  return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad, maxHeight };
}

export const createTownScene: CreateTownScene = (options = {}) => new TownSceneImpl(options);
