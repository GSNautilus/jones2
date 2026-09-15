# pixelart — working notes

## What exists
- `src/palette.ts` — `PALETTE` (61 colours, index 0 transparent) and `C`, the name→index shorthand every file uses. `SHIRT_KEY` / `PLAYER_SHIRTS` drive character tinting. Phase B added `gold`, `goldDark`, `olive`, `oliveDark`, `slate`, `slateDark`, `maroon`; new colours are appended so existing indices never move.
- `src/surface.ts` — `createSurface`/`createSprite` plus put/get/rect/box/line/fillCircle/fillEllipse/dither/blit/tint/floodFill, the curve family (`bezierQuad`, `bezierCubic`, `catmullRom`, `curve`, `strokePolyline`, `dashedPolyline`) and `spriteFromRows`/`drawRows` for hand-authored pixel grids.
- `src/font.ts` — 5×7 uppercase font, digits and `. , ' - $ : ! ? & / + % *`. `drawText`, `drawTextCentred`, `drawTextShadowed`, `drawTextScaled` (big shop signs), `measureText`.
- `src/parts/` — walls, roofs (flat / gable / hip / sawtooth / tower / smokestack / clock face), windows (pane / grid / band / round), doors (single / double / glass / arched / garage / steps), signs (box / roof / hanging / band / icon / awning / columns / pediment / planter) and **`details.ts`**: fences, bunting, aerials, satellite dish, marquee bulbs, fire escape, notice board, flag, security camera, topiary, produce crate, palm tree, dress form, pawnbroker's balls, and the sign pictograms (cup, fork, dumbbell, bolt, cross, pig).
- `src/buildings/` — 25 generators covering every sim location, exported as `BUILDINGS` plus `buildFromRef(kind, params)` and **`recipes.ts`** (`LOCATION_RECIPES`, `recipeFor`), which maps all 27 sim location ids to a kind and its sign text.
- `src/tiles/` — `grass_0..2`, `water_0..1`, `path`, `plaza` (all 16×16, opaque).
- `src/nature/` — `tree_round`, `tree_pine`, `tree_oak`, `bush`, `flowers`, `rock`.
- `src/props/` — `PROPS`: lamp, bench, car_red/blue/green, bus, signpost, hydrant, mailbox, fence_h, fence_v, picnic_table, dock, bridge.
- `src/ui/` — `UI` and `PANEL_INSETS` / `BUTTON_INSETS` / `ICON_KEYS`: a 9-slice panel, three button states, a 96×96 clock face with separate hand sprites, and twelve 12×12 stat icons.
- `src/characters/` — `idle_<dir>` and `walk_<dir>_<0..2>` for `s n e w`, 12×20, plus `tintCharacter`.
- `tools/png.ts` (zero-dep PNG encoder), `tools/sheet.ts` (grouped contact sheet, the 320×200 mock scene and the 640×200 town strip), `tools/zoom.ts` (dev aid: render named sprites large — it now finds props and UI sprites too).

## Conventions
- Sprite names: `kind` for buildings, `name_variant` for tiles (`grass_0`), `walk_<dir>_<frame>` / `idle_<dir>` for animation, `icon_<stat>` for HUD icons.
- Anchor is the bottom-centre of the footprint; tiles anchor top-left. The bottom three rows of a building are its ground shadow.
- Light is always top-left. Right edges and undersides take the `shade` tone; outlines are `C.ink` (never pure black).
- Buildings are 40–110px on each side. The tests enforce that envelope, an ink silhouette ratio above 0.75, a ground shadow and determinism.
- `noUncheckedIndexedAccess` is off for this package only — pixel buffers are indexed on every line. Bounds are checked in `surface.ts`.

## Adding a building
1. New file in `src/buildings/`. Call `frame(width, height, { topPad, roofH })` for the layout (it reserves the shadow rows and returns `x/w/cx/roofY/wallY/groundY`).
2. **Budget the vertical band before drawing anything.** Almost every problem in Phase B was a sign, a window grid and a door recess silently overlapping. Write the row ranges down: sign band `wallY+3 .. wallY+14`, mid detail, shopfront `groundY-24 .. groundY-4`, plinth `groundY-3 ..`. If they do not fit, make the sprite taller rather than squeezing.
3. Draw in this order: anything behind (smoke), roof, wall, signs, shopfront, then `groundShadow(t, f.x, f.groundY + 1, f.w)`. Anything that must stand *in front* (a bus at a kerb, palms, produce crates) goes after the shadow.
4. Read params with `str`/`num`/`bool`/`colorParam` from `./common` — never read `params` directly, so unknown values fall back cleanly.
5. Register it in `src/buildings/catalogue.ts` and add a `LOCATION_RECIPES` entry in `src/buildings/recipes.ts`; the tests and contact sheet pick both up automatically.
6. `npx tsx packages/pixelart/tools/sheet.ts` and **look at** `art/sheets/contact.png` and `art/sheets/town-strip.png`.

## Tricks worth reusing
- `haloBlit` (parts/common) draws a sprite with a 1px ink halo. Use it whenever a prop stands in front of a facade it would otherwise dissolve into — the depot bus was invisible until it got one, and a dark recess behind it.
- `outlineSilhouette` / `inkRowEdges` (parts/common) ink an irregular shape so it still passes the silhouette rule. Call them *before* `groundShadow`, which is deliberately dithered.
- Names wider than the facade go on two lines via `sign` / `sign2` rather than being squeezed with `spacing: 0`. `signWidthFor(text)` gives the panel width a name needs.
- Text at 5×7 needs `5n + (n-1)` pixels at spacing 1 — check that against the facade width *before* placing the band.

## Known weaknesses
- The QT Clothing palms are the weakest thing in the catalogue: at 26–32px tall the fronds collapse into a green blob at 1×, and the crowns crowd the fascia they are meant to flank.
- `fence_v` (the run receding from the viewer) barely reads as a fence at 1×; it is three white posts and two diagonals and wants a proper perspective study.
- The dress form in the QT window still reads a little like a table lamp — the skirt flare against the narrow bodice is not quite right.
- `roofHip` looks nearly flat on wide, shallow roofs — it needs a real ridge highlight rather than the current shade band.
- No night variants beyond per-window `lit` flags, and no interiors.
- `tools/zoom.ts` writes `art/sheets/zoom.png`, which is scratch — do not commit it.
