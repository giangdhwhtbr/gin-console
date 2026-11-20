# Design: Graph and Lanes canvas usability

Epic: gin-console-csp

## Architecture

- **Graph canvases** (`frontend/src/features/beads/GraphCanvas.tsx:54`, `LaneGraphCanvas.tsx:67`):
  - The scroll box loses `h-[calc(100dvh-14rem)] overflow-auto overscroll-contain`. It gets `overflow-x-auto overflow-y-hidden overscroll-x-contain isolate`, and its height is the content height at the current scale (`height × scale`, plus the scroll bar).
  - A small `min-h-40` is kept so an empty or tiny graph keeps a visible box.
- **Lanes canvas** (`frontend/src/features/beads/LanesCanvas.tsx:75`): the same classes, and its height is the board height. The sticky header column (`sticky left-0`) keeps working sideways.
- **Zoom** (`frontend/src/features/beads/useZoom.ts`):
  - `fit` uses the canvas width only: `scale = min(1, clientWidth / contentWidth)`, clamped to the 40%–200% range.
  - The wheel handler stays: it calls `preventDefault` only with `Ctrl`/`⌘`.
  - `fitScale(width, height, boxW, boxH)` becomes `fitWidth(width, boxW)`. Its tests move with it.
- **No default selection** (`frontend/src/features/beads/GraphView.tsx` selection, used by `LanesView.tsx`): with no `select` in the URL, nothing is selected and the details panel is not rendered, so the canvas spans the page width. Escape returns to no selection. `select=none` keeps its meaning.
- **Lane boxes left to right** (`frontend/src/features/beads/laneGraph.ts`, pure; mockup `assets/mockup-c.html`):
  - **Tiers:** tiers become columns. The column x comes from the widest box of the earlier tiers plus a tier gap (about 140px, wide enough for the chips). The boxes of a tier stack vertically with a box gap. Box internals stay the same (cards left to right by layer, stacks under each other).
  - **Cross-lane arrows:** they leave the source card's right middle and run in the tier gap to the target box's left edge, at the waiting card's middle y.
  - **Back and loop arrows:** they run in a channel below all boxes.
  - **Chips:** they sit on the arrow in the tier gap, spaced vertically so they never overlap.
  - **Keys:** `laneGraphStep` follows the new rule (Left/Right along the box and across tiers via arrows, Up/Down between boxes of a tier). `laneGraphLines` keeps its texts.
- **Unchanged:** `DetailsPanel` (sticky, own scroll, `lg:overscroll-contain`), the Gantt, the List view.

## Data Flow

No data change. The browser lays the canvas out at its content height. The page scrolls vertically, and the canvas scrolls horizontally.

## Error Handling

- **Very wide graphs:** they still scroll sideways inside the canvas.
- **Very tall graphs:** they make the page long; this is accepted in the proposal.
- **Empty graph:** the canvas keeps `min-h-40`.

## Testing

- **vitest:**
  - `useZoom` tests:
    - Fit to width (wide graph below 100%, narrow and tall graph stays 100%).
    - A plain wheel event is not default-prevented; a `Ctrl`+wheel event is.
  - Canvas tests (`GraphCanvas`, `LaneGraphCanvas`, `LanesCanvas`):
    - Each scroll box has `overflow-x-auto`, `overflow-y-hidden` and `overscroll-x-contain`.
    - It has no fixed `h-[calc` height and no `overscroll-contain`.
    - Its style height equals the content height at the scale.
- **vitest (layout and selection):** `laneGraph.test.ts` invariants are rewritten for columns: tiers left to right, boxes of a tier stacked, no arrow crossing a card or header text, chips in the tier gap without overlap, loop arrows below the boxes, and the keys rule. `GraphView`/`LanesView` tests check that no panel shows without `select` and that a click opens it.
- **Playwright:** gin-qa cases for the REQ-UI-122 and REQ-UI-077 scenarios. The wheel specs use `page.mouse.wheel` over the canvas and assert that `window.scrollY` grows while the canvas `scrollTop` stays 0. The `readability.spec.ts` groups stay green.
- **TC-1:** on the deployed console, the wheel checks at 1440 and 1920px (the page scrolls wherever it is taller than the window; the canvas never scrolls up or down), plus the live readability check.

## Open Technical Questions
