# game/ — hot-seat harness

## Layout
- `store.ts` — `useGameStore()`: state, persistence (`jones2-client-state`),
  `weekStarts`, per-player `playerColors` (fixed 6-colour `PLAYER_COLORS`,
  indexed by `playerOrder`).
- `format.tsx` — `hm`, `money`, `<Deltas>` shared by the panels.
- `SetupScreen.tsx`, `StatsPanel.tsx`, `ActionsPanel.tsx`, `PlayScreen.tsx`,
  `ResolveScreen.tsx` — ports of `apps/debug-client`'s screens.
- `index.ts` — re-exports plus `GameRoot`, the mode switch. Plain `.ts`
  (uses `createElement`, no JSX) so it typechecks without a bundler.
- `game.css` — extra rules layered on `../styles.css`; imported by `index.ts`.

## Parent wiring (App.tsx)
```
const pickRef = useRef<((hit: PickResult) => void) | null>(null);
const hoverRef = useRef<((hit: PickResult) => void) | null>(null);
const scene = useTownScene({ onPick: h => pickRef.current?.(h), onHover: h => hoverRef.current?.(h) });
<GameRoot scene={scene} mapSlot={<MapCanvas scene={scene}/>} pickRef={pickRef} hoverRef={hoverRef} ReplayView={ReplayView} />
```
`ReplayView` is `React.ComponentType<ReplayProps>` (`ReplayProps` defined in
`ResolveScreen.tsx`, matching `src/replay/types.ts`'s intended component
props). `GameRoot` never imports `../replay/ReplayView` directly, so this
module builds even before that file exists.

## Resolve flow
`GameRoot` sets a local `resolving` flag once `allPlayersDone`. `ResolveScreen`
captures `weekStarts` *before* calling `store.resolve()` (the store then
advances to the next week and overwrites `weekStarts`), shows the replay with
`lastReport.logs`, then a notes step, then calls `onExit` to clear the flag.

## Limitations
- No lazy-loading of `ReplayView`; parent must supply a real component (a
  placeholder works fine for now).
- Bank-op amount uses one shared input (only shown for deposit), matching a
  quirk already present in the debug client.
- Action grouping into kinds (Work/Jobs/Study/...) is a judgment call, not
  spec'd by the sim; see `kindOf` in `ActionsPanel.tsx`.
