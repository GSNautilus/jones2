# src/classic — the classic play interface

The original's screen, for `GameConfig.ruleset === 'classic'`. `GameRoot` picks
between this and `src/game/PlayScreen.tsx` (the Jones 2 screen, unchanged), so
nothing here can regress the other ruleset.

Shape (docs/PLAN.md §2 and §4, mocked in `art/sheets/ui-classic.png`): the board
fills the stage; the only permanent furniture is the pie clock bottom-centre
with WEEK #N under it, the big cash readout with END TURN bottom-right, and
GOALS / STATISTICS / OPTIONS bottom-left. Everything else is a framed window
in the centre, over the map.

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
  appear in a window. DONE is a button with a null action. Rows are never
  re-sorted: the sim's order is the original's shelf order, and an unaffordable
  row greys out in place so nothing moves as cash or time changes.
- `cards.ts` — the start-of-week deck from `PlayerState.classic.weekStart`: the
  sim's order, one heading per step id, deltas as lines.
- `tooltip.ts` — "Bank · 2h", or "Not enough time: 3h, 2h left".
- `tokens.ts` — seat -> token number / colour / figure label.
- `layout.ts` — the window's geometry in NATIVE pixels, plus `hitPanel`. One
  layout, used by both the painter and the mouse, so they cannot drift.
- `screens.ts` — the GOALS and STATISTICS models.
- `screen.ts` — sizing for the device (PLAN §7): crisp scales in whole device
  pixels, `fitPanel` (a window's scale, width, rows in a given room),
  `placeFurniture` and `chooseLayout` (corners / rail / dock and the furniture's
  scale, so windows never cover the furniture).
  `useScreen.ts` is the React hook that feeds it.
- `touch.ts` — two-tap travel: `tapResult` decides select / act / clear.
- `paint.ts` — draws a `PanelModel` into a pixel-art `Surface` with the art
  package's own primitives (9-slice frame, title plate, portrait, bubble, rows,
  buttons). `fontSafe` blanks what the 5x7 font cannot draw (no lowercase, no
  parentheses).

React:
- `PixelPanel.tsx` — one canvas: paint at native size, blow up by an integer
  zoom with smoothing off, hit-test with the same layout. Carries a
  `data-buttons` attribute purely so the screenshot harness can click DONE.
- `OptionsPanel.tsx` — the OPTIONS window: Music and Sound sliders with a mute
  each (`AudioSettings.musicMuted` / `soundMuted`), NEW GAME. A DOM `Frame`,
  because the pixel window has no slider.
- `ClassicScreen.tsx` — the screen. Map wiring (highlight, hover route +
  tooltip + clock preview, click to travel and open), the card deck, the
  window, goals/statistics/options, the bottom bar with END TURN.

## Things worth knowing
- Touch (PLAN §7): every canvas here uses pointer events, so mouse, pen and
  finger share one path. A finger's first map tap runs the same `preview` the
  mouse hover does; `go` is what a click does. The window's `density: 'touch'`
  only changes row and button heights; the desktop's pixels are identical.
- The map hover/pick handlers are registered **once** and read everything
  volatile through refs. Re-registering them on every render would run the effect
  cleanup, which clears the route and the clock preview the hover just set.
- Tokens and CLOSED boards reach the map through the figure MARKER convention
  in `src/map/figures.ts`. `FigureStyle` (the contract) carries `emphasis`
  (the active player's big, bobbing token; every other token is plain size so
  four at one door sit side by side) and `caption` (the recap's bubble saying
  what a player is doing).
- The clock now FILLS as the week is spent (`pieFraction` / `previewWedge` in
  `src/hud/clockMath.ts`). The old drain-ring maths is still exported and still
  tested, because the Jones 2 screen reads it.
