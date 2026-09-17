/**
 * The 2D pixel-art town renderer. Implements `api.ts` (THE CONTRACT).
 *
 * Two layers:
 *  - a static native-resolution surface with the whole town (ground, roads,
 *    shadows, scenery, buildings), rebuilt only on setTown/moveNode;
 *  - a per-frame native-resolution surface the size of the visible window,
 *    which starts as a copy of the static one and then takes highlights, the
 *    route, figures, labels and editor handles.
 *
 * The frame surface is flattened to RGBA once, put into an offscreen canvas,
 * and blown up onto the visible canvas with an INTEGER zoom and
 * `imageSmoothingEnabled = false`. Nothing is ever drawn at a fractional scale,
 * which is the whole point.
 */
import type { NodeId, Town } from '@jones2/town';
import type { CreateTownScene, FigurePose, FigureStyle, PickResult, TownScene, TownSceneOptions } from './api';
import { PX_PER_UNIT, getArt } from './art';
import {
  LABEL_MIN_ZOOM,
  type View,
  ZOOM_LEVELS,
  centreOrigin,
  clampOrigin,
  createView,
  fitZoom,
  originAfterZoomAt,
  screenToNative,
  screenToTown,
  stepZoom,
} from './camera';
import {
  type FigureState,
  type ResolvedFigure,
  anyMoving,
  drawFigure,
  drawFigureLabel,
  resolveFigure,
} from './figures';
import { type Ground, type Placement, buildGround, ditherEllipse, pickNode } from './ground';
import { dashAlong, edgePolyline } from './roads';
import {
  RenderPalette,
  type Surface,
  blitAnchored,
  copyWindow,
  createSurface,
  fillRect,
  put,
  strokeEllipse,
  strokeRect,
  text,
  toRGBA,
} from './surface';

/** Shown outside the town layer. */
const BACKDROP = '#20241d';

const EMPTY_TOWN: Town = { id: 'empty', name: 'empty', startNode: '', nodes: [], edges: [] };

class PixelTownScene implements TownScene {
  private readonly options: TownSceneOptions;
  private readonly art = getArt();
  private readonly pal = new RenderPalette(this.art.palette);

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  /** Native-resolution scratch canvas the frame surface is put into. */
  private native: HTMLCanvasElement | null = null;
  private nativeCtx: CanvasRenderingContext2D | null = null;
  private frame: Surface | null = null;
  /** Reused every frame; `toRGBA` writes straight into `image.data`. */
  private image: ImageData | null = null;

  private sourceTown: Town = EMPTY_TOWN;
  private town: Town = EMPTY_TOWN;
  private readonly moved = new Map<NodeId, { x: number; y: number }>();
  private ground: Ground | null = null;

  private readonly figures = new Map<string, FigureState>();
  private highlight: NodeId[] = [];
  private route: NodeId[] | null = null;
  private followId: string | null = null;

  private readonly view: View = createView();
  private framed = false;

  private raf = 0;
  private dirty = true;
  private lastHover = 0;
  private lastHoverNode: NodeId | null | undefined;

  private drag: 'none' | 'pan' | 'node' = 'none';
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private movedFar = false;

  constructor(options: TownSceneOptions = {}) {
    this.options = options;
  }

  /* ------------------------------------------------------------ lifecycle */

  mount(canvas: HTMLCanvasElement): void {
    if (this.canvas === canvas) return;
    if (this.canvas) this.unmount();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    canvas.style.imageRendering = 'pixelated';
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    if (!this.ground && this.sourceTown !== EMPTY_TOWN) this.rebuild();
    this.resize();
    this.dirty = true;
    this.loop();
  }

  unmount(): void {
    const canvas = this.canvas;
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('pointermove', this.onPointerMove);
      canvas.removeEventListener('pointerup', this.onPointerUp);
      canvas.removeEventListener('pointercancel', this.onPointerUp);
      canvas.removeEventListener('pointerleave', this.onPointerLeave);
      canvas.removeEventListener('wheel', this.onWheel);
    }
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.canvas = null;
    this.ctx = null;
    this.drag = 'none';
    this.pointerId = null;
  }

  /**
   * Free the heavy buffers. The scene stays usable: a later `mount()` rebuilds
   * the static layer from the town it still holds, which is what React
   * StrictMode's mount/unmount/mount needs.
   */
  dispose(): void {
    this.unmount();
    this.ground = null;
    this.native = null;
    this.nativeCtx = null;
    this.frame = null;
    this.image = null;
  }

  /* ------------------------------------------------------------ town state */

  setTown(town: Town): void {
    this.sourceTown = town;
    this.moved.clear();
    this.rebuild();
    if (!this.framed) this.fitAll();
    this.dirty = true;
  }

  moveNode(id: NodeId, x: number, y: number): void {
    if (!this.sourceTown.nodes.some((n) => n.id === id)) return;
    this.moved.set(id, { x, y });
    this.rebuild();
    this.dirty = true;
  }

  private rebuild(): void {
    this.town =
      this.moved.size === 0
        ? this.sourceTown
        : {
            ...this.sourceTown,
            nodes: this.sourceTown.nodes.map((n) => {
              const p = this.moved.get(n.id);
              return p ? { ...n, x: p.x, y: p.y } : n;
            }),
          };
    this.ground = buildGround(this.town, this.art, this.pal);
  }

  setHighlight(nodeIds: NodeId[]): void {
    this.highlight = nodeIds.slice();
    this.dirty = true;
  }

  setRoute(path: NodeId[] | null): void {
    this.route = path && path.length > 1 ? path.slice() : null;
    this.dirty = true;
  }

  setFigures(figures: Record<string, FigureStyle>): void {
    for (const id of [...this.figures.keys()]) {
      if (!(id in figures)) this.figures.delete(id);
    }
    for (const [id, style] of Object.entries(figures)) {
      const existing = this.figures.get(id);
      if (existing) existing.style = style;
      else this.figures.set(id, { id, style, pose: { kind: 'at', node: this.town.startNode } });
    }
    this.dirty = true;
  }

  setPoses(poses: Record<string, FigurePose>): void {
    for (const [id, pose] of Object.entries(poses)) {
      const fig = this.figures.get(id);
      if (fig) fig.pose = pose;
    }
    this.dirty = true;
  }

  /* ---------------------------------------------------------------- camera */

  follow(figureId: string | null): void {
    this.followId = figureId;
    this.dirty = true;
  }

  /** No-op: the camera is fixed top-down. Kept so the contract does not change. */
  rotate(_quarterTurns: number): void {
    /* intentionally empty */
  }

  zoom(factor: number): void {
    if (factor === 1) return;
    this.setZoomAt(stepZoom(this.view.zoom, factor < 1 ? -1 : 1), this.view.width / 2, this.view.height / 2);
  }

  panTo(x: number, y: number): void {
    const o = centreOrigin(x, y, this.view);
    this.view.originX = Math.round(o.x);
    this.view.originY = Math.round(o.y);
    this.clamp();
    this.framed = true;
    this.dirty = true;
  }

  fitAll(): void {
    const g = this.ground;
    if (!g || this.view.width <= 1) return;
    this.view.zoom = fitZoom(g.width, g.height, this.view.width, this.view.height, ZOOM_LEVELS);
    const cx = (g.offsetX + g.width / 2) / PX_PER_UNIT;
    const cy = (g.offsetY + g.height / 2) / PX_PER_UNIT;
    this.panTo(cx, cy);
    this.framed = true;
  }

  resize(): void {
    const canvas = this.canvas;
    if (!canvas) return;
    const w = Math.max(1, Math.round(canvas.clientWidth || canvas.width || 1));
    const h = Math.max(1, Math.round(canvas.clientHeight || canvas.height || 1));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    this.view.width = w;
    this.view.height = h;
    if (!this.framed) this.fitAll();
    this.clamp();
    this.dirty = true;
  }

  private setZoomAt(next: number, sx: number, sy: number): void {
    if (next === this.view.zoom) return;
    const town = screenToTown(sx, sy, this.view);
    this.view.zoom = next;
    const o = originAfterZoomAt(sx, sy, town, next);
    this.view.originX = Math.round(o.x);
    this.view.originY = Math.round(o.y);
    this.clamp();
    this.framed = true;
    this.dirty = true;
  }

  private clamp(): void {
    const g = this.ground;
    if (!g) return;
    const before = { x: this.view.originX, y: this.view.originY };
    const shifted: View = { ...this.view, originX: this.view.originX - g.offsetX, originY: this.view.originY - g.offsetY };
    clampOrigin(shifted, g.width, g.height);
    this.view.originX = Math.round(shifted.originX + g.offsetX);
    this.view.originY = Math.round(shifted.originY + g.offsetY);
    if (before.x !== this.view.originX || before.y !== this.view.originY) this.dirty = true;
  }

  /* ----------------------------------------------------------------- input */

  private hitAt(ev: PointerEvent): PickResult {
    const canvas = this.canvas!;
    const rect = canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const t = screenToTown(sx, sy, this.view);
    const n = screenToNative(sx, sy, this.view);
    const node = this.ground ? pickNode(this.town, this.ground.picks, n.x, n.y) : null;
    return { node, x: t.x, y: t.y };
  }

  private readonly onPointerDown = (ev: PointerEvent): void => {
    if (!this.canvas || ev.button !== 0) return;
    this.canvas.setPointerCapture?.(ev.pointerId);
    this.pointerId = ev.pointerId;
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.movedFar = false;
    const hit = this.hitAt(ev);
    if (this.options.editable && this.options.onDragStart && hit.node) {
      this.drag = 'node';
      this.options.onDragStart(hit);
    } else {
      this.drag = 'pan';
    }
  };

  private readonly onPointerMove = (ev: PointerEvent): void => {
    if (!this.canvas) return;
    if (this.drag === 'none') {
      const now = Date.now();
      if (!this.options.onHover) return;
      const hit = this.hitAt(ev);
      if (now - this.lastHover < 30 && hit.node === this.lastHoverNode) return;
      this.lastHover = now;
      this.lastHoverNode = hit.node;
      this.options.onHover(hit);
      return;
    }
    if (this.pointerId !== null && ev.pointerId !== this.pointerId) return;
    const dx = ev.clientX - this.startX;
    const dy = ev.clientY - this.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.movedFar = true;
    if (this.drag === 'node') {
      this.options.onDrag?.(this.hitAt(ev));
      return;
    }
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.view.originX = Math.round(this.view.originX - dx / this.view.zoom);
    this.view.originY = Math.round(this.view.originY - dy / this.view.zoom);
    this.framed = true;
    this.clamp();
    this.dirty = true;
  };

  private readonly onPointerUp = (ev: PointerEvent): void => {
    if (this.drag === 'none' || !this.canvas) return;
    const wasNode = this.drag === 'node';
    this.drag = 'none';
    this.canvas?.releasePointerCapture?.(ev.pointerId);
    this.pointerId = null;
    if (!this.movedFar) this.options.onPick?.(this.hitAt(ev));
    if (wasNode) this.options.onDragEnd?.();
  };

  private readonly onPointerLeave = (): void => {
    this.lastHoverNode = undefined;
  };

  private readonly onWheel = (ev: WheelEvent): void => {
    if (!this.canvas) return;
    ev.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    this.setZoomAt(
      stepZoom(this.view.zoom, ev.deltaY < 0 ? -1 : 1),
      ev.clientX - rect.left,
      ev.clientY - rect.top,
    );
  };

  /* ---------------------------------------------------------------- render */

  private readonly loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    const figures = [...this.figures.values()];
    const animating = anyMoving(figures) || (this.followId !== null && this.figures.has(this.followId));
    if (!this.dirty && !animating) return;
    this.dirty = false;
    this.render();
  };

  private ensureBuffers(): boolean {
    const ctx = this.ctx;
    if (!ctx) return false;
    const fw = Math.ceil(this.view.width / this.view.zoom) + 1;
    const fh = Math.ceil(this.view.height / this.view.zoom) + 1;
    if (!this.frame || this.frame.width !== fw || this.frame.height !== fh || !this.nativeCtx) {
      this.frame = createSurface(fw, fh);
      this.native = document.createElement('canvas');
      this.native.width = fw;
      this.native.height = fh;
      this.nativeCtx = this.native.getContext('2d');
      this.image = this.nativeCtx ? this.nativeCtx.createImageData(fw, fh) : null;
    }
    return this.nativeCtx !== null && this.image !== null;
  }

  private render(): void {
    const ctx = this.ctx;
    const g = this.ground;
    if (!ctx) return;

    if (this.followId) {
      const fig = this.figures.get(this.followId);
      const r = fig && g ? resolveFigure(this.town, fig, Date.now()) : null;
      if (r) {
        const o = centreOrigin(r.nx / PX_PER_UNIT, r.ny / PX_PER_UNIT, this.view);
        this.view.originX = Math.round(o.x);
        this.view.originY = Math.round(o.y);
        this.clamp();
      }
    }

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = BACKDROP;
    ctx.fillRect(0, 0, this.view.width, this.view.height);
    if (!g || !this.ensureBuffers()) return;

    const frame = this.frame!;
    const ox = this.view.originX;
    const oy = this.view.originY;
    copyWindow(frame, g.surface, ox - g.offsetX, oy - g.offsetY);

    this.drawHighlights(frame, ox, oy);
    this.drawRoute(frame, ox, oy);
    this.drawFigures(frame, ox, oy);
    if (this.options.editable) this.drawEditorHandles(frame, ox, oy);

    const image = this.image!;
    toRGBA(frame, this.pal.colors, image.data);
    this.nativeCtx!.putImageData(image, 0, 0);
    ctx.drawImage(
      this.native!,
      0,
      0,
      frame.width,
      frame.height,
      0,
      0,
      frame.width * this.view.zoom,
      frame.height * this.view.zoom,
    );
  }

  private drawHighlights(frame: Surface, ox: number, oy: number): void {
    if (this.highlight.length === 0) return;
    const accent = this.pal.index('highlight', [63, 143, 232]);
    const redraw: Placement[] = [];
    for (const id of this.highlight) {
      const n = this.town.nodes.find((x) => x.id === id);
      if (!n) continue;
      const placement = this.ground?.placements.find((p) => p.id === id);
      const rx = (placement ? placement.sprite.footprintW / 2 : 6) + 4;
      const ry = (placement ? placement.sprite.footprintH / 2 : 4) + 3;
      const cx = n.x * PX_PER_UNIT - ox;
      const cy = n.y * PX_PER_UNIT - oy;
      ditherEllipse(frame, cx, cy, rx, ry, accent);
      strokeEllipse(frame, cx, cy, rx, ry, accent);
      if (placement) redraw.push(placement);
    }
    // The ring belongs UNDER the building, so put the building back on top.
    for (const p of redraw) blitAnchored(frame, p.sprite, p.nx - ox, p.ny - oy);
  }

  private drawRoute(frame: Surface, ox: number, oy: number): void {
    const path = this.route;
    if (!path) return;
    // Fat white dashes with an ink outline, marching toward the destination:
    // the roads carry yellow centre lines and kerbs, so the route must be
    // heavier and darker-edged than anything painted on them.
    const colour = this.pal.index('route', [255, 255, 255]);
    const ink = this.pal.index('ink', [29, 26, 36]);
    const dash = 7;
    const gap = 5;
    const phase = dash + gap - ((Date.now() / 60) % (dash + gap));
    const polys: { x: number; y: number }[][] = [];
    for (let i = 1; i < path.length; i++) {
      // The chain's own samples, so the route sits exactly on the drawn road.
      const pts = edgePolyline(this.town, path[i - 1]!, path[i]!).map((p) => ({
        x: p.x * PX_PER_UNIT - ox,
        y: p.y * PX_PER_UNIT - oy,
      }));
      if (pts.length >= 2) polys.push(pts);
    }
    for (const pts of polys) {
      dashAlong(frame, pts, dash, gap, phase, (x, y) => {
        for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) put(frame, x + i, y + j, ink);
      });
    }
    for (const pts of polys) {
      dashAlong(frame, pts, dash, gap, phase, (x, y) => {
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(frame, x + i, y + j, colour);
      });
    }
  }

  private drawFigures(frame: Surface, ox: number, oy: number): void {
    const g = this.ground!;
    const now = Date.now();
    const resolved: ResolvedFigure[] = [];
    for (const fig of this.figures.values()) {
      const r = resolveFigure(this.town, fig, now);
      if (r) resolved.push(r);
    }
    if (resolved.length === 0) return;
    resolved.sort((a, b) => a.ny - b.ny || a.nx - b.nx);

    // Markers (player tokens, CLOSED boards) are overlays, not inhabitants:
    // they go on top of everything, after the occlusion pass.
    const walkers = resolved.filter((f) => !f.marker);
    const markers = resolved.filter((f) => f.marker);

    for (const f of walkers) drawFigure(frame, this.art, this.pal, f, ox, oy);

    // Occlusion: re-blit any building standing in front of a figure (larger
    // anchor y) whose sprite overlaps it. Cheap, and visually identical to
    // compositing the whole band.
    const minY = walkers.length ? walkers[0]!.ny : Infinity;
    for (const p of g.placements) {
      if (!p.id || p.ny <= minY) continue;
      const left = p.nx - p.sprite.anchorX;
      const top = p.ny - p.sprite.anchorY;
      const right = left + p.sprite.width;
      const bottom = top + p.sprite.height;
      if (right < ox || left > ox + frame.width || bottom < oy || top > oy + frame.height) continue;
      const hides = walkers.some(
        (f) => f.ny < p.ny && f.nx > left - 12 && f.nx < right + 12 && f.ny > top - 24 && f.ny < bottom + 24,
      );
      if (hides) blitAnchored(frame, p.sprite, p.nx - ox, p.ny - oy);
    }

    for (const f of markers) drawFigure(frame, this.art, this.pal, f, ox, oy);

    // Name plates are 3x5 text: below zoom 2 they are noise, so they go away.
    if (this.view.zoom >= LABEL_MIN_ZOOM) {
      for (const f of resolved) {
        const sprite = this.art.character(f.dir, f.frame, 1);
        drawFigureLabel(frame, this.pal, f, sprite.height, ox, oy);
      }
    }
  }

  private drawEditorHandles(frame: Surface, ox: number, oy: number): void {
    const ink = this.pal.index('ink', [29, 26, 36]);
    const handle = this.pal.index('junction', [240, 140, 34]);
    const white = this.pal.index('white', [242, 242, 238]);
    const panel = this.pal.index('panel', [36, 31, 43]);
    for (const n of this.town.nodes) {
      const x = Math.round(n.x * PX_PER_UNIT - ox);
      const y = Math.round(n.y * PX_PER_UNIT - oy);
      if (x < -20 || y < -20 || x > frame.width + 20 || y > frame.height + 20) continue;
      if (!n.building) {
        fillRect(frame, x - 2, y - 2, 5, 5, handle);
        strokeRect(frame, x - 3, y - 3, 7, 7, ink);
      }
      if (this.view.zoom < LABEL_MIN_ZOOM) continue;
      const label = n.id;
      const w = label.length * 4 + 1;
      fillRect(frame, x - Math.floor(w / 2), y + 5, w, 7, panel);
      text(frame, label, x - Math.floor(w / 2) + 1, y + 6, white);
    }
  }
}

export const createTownScene: CreateTownScene = (options?: TownSceneOptions) =>
  new PixelTownScene(options);
