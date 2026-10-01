# Jones 2 — Design Document (running)

A modernized, deeper take on *Jones in the Fast Lane* (Sierra, 1991). Must feel immediately familiar to a player of the original while adding depth and reducing blind randomness.

Status tags: **DECIDED** · **DISCUSSING** · **DEFERRED** · **REJECTED**

---

## 1. Vision and pillars

- **Time is the currency.** A fixed number of hours per week; every action and every trip costs hours. Routing decisions are the game.
- **Four dials, player-set targets.** Money, Happiness, Education, Career. Classic mode: first to hit all four wins.
- **Pressure from maintenance.** Rent, food, clothing wear, health, happiness decay. Neglect snowballs.
- **Informed, not random.** Very few hidden stats (ideally none). Events are forecastable and exposure is something the player can manage. Bad luck still exists, but preparation matters.
- **Light-touch sim.** Depth comes from meaningful choices, not bookkeeping. A turn should take a minute or two.
- **Built for family play online, possibly over days.** Architecture and turn structure are designed around async multiplayer from day one, even if the first builds are local.
- **Tone:** keep the 90s satire and cheeky storefront names. **DECIDED**

## 2. What the original did well (keep)

- Weekly hour budget; everything costs time.
- Distinct storefront locations with a strong identity each.
- Four goals with targets chosen at setup.
- Weekly newspaper driving economy shifts.
- Rent, food, clothing as weekly pressure.
- Quick turns, ~1 hour per game.
- Degrees gating specific jobs (already partly track-like).
- Bank: savings, loans, lottery, pawn shop (needs polish only).

## 3. Where the original falls down (fix)

- One dominant strategy; solved after two games.
- Randomness is punitive and unavoidable.
- Happiness is shallow (buy things, relax).
- Effectively one career ladder.
- Late game is a grind once you hold the top job.
- Static, circular board; movement is pure cost.

## 4. Game modes  **DECIDED**

1. **Classic race** — first player to reach all four goal targets wins.
2. **Fixed length** — play N weeks; scored at the end.

Solo / scenario mode: **DEFERRED** (not needed for the family use case yet).

## 5. Players and AI  **DECIDED**

- Human players only in the first implementations. AI rivals are **DEFERRED**; not a priority.
- Online multiplayer is key. Local/hot-seat is acceptable for early builds, but the design must assume remote players who may take their turns hours or days apart.

## 6. Systems

### 6.1 Time  **DECIDED (core) / DISCUSSING (details)**
- Fixed hours per week. Travel, work, classes, shopping, cooking, leisure all draw from the same pool.
- Time is investable: transport upgrades (bus pass, bicycle, used car), appliances, home computer reduce recurring time costs. This is a major source of the new version's depth.
- Health modifies the available hour budget (see 6.5).

### 6.2 Map  **DECIDED (model) / DISCUSSING (layout, location list)**
- **Not a ring.** A graph of locations connected by weighted routes; multiple paths between places.
- Feels like a small town (think a Sims-style neighbourhood): businesses, services, and housing distributed across the map rather than in strict zones. Housing options of every tier scattered throughout, not confined to one suburb.
- Travel cost depends on route and transport owned (walk, bus lines with a pass, bike, car with a running cost).
- Where you live sets where your week starts. **Everyone starts at the same default location** at game start.
- Loose district flavour still useful for readability (downtown services, shopping strip, industrial edge, park/waterfront leisure) but not hard zoning.

### 6.3 Careers  **DECIDED**
- Multiple career tracks (e.g., Service, Trades, Tech, Finance, Academia), each with several rungs.
- Rungs require specific degrees plus experience.
- Track experience improves odds of landing jobs in that track at *different* businesses, not just the current employer.
- Tracks differ in shift length, pay, happiness cost, recession stability, and a perk (bank job → better interest; retail → discount; university → cheaper classes).
- Switching tracks retains partial experience.

### 6.4 Happiness  **DECIDED (structure) / DISCUSSING (weights)**
- Several sources, each with diminishing returns, so no single source carries you:
  - Comfort — home tier and possessions
  - Leisure — time spent at park, gym, cinema, etc.
  - Fulfilment — career fit, promotions
  - Minus stress — overwork, debt, hunger, poor health
- Balance weighting acknowledged as the hard part; tune with playtesting.

### 6.5 Health  **DECIDED**
- A **visible** stat (no hidden stats where avoidable).
- Modifies weekly hour budget; sickness costs hours.
- Food choices trade time vs. health vs. happiness:
  - Fast food: quick, cheap, unhealthy
  - Groceries + cooking: slow, cheap, healthy (fridge/appliances reduce the time cost)
  - Fancy healthy restaurant: expensive, healthy
  - Fancy unhealthy restaurant: expensive, big happiness, poor health
- Exercise activities of various types with different happiness/health mixes (gym, running in the park, sports, etc.).
- Clinic location for recovery.

### 6.6 Information and events  **DECIDED**
- Events are forecastable. Multiple news sources with different time horizons and reliability (e.g., daily paper = next week, business weekly = several weeks out, tabloid = cheap but unreliable).
- Obtained forecasts are recorded in an in-game notebook/journal until they expire.
- Exposure is manageable: insurance, secure housing, savings buffer, job stability.

### 6.7 Housing and property  **DECIDED**
- Housing ladder: roommate → low-cost → secure apartment → owned property.
- Specific named properties in the late game with distinct advantages: better starting position for the week, built-in amenities (kitchen, gym, office), safety.
- Property ownership as the late-game money sink.

### 6.8 Money and finance  **DECIDED (polish only)**
- Savings, term deposit, loan, one simple economy-linked investment.
- Debt with interest as the slow failure mode rather than instant eviction.
- Pawn shop and lottery kept.

### 6.9 Player interaction  **DECIDED**
Accepted:
- **Scarce jobs.** One opening per position (at least for upper rungs). Competing applications resolve at week end by qualifications, tiebreak on track experience. A lost application costs only the interview hours.
- **Scarce property.** Named properties have one owner. Competing offers resolve at week end (sealed bid).
- **Storefront shares** (maybe). Late-game stake in a business; other players' spending there pays the holder a cut. Doubles as a Finance-track endgame.
- **Achievements race** — see 6.12.

Rejected:
- Lending or gifting money between players.
- Landlord/tenant rent between players.
- Referrals, shared activities, carpooling, sabotage/rumours.
- Demand-driven shared pricing (not wanted as an interaction mechanic).

### 6.10 Starting traits  **DEFERRED**
- Character trait reweighting happiness sources. Revisit after the core systems exist; balance risk.

### 6.11 Turn structure and week resolution  **DECIDED**
- **Simultaneous weeks.** Each player plays their full week whenever they log in. When the last player finishes, the week resolves.
- Contested actions (job applications, property offers) are submitted during the week and resolved at week end.
- Nothing a player does may require another player to be online.
- Every action a player takes during the week is recorded as an ordered event log with timestamps in game hours. This log is the source of truth for resolution, for the replay (below), and for syncing state between clients.

**Week replay.** At resolution, the game animates every player's week simultaneously on the map: each figure leaves its starting point and performs its activities in game-hour order.
- Viewer controls: play/pause, scrub forward and backward in time, playback speed.
- Focus on any individual player to follow exactly what they did, with an activity readout.
- Overview mode showing all players at once.
- Implication for architecture: the week is a deterministic replayable script; UI is a pure function of (state at week start, event log, time cursor).

### 6.12 Achievements  **DECIDED (concept) / draft list — REVISIT LATER**
- Race-style milestones: the **first** player to achieve one gets a reward. Later players get nothing (or a much smaller consolation).
- Visible from week one so players can plan a race for them.
- Rewards are mostly in-kind rather than cash, so the race pulls players toward different parts of the game instead of just feeding the Money dial.

Draft list (~15 at launch, all subject to change):
| Achievement | Condition | Draft reward |
|---|---|---|
| Explorer | First to visit the far corner of the map | Bicycle |
| Wheels | First car | Free fuel for several weeks |
| Homeowner | First owned house | Happiness bump + furniture voucher |
| Graduate | First degree of any kind | Tuition discount |
| Track climber ×5 | First to rung 3 in Service / Trades / Tech / Finance / Academia | One-time cash bonus scaled to track |
| Nest egg | First to a savings threshold | Better interest rate for a stretch |
| Iron constitution | First to max Health | Extra hours the following week |
| Dressed for success | First full top-tier wardrobe | Permanent small interview bonus |
| Shareholder | First storefront stake (if shares kept) | TBD |

### 6.13 Week-end resolution order  **DECIDED**
1. Each player's uncontested actions stand exactly as played; the event log is authoritative.
2. Contested job applications resolve: best qualified → most track experience → earliest application in game hours within the week. No dice.
3. Contested property offers resolve: highest bid → earliest-in-week tiebreak.
4. Achievements resolve; ties broken by the game hour the condition was met.
5. Weekly upkeep: rent, loan interest, clothing wear, health drift, happiness decay from stress.
6. Economy update: forecast events fire, prices and wages move, layoffs happen.
7. New forecasts publish; journals update.
8. Goal check → win, or replay plays and the next week opens.

During a player's own week only their own figure is live on the map; other players are shown greyed at their previous week-end positions.

### 6.14 Education  **DECIDED (shape) / details — REVISIT LATER**
- Degrees earned through university classes; each class costs hours and tuition; a degree needs a set number of classes.
- Degrees grouped by career track, plus a couple of general degrees usable by any track.
- Home study with a computer: completes a class over more hours, no travel, lower cost.
- Some jobs offer on-the-job training that counts toward a track degree, slower than classes.
- Education goal percentage = total credits earned, so breadth and depth both count.
- Specific degree list and hours per degree: to be defined during balancing.

## 7. Explicitly out of scope
- Day-by-day scheduling inside a week
- Taxes
- Deep relationship simulation
- Anything that pushes a turn past a couple of minutes

## 8. Open discussion items
Core design is considered complete as of round 3; items below are detail work to be done during building.
- Achievement list and rewards (revisit)
- Exact list of locations and the town layout
- Education: degree list, class structure, home study
- Clothing and possessions: wear, theft, what each item does
- Happiness weighting
- News sources: exact roster, prices, reliability
- Fixed-length mode scoring
- Goal target selection at setup

## 9. Decision log
- 2026-09-30 — Expansions, and the first one, Wheels & Whiskers: DECIDED Riverton's closed buildings open through **expansion packs** chosen at new game time and fixed for the game (`GameConfig.expansions`; absent = none, so older games and saves are untouched). On the Jones 2 map the new game screen shows an **Expansions…** button that opens a window with one checkbox per pack; the Classic ring has no closed buildings and shows no button; ticks are remembered across a map switch but only the map's own apply. A pack may open one building or several. Expansions are classic-ruleset data (`packages/sim/src/content/classic/expansions.ts`). DECIDED **Wheels & Whiskers** opens Honest Al's Autos and the Pet Store. **Vehicles** (Honest Al's): Skateboard $80, Bicycle $240, Used Car $1,500, Sports Car $7,500 (economy-indexed), happiness on purchase +1/+1/+2/+4; travel is charged with the best vehicle owned, the walking charge times 0.75 / 0.625 / 0.5 / 0.375 rounded half up to whole hours, minimum 1 (on Riverton ×1.5 / ×1.25 / ×1 / ×0.75 instead of ×2). No running costs. A breakdown is only a **start-of-week repair bill** like an appliance's (same 1/51 new, 1/36 second-hand chance, 5–25% of what was paid, so dearer vehicles cost more to fix), with no happiness loss and never "in the shop". Vehicles can be pawned and count toward net worth. **Pets** (Pet Store): Goldfish $30 +1, Cat $120 +2, Dog $200 +2, Clownfish $650 +3, Owl $650 +3, Dragon $4,000 +5 happiness on purchase, plus +1 at the start of every week while owning any pet (not cumulative, like the Stove/Microwave). No food, no housing rules; the pawn shop refuses pets. DECIDED on the map a travelling token rides its vehicle (skateboard or bicycle under the walker; a top-down car in the player's colour, matching the road traffic, keeping to the road rather than the seat spread) and only while moving; the **best pet** (dearest, latest bought on a tie) follows the token everywhere — behind on east-west legs, alongside on north-south ones, beside it at a door; fish swim and owls and dragons fly at head height with a shadow. The four classic goals are unchanged for now; **health** is planned as the key of a future expansion (it will differentiate the restaurants and gate some careers).
- 2026-09-30 — Classic rules checked against the fan wiki: the extract `docs/original-rules.md` lacked the wiki's Economy, Market Crash, Economic Boom, Experience, Wage, Turn, Hour, Garnishment and Donation pages; they are now `docs/original-rules-extra.md` and are spec like the rest. DECIDED the classic sim follows them: the economy is a hidden trend (−3..+3) and reading (−30..+90, prices at base × (1 + reading/60)); a crash can only strike a reading of 80+ and a boom a reading of +15 or less (the wiki's "120" is outside the range; read as "neutral or slightly better"), each about 1 in 31 a week (1/(1+30×players) per turn); crash severity is a third each; a crash shoves the trend 3 down and cuts prices 5/10/15%, a boom shoves it 3 up and raises prices 10%; a moderate crash fires half of the employed and cuts the rest to 80% of their wage, a major one fires everyone and empties every bank account. The weekly walk of the trend and reading is still ours (the wiki calls it "quite complex"; marked GUESS in `classic/config.ts`). DECIDED crash Happiness still hits every player, not only "the player whose turn it was" (simultaneous weeks). Also now as the original: Experience starts at 10, +2 per new job, cap 10 + required + 5 per degree; working never pulls a stat above its cap back down; the first four weeks report a dependability shortfall as "No openings"; a refused raise costs no Happiness; at most 4 courses at once; the win check comes after the stove/microwave bonus and before the weekend; fresh food that spoils for want of a fridge leaves you hungry; unpaid rent adds a month to the debt every month and rent debt counts against Liquid Assets; the Rent Office opens only at month end or during your extension; loan payments push the deadline a month each and a default lasts until each missed month is paid (−1 Happiness once a month, with the notice); DECIDED Z-Mart puts 6 random rows of its shelf on sale each week; repairs, redemption and resale use the price actually paid; the pawn shop holds one of each item; Donations (two naked weeks, under $300 cash and net worth).
- 2026-10-02 — One ruleset offered: DECIDED the new game screen no longer has a Rules choice; every new game (local or online) uses the classic rules and the classic screen (clerks, windows, options) on either map, Classic ring or Jones 2 (Riverton). The extended-design ruleset stays in the sim and the balance runner, but its only interface is the Milestone 2 placeholder (`PlayScreen`), so it is not offered until it has a real one; a locally saved game on those rules is set aside on load.
- 2026-10-02 — Hosting from the site (amends the 2026-09-22 schema entry's "games and seats are created only by host tools with the secret key"): DECIDED a **host link** (`#/hostkey/<token>`, printed by `npm run host-link -w @jones2/host`, stored as sha256 in `host_keys`) makes each device that opens it a host device (`host_devices`). Host devices, and only they, create online games from the new game screen ("Where: Online", classic rules only) and use the host panel (`#/host`): list games, send or re-send each player's link, play as a seat, replace a link, delete a game. All through security-definer functions that check `is_host()`; the public site still cannot mint a seat without the host link. DECIDED player links are now kept in `seats.link` so the host panel can show them again; only the host functions return them. Accepted: a database breach would reveal player links. The browser builds week 1 with the sim and the database checks it matches the settings; the host is trusted. Running host-link again replaces the link and signs every host device out.
- 2026-09-30 — Building menus keep a fixed order: DECIDED a location window never re-sorts its rows (the client used to lift affordable rows to the top, so items jumped as cash and time changed); an unaffordable row greys out in place. DECIDED every list follows the original's on-screen order, taken from the wiki tables and confirmed against screenshots of the original (QT Clothing: Suit, Dress, Casual; Monolith: ... Fries, Shakes, Colas): the sim's content order is the shelf order, and Z-Mart has its own `ZMART_SHELF` (its appliance order differs from Socket City's, and its clothes sit between the books and the tickets). The broker lists Buy and Sell for all six stocks at all times, Sell greyed when none is held. Lists that change because the game changed stay as the original had them: Hi-Tech U drops a finished course and adds the ones it unlocks; the pawn shop lists what is there.
- 2026-10-01 — Permanent invite links (supersedes "a token is single-use and binds to the first session" in the 2026-09-22 hosting entry): DECIDED a player's link is their key for the whole game: every device that opens it joins their seat (`seat_devices`), any number of times, with no host involvement for a new phone or a cleared browser. `seats.user_id` is gone. Re-issuing a seat changes the token and removes all its devices; it is for a link that reached the wrong person. Accepted trade-off: anyone holding a player's link can play as them and read the audio bucket, the same trust as a shared family password. Google sign-in stays an option to add on top later.
- 2026-09-30 — Online client and publishing (Milestone 3 step 5): DECIDED online addresses live in the URL hash (`#/join/<token>`, `#/game/<id>/<seat>`), so the static site needs no routing and invite tokens never reach a server log. DECIDED a player's week runs locally on the week snapshot, with rivals shown where the week began; the draft is saved to the server 1.5 s after each action and on page hide, so another device or a closed tab resumes it; ending the week hands it to submit-turn. DECIDED the recap of a resolved week shows once per device, the next time the game is opened there; a device's first visit starts at the open week. DECIDED waiting players poll every 20 s and on tab focus; no email or push in v1. DECIDED the site is built and published by GitHub Actions on every push to main (tests must pass first); a scheduled workflow calls `public.ping()` every three days against free-plan pausing.
- 2026-09-26 — Online weeks and the turn function (Milestone 3 step 4; `packages/sim/src/online.ts`, `packages/server`, `supabase/functions/submit-turn`): DECIDED **in-week dice come from each player's own weekly stream** (`playerRoll`, seeded from the week-start game stream, the week and the seat), so a player's rolls are identical on their device and on the server whatever the others did; hot-seat games get different but still deterministic dice. DECIDED the server merges a week by applying every player's checked actions in **in-week time order, seat order breaking ties**; an action that fails only because a rival got there first (in practice: the pawn shop) is skipped and the player gets a "fell through" note at the top of the week report, per 6.13's earliest-in-week rule. DECIDED online play is **classic ruleset only** (the other ruleset still rolls on the shared stream). DECIDED stored snapshots drop `history` (nothing reads it; storage would grow with the square of game length); each snapshot row keeps its producing week's report. DECIDED the Edge Function identifies the caller by asking Supabase Auth (`/auth/v1/user`), writes through a direct Postgres transaction that locks the game row (so exactly one submission resolves a week), accepts an identical retry, and refuses a turn longer than 2000 actions.
- 2026-09-22 — Supabase schema (Milestone 3 step 3, `supabase/migrations/`, `docs/SUPABASE.md`): DECIDED tables `games` (config + open week), `seats` (sim player id, name, sha256 of the invite token, the redeeming session), `snapshots` (one GameState per game per week; the primary key is the resolution race guard), `turns` (one Action[] per seat per week, `submitted_at` set only by the Edge Function). DECIDED **games and seats are created only by host tools with the secret key, never from the public site**: any seat unlocks the audio bucket, so the site must not be able to mint one; in-app game setup for online play is out of v1. DECIDED one device may hold several seats (shared tablet). DECIDED rivals' turns stay hidden until their week resolves. Access rules are tested on PGlite (in-process Postgres) with a stand-in for Supabase's roles, no Docker.
- 2026-09-22 — Hosting and the original's assets (supersedes §10 "Hosting" and the SQLite line; closes §13 "Server persistence and hosting specifics" and "Auth"): DECIDED client on **GitHub Pages** from a **public repo**; **Supabase** replaces `apps/server` — Postgres tables for week snapshots and per-player event logs, one Edge Function that validates submitted logs and runs `resolveWeek` (sim bundled unchanged), Realtime/page-load for "new week". DECIDED login by **seat-token invite link** over Supabase anonymous sign-in, no email in v1; a token is single-use and binds to the first session, host can re-issue. DECIDED **no Sierra-derived bytes in the repo or the Pages build**: the audio moves to a gitignored `assets/sierra/`, history is rewritten with git filter-repo **before the first push**, an upload script puts the folder into a private Storage bucket whose read policy requires the caller's user id to be in the players table (a bare anonymous session is not enough). DECIDED the client reads audio through an injected asset source (`local` for dev and tests, `supabase` for play), downloads each file whole to an object URL (effects, voices and music alike), and keeps it in the browser Cache API so each device fetches each file once. Known limit: a player can still save files out of their own browser, as with lending the CD.
- 2026-09-14 — Initial discussion. Decided: modes (classic + fixed length), human-only first, online-first architecture, non-ring map, visible Health, career tracks with cross-business experience, forecastable events with multiple news sources, property ladder with named late-game properties, keep tone. Deferred: traits, AI rivals, solo mode. Rejected: player-to-player lending.
- 2026-09-22 — After the human playthrough: DECIDED no 2-hour charge for entering a location, on either map; the classic ruleset plays well enough to move on; the CD voice labelling is confirmed by ear; balance issues (degrees dominant, clothes softlock, food prices) are parked. Next: the Jones 2 expansion-building roadmap, then the sim additions the client wants.
- 2026-09-18 — Map life and chrome: DECIDED Riverton's through roads run off the edge of the map (seven exit stubs); DECIDED ambient life on the map — cars on streets and the highway keeping to the right, flocks of birds, an occasional plane and helicopter with shadows — on by default, off under reduced motion and under OPTIONS; a map smaller than the screen is draggable, not pinned; the Week Resolved window lists every player's actions by hour; the corner furniture (GOALS / STATISTICS / OPTIONS, the cash readout and END TURN) is pixel art in the window's style. Dependability's −3 a week is the original's rule (`DEPENDABILITY_WEEKLY_DECAY`), kept.
- 2026-09-18 — Two maps at new game creation: DECIDED the setup screen offers **Classic** (`townId` 'classic': the original board as a ring of the thirteen buildings, clockwise from the top-left as the original, the original screen at 2× = 640×400, players start at their apartment, a lap is about ten hours per the fan wiki, nothing closed) and **Jones 2** (`townId` 'riverton'); the Map select follows the rules until picked. The travel doubling became a town property (`Town.travelHourMultiplier`: Riverton 2, the ring 1) and buildings may hang off their walkway node (`TownNode.spriteOffset`) so tokens stand on the ring in front of a building as the marble did. The town's source of truth is `packages/town/tools/classic.ts`. The wiki's "entering any Location advances the clock by 2 Hours" is not charged (decided 2026-09-22).
- 2026-09-18 — Classic chrome: DECIDED the board's only permanent furniture is the clock, a large cash readout with END TURN, and GOALS / STATISTICS / OPTIONS; volumes, mutes and NEW GAME live under OPTIONS; the week-end screen offers the recap or skips it and has no abandon button; the recap keeps the numbered tokens, spreads them so they never overlap, and captions what each player is doing. DECIDED travel charges twice its ladder hours (`TRAVEL_HOUR_MULTIPLIER`), with the walk animation and replay unchanged.
- 2026-09-16 — Final layout after seeing it rendered (docs/PLAN.md §1 "Where things live"): DECIDED Employment and Monolith on the poor bank at the town bridge (jobs and cheap food on the poor side); the crossroads is a plain junction with Rent Office and Clinic either side of the high street; everyone starts at the Bus Depot beside Low-Cost Housing (2h to the jobs board once, then a one-hour world); second bus station beside Hi-Tech U; Riverside Park north of Security Apartments; modern house on the lake lane; closed placeholders Corpo Ltd., Stadium, Government (north-east high street beside the highway), Research Lab (at the end of the lane past the footbridge turn), Theme Park (west end of the high street); Government stands opposite the Rent Office, not on the highway strip; Pet Store (closed) between Monolith and Honest Al's. Hour ladder is now a trip table (`packages/town/tools/ladder-table.ts`), Rent Office 2h from the campus; walking rate 10.5 px/min.
- 2026-09-16 — Map scheme (docs/PLAN.md §1): DECIDED river on one diagonal (top-left to bottom-right), highway on the other, crossing at an off-centre town centre; rich half north-east, poor half south-west; highway is a walker barrier crossed at authored underpasses; three bridges; water authored as a curve like a street; centre holds Employment/Monolith/Rent, Factory+Low-Cost and the cheap strip on the poor side, Bank/QT/Socket City uptown and Hi-Tech U with Security Apartments on the rich side; hour ladder as a test. Curves and variation, not a grid.
- 2026-09-16 — Plan for classic ruleset (docs/PLAN.md): DECIDED whole-hour travel and distance ladder, ~1920×1152 town, non-classic buildings stay as inert CLOSED placeholders, centre location window over the map, keep the replay, classic rules behind a `ruleset` flag with Wild Willy and Doctor omitted for now, economy events resolve at week end.
- 2026-09-14 — Milestone 2b (pixel art direction) built: DECIDED 2D pixel art generated as code replaces three.js; fixed top-down camera, integer zoom, curvy roads from edge control points; town canvas 768×448 at 1 unit = 1 px; big analog clock HUD with hover time-preview. Phase A ~455k tokens, Phase B ~1.3M tokens (art 416k, layout 703k over two passes, HUD 188k).
- 2026-09-14 — Milestone 2 built: three.js town renderer, week replay, town editor, hot-seat harness in apps/client (4 parallel agents, ~540k tokens, then integrated). Renderer contract gained unmount() and editor drag callbacks. Riverton coordinates doubled.
- 2026-09-14 — Milestone 1 built: sim core, Riverton town, content tables, tests, balance runner, debug client. See STATUS.md.
- 2026-09-14 — Round 4 (build). Decided: web client, TypeScript, deterministic shared simulation core, Node server with SQLite, three.js isometric map built from a JSON town graph, Kenney 3D kits as parts library, in-browser town editor, 2D VGA-style interiors, build order.
- 2026-09-14 — Round 3. Decided: week-end resolution order with deterministic earliest-in-week tiebreaks. Recorded as drafts to revisit: achievement list, education shape. Core gameplay design closed; moving to build discussion.
- 2026-09-14 — Round 2. Decided: simultaneous weeks with end-of-week resolution; animated week replay with scrub/focus controls; achievements race as a core interaction; scarce jobs and scarce property; storefront shares as a maybe; map is a small-town graph with housing distributed throughout; everyone starts at the same location. Rejected: landlord/tenant, referrals, shared activities, carpool, sabotage, demand-driven pricing as interaction.

---

# Part II — Build

## 10. Platform and architecture  **DECIDED**
- **Browser client, TypeScript everywhere.** No installs; family plays from a link on laptop, tablet, or phone.
- **Simulation core = pure, deterministic TypeScript package.** No rendering, no network, no clock. `(state, action) → (state, event)`. Shared by client and server.
  - Client runs it for instant feedback during a week.
  - Server re-runs each submitted event log to validate (cheat resistance for free).
  - Replay = same code with a time cursor.
- **Server: Node, same simulation package.** Stores per game: week-start snapshot + per-player event logs. When the last log for a week lands, it runs resolution (6.13), saves the new snapshot, notifies players. SQLite to start.
- **Hosting:** ~~small VPS or Fly.io-class service~~ GitHub Pages + Supabase, see decision log 2026-09-22. Login by invite link, no passwords. Email/push notification when a new week opens.
- **UI split:** map and replay in a 3D canvas; everything else (shops, bank, journal, employment office, week summary) in plain HTML.

## 11. Map rendering and art direction  **DECIDED**
- **three.js**, orthographic isometric camera, flat shading, fixed palette. Toy-town look, deliberately not pixel art.
- **Town is data.** A JSON town file: nodes, roads (edges with travel cost), lots, each lot holding a building recipe and an entrance point. The renderer builds the whole scene from it. Same graph drives movement, travel costs, and the replay.
- **Buildings from recipes.** Footprint + height + colour + roof + text-rendered sign + one landmark prop. Modular parts from Kenney City Kits (Commercial, Suburban, Roads, Industrial; CC0 glTF). Procedural boxes where a kit piece doesn't exist.
- **Figures:** Kenney Blocky/Mini Characters (rigged, animated, CC0). Cars, bikes, buses are objects moving on the road graph.
- **Town editor:** small in-browser tool to place nodes, drag roads, drop building recipes on lots, set entrances. Required to author the board; built as part of the project.
- **Interiors: 2D screens** in a VGA/Sierra style with a clerk sprite, one per storefront. This is where the original's charm lives. LoRA-assisted (Krea 2 or similar, trained on Jones + contemporaries), all output quantised to one shared palette. Done in the art pass, not up front.
- **Portraits:** family photos pixelated to the palette (nod to the original's digitised faces).
- Rejected for the map: 2D tile-based (LimeZu/Kenney 2D), painted map with path overlay. Both lacked unique buildings or an editable board.

## 12. Build order  **DECIDED**
1. Simulation core + plain HTML debug client. Hot-seat playable in one tab, ugly. Balance work starts here.
2. Town JSON + three.js renderer + editor, placeholder recipes. Movement and replay working.
3. Server, accounts, async turns, notifications.
4. Art pass: building recipes, interiors, portraits, palette.
5. Sound and polish.

## 13. Open build decisions
- UI framework for the HTML layer
- Notification mechanism (email/push) beyond page-load and Realtime
- Repo layout (monorepo packages)
- Camera behaviour and map scale
- Editor scope for v1
