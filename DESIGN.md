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
- 2026-09-14 — Initial discussion. Decided: modes (classic + fixed length), human-only first, online-first architecture, non-ring map, visible Health, career tracks with cross-business experience, forecastable events with multiple news sources, property ladder with named late-game properties, keep tone. Deferred: traits, AI rivals, solo mode. Rejected: player-to-player lending.
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
- **Hosting:** small VPS or Fly.io-class service. Login by invite link, no passwords. Email/push notification when a new week opens.
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
- Server persistence and hosting specifics
- Auth and notification mechanism
- Repo layout (monorepo packages)
- Camera behaviour and map scale
- Editor scope for v1
