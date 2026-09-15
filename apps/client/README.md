# @jones2/client

The real client: three.js town map plus React UI. Milestone 2 scope is the
map, the week replay, and the town editor. Game screens come later.

## Layout and ownership
- `src/map/` — three.js renderer. Public surface is `api.ts` (CONTRACT). Implementation in `TownScene.ts` (+ helpers). Nothing outside this folder imports three.js.
- `src/replay/` — timeline built from sim event logs (`types.ts` is the CONTRACT, `timeline.ts` implements `buildTimeline`) and the React replay controls/view.
- `src/editor/` — in-browser town editor React panel. Edits a `Town` object, calls `scene.setTown()` / `scene.moveNode()`, exports JSON.
- `src/game/` — hot-seat harness (port of `apps/debug-client`) that drives the sim and uses the map for travel.
- `src/App.tsx` — mode switch: play / replay / editor.

## Conventions
- Town units: `x` east, `y` south, roughly metres. World: X = x, Z = y, Y up.
- Buildings come from `node.building` (a `BuildingRecipe`). Junctions have none.
- Roads are edges; kind `busline` is drawn as a dashed overlay, `highway` wider and darker, `path` narrow and tan.
- Fixed palette: flat shading, no textures. Keep materials few and shared.
- Do not edit `package.json`; dependencies are already installed (`three`, `react`).
- Typecheck: `npx tsc --noEmit -p apps/client`. Tests: `npx vitest run --root apps/client`.

## Run
```powershell
npm run dev -w @jones2/client
```
Open http://localhost:5174. `?editor` opens the editor, `?replay` a demo replay.
