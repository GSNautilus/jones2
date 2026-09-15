# hud/ — the play-screen overlay

The map fills the stage (`game/GameRoot.tsx` mounts it); the HUD overlays it in
`.hud-root`: clock bottom-centre, status bottom-left, location panel right, log
top-left, camera buttons top-right. Under 1000px the panel becomes a sheet.

## Files
- `clockMath.ts` — pure: minutes → day index, hand angles, ring fraction, zone,
  preview arc, `formatHM`. Tested in `test/hud/clockMath.test.ts`.
- `raster.ts` — tiny RGBA rasteriser (disc / annulus sector / Bresenham hand);
  canvas arcs are anti-aliased, these are not, so magnifying keeps pixels.
- `Clock.tsx` — 96×96 art blitted from an offscreen canvas at integer scale
  (default 2 ⇒ 192 css px), `imageSmoothingEnabled = false`; animates old → new
  minutes over 400 ms (rAF + refs). `paintClock()` is exported for Node.
- `preview.tsx` — the time preview store. `useSetTimePreview()` is write-only
  (never re-renders the caller), `useTimePreview()` reads (the clock does),
  `usePreviewHandlers(minutes)` spreads onto a hover target. Action buttons
  (`game/ActionsPanel.tsx`), End Week and the map's travel hover
  (`game/PlayScreen.tsx`) publish through it.
- `Frame.tsx` / `hud.css` — bevelled frames, buttons, plates, LED readout.
- `StatusStrip.tsx`, `LocationPanel.tsx`, `WeekLog.tsx`, `MapControls.tsx`, and
  `skin.ts` (palette + art-package adapter).

## Swapping in pixel UI sprites
`skin.ts` is the only file that imports `@jones2/pixelart`. It duck-types the UI
catalogue: whichever of `UI` / `UI_SPRITES` / `uiSprites` / `UI_CATALOGUE` the
package exports is used, and `clockSkin()` looks for `clock_face`,
`clock_hand_hour`, `clock_hand_minute` (aliases in the file). Once those exist
the clock paints the sprite face instead of drawing its own; nothing else
changes. Panel/button 9-slices and 12×12 icons are still CSS — adopting them
means a `<Frame>` variant that paints the 9-slice, again driven from `skin.ts`.

## Limitations
- Hands are drawn, not sprites: rotating an indexed sprite needs a helper the
  art package does not export yet.
- The clock shows the *current player's* budget, so a hot-seat switch spins the
  hands through the 400 ms tween.
- A map-hover preview lingers if the pointer leaves the canvas without a final
  hover event (it clears on the next hover, pick or move).
- No pixel font: headings use a bold monospace stack with letter-spacing.
