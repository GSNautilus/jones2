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
npx tsx packages/town/tools/classic.ts     # rebuild src/towns/classic.json (the original's ring)
npx tsx packages/town/tools/ladder.ts      # the pairwise hour table + any offenders
npx tsx packages/town/tools/overlaps.ts    # overlaps, wet buildings, unmarked crossings
npx tsx packages/town/tools/preview.ts     # art/sheets/riverton-graph.png (the graph sketch)
npx tsx apps/client/tools/town-png.ts      # art/sheets/riverton-client.png (the real renderer)
npx tsx apps/client/tools/town-png.ts 1 "1300,580,230,180" 3   # shrink, crop x,y,w,h, zoom
npm test
```

**Achieved hour ladder at the end of Phase D** (superseded by Phase E; walking minutes, bands `<=60` = 1h, `61..120` = 2h, `121..180` = 3h):

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

Phase E — final layout and the new buildings (DONE 2026-09-16):
The layout was revised after seeing Phase D rendered, and is now FINAL (DESIGN.md decision log,
docs/PLAN.md §1 "Where things live"):
- Employment Office and Monolith Burgers moved to the poor bank at the town bridge; the Research
  Lab (closed) closes the lane up from the mill road past the footbridge turn. The old star junction is a plain crossroads with the
  Rent Office south of the high street and the Clinic north of it; the centre plaza is gone.
- Everyone starts at the Bus Depot, now beside Low-Cost Housing. A second Bus Station (closed,
  depot art) stands between Hi-Tech U and Security Apartments; Riverside Park is just north of
  the apartments; the lake-lane house is the new `modern` house style (flat slate roof, glass
  band, garage wing).
- Closed placeholders with their own art: Theme Park (west end of the high street, the widest
  sprite in town), Corpo Ltd. (the tallest), Riverton Stadium, Government (two-storey civic hall
  on the open ground opposite the Rent Office), Research Lab. Honest Al's sign board now sizes to
  its text; the Bijou blade reads MOVIES. Pet Store (closed) added between Monolith and Honest
  Al's on the mill road. 35 sim locations. 34 sim locations now; every one has a
  node and a pixelart recipe (`MAX_SPAN` raised to 150, `MAX_HEIGHT` 110).
- Hour ladder is now a trip table, `packages/town/tools/ladder-table.ts`, shared by
  `test/scheme.test.ts` and `tools/ladder.ts`: Low-Cost is 1h from Factory/Employment/Monolith/
  Depot, 2h from the strip and Rent Office, 3h from the rich bank; Security Apartments is 1h from
  Hi-Tech U, 2h from the Rent Office, uptown and the jobs board, 3h from the poor side; the Depot
  is 2h from the jobs board once. Walking rate raised to 10.5 px/min on streets (8 on paths) to
  land it; the thinnest margins are Low-Cost→Employment (56 min) and mill→strip (63 min).
- Props are placed by their real sprite footprint against building boxes, so trees no longer
  stand in front of doors or over signs.
- Tests: pixelart 393, sim 15, town 44, client 140. Generator: no warnings; overlap checker clean.

Known weaknesses: the stadium crowd reads as
confetti at 1×; the satellite dish part is a white blob at 1×; the CLOSED sign/board treatment
on the sprites is still to do.

## Milestone 2c — classic ruleset (IN PROGRESS, started 2026-09-16)
Steps 1–3 of the plan's work breakdown are built (three agents, ~276k + 266k + 364k tokens), all verified by the parent session:

- **Classic content tables** — `packages/sim/src/content/classic/` (14 tables, exported as the `classic` namespace): time costs, 13 locations with clerk quotes, 39 jobs, 11 degrees, 19 items, 5 clothes, 9 foods + lottery, housing/rent rules, bank/loans/6 stocks, 65 happiness entries, goal formulas + dependability, 60 weekend texts + doctor/Willy data, 45 headlines. Every entry cites `docs/original-rules.md` lines; contradictions are resolved in comments (the more specific section wins). 41 tests in `test/classic-content.test.ts`.
- **Interface art** — `packages/pixelart/src/portraits/` (13 clerk portraits, 56×64, `PORTRAITS`), `src/ui/classic.ts` (`window_frame` 9-slice with `FRAME_INSETS` 12, `bubble` + `bubble_tail_l/r`, `title_plate`, `TOKENS` 1–4 at 14px, `sign_closed` 28×14). Sheets: `art/sheets/portraits.png`, `art/sheets/ui-classic.png` (a mock location window assembled from the slices). 76 new tests. Known: faces are flat (two skin tones per ramp); token numerals have no margin at 14px.
- **Classic ruleset** — `packages/sim/src/classic/` (context, actions, turnStart, week, economy, goals, state, effects, config, game), dispatched on `GameConfig.ruleset` (`'classic' | 'jones2'`, default jones2 so nothing existing changes). State hangs off `PlayerState.classic` / `GameState.classic`. 13 additive `Action` variants. 60h weeks in minutes (3600); travel charged as `routeHours × 60` while events keep route minutes for the replay; work 6h, apply/raise 4h, lesson 6h, relax 6h, loan 2h, broker 2h, newspaper 1h, everything else 0h. Start-of-week cards: weekend → lottery → starvation → stats → breakdown → spoilage → household → rent → loan → consumables → news; win check after, in `resolveWeek`, tie-break on goal excess then seat. No Wild Willy, no doctor (decision 6). Every number the wiki lacks is a marked GUESS in `classic/config.ts` (START_CASH 200, FIRED_HAPPINESS −5, boom/crash odds and deltas, stock volatility, DEFAULT_GOALS 50×4…). 38 tests in `test/classic.test.ts` + `classic-week.test.ts`.

- **Classic interface** — `apps/client/src/classic/` (pure modules: locations, menu, cards, tooltip, tokens, layout, screens, paint; React: `PixelPanel.tsx`, `ClassicScreen.tsx`), dispatched from `GameRoot` on `config.ruleset`; the Jones 2 screen is untouched. Board full-screen with numbered tokens (marker convention on `FigureStyle.label`, contract unchanged), hover tooltip "Bank · 2h" with the not-enough-time reason, pie clock (`pieFraction`/`pieSweep`/`previewWedge` in `clockMath.ts`), WEEK #N, cash readout, the framed centre window (title plate, clerk portrait, greeting bubble, priced menu from `availableActions`, DONE + verb buttons), start-of-week cards from `weekStart`, GOALS and STATISTICS screens, CLOSED boards on the 22 shut buildings, resolve → replay kept. 66 new tests (206 client). Screenshots: `art/sheets/ui-play.png`, `ui-window.png`, `ui-cards.png`, `ui-goals.png`, `ui-hover.png`, `ui-stats.png`, `ui-setup.png` (headless Edge via a cached playwright-core; not a dependency). Known: card dismissal and greeting rotation are per-session; bank amounts are all-in and stock buys one unit (the sim offers no quantities); the window is a fixed 380px native at ×2; no keyboard control; no player portraits yet.
- Wanted from the sim (additive, not done yet): `ActionOption.price?/payout?` so the client stops parsing labels; `ActionOption.kind?: 'verb' | 'item'` so the sim decides buttons vs rows.

- **After the first playthrough (2026-09-16):** travel doubled (walking rate halved in `spec.ts`; `ladder-table.ts` re-derived: Low-Cost→Employment 2h, cross-river 4–6h); the Employment Office groups jobs by workplace (`ActionOption.group`, `menu.ts` drill-in with BACK); Hi-Tech U lists only open courses and enrolled lessons (`ActionOption.hidden`); the clerk's bubble reports each action's outcome; tokens haloed, route outlined and marching, walks animated (`classic/walk.ts`); New game button; `/?new`; versioned saves.

- **Original sounds extracted (2026-09-16):** `tools/sci/` (new workspace `@jones2/sci`) reads the floppy release's SCI resource files (6-byte map entries, 8-byte headers, LZW1 method 2), parses the SCI1 sound resources (per-device tracks, 60 Hz deltas) and writes the MT-32 arrangement as standard MIDI (`assets/sierra/source/midi/`, 34 files + manifest), then renders them with spessasynth_core and the MuseScore General soundfont (git-ignored) to `assets/sierra/source/ogg/` (8.7 MB) via ffmpeg, with an audition page `assets/sierra/source/index.html` for naming them into `assets/sierra/source/names.json`. 8 tests (the two against the real game files skip when F: is absent). See `tools/sci/README.md`. Not wired into the client yet.

- **Audio in the client (2026-09-16):** `apps/client/src/audio/` — `map.ts` turns `assets/sierra/audio/names.json` (the audition-page names) into a sound map by keyword (music/theme → rotation; cash, hired, refused, buy, study, graduate, travel, door, weekend, card, end week, win, click) with an `overrides` block; `events.ts` maps player-log events to moments; `player.ts` plays SFX and rotates the music with 2 s fades and a 5 s rest, never repeating a piece back to back, with mute/volume in localStorage. `ClassicScreen` starts the music on mount, plays a sound for every new log entry, at walk start, on window open and per card; SOUND ON/OFF button above the cash readout. The OGGs are served from `assets/sierra/audio/ogg/` (copied from `assets/sierra/source/ogg/`). `names.json` now carries the 27 names from the audition (rotation = 9 random pieces; theme 6 at game start; start-of-turn 9 at the first card; cash register 23 for work, purchases and payments; hired 45; refused/can't 44; time's up 29 on End week; rent due 27; forgot to eat 20; new clothes 28; economy 32/34 from the news card; university 41 on entering Hi-Tech U; graduation 42; new-game screen 10; robbed 8, sick 21 and shady 100 reserved). Stingers (theme, start of turn, university, graduation, new game) pause the rotation and it resumes after the rest. 15 tests.

- **CD edition (2026-09-17):** `Jones3x/CD` (git-ignored copy of the 1992 CD-ROM release). Its 533 spoken lines (34 min, raw 8-bit PCM at 11025 Hz) are extracted by `tools/sci/src/voices.ts` to `assets/sierra/source/voice/ogg/` (11 MB). Its `NNNN.snd` files carry General MIDI tracks, now layered over the floppy set in `assets/sierra/source/midi` and re-rendered (sound 100 stays MT-32).

- **Voices labelled and wired (2026-09-18):** the audio map's offsets are 28-bit (the first extraction read 24 and sliced lines 516+ from the wrong place; fixed, 195 lines re-extracted). All 533 lines transcribed with faster-whisper on the GPU, matched to the wiki quotes and the CD text resources and settled by run position (`tools/sci/voices/`, data and `labels.html` in `assets/sierra/source/voice/`), result in `assets/sierra/audio/voices.json`: every location's greetings in wiki order, every wiki quote group, the CD-only responses (got the job, no openings + reasons, raise, not enough cash, no time, pawn/bank/university answers, per-workplace fired/not-dressed/garnished), the 60 weekend texts and 63 headlines. `docs/VOICES.md` has the numbering table and the seven lines whose recording differs from the on-screen text. Client: `audio.speak()` (one voice at a time, music ducked to 5 %, stingers included, stingers wait, `voice` volume; the Hi-Tech U music fades out in 0.6 s when its window closes), the clerk speaks the greeting on window open, the answer to every logged outcome and refusal while the window is open, and reads the weekend and news cards. 8 new tests + a `voices.json` invariants test (252 client tests). Not yet: a human ear check (`labels.html`), lip sync.

- **Classic chrome and the recap (2026-09-18):** bottom right is now a big cash readout with END TURN under it (the SOUND ON toggle and the play/replay/editor/map links are gone from play mode; the other modes still answer to their URLs). Bottom left: GOALS, STATISTICS, OPTIONS. OPTIONS (`src/classic/OptionsPanel.tsx`, a DOM window) has a Music slider and a Sound slider (effects and voices together), a MUTE for each (`AudioSettings.musicMuted` / `soundMuted`; a stinger counts as music), and NEW GAME. Week end: "Resolve and watch the recap" or "Skip the recap"; the ABANDON GAME button is gone. The recap keeps the numbered tokens (each on its own seat beside the door, so players never overlap), draws what each player is doing as a caption bubble over their name plate (`FigureStyle.caption`; `wrapCaption` and `placeCaption` in `src/map/figures.ts`, bubbles stack upward when two players at one door would cover each other, and draw at every zoom: zoomed out, where the name plates hide, the text is doubled via `textScaled`), and frames the town one zoom step in so the plates are legible. Only the active player's token is big and bobbing (`FigureStyle.emphasis`); seats are 20 px apart so plain tokens clear each other. **Travel charges twice the hour ladder** (since the two-maps work, `travelHourMultiplier: 2` on the Riverton town JSON, read by `classic.travelHours`); the replay and the walk animation keep the route's real minutes, so the walk is the same speed as before. 14 new tests (269 client, 94 sim). Screenshot-verified in headless Edge over the CDP (a scratch driver, not in the repo).

- **Audio latency (2026-09-18):** an old saved master mute (the removed SOUND OFF toggle) is migrated into the two channel mutes on load, so OPTIONS can undo it (`migrateSettings`). Effects are preloaded into memory as object URLs once the map is known (`audio.preload()`, 12 files; music and the 533 voice lines still stream), so a WORK or purchase no longer waits on a round trip (~200 ms on the dev server). A one-second silent WAV (`SILENCE_URI`, generated in code) loops from `start()` to `stop()` so the output device never idles between sounds; idle wake-up on HDMI/Bluetooth/USB outputs is the usual cause of a 1–2 s late or clipped first effect. 273 client tests.

- **Two maps (2026-09-18):** the setup screen has a **Map** select, Classic or Jones 2, defaulting to the ruleset's map until picked. `townId: 'classic'` is the original board as a ring: `packages/town/tools/classic.ts` (source of truth) writes `src/towns/classic.json` — the 13 buildings clockwise from the top-left as the original screen (Security Apts, Rent Office, Low-Cost, Pawn, Z-Mart, Monolith, QT, Socket City, Hi-Tech U, Employment, Factory, Bank, Black's), canvas 640×400 (the original at 2×), a paved band with a path on it for the walkway, a few trees, nothing closed. Every node is ON the walkway and the sprite hangs off it via the new `TownNode.spriteOffset` (renderer: placements, pick boxes and bounds honour it; the node is where tokens stand). A lap is 600 minutes (the fan wiki's "about 10 Hours"), so a hop to the neighbour is 1h, the clock gap 2h, the far side 5h. Players start at Low-Cost Housing (their apartment). The travel doubling moved from a sim constant to `Town.travelHourMultiplier` (Riverton 2, classic 1; `classic.travelHours(minutes, multiplier)`), and `@jones2/town` exports `TOWNS` by id, which the sim's `getGraph` and the client's `GameRoot` (which now loads the game's town into the scene) use. Tools take a town id: `tools/preview.ts classic`, `tools/overlaps.ts classic`, `apps/client/tools/town-png.ts 1 "" 2 classic`; the balance runner takes `--town`. 12 new town tests, 3 sim, 6 client (sim 97, town 56, client 280). The wiki's "entering any Location advances the clock by 2 Hours" is deliberately not charged (decided 2026-09-22). The camera now centres a town smaller than the screen instead of pinning it top-left (`clampOrigin`). Verified in headless Edge over the CDP (a scratch driver, not in the repo): week 1 on the ring, DONE on the weekend card, click the Bank, Ann walks the short way round (3h charged), the Bank window opens over the loop. Screenshots: `art/sheets/ui-classic-map.png`, `ui-classic-map-window.png`, `classic-client.png`, `classic-graph.png`. Polish wanted: the destination halos on the walkway are as wide as the buildings and run into each other along the top row.

- **Map life, exits, corner chrome and the week log (2026-09-18):**
  - **Roads leave through the edge of Riverton.** `EXITS` in `packages/town/tools/riverton.ts`: seven street ends (both highway ends, main street east, uptown road north, campus road east, mill road west, works road south) get a straight stub on the same street id to an `exit_*` junction 80 px past the canvas, so the renderer draws one stroke that the map edge cuts off. The renderer's layer is now exactly the authored canvas plus its margin (`townBounds`), so content past the edge never grows the map. Tests skip `exit_` nodes in the inside-the-canvas checks and assert the seven exits.
  - **Ambient life.** `packages/pixelart/src/props/vehicles.ts`: a true top-down car rasterised at any heading (`carTopDown`, 16 headings × 6 colours cached by the art adapter's `vehicle()`), and `SKY` sprites (two bird frames, the plane both ways, the helicopter with a two-frame rotor both ways; `sky()`). `apps/client/src/map/ambient.ts` is the pure simulation: cars on street and highway chains (never driveways, paths, bus lines, so the classic ring stays a walkway), one per ~320/230 units, keeping to the right, turning back at dead ends (off the map for the exit stubs); one or two flocks of 3–6 birds crossing and resting; a plane every 40–90 s straight across with a ground shadow; a helicopter every 60–120 s through the middle. Seeded from the town id, ticked in real seconds by `TownScene`'s loop, which redraws at ~30 fps when only ambient life moves and every frame during a walk; cars go under buildings in the occlusion pass, the sky over everything. Off in the editor and when the OS asks for reduced motion; OPTIONS has a "Traffic and birds" switch (localStorage `jones2-ambient`); `TownScene.setAmbient`.
  - **Camera:** a map smaller than the screen (Riverton at zoom 1 on a 4K display, the ring at zoom 2) can now be dragged anywhere fully inside the screen instead of being pinned (`clampOrigin`); `fitAll` centres it.
  - **Week Resolved** (and the game-over window) lists what each player did, one column per player, each action with the hour it started at and its deltas (`PlayerLogs` in `ResolveScreen.tsx`, from the report's per-player logs); the town notes follow only when there are any.
  - **Pixel chrome:** the bottom-left GOALS / STATISTICS / OPTIONS bar and the bottom-right cash readout with END TURN are painted pixel art (`src/classic/chrome.ts` layout + paint, `PixelChrome.tsx` canvas with hover/pressed states and `data-buttons` for the screenshot harness): the window frame nine-slice, a dark readout with the cash doubled in green and the hours line (clock hover) under it, the catalogue's gold buttons.
  - Tests: pixelart 484 (+5), client 294 (+12: ambient, chrome, camera), town 57. Screenshots: `art/sheets/ui-classic-chrome.png`, `riverton-traffic.png`, `ui-week-resolved.png`. Verified in headless Edge: chrome and hover, cars and a flock moving between two shots on Riverton, a played week ending in the log.

**Classic balance, first look** (30 games × 60 weeks; run it directly, npm swallows the flags):
```powershell
npx tsx apps/balance/src/run.ts --ruleset classic --games 30 --weeks 60 --town riverton
```
(`--town` defaults to `classic` for the classic ruleset since 2026-09-18; on the ring, 6 games × 40 weeks: student wins 4/6 by week ~27.) On Riverton the student strategy wins 30/30 by week ~22 (career wk 8, education wk 12, happiness wk 16, money wk 23); the grinder gets money by wk 17 but never happiness or education; the shopper gets happiness by wk 10 and nothing else. Two things to act on before a human playthrough: **degrees are dominant** (10 lessons × 6h = one degree per week of study, +9 education and +5 dependability cap) and **clothes can softlock** a broke player whose uniform expires ($73 casual, 6 weeks). Neither is a map problem.

## NEXT SESSION STARTS HERE
Everything through Milestone 2c is committed (latest: 777736f, 2026-09-19). The classic ruleset
plays on both maps and a human has played it through; the voice lines are checked by ear.
Decided 2026-09-22: no 2-hour entry charge; balance (degrees, clothes softlock, food prices) is
parked as good enough for now. Remaining, in order:
1. **Jones 2 expansion buildings:** the roadmap for turning Riverton's closed buildings into
   the Jones 2 game. Under discussion (see DESIGN.md decision log).
2. Additive sim tweaks the client wants: price/payout and kind on `ActionOption`, amounts for
   bank and stock actions, player portraits at setup.
3. Polish: the classic ring's destination halos are too wide and run together on the top row.

## Milestone 3 — server + async multiplayer (IN PROGRESS)
Plan (DESIGN decision log 2026-09-22), in order:
1. DONE 2026-09-22. `apps/client/src/audio/assets.ts`: `AssetLoader` over an `AssetSource` (`localSource` fetch beside the page, `supabaseSource` download from the private `sierra` bucket via a minimal client interface, no supabase-js dependency yet). Local mode streams paths exactly as before; bucket mode downloads whole files to object URLs and keeps them in the Cache API (`jones2-sierra-v1`; bump to force refetch). The player takes the loader as a third constructor argument or via `useAssets()`; every play goes through it, with turn counters so a line or piece that finishes downloading after being cut stays silent, and the music ducks from the moment a line is asked for. `prefetch()` pulls music, stingers and labelled lines in the background (bucket mode only); `prefetchPlace(loc)` pulls one clerk's lines on entry. Wired in ClassicScreen. Not yet switched on anywhere: that happens when a seat signs in (steps 3 and 5). 21 new tests (`assets.test.ts`, `player-assets.test.ts`); old player tests unchanged.
2. DONE 2026-09-22. Everything from the original game now lives in gitignored `assets/sierra/`: `audio/` (what the client plays and the bucket will hold), `source/` (extractor outputs and labels), `reference/` (screenshots), `cd/` (the CD-ROM zip, which had been committed at the root). That folder is its own local git repo with no remote; keep it that way unless the remote is private. History rewritten with git filter-repo so no commit ever held those files; `.git` went from 75 MB to under 5 MB. The Vite dev server serves `assets/sierra/audio` at `/audio/`; builds contain no audio. Tests that read the real label files skip without the folder. The pre-rewrite backup still contains all of it and must never be uploaded: `C:\Users\Nautilus\Projects\Jones2-backup-before-asset-removal-2026-09-22.bundle`.
3. Supabase project: migrations (games, seats, week snapshots, event logs, RLS), private `sierra` bucket + policy, upload script.
4. Edge Function: submit log → validate by replay → store → last log runs `resolveWeek`.
5. Seat-token invites over anonymous sign-in; GitHub Actions deploy to Pages; keep-alive ping against free-tier pausing.
## Milestone 4 — art pass (NOT STARTED)
## Milestone 5 — sound + polish (NOT STARTED)

## Known gaps / TODO
- Economy-linked investment (DESIGN 6.8) not implemented; bank has savings + loan only.
- Storefront shares (DESIGN 6.9, maybe) not implemented.
- Achievement rewards are placeholders (cash instead of in-kind for most).
- Contested-job ranking uses degree count + track experience; refine once tracks are tuned.
- Sim performance: `applyAction` deep-clones only the acting player; `resolveWeek` clones everything except history. Fine for now.
