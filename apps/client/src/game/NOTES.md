# game/ — hot-seat harness

## Layout
- `store.ts` — `useGameStore()`: state, persistence (`jones2-client-state`),
  `weekStarts`, per-player `playerColors` (fixed 6-colour `PLAYER_COLORS`,
  indexed by `playerOrder`).
- `format.tsx` — `hm`, `money`, `<Deltas>` shared by the screens.
- `GameRoot.tsx` — the mode switch *and* the stage: it mounts the map once
  (`.stage-map`) and keeps it mounted across play → resolve → replay → play, so
  the replay animates on the same scene. Wraps everything in the HUD's
  `TimePreviewProvider`.
- `PlayScreen.tsx` — no longer a three-column layout: it wires map pick/hover
  (travel, route preview, clock time preview) and renders the HUD overlay
  (`src/hud/`): week log, camera buttons, location panel, status strip, clock.
- `ActionsPanel.tsx` — grouped action buttons only. Each button publishes its
  minute cost to the time preview on hover. The heading, End Week and the week
  log moved to `hud/LocationPanel.tsx` and `hud/WeekLog.tsx`. Accepts an
  `options` prop so the caller can reuse one `availableActions()` call.
- `StatsPanel.tsx` — the player file, rendered inside the HUD status drawer;
  switch-player and abandon live in `hud/StatusStrip.tsx`.
- `SetupScreen.tsx`, `ResolveScreen.tsx` — framed cards (`.hud-modal`).
- `index.ts` — re-exports; imports `game.css`.

## Parent wiring (App.tsx) — unchanged
```
const pickRef = useRef<((hit: PickResult) => void) | null>(null);
const hoverRef = useRef<((hit: PickResult) => void) | null>(null);
const scene = useTownScene({ onPick: h => pickRef.current?.(h), onHover: h => hoverRef.current?.(h) });
<GameRoot scene={scene} mapSlot={<MapCanvas scene={scene}/>} pickRef={pickRef} hoverRef={hoverRef} ReplayView={ReplayView} />
```
`ReplayView` is `React.ComponentType<ReplayProps>` (`ReplayProps` in
`ResolveScreen.tsx`, matching `src/replay/types.ts`), so this module builds
without importing the replay implementation.

## Resolve flow
`GameRoot` sets a local `resolving` flag once `allPlayersDone`. `ResolveScreen`
captures `weekStarts` *before* calling `store.resolve()` (the store then
advances to the next week and overwrites `weekStarts`), shows the replay with
`lastReport.logs`, then a notes step, then calls `onExit`. The clock is part of
`PlayScreen`, so it is absent during the replay by construction.

## Limitations
- Bank-op amount uses one shared input (only shown for deposit), a quirk
  inherited from the debug client.
- Action grouping into kinds (Work/Jobs/Study/...) is a judgment call, not
  spec'd by the sim; see `kindOf` in `ActionsPanel.tsx`.
