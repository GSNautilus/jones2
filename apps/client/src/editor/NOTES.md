# Editor module notes

## Module layout
- `model.ts` — pure `Town` mutators + `validate`/`defaultRecipe`/`suggestMinutes`. No React, no scene.
- `EditorPanel.tsx` — `forwardRef<EditorHandle, EditorPanelProps>` panel. Owns tool mode, selection, pending
  add-edge state, and a 50-entry undo/redo stack (Ctrl+Z/Ctrl+Y, ignored while a form field has focus). Every
  edit goes through `commit()`, which pushes to the undo stack and calls `props.onChange(newTown)`.
- `index.ts` — barrel: `EditorPanel`, `EditorHandle`, `EditorPanelProps`, and the `model.ts` functions.

## Wiring pick/drag into `EditorHandle`
1. Pass `onPick`/`onHover` in `TownSceneOptions` that forward straight to `editorRef.current.onPick`/`.onHover`.
2. The renderer contract has no drag concept, so synthesize it from raw pointer events on the canvas:
   `pointerdown` on a hit node → `onDragStart(hit)` (instead of `onPick`); `pointermove` while dragging →
   `onDrag(hit)` with a fresh ground pick; `pointerup`/`pointerleave`/`pointercancel` → `onDragEnd()` (no
   args — the panel remembers the last position). A click with no movement should still reach `onPick`.
3. After each `onChange(town)`, the parent updates its own state and calls `scene.setTown(town)`. The panel
   never calls `setTown` itself — only `scene.moveNode` for live drag feedback and `scene.setHighlight` for
   selection.

## Limitations
- Add-edge/add-node-as-location and error reporting use `window.prompt`/`alert` — no modal component exists.
- Edge selection only happens via the node inspector's edge list; the renderer has no edge-pick result.
- Text/number fields commit on every keystroke, so heavy typing produces many undo entries (capped at 50).
- Import trusts the file's shape (cast to `Town`); malformed JSON surfaces as `validate()` problems or a
  generic "Could not import" alert, not field-level parse errors.
