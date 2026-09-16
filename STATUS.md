# Status

## Milestone 1 — sim core (DONE 2026-09-14)
Deterministic game core, first content tables, headless balance runner, ugly hot-seat debug client.

- [x] Repo scaffold (npm workspaces, TypeScript, vitest)
- [x] `packages/town`: schema, Riverton town JSON (35 nodes, 66 edges, streets/paths/highway/bus lines), Dijkstra travel per transport mode
- [x] `packages/sim`: state/action/event types (`src/types.ts` is the contract)
- [x] `packages/sim`: content tables — 27 locations, 26 jobs across 5 tracks, 9 degrees, 10 items, 5 foods + groceries, 6 activities, 6 housing options, 4 news sources, 12 achievements, 8 economy event templates
- [x] `packages/sim`: `applyAction` for all 22 action types, with `availableActions` giving enabled/disabled + reason for the UI
- [x] `packages/sim`: `resolveWeek` in the DESIGN.md 6.13 order (jobs → property → achievements → upkeep → economy → forecasts → winner)
- [x] `packages/sim`: 15 unit tests, all passing (`npx vitest run --root packages/sim`)
- [x] `apps/balance`: 4 scripted strategies, N-game runner (`npm run balance -- --games 30 --weeks 80`), ~0.3–0.9s per game
- [x] `apps/debug-client`: React hot-seat client, builds clean (`npm run debug` then open http://localhost:5173)

### How to run (PowerShell)
```powershell
npm install
npm test
npm run debug          # hot-seat debug client
npm run balance -- --games 30 --weeks 80
```

### First balance observations (not yet tuned)
- Health drain is harsh: any strategy that eats only burgers and never exercises hits 0 health within ~20 weeks. Fast food or weekly drift probably needs softening, or missed-meal/burger penalties need rebalancing.
- Money is the easy goal: strategies that study reach $10k by ~week 15 and $50–80k by week 80. Education (20 credits) is the long pole. Consider raising the default money target or lowering wages at rungs 3–4.
- Study-heavy strategies reach career 100 and happiness ~96 comfortably; happiness may be too easy once you have a home and a couple of items.
- Random play goes deep into debt via auto-loan for rent; that is the intended slow failure mode.

## Milestone 2 — town renderer + editor (DONE 2026-09-14)
three.js isometric map from the town JSON, movement/replay from event logs, in-browser editor, hot-seat harness in the real client.

- [x] `packages/town`: `BuildingRecipe` + `Decor` in the schema; all 27 Riverton locations have recipes; coordinates scaled ×2 so buildings don't overlap
- [x] `apps/client` scaffold (Vite, React, three@0.170); contracts in `src/map/api.ts` and `src/replay/types.ts`
- [x] `src/map/` renderer: procedural buildings/roofs/signs/props, roads by kind, decor, figures, ortho iso camera (rotate/zoom/pan/follow/fit), picking, editor node-drag
- [x] `src/replay/` timeline (binary-searched intervals) + ReplayView controls (play/pause/speed/scrub/markers/follow); 9 tests
- [x] `src/editor/` EditorPanel: select/move/add nodes, edges, decor, recipe inspector, validation, undo/redo, export/import; 14 tests
- [x] `src/game/` hot-seat harness: setup, stats, actions, map-click travel with route preview, resolve → replay → report
- [x] `App.tsx` integration: `/` play, `/?replay` demo replay, `/?editor`, `/?map` renderer demo
- [x] typecheck + 43 tests + vite build green; all four modes screenshot-verified in headless Edge

### How to run (PowerShell)
```powershell
npm run dev -w @jones2/client
```
Then open http://localhost:5174 (play), /?replay, /?editor, /?map.

### Known limitations after M2
- Verified by screenshot only; nobody has clicked through a full week in the 3D client yet. Map-click travel, hover route preview, and the resolve→replay flow need a human pass.
- Location name labels hide at the fit-all zoom level (renderer threshold); zoom in to see them. Signs are single-sided.
- Editor uses window.prompt/alert for a couple of inputs; edges are selectable only through a node's edge list.
- Screenshot harness lives outside the repo (scratchpad `shoot.cjs` using playwright-core + the installed Edge via `channel: 'msedge'`); worth turning into a project skill.
- Bundle is one ~600 kB chunk (three.js); code-split later.

## Milestone 2b — pixel art direction (IN PROGRESS, started 2026-09-14)
Direction change after reviewing the original: 2D pixel art generated as code replaces three.js. Fixed top-down camera, integer zoom, curvy roads rasterised from edge control points.

Phase A (DONE): `packages/pixelart` (DSL, 54-colour palette, 5×7 font, parts, 6 hero buildings, tiles, nature, walk cycles; 96 tests; `npm run sheet -w @jones2/pixelart` writes `art/sheets/`), and the 2D renderer in `apps/client/src/map` behind the unchanged contract (42 tests). Real art wired via `src/map/art.ts`; unknown locations fall back to a signed house.

Phase B (DONE 2026-09-14):
- All 27 locations have distinct buildings (`LOCATION_RECIPES`), plus `PROPS` (lamps, benches, cars, bus, fences, dock, bridge…) and `UI` sprites (9-slice panel/buttons, 96px clock face + hands, 12 icons). 326 pixelart tests.
- Riverton re-authored at 1 unit = 1 px on a 768×448 canvas by `packages/town/tools/riverton.ts` (source of truth; JSON is output): 27 locations, 13 junctions, 63 curved edges, 146 decor. `tools/overlaps.ts` checks real sprite boxes vs buildings/roads/canvas and reports clean. `tools/preview.ts` renders `art/sheets/riverton-graph.png`.
- Clock HUD (`apps/client/src/hud/`): pixel analog clock with draining week ring, DAY/TIME/WEEK plates, LED hours-left, hover-preview arcs from action buttons and map hover; full-screen map with overlay panels (status strip, location panel, week log, map controls). 17 clock-math tests.
- Renderer adapter uses `LOCATION_RECIPES` and `PROPS`; `PX_PER_UNIT = 1`.
- Screenshot-verified in headless Edge: map and play modes.

Phase C — roads and distances (DONE 2026-09-14):
- Renderer: streets are chained by `edge.street` into one continuous stroke (continuous dashes through mid-street nodes); kerbs are the outline of the asphalt mask so they cannot cross junctions; junction aprons with kerb-return fillets; dashes stop short of junctions; highway double line; bus routes as a 1px blue dotted line at the kerb with stop markers; zoom level 1 added for overview. `apps/client/tools/roads-png.ts` renders `art/sheets/roads-test.png`. 125 client tests.
- Town: streets-first generator on 1280×768 — 13 named streets + 4 bus lines, side streets meet parents at ≥70°, buildings placed along streets with doors to the road using real sprite boxes; 93 nodes, 133 edges, 246 decor; per-pixel minute rate halved so hop times stay as before (downtown median 9 min; depot→lookout 147 min walking). Note: cross-town totals to some places dropped because arterials replaced building-to-building chains (e.g. zmart 183→88 min); tune the street rates in `tools/riverton.ts` if the game needs longer trips.
- Overlap checker also flags near-crossings and missing street ids; reports clean.

Known weaknesses (from the art agent's own critique): QT Clothing palm trees read as blobs; `fence_v` reads as a zigzag; the dress form in QT's window; cinema marquee second line cramped. Water is rectangles (no shoreline tiles yet). Editor has no curve-point editing yet (edit `curve` arrays in JSON or the generator).

Suggested next: a human plays a full week in the client; shoreline/rounded water; editor curve handles; UI sprites adopted by the HUD skin (currently CSS fallbacks); the interiors (location screens with clerks) as the next art chunk.

## NEXT SESSION STARTS HERE — classic ruleset (see docs/PLAN.md)
All seven plan decisions are made (2026-09-16). First batch to propose to the user before launching:
- Classic content extraction from docs/original-rules.md → packages/sim/src/content/classic/ (Sonnet, ~150–250k)
- Map retune: whole-hour travel, 13 active + 14 CLOSED placeholder buildings, ~1920×1152, district ladder (Opus, ~300–450k)
- Clerk portraits (13) + window frame/bubble/player tokens in packages/pixelart (Opus, ~250–400k)
Then: classic ruleset in the sim (Opus), interface rebuild around the centre window + pie clock + hover tooltips (Opus).

## Milestone 3 — server + async multiplayer (NOT STARTED)
## Milestone 4 — art pass (NOT STARTED)
## Milestone 5 — sound + polish (NOT STARTED)

## Known gaps / TODO
- Economy-linked investment (DESIGN 6.8) not implemented; bank has savings + loan only.
- Storefront shares (DESIGN 6.9, maybe) not implemented.
- Achievement rewards are placeholders (cash instead of in-kind for most).
- Contested-job ranking uses degree count + track experience; refine once tracks are tuned.
- Sim performance: `applyAction` deep-clones only the acting player; `resolveWeek` clones everything except history. Fine for now.
