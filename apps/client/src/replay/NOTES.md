# Replay module

## Layout
- `types.ts` — contract (owned elsewhere, not modified here).
- `timeline.ts` — `buildTimeline()`. Per player, precomputes idle/held/travel
  segments covering `[0, totalMinutes]`, sorted by start minute. `at(minute)`
  binary-searches segment starts (O(log n)) and interpolates travel poses by
  cumulative path distance.
- `ReplayView.tsx` — overlay controls (play/pause, speed, scrub with marker
  ticks, time readout, Overview/Follow, per-player marker list, step
  buttons, space/arrow keys). Drives `scene.setPoses` from a rAF loop; never
  imports three.js.
- `demo.tsx` — `ReplayDemo`: builds a 3-player week via the real sim
  (`createGame` → scripted `applyAction`, tolerating `ok:false` →
  `resolveWeek`) and renders `ReplayView`.

## Day/time display convention
`Day D, HH:MM` where `day = floor(minute/720)+1`, `hour = 8 + floor((minute
% 720)/60)` — each in-game day is a fixed 12-hour window, 08:00-19:59.
Display-only; unrelated to the sim's `minutesBudget`/`minutesLeft`.

## Limitations
- A trailing zero-width idle segment is always appended per player so a
  query exactly at their last event (or past it) yields an empty caption.
- Scrub-bar marker ticks are absolutely-positioned divs, not a native
  `<datalist>`, for consistent cross-browser rendering.
- Keyboard shortcuts are ignored while an input/select has focus.
- `ReplayDemo` skips scripted actions that fail (e.g. no walk route), so a
  town-graph change could silently shorten the demo week.
