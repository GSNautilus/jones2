# Jones 2 — project instructions

A modernized *Jones in the Fast Lane*. Family online play, async weeks, browser client.

## Read first
- `DESIGN.md` — the running design document. Every gameplay and build decision is recorded there with a status tag. Do not re-litigate DECIDED items; add new decisions to the decision log at the bottom.
- `STATUS.md` — what is built, what is in progress, what is next. Update it at the end of every working session.
- `docs/PLAN.md` — the current plan (classic Jones on the new map) with its open decisions. `docs/original-rules.md` is the extracted fan-wiki reference for the original game's rules; treat its numbers as the spec for the classic ruleset.

## Layout (npm workspaces)
- `packages/sim` — deterministic game core. Pure TypeScript, no I/O, no DOM, no clock. `applyAction(state, playerId, action)` and `resolveWeek(state)`. All content (locations, jobs, items, degrees, food, news, achievements) lives in `packages/sim/src/content/` as typed data tables. Balance changes edit data, not logic.
- `packages/town` — town graph schema, the town JSON, and path/travel utilities. The sim depends on it.
- `apps/balance` — headless runner that plays many games with scripted strategies to find dominant strategies.
- `apps/debug-client` — plain HTML/React hot-seat client for playtesting. Deliberately ugly.
- `apps/client` — the real client (pixel map + React UI); online play in `src/online/`, published to GitHub Pages by `.github/workflows/pages.yml`.
- `packages/server` — the submit-turn Edge Function's logic (bundled into `supabase/functions/_shared`), and the database tests.
- `supabase/` — migrations and the Edge Function entry. `tools/host` — host commands run with the secret key (upload audio, new game, invites). Setup: `docs/SUPABASE.md`.
- Never commit anything from the original game: it lives in gitignored `assets/sierra/` (see `assets/README.md`). The repo is public.

## Rules
- Commands handed to the user are PowerShell. Always.
- No multi-agent fan-out without stating the scale and getting explicit approval first. Default to doing the work directly.
- Keep the sim pure and deterministic. Randomness only through the seeded RNG in state. No `Date`, no `Math.random` in `packages/sim`.
- Tests are the review mechanism: `npm test` must pass before a milestone is called done.
- Prefer small files. Anything an agent has to re-read repeatedly should be short.
