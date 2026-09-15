# pixelart — working notes

## What exists
- `src/palette.ts` — `PALETTE` (54 colours, index 0 transparent) and `C`, the name→index shorthand every file uses. `SHIRT_KEY` / `PLAYER_SHIRTS` drive character tinting.
- `src/surface.ts` — `createSurface`/`createSprite` plus put/get/rect/box/line/fillCircle/fillEllipse/dither/blit/tint/floodFill, the curve family (`bezierQuad`, `bezierCubic`, `catmullRom`, `curve`, `strokePolyline`, `dashedPolyline`) and `spriteFromRows`/`drawRows` for hand-authored pixel grids.
- `src/font.ts` — 5×7 uppercase font, digits and `. , ' - $ : ! ? & / + % *`. `drawText`, `drawTextCentred`, `drawTextShadowed`, `drawTextScaled` (big shop signs), `measureText`.
- `src/parts/` — walls, roofs (flat / gable / hip / sawtooth / tower / smokestack / clock face), windows (pane / grid / band / round), doors (single / double / glass / arched / garage / steps), signs (box / roof / hanging / band / icon / awning / columns / pediment / planter).
- `src/buildings/` — `monolith`, `bank`, `zmart`, `university`, `factory`, `house`, exported as `BUILDINGS` plus `buildFromRef(kind, params)`.
- `src/tiles/` — `grass_0..2`, `water_0..1`, `path`, `plaza` (all 16×16, opaque).
- `src/nature/` — `tree_round`, `tree_pine`, `tree_oak`, `bush`, `flowers`, `rock`.
- `src/characters/` — `idle_<dir>` and `walk_<dir>_<0..2>` for `s n e w`, 12×20, plus `tintCharacter`.
- `tools/png.ts` (zero-dep PNG encoder), `tools/sheet.ts` (contact sheet + mock scene), `tools/zoom.ts` (dev aid: render named sprites large).

## Conventions
- Sprite names: `kind` for buildings, `name_variant` for tiles (`grass_0`), `walk_<dir>_<frame>` / `idle_<dir>` for animation.
- Anchor is the bottom-centre of the footprint; tiles anchor top-left. The bottom three rows of a building are its ground shadow.
- Light is always top-left. Right edges and undersides take the `shade` tone; outlines are `C.ink` (never pure black).
- `noUncheckedIndexedAccess` is off for this package only — pixel buffers are indexed on every line. Bounds are checked in `surface.ts`.

## Adding a building
1. New file in `src/buildings/`. Call `frame(width, height, { topPad, roofH })` for the layout (it reserves the shadow rows and returns `x/w/cx/roofY/wallY/groundY`).
2. Draw in this order: anything behind (smoke), roof, wall, signs, shopfront, then `groundShadow(t, f.x, f.groundY + 1, f.w)`.
3. Read params with `str`/`num`/`bool`/`colorParam` from `./common` — never read `params` directly, so unknown values fall back cleanly.
4. Register it in `src/buildings/catalogue.ts`; the tests and contact sheet pick it up automatically.
5. `npx tsx packages/pixelart/tools/sheet.ts` and **look at** `art/sheets/contact.png`.

## Known weaknesses
- Front/back walk frames differ by a single lifted pixel; the motion barely reads at 1×. The side frames are much better.
- `roofHip` looks nearly flat on wide, shallow roofs — it needs a real ridge highlight rather than the current shade band.
- No night/lit-window variants, no UI sprites (`src/ui/` in the README is still empty), no interiors.
- `bank` is the plainest hero building: a lot of undifferentiated grey between the pediment and the colonnade.
