# src/classic — the classic play interface

The original's screen, for `GameConfig.ruleset === 'classic'`. `GameRoot` picks
between this and `src/game/PlayScreen.tsx` (the Jones 2 screen, unchanged), so
nothing here can regress the other ruleset.

Shape (docs/PLAN.md §2 and §4, mocked in `art/sheets/ui-classic.png`): the board
fills the stage; the only permanent furniture is the pie clock bottom-centre
with WEEK #N under it and the cash readout bottom-right. Everything else is a
framed window in the centre, over the map.

## Files
Pure, unit-tested (no DOM, no React):
- `locations.ts` — the 13 open ids vs the 22 shut ones, clerk greetings (rotated
  by visit count), display names.
- `menu.ts` — the window's contents **straight from `availableActions`**. The
  only decisions made here are (a) which action types are BUTTONS along the
  bottom (`BUTTON_ACTIONS`: the verbs — WORK, RELAX, RAISE, BROKER, PAY RENT,
  EXTEND, LOAN, PAY LOAN, LOTTERY, NEWS) and which are priced MENU ROWS
  (everything else: applications, lessons, purchases, banking, stocks, pawn,
  moving house), and (b) `splitLabel`, which lifts the money out of the sim's
  label so the row can be set with a dotted leader. `travel` and `endWeek` never
  appear in a window. DONE is a button with a null action.
- `cards.ts` — the start-of-week deck from `PlayerState.classic.weekStart`: the
  sim's order, one heading per step id, deltas as lines.
- `tooltip.ts` — "Bank · 2h", or "Not enough time: 3h, 2h left".
- `tokens.ts` — seat -> token number / colour / figure label.
- `layout.ts` — the window's geometry in NATIVE pixels, plus `hitPanel`. One
  layout, used by both the painter and the mouse, so they cannot drift.
- `screens.ts` — the GOALS and STATISTICS models.
- `paint.ts` — draws a `PanelModel` into a pixel-art `Surface` with the art
  package's own primitives (9-slice frame, title plate, portrait, bubble, rows,
  buttons). `fontSafe` blanks what the 5x7 font cannot draw (no lowercase, no
  parentheses).

React:
- `PixelPanel.tsx` — one canvas: paint at native size, blow up by an integer
  zoom with smoothing off, hit-test with the same layout. Carries a
  `data-buttons` attribute purely so the screenshot harness can click DONE.
- `ClassicScreen.tsx` — the screen. Map wiring (highlight, hover route +
  tooltip + clock preview, click to travel and open), the card deck, the
  window, goals/statistics, the bottom bar.

## Things worth knowing
- The map hover/pick handlers are registered **once** and read everything
  volatile through refs. Re-registering them on every render would run the effect
  cleanup, which clears the route and the clock preview the hover just set.
- Tokens and CLOSED boards reach the map through the figure MARKER convention
  in `src/map/figures.ts`; `src/map/api.ts` (THE CONTRACT) is untouched.
- The clock now FILLS as the week is spent (`pieFraction` / `previewWedge` in
  `src/hud/clockMath.ts`). The old drain-ring maths is still exported and still
  tested, because the Jones 2 screen reads it.
