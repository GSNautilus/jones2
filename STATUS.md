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

Phase D — the river/highway map (DONE 2026-09-16):
Riverton rebuilt to the scheme in `docs/PLAN.md` §1: a meandering river on one diagonal, a
highway sweeping the other, crossing near an off-centre town centre, four wedges of buildings
round the crossing. `packages/town/test/scheme.test.ts` (written first, as the target) is green.

- **Canvas 1920×1152**, declared as `town.canvas` and read by every tool and test.
- **Water is authored like a street.** New `Town.water: WaterCourse[]` — a curve with a width.
  Four courses: the `river` (8 waypoints, width 48, top-left corner to bottom-right, ~100px off
  its chord), the `lake` in the south-east and two small pools. One rectangle `water` decor pond
  remains so that path keeps working. The rectangle-chain river is gone.
- **The highway is a barrier.** It shares no node with any street or path, so walkers can never
  step onto it. Streets that cross it get an `underpass` decor with a `dir` and NO junction —
  grade separation falls out of the streets-first generator. Four underpasses, two per half.
- **Three bridges**, found automatically where a walkable road runs through a water course:
  the town bridge on Bridge Street, a footbridge on the upper river to the bluff, and the lake
  lane over the lower river. The highway's own span over the river is a `viaduct` (a documented
  fifth decor kind) so the bridge count stays at three.
- **Generator split into modules** under `packages/town/tools/riverton/`: `spec.ts` (types and
  tuning constants), `curves.ts` (street resolution, masks, the per-street pixel bitmask),
  `water.ts` (course rasterising, water and road crossings), `plan.ts` (all the geometry as
  data). `tools/riverton.ts` is now just the assembly. A side street may declare its parent
  junction as a POINT, which is snapped to the nearest arc position, so the plan reads as
  coordinates rather than arc lengths.
- **Driveways are honest.** A driveway is clamped to 2–5 minutes (how far a sprite had to be
  pushed off the kerb is an art problem, not a travel cost), it may not cross water, another
  road or a building, and no later building may land under one. The four buildings on the
  centre crossroads use `nudge` to spread over its four corners.
- **Renderer** (`apps/client/src/map/`): new `water.ts` rasterises courses exactly like roads
  and traces the SHORELINE off the water mask the way kerbs come off the asphalt mask; new
  `crossings.ts` draws bridge/viaduct decks and underpass portals along `dir`; `PAINT_ORDER` now
  paints the highway LAST so it covers the street it passes over; `townBounds` includes the
  water and the authored canvas. 15 new tests in `apps/client/test/map/water.test.ts`.
- `packages/pixelart`: new `rent_office` building (brick municipal counter, barred windows,
  payment slot) and its recipe; `rent_office` added to the sim-location list in the tests.

**Tools (PowerShell, from the repo root):**
```powershell
npx tsx packages/town/tools/riverton.ts    # rebuild src/towns/riverton.json (source of truth)
npx tsx packages/town/tools/ladder.ts      # the pairwise hour table + any offenders
npx tsx packages/town/tools/overlaps.ts    # overlaps, wet buildings, unmarked crossings
npx tsx packages/town/tools/preview.ts     # art/sheets/riverton-graph.png (the graph sketch)
npx tsx apps/client/tools/town-png.ts      # art/sheets/riverton-client.png (the real renderer)
npx tsx apps/client/tools/town-png.ts 1 "1300,580,230,180" 3   # shrink, crop x,y,w,h, zoom
npm test
```

**Achieved hour ladder** (walking minutes; the bands are `<=60` = 1h, `61..120` = 2h, `121..180` = 3h):

| pair                | minutes  | hours |
|---------------------|---------:|------:|
| centre ↔ centre     | 10       | 1h    |
| centre ↔ uptown     | 41–59    | 1h    |
| centre ↔ campus     | 48–58    | 1h    |
| centre ↔ mill       | 96–109   | 2h    |
| centre ↔ strip      | 95–111   | 2h    |
| uptown ↔ uptown     | 17–28    | 1h    |
| campus ↔ campus     | 20       | 1h    |
| mill ↔ mill         | 23       | 1h    |
| strip ↔ strip       | 10–26    | 1h    |
| uptown ↔ campus     | 79–107   | 2h    |
| mill ↔ strip        | 71–100   | 2h    |
| mill ↔ uptown       | 127–158  | 3h    |
| mill ↔ campus       | 134–157  | 3h    |
| strip ↔ uptown      | 126–160  | 3h    |
| strip ↔ campus      | 133–159  | 3h    |

Street rate 9 px/min, path 7, highway 14 (`PER_MINUTE` in `tools/riverton/spec.ts`). The tight
edges are centre↔uptown at 59/60 and centre↔strip at 111/120; anything that lengthens Uptown
Road or Strip Road will break a band, so run `tools/ladder.ts` after every geometry change.

**Known weaknesses of the new map:**
- The margins above are thin at two boundaries (see previous paragraph). The ladder tool exists
  because hand-checking is hopeless.
- The four centre buildings sit up to ~200px from `j_center` on radial driveways; the square
  reads as a star of lanes rather than a tight market square.
- The west and south-west of the canvas are large stretches of trees and grass with one road
  through them. Correct for a poor half on the far side of a river, but it is a lot of green.
- The highway and the streets share an asphalt colour, so the highway reads as "a wide street"
  rather than as a different class of road until you notice the double centre line.
- Bridge decks are procedural bars, not art: a parapet line each side and a shadow. The
  `bridge` prop sprite in `packages/pixelart` is now unused by the town.
- 27 of the 28 buildings are drawn but only 13 are active in the classic ruleset; nothing on the
  map says which yet (the CLOSED treatment from the plan is still to do).

Known weaknesses (from the art agent's own critique): QT Clothing palm trees read as blobs; `fence_v` reads as a zigzag; the dress form in QT's window; cinema marquee second line cramped. Editor has no curve-point editing yet (edit `curve` arrays in JSON or the generator).

Suggested next: a human plays a full week in the client on the new map; editor curve handles; UI sprites adopted by the HUD skin (currently CSS fallbacks); the interiors (location screens with clerks) as the next art chunk.

## NEXT SESSION STARTS HERE — classic ruleset (see docs/PLAN.md)
All seven plan decisions are made (2026-09-16). First batch to propose to the user before launching:
- Classic content extraction from docs/original-rules.md → packages/sim/src/content/classic/ (Sonnet, ~150–250k)
- ~~Map retune: whole-hour travel, ~1920×1152, district ladder~~ DONE, see Phase D. Still to do: the CLOSED treatment for the 15 non-classic buildings.
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
