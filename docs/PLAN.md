# Plan: Classic Jones on the new map

Working plan for the next stretch of work. Discussed 2026-09-16; status tags as in DESIGN.md
(**DECIDED** / **DISCUSSING** / **DEFERRED**). Reference material: `docs/original-rules.md`
(49 pages from the fan wiki, extracted verbatim) and `art/reference/original/*.png`.

Direction in one sentence: **reproduce the original's gameplay and interface faithfully on the
new pixel-art town, then grow from there.** Everything added in DESIGN.md §6 that the original
did not have is parked behind a ruleset flag, not deleted.

---

## 0. What the original actually is (from `original-rules.md`)

The facts the plan is built on. Numbers are the wiki's.

- **Turn = 60 Hours.** Every action costs whole hours: Work 6h (pays 8× wage), Apply/Raise 4h,
  Relax 6h, a University lesson 6h, Loan application 2h, Stocks 2h, Newspaper 1h. Ordinary
  purchases cost 0h (corrected 2026-09-16 from the per-location sections; the extracted table is
  `packages/sim/src/content/classic/time.ts`). Moving around the board costs hours by distance.
  Turn ends at 0h.
- **Turn start sequence:** Weekend event (random text, costs $5–$100) → Starvation check
  (no food last turn: −20h, −2 Happiness, 25% Doctor) → Relaxation/Doctor check → Wild Willy
  apartment robbery (Low-Cost only, chance 1/(Relaxation+1)) → appliance breakdowns → food
  spoilage → Rent notice (week 4, 8, 12, …) → consumables tick down → win check.
- **Four goals, each 10–100:** Wealth = liquid assets/100 (cash + bank + stocks; items don't count);
  Happiness = the stat; Education = 1 + 9×degrees (11 degrees, 10 lessons each);
  Career = 1.25 × Dependability (only while employed).
- **Dependability** (hidden in the original): starts 20, −3 every week, +1 per work session,
  capped at 20 + job's required dependability + 5×degrees. Drop 5 below your job's requirement
  and you're fired when you try to work. Raises need required + 5×raises-so-far.
- **Jobs:** ~40 jobs across Z-Mart, Monolith, QT, Socket City, Hi-Tech U, Factory, Bank,
  Black's Market, Rent Office. Each has Experience, Dependability, Degree and Uniform
  (casual/dress/business) requirements. Applications can randomly fail ("No openings").
  Wages fluctuate with the economy; raises at the Employment Office.
- **Degrees (11):** Junior College and Trade School are the starters; the wiki's degree table
  (extracted to `content/classic/degrees.ts`) gives the exact prerequisites, e.g. Business Admin
  needs Junior College. Then Graduate School, Engineering → Post-Doctoral → Research → Publishing.
- **Money:** Bank (deposit/withdraw), Loans (monthly payments, default penalties), Stocks via the
  Broker (booms/crashes), Pawn Shop (sell items at a loss, −1 Happiness), Lottery (tickets at
  Black's Market).
- **Living:** Rent monthly at the Rent Office ($325 Low-Cost, $475 Security, ×economy);
  extensions with falling approval odds; rent debt garnishes wages. Clothes are consumables
  (casual/dress/business, weeks remaining). Food: Fast Food at Monolith (eat this turn) or
  Fresh Food from Black's Market (weeks of food; needs a Refrigerator or it spoils).
  Relax at home (+3 Relaxation, +2 Happiness once per turn).
- **Happiness:** an explicit table of +/− events (buying appliances, tickets, getting a job,
  degrees, loans; robbed, fired, refused, pawned…). See "Happiness Goal" in the reference.
- **Economy:** newspaper headlines; booms and crashes move prices, wages and rents; crashes can
  cost jobs or wages.
- **Locations (13):** Employment Office, Monolith Burgers, Z-Mart, QT Clothing, Socket City,
  Black's Market, Hi-Tech U, Bank, Factory, Pawn Shop, Rent Office, Low-Cost Housing,
  Security Apartments. (The Doctor is an event, not a place.)

---

## 1. The map — bigger, strategic  **DECIDED**

Distance is now a real cost, so the town's shape *is* game design.

**Facts to design around**
- The original's time granularity is coarse: 60h per turn, a work session is 6h, so at most ten
  sessions a week. Travel needs to live on that scale: a short hop ≈ 1h, cross-town ≈ 3–5h.
  Today's map costs ~9 minutes per downtown hop, which is invisible against a 60h budget.
- Only the 13 classic locations are active in classic mode (see §3). The other 14 buildings
  either stay as inert scenery or are removed from the classic town.

**Decided 2026-09-16 (first pass)**
1. Whole-hour travel with a distance ladder (superseded in detail by the table below). Since
   2026-09-18 every trip is charged **twice** its ladder hours (`travelHourMultiplier: 2` on the
   Riverton town JSON, read by `classic.travelHours`); the ladder itself, the replay and the walk
   animation are unchanged. The classic ring (below) sets 1.
2. The 14 non-classic buildings stay on the map as **inert placeholders**: drawn, labelled CLOSED
   (a sign/board on the sprite and a "Closed" note if clicked), not enterable, no actions.
   They are reserved for later rulesets. On the new map they are scattered through the wedges as
   scenery so no district looks empty; they have no travel role.
3. Canvas ≈ 1920×1152.

**Decided 2026-09-16 (second pass): river and highway**

The town's shape is a **river on one diagonal and a highway on the other**, crossing at the
centre. The river splits the town into a rich/commercial half and a poor/industrial half; the
highway cuts each half in two, so the town is four wedges meeting at the crossing.

- **Orientation:** the river runs from the top-left corner to the bottom-right; the rich half is
  above it (north-east), the poor half below (south-west). The highway runs bottom-left to top-right.
- **Not a grid.** The diagonals are the *scheme*, not the drawing: the river meanders, the highway
  sweeps in long curves, streets bend and branch at odd angles, wedges differ in size and density,
  and the crossing is off-centre rather than at the exact middle. Woods, water and open ground
  fill the gaps between districts. The sketch is a diagram; the generator should hide it.
- **The highway is a barrier to walkers** (the transport table already forbids walking on it).
  Streets cross it only at authored **underpasses**, about two per half, drawn as a prop with no
  junction node (a street that crosses without attaching gets no junction, so grade separation is
  automatic in the streets-first generator).
- **Three bridges:** one at the central crossing (the highway crosses the river there too, on its
  own span) and one out toward each end of the river. Prune to fewer if crossing feels too cheap.
- **Water is authored like a street:** a curve with a width, rasterised by the same machinery as
  roads, so the shoreline comes from the outline of the water mask the way kerbs come from the
  asphalt mask. The rectangle-chain river goes away.

**Where things live (final layout, decided 2026-09-16 after seeing it rendered)**
- **The bridgehead (poor bank, at the town bridge):** Employment Office and Monolith Burgers. The
  Research Lab (closed) closes the lane that runs up from the mill road past the footbridge turn. Jobs and cheap food are on the poor side; rich-side
  players cross the river to apply.
- **Mill district (poor, west along the river road):** Consolidated Widgets, Low-Cost Housing, and
  the **Bus Depot beside it, where everyone starts**. A starting player lives, eats, applies and
  works without crossing water.
- **The strip (poor, south under the highway):** Z-Mart, Black's Market, Pawn Shop.
- **The high street (rich bank):** Rent Office south of the road and the Clinic north of it at the
  town-bridge junction, which is a plain crossroads (no plaza, nothing hangs off the junction
  itself); Bank, QT Clothing, Socket City up the hill. The north-east stretch runs beside the
  highway and carries two closed lots, Corpo Ltd. and the Stadium, on its north side. The
  Government building (closed) stands on the open ground opposite the Rent Office. The Theme Park
  (closed) closes the road's west end.
- **Campus (rich, under the highway):** Hi-Tech U, the second Bus Station (closed; depot art),
  Security Apartments, with Riverside Park just north of the apartments and the modern house
  on the lake lane beyond.
- **Closed placeholders on the map:** bus_station, corpo, stadium, government, research_lab,
  theme_park, pet_store (south of the mill road between Monolith and Honest Al's), plus the 14
  Jones 2 locations. All have sim location ids with no actions.

**The hour ladder (the target; encoded as a test)**

Edges keep minutes (the sim budget and the replay timeline use them). The classic ruleset charges
whole hours per trip, rounded up, minimum 1h. The spec is `packages/town/tools/ladder-table.ts`,
asserted by `packages/town/test/scheme.test.ts` and printed by `tools/ladder.ts`. In short:

Travel was **doubled on 2026-09-16** (walking rate halved to 5.25 px/min on streets, 4 on paths)
after the first playthrough felt the map was too cheap to cross. The table now reads:

| From                | 1h              | 2h                    | 3h                | 4h                    | 5–6h                       |
|---------------------|-----------------|-----------------------|-------------------|-----------------------|----------------------------|
| Low-Cost Housing    | Depot, Factory  | Employment, Monolith  | Strip             | Rent Office, Bank     | QT, Socket City, campus    |
| Security Apartments |                 | Hi-Tech U             | Rent Office       | Uptown, Employment    | Factory, strip             |
| Employment Office   | Monolith        | Rent Office, Factory, Strip |             | Uptown, Hi-Tech U (3h) |                          |
| Bus Depot (start)   | Factory         |                       | Employment        |                       |                            |

Arriving costs three hours to reach the jobs board once. A cross-river errand is most of a
working day, which is the point: where you live decides what you can do in a week. The earlier "centre wedge" table (Employment, Monolith and Rent Office at the crossing) is
superseded.

**Roads leave the map (added 2026-09-18)**

Riverton's through roads no longer end in a field: both ends of the highway, the main street's
east end, the uptown road north, the campus road east, the mill road west and the works road
south continue as straight stubs past the canvas edge (`EXITS` in `tools/riverton.ts`, nodes
`exit_*`, walkers cannot go there). The renderer's layer is the canvas plus its margin, so the
edge of the map cuts the road off. Ambient traffic uses the stubs to turn round out of sight.

**The classic map (added 2026-09-18)**

A second town, `townId: 'classic'`, offered beside Riverton at new game creation: the original
board as our engine sees it. Source of truth `packages/town/tools/classic.ts` →
`src/towns/classic.json`; asserted by `packages/town/test/classic.test.ts`.
- The thirteen buildings on a ring, clockwise from the top-left as the original screen reads:
  Security Apartments, Rent Office, Low-Cost Housing, Pawn Shop, Z-Mart, Monolith Burgers,
  QT Clothing, Socket City, Hi-Tech U, Employment Office, Factory, Bank, Black's Market. Nothing
  else: no closed placeholders, no bus depot. The centre is empty for the location window.
- Canvas 640×400 (the original 320×200 at 2×). Every node is ON the walkway (a paved band with a
  path on it) and its sprite hangs off it outward via `TownNode.spriteOffset`, so tokens stand
  on the ring in front of the building where the marble did.
- Travel: the fan wiki's Locations page says a full lap costs about 10 Hours, so the perimeter
  is 600 minutes and the classic ruleset's whole-hour charge makes a hop to the next building
  1h (2h across the clock gap between Hi-Tech U and the Employment Office) and the far side of
  the board 5h. `travelHourMultiplier` is 1: no doubling. Routes take the short way round.
- Players start at their apartment (Low-Cost Housing by default), as the wiki's Time page has it.
- The wiki also says entering any location advances the clock by 2 Hours. Decided 2026-09-22:
  not charged, on either map.

**Build order for the map**
1. Amend this plan (done) and write the hour-table test, failing, as the target.
2. Schema: water curve with width; underpass decor kind. Renderer: river stroke with shoreline,
   highway painted over streets, bridge and underpass props sized to the new widths.
3. Generator: 1920×1152 canvas, the two diagonals with curves and variation, four wedges of
   streets, all 27 locations placed (13 active, 14 CLOSED), water and woods between districts.
   Overlap checker learns the water corridor.
4. Sim: classic mode charges whole hours per trip. Tune until the hour table passes.
5. Preview PNG, eyeball, iterate; then a human walk-through in the client.

## 2. Interface — recognisable from the original  **DECIDED**

Goal: a player of the original knows immediately how to do everything. Replace the current side
panels with the original's organisation.

**Layout (from the screenshots)**
- **Board fills the screen.** Player positions shown as numbered tokens on the map.
- **Location window in the centre**, framed, over the board: location name as the title,
  a **clerk portrait** top-right (pixel art, one per location), a **speech-bubble greeting**
  (the wiki has the original's quotes), a **menu of items with prices** on the right,
  action buttons at the bottom (**DONE**, and per-location **WORK**, **RELAX**, etc.).
  Junctions and travel never open a window.
- **Bottom bar:** the **clock** at bottom-centre with **WEEK #N** under it; a **digital readout**
  at bottom-right (cash, and time when hovering); nothing else permanently on screen.
- **Goals screen** (the original's F6): a bar per player with a per-goal breakdown; opened from a
  button, not always visible. **Statistics screen** for net worth, items, degrees, job.
- **Employment Office lists the workplaces first**, then the jobs at the one you pick, with the
  wage next to each (the original's flow); **Hi-Tech U lists only the courses open to you** now,
  with lessons for the ones you are enrolled in, and more appear as degrees are earned. The sim
  carries this as `ActionOption.group` / `hidden`.
- **Turn-start sequence as centre-window cards:** "Oh What a Weekend!", starvation/doctor/robbery
  notices, rent due, newspaper headline. Each dismissed with DONE.
- **Character select** with portraits at game start (family photos pixelated, per DESIGN §11).

**Art needed:** clerk portraits (13), the window frame and bubble in the pixel UI set, numbered
player tokens, weekend/event illustrations (optional), goal-screen icons (exist).

**Decided 2026-09-16**
4. Centre-window overlay with the map visible around it.
5. Keep the end-of-week replay.

## 3. Gameplay — classic ruleset first  **DECIDED**

Add `ruleset: 'classic' | 'jones2'` to `GameConfig`. Classic replaces the content tables and
week logic with the original's; the Jones 2 systems stay in the code behind the flag.

**Classic content to encode from `original-rules.md`** (data files under
`packages/sim/src/content/classic/`): jobs (full List of Jobs), degrees and prerequisites,
Socket City / Z-Mart items with prices and happiness, QT clothes, Black's Market food and lottery,
Monolith menu, rent tables, loan and stock rules, the happiness event table, the 42 weekend
texts and price bands, newspaper headlines and economy effects, Wild Willy odds, doctor odds.

**Classic rules to implement**: 60h turns with whole-hour costs; the turn-start sequence;
Dependability/Experience with caps and firing; apply/raise with the luck roll; work sessions;
lessons (10 per degree); consumable clothes and uniforms; fast vs fresh food, fridge, spoilage;
relaxation; rent, extensions, debt and garnishing; loans and defaults; stocks with booms and
crashes; pawning; lottery; goals as the original computes them; win check at week start.

**Parked (flag off in classic):** Health, career tracks and track perks, achievements race,
property purchase and named houses, transport modes, news sources and journal, insurance,
groceries/cooking model, activities, scarce-job resolution, storefront shares. Also the 14
non-classic locations.

**Deliberate deviations from the original, kept:**
- **Simultaneous weeks** instead of sequential turns (DESIGN §6.11). "Start of turn" events
  happen at the start of each player's week; economy events fire at week resolution for everyone.
- **No hidden stats:** Dependability, Experience and Relaxation are shown.
- **No Jones AI** for now (DESIGN §5).
- The new map and travel time.

**Decided 2026-09-16**
6. **Wild Willy (muggings, apartment robbery) and Doctor visits are NOT implemented** in the
   first classic ruleset. A variant with a fairer version comes later. Everything that only
   exists to feed them (relaxation's robbery odds, starvation's doctor roll) is dropped with them;
   Relaxation itself stays (it gives Happiness). Appliance breakdowns and food spoilage stay.
7. Economy events (booms, crashes, layoffs, wage cuts) resolve at week end for everyone.

## 4. UI details  **DECIDED**

- **Hover distance:** hovering any destination on the map shows the route and a tooltip near the
  cursor with the location name and travel time in hours ("Bank · 2h"); the clock preview arc
  shows the same cost. Unreachable-this-week destinations show why.
- **Clock fills like a pie**, as the original: the face fills clockwise as hours are spent, so
  time *left* is the unfilled remainder. WEEK #N under it. Hover preview shades the slice an
  action would consume.
- **Bottom bar (2026-09-18):** a large cash readout with END TURN under it at the bottom right;
  GOALS, STATISTICS and OPTIONS at the bottom left. OPTIONS holds the Music and Sound sliders
  with a mute each, and NEW GAME. Nothing else is permanently on the board.
- **Week end (2026-09-18):** "Resolve and watch the recap" or "Skip the recap"; no abandon
  button there (that lives under OPTIONS). In the recap the players stay numbered tokens, each
  on its own seat beside the door so they never overlap, with a caption bubble over each saying
  what they are doing.

---

## 5. Work breakdown and order

Sequential first, then parallel where the interfaces are fixed.

1. ~~Decisions 1–7.~~ Done 2026-09-16.
2. **Classic content extraction** — Sonnet agent: turn `original-rules.md` into typed tables with
   a test per table (every job/degree/item present, prices numeric). ~150–250k tokens.
3. **Classic ruleset in the sim** — Opus agent: `ruleset` flag, classic week/turn logic, actions,
   goals; balance runner strategies for classic; tests. ~400–600k tokens.
4. **Map rebuild** — Opus agent: the river/highway scheme in §1 (water as a curve, underpasses,
   bridges, four wedges, 1920×1152, hour-table test), generator + renderer + checker + tests.
   ~300–450k tokens. Chosen as the first step to run.
5. **Interface rebuild** — Opus agent: centre location window with clerk/bubble/menu, bottom
   bar with pie clock and readout, goals/stats screens, turn-start cards, hover tooltips;
   remove side panels. ~400–600k tokens.
6. **Clerk portraits + UI frame art** — Opus agent in `packages/pixelart`. ~250–400k tokens.
7. Integration, screenshots, a full human playthrough, then balance.

Steps 2 and 4 and 6 can run together; 3 needs 2; 5 needs 3's action surface (or can code
against the current `availableActions` shape, which will not change).

## 6. Open questions parked for later
- Jones AI opponent (needed for solo play).
- Shoreline tiles for the river; the two empty plaza squares; camera clamp at the town edge.
- Editor: curve-point handles; streets-first editing.
- Server / async multiplayer (Milestone 3) once classic play feels right hot-seat.
