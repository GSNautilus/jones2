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
  Relax 6h, a University lesson 6h, Loan application 2h, Stocks 2h, Newspaper 1h, small
  purchases 1h. Moving around the board costs hours by distance. Turn ends at 0h.
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
- **Degrees (11):** Junior College, Trade School → Business Admin, Academic, Electronics,
  Pre-Engineering → Graduate School, Engineering → Post-Doctoral → Research → Publishing.
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

**Proposal**
- Convert travel to **whole hours** (round up; minimum 1h) and re-tune the town so:
  downtown hops 1h, downtown↔strip 2h, downtown↔campus 2–3h, downtown↔factory 3h,
  Low-Cost Housing far from downtown (3h) vs Security Apartments in the centre (1h).
  The rent difference then buys *time*, which is the strategic hook the original lacked.
- Districts, each with one reason to go there:
  - **Centre:** Employment Office, Bank, Rent Office, Monolith Burgers, Security Apartments.
  - **Retail strip (one direction):** Z-Mart, QT Clothing, Socket City, Black's Market, Pawn Shop.
  - **Campus (another direction):** Hi-Tech U — studying means committing to trips.
  - **Industrial (opposite):** Factory (best wages, far) with Low-Cost Housing beside it.
- Canvas grows to fit those distances (≈1920×1152) with woods, river and highway as the
  space between districts. The renderer's 1× overview shows it whole; play at 2×.
- Later (not classic): the parked transport system (bus/bike/car) becomes the way to buy back
  travel time on this map.

**Decided 2026-09-16**
1. Whole-hour travel with the ladder above. Yes.
2. The 14 non-classic buildings stay on the map as **inert placeholders**: drawn, labelled CLOSED
   (a sign/board on the sprite and a "Closed" note if clicked), not enterable, no actions.
   They are reserved for later rulesets.
3. Canvas ≈ 1920×1152; the ladder numbers are the starting point for tuning.

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

---

## 5. Work breakdown and order

Sequential first, then parallel where the interfaces are fixed.

1. ~~Decisions 1–7.~~ Done 2026-09-16.
2. **Classic content extraction** — Sonnet agent: turn `original-rules.md` into typed tables with
   a test per table (every job/degree/item present, prices numeric). ~150–250k tokens.
3. **Classic ruleset in the sim** — Opus agent: `ruleset` flag, classic week/turn logic, actions,
   goals; balance runner strategies for classic; tests. ~400–600k tokens.
4. **Map retune** — Opus agent: hour-granular travel, classic location set, district layout,
   larger canvas, generator + checker + tests. ~300–450k tokens.
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
