# src/map — 2D pixel-art town renderer

`api.ts` is the contract; everything else here is implementation detail.
No three.js: the camera is fixed top-down and `rotate()` is a no-op.

## Architecture
Three coordinate spaces: **town units** (the contract), **native px** (town ×
`PX_PER_UNIT`, what everything is drawn at), **screen px** (native × integer
zoom). `camera.ts` holds the pure conversions — `screenToTown`, `fitZoom`,
`stepZoom` — and is unit-tested. Zoom levels are `[1, 2, 3, 4]`; at level 1 a
big town fits whole and text overlays (`LABEL_MIN_ZOOM`) are not drawn.

Drawing is palette-indexed, never RGBA: a `Surface` (`surface.ts`) is a
`Uint8Array` of indices, identical in shape to a `Sprite`, so art-package
sprites blit straight in and nothing is ever anti-aliased.

- `ground.ts` — the **static layer**: one native surface with grass tiles,
  decor areas, roads, dithered shadows, scenery and buildings depth-sorted by
  anchor y. Rebuilt only on `setTown`/`moveNode`. Also emits the pick boxes.
- `streets.ts` — road GEOMETRY. Edges sharing `edge.street` are one road, so
  this file chains them; see below. Pure, in town units, unit-tested.
- `roads.ts` — the road RASTERISER, plus `poseAlongEdge`/`pointAlongEdge`
  (by arc length, direction-aware, sampled off the chain) and `edgePolyline`
  (so the route overlay sits exactly on the drawn road).
- `figures.ts` — pose → position/facing/walk frame, plus the 3x5 name plate.
  Also the **MARKERS** convention: a figure whose `FigureStyle.label` starts
  `#N ` is drawn as player N's numbered token and one labelled `@closed` as the
  CLOSED board, so the classic screen can put tokens and shut-shop signs on the
  map without widening `api.ts`. Markers are overlays: they are drawn after the
  occlusion pass and are never hidden by a building.
- `TownScene.ts` — per frame: copy the visible window out of the static layer,
  add highlights, route, figures (buildings in front are re-blitted so they
  occlude), labels, editor handles; flatten to one `ImageData`; `drawImage` at
  integer zoom with `imageSmoothingEnabled = false`. Renders only when dirty or
  animating.

## Streets are chains, not edges
`buildStreetChains(town)` groups edges by `street` id **and kind**, orders each
group into maximal simple paths (a branching street splits rather than being
guessed at), and samples ONE centripetal Catmull-Rom through node, curve
points, node, … at ~2 native px. Arc length is continuous across the whole
chain, which is the point: dashes never restart at an interior junction, and a
figure walking edge-by-edge follows one smooth line. Chains are cached per
`Town` object in a `WeakMap`, so they are built once per static-layer rebuild.

Centripetal (not uniform) Catmull-Rom because a chain's control points are very
unevenly spaced — uniform overshoots and loops there.

## How a junction is drawn
`drawRoads` runs five passes over ALL chains, never per edge:

1. **asphalt** — disc stamps along each chain, widest kind first, into the
   surface *and* into a parallel kind mask.
2. **junction aprons** — a node is a junction when three or more road arms meet
   there, or two arms from different chains do; a node in the middle of one
   chain is not. Each gets a disc of the widest incident half width (flush, so a
   T-junction gets no bump on the through road) plus a **kerb-return fillet** in
   every angular gap between 50° and 155°: the circle of radius ≈ half the
   narrower road, tangent to both kerb lines, with the curvilinear triangle
   between the corner, the two tangent points and the arc filled as asphalt.
   That is what turns the square notch two crossing strips leave into a rounded
   corner. Gaps near 180° get nothing, so a road running through stays straight.
3. **kerbs** — the 1px **outline of the asphalt mask** (lighter for roads, a
   darker sand for paths), not two offset strokes. A kerb can therefore only
   exist where asphalt meets not-asphalt, which makes it structurally impossible
   for a kerb to run across a junction, and it wraps the fillets for free.
4. **centre dashes** — 6 on / 4 off along chain arc length (highways get two
   lines, paths none), suppressed inside ±(apron + 4px) of every junction.
5. **bus overlay** — `busline` chains are drawn as a 1px light-blue dotted line
   offset 4px to one consistent side of the road, never on the centreline, plus
   a hand-drawn 6×10 pole-and-sign marker at every bus node that is a place or a
   junction. Visible in play as well as in `editable` mode.

`tools/roads-png.ts` renders a synthetic town (chained main street, two
T-junctions, a crossroads, a highway, a footpath, a bus line) to
`art/sheets/roads-test.png` with no DOM. `test/map/roadraster.test.ts` asserts
the same render's properties, so a regression fails the suite rather than only
looking wrong.

## Swapping in the real art — one file
`art.ts` is the only place that knows where sprites come from. Sizes, anchors
and footprints all come off the `Sprite`; `RenderPalette` reads the art palette
live and allocates its own chrome colours from index 255 downwards, so indices
never collide. `pixelart.ts` mirrors the sprite types locally only so a
work-in-progress art package cannot fail the client typecheck — swap it for a
re-export when it is clean.

## Limitations
- Occlusion is per-sprite re-blit, not a true depth band; a figure exactly
  straddling two overlapping buildings can pop.
- A town with no `street` ids still renders, but every edge is its own chain, so
  every shared node counts as a junction and the dashes break there. Author
  `street` ids for roads that should read as one.
- Never opened in a browser. Verified by rendering the layers to PNG in Node.
