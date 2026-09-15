# src/map — town renderer

`api.ts` is the contract; everything else here is implementation detail.

## Modules
- `TownScene.ts` — `createTownScene()`. Owns the renderer, the scene graph, input
  handling, the dirty-flag render loop, and all the contract methods.
- `camera.ts` — `IsoCamera`: orthographic camera at 35° elevation, azimuth in
  quarter turns with a 250 ms ease, `fit()` frames a bounds box by projecting its
  corners into camera space.
- `roads.ts` — per-edge flat ribbons (street 3 / highway 5 / path 1.6 units) plus
  a joint disc per node. Bus lines and highway centre lines are `LineSegments`
  with `LineDashedMaterial` (`computeLineDistances()` after every rebuild).
- `buildings.ts` — box + roof (flat cap / gable prism / 4-sided hip cone / none
  pad), door and sign on the facing side, one landmark prop.
- `decor.ts`, `figures.ts`, `labels.ts` (canvas textures), `palette.ts`
  (shared-material cache, `disposeSubtree`).
- `MapCanvas.tsx` — `<MapCanvas scene>` + `useTownScene()`. `index.ts` re-exports.
- `demo.tsx` — `MapDemo`, a self-contained exercise of every feature.

## Conventions worth knowing
- `zoom(f)` multiplies the **frustum size**, so `f > 1` zooms *out*. The demo's
  "zoom in" button passes `0.8`.
- Layer heights: decor areas 0.01–0.02, roads 0.04–0.07, bus dashes 0.12,
  highlight 0.15, route 0.2. Nothing else shares a plane, so no z-fighting.
- Picking raycasts `pickRoot`, a group of invisible cylinders (r 2.5) that is
  never added to the scene, so it costs nothing to draw and stays independent of
  the art. Ground coordinates come from a mathematical plane, not a mesh.
- Rendering is gated by a `dirty` flag plus "is anything animating"
  (rotation tween, figure easing, camera follow).
- `dispose()` leaves the object re-mountable — React StrictMode mounts, disposes
  and mounts again, and that has to work.

## Known limitations
- `setTown()` re-renders one canvas texture per sign (~35 for Riverton), which is
  the bulk of its cost — expect ~10–20 ms, not "a few". Use `moveNode()` for
  node drags in the editor; it only rebuilds the touched ribbons.
- Dashed lines are 1 px wide: `linewidth` is not supported by WebGL.
- No shadows, no anti-aliased line joins, no LOD. Labels simply hide above a
  frustum half-height of 70 units.
- Signs are single-sided, so they vanish when the camera rotates behind them.
- Never opened in a browser during implementation; API usage was checked against
  three r170 but the visual result is unverified.
