# src/map — 2D pixel-art town renderer

`api.ts` is the contract; everything else here is implementation detail.
No three.js: the camera is fixed top-down and `rotate()` is a no-op.

## Architecture
Three coordinate spaces: **town units** (the contract), **native px** (town ×
`PX_PER_UNIT`, what everything is drawn at), **screen px** (native × integer
zoom). `camera.ts` holds the pure conversions — `screenToTown`, `fitZoom`,
`stepZoom` — and is unit-tested.

Drawing is palette-indexed, never RGBA: a `Surface` (`surface.ts`) is a
`Uint8Array` of indices, identical in shape to a `Sprite`, so art-package
sprites blit straight in and nothing is ever anti-aliased.

- `ground.ts` — the **static layer**: one native surface with grass tiles,
  decor areas, roads, dithered shadows, scenery and buildings depth-sorted by
  anchor y. Rebuilt only on `setTown`/`moveNode`. Also emits the pick boxes.
- `roads.ts` — `sampleEdge` (Catmull-Rom through `edge.curve`, ~2px samples),
  `pointAlongEdge`/`poseAlongEdge` (by **arc length**, direction-aware), and the
  rasteriser: borders, fills, junction discs, dashed centre lines, bus overlay.
- `figures.ts` — pose → position/facing/walk frame, plus the 3x5 name plate.
- `TownScene.ts` — per frame: copy the visible window out of the static layer,
  add highlights, route, figures (buildings in front are re-blitted so they
  occlude), labels, editor handles; flatten to one `ImageData`; `drawImage` at
  integer zoom with `imageSmoothingEnabled = false`. Renders only when dirty or
  animating.

## Swapping in the real art — one file
`art.ts` is the only place that knows where sprites come from. Replace the body
of `getArt()` with the real `@jones2/pixelart` generators (the docblock has the
shape) and delete `art.placeholder.ts`. Sizes, anchors and footprints all come
off the `Sprite`; `RenderPalette` reads the art palette live and allocates its
own chrome colours from index 255 downwards, so indices never collide.
`pixelart.ts` mirrors the sprite types locally only so a work-in-progress art
package cannot fail the client typecheck — swap it for a re-export when it is
clean.

## Limitations
- `PX_PER_UNIT` is **3**, not 1: Riverton's coordinates predate the pixel-art
  scale (152×120 units, buildings 2–16 wide). Set it to 1 when the town JSON is
  re-authored with 64–96-unit buildings. It must stay an integer.
- Occlusion is per-sprite re-blit, not a true depth band; a figure exactly
  straddling two overlapping buildings can pop.
- Never opened in a browser. Verified by rendering the layers to PNG in Node.
