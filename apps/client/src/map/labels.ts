/**
 * Canvas-texture text: shop signs (a flat board on a building) and floating
 * name labels (sprites that always face the camera).
 */
import * as THREE from 'three';
import { own } from './palette';

const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context unavailable');
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Mipmaps matter: signs are heavily minified at fitAll zoom and shimmer
  // badly without them. WebGL2 handles non-power-of-two mipmaps fine.
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * A shop sign: bold uppercase black text on a white board. Returns a mesh whose
 * width is `maxWidth` at most and whose height follows the text aspect ratio.
 * The board faces local +Z (the building's facing side).
 */
export function makeSign(text: string, maxWidth: number, height: number): THREE.Mesh {
  const label = text.toUpperCase();
  const px = 96;
  const pad = 26;
  const { ctx: pctx } = makeCanvas(8, 8);
  pctx.font = `700 ${px}px ${FONT}`;
  const textW = Math.max(1, pctx.measureText(label).width);

  const cw = Math.min(2048, Math.ceil(textW + pad * 2));
  const ch = Math.ceil(px * 1.5);
  const { canvas, ctx } = makeCanvas(cw, ch);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = '#2b2f36';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, cw - 8, ch - 8);
  ctx.fillStyle = '#16191d';
  ctx.font = `700 ${px}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cw / 2, ch / 2 + 2, cw - pad * 2);

  const aspect = cw / ch;
  let h = height;
  let w = h * aspect;
  if (w > maxWidth) {
    w = maxWidth;
    h = w / aspect;
  }
  const geom = new THREE.PlaneGeometry(w, h);
  const mat = own(
    new THREE.MeshBasicMaterial({ map: toTexture(canvas), toneMapped: false, side: THREE.FrontSide }),
  );
  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData.signSize = { w, h };
  return mesh;
}

/**
 * A floating name label. Sprites always face the camera; scale is in world
 * units, so `worldHeight` is the on-ground height of the label.
 */
export function makeLabel(text: string, worldHeight: number, opts?: { color?: string; bg?: string }): THREE.Sprite {
  const px = 64;
  const padX = 22;
  const padY = 12;
  const { ctx: pctx } = makeCanvas(8, 8);
  pctx.font = `600 ${px}px ${FONT}`;
  const textW = Math.max(1, pctx.measureText(text).width);

  const cw = Math.min(2048, Math.ceil(textW + padX * 2));
  const ch = Math.ceil(px + padY * 2);
  const { canvas, ctx } = makeCanvas(cw, ch);
  ctx.fillStyle = opts?.bg ?? 'rgba(255,255,255,0.88)';
  roundRect(ctx, 0, 0, cw, ch, ch * 0.32);
  ctx.fill();
  ctx.fillStyle = opts?.color ?? '#1f2328';
  ctx.font = `600 ${px}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cw / 2, ch / 2 + 1);

  const mat = own(
    new THREE.SpriteMaterial({
      map: toTexture(canvas),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(worldHeight * (cw / ch), worldHeight, 1);
  sprite.renderOrder = 20;
  return sprite;
}

/** A small round badge (used by the `dollar` prop). */
export function makeBadge(glyph: string, bg: string, fg: string): THREE.CanvasTexture {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = `700 ${Math.round(size * 0.68)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, size / 2, size / 2 + 3);
  return toTexture(canvas);
}
