# @jones2/pixelart

All game art, generated as code. No image files are checked in except contact
sheets for review.

## Rules
- Pure TypeScript, no DOM. `Sprite` = indexed-colour grid over one shared `Palette` (see `src/types.ts`).
- One palette for the whole game (~40 colours, VGA-ish, muted, one shared outline ink). Every sprite uses it.
- Style: tilted top-down (roof band visible above the facade), 1px dark outline on every silhouette, flat fills with one shade band, no anti-aliasing, no gradients.
- Scale: 16px tiles. Buildings 40–110px on a side (kiosks at the bottom, apartment towers at the top). Characters ~12×20. Displayed at integer zoom (2×–4×) with nearest-neighbour.
- Text: 5×7 pixel font (uppercase, digits, punctuation). Signs must be readable at 2×.
- Every generator is deterministic: same params → same pixels. Tests snapshot a hash per sprite.

## Layout
- `src/palette.ts` — the palette and named colours.
- `src/surface.ts` — Surface + drawing primitives (put, rect, box, line, curve, dither, blit, text).
- `src/font.ts` — 5×7 font.
- `src/parts/` — reusable building parts: walls, roofs (flat/gable/hip/sawtooth), window grids, awnings, doors, signs, columns, chimneys, props.
- `src/buildings/` — one file per building kind; `catalogue.ts` maps kind → generator, `recipes.ts` maps every sim location id → `{ kind, params }`.
- `src/tiles/` — grass, water, path, plaza tiles and variants.
- `src/nature/` — trees, bushes, flowers, rocks.
- `src/props/` — street furniture and vehicles: lamps, benches, cars, a bus, fences, a dock, a bridge.
- `src/characters/` — player figures with 4-direction 3-frame walk, tinted per player.
- `src/ui/` — 9-slice panel and buttons (`PANEL_INSETS` / `BUTTON_INSETS`), a 96×96 clock face with separate hand sprites, and twelve 12×12 stat icons.
- `tools/sheet.ts` — renders the review PNGs: a grouped contact sheet, a 320×200 mock scene and a 640×200 town strip (Node, zero deps: tiny PNG encoder in `tools/png.ts`).
