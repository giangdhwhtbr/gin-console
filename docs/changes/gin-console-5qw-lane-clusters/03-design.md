# Design: Lane clusters

Epic: gin-console-5qw

## Architecture

- **Colours** (`frontend/src/index.css`): tokens `--lane-1` … `--lane-8` with a light and a dark step each, mapped as `--color-lane-1..8` in the Tailwind theme.

  | Theme | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
  |---|---|---|---|---|---|---|---|---|
  | Light | `#2a78d6` | `#eb6834` | `#1baf7a` | `#eda100` | `#e87ba4` | `#008300` | `#6250d6` | `#e34948` |
  | Dark | `#3987e5` | `#d95926` | `#199e70` | `#c98500` | `#d55181` | `#008300` | `#9085e9` | `#e66767` |

  - These are the reference categorical palette, checked with the dataviz validator: every adjacent pair passes the CVD and normal-vision floors in both themes. Light mode has a contrast warning, which the always-present lane names relieve.
  - A box is filled with `color-mix(in srgb, var(--lane-k) 9%, var(--card))` (16% in dark) and bordered with `color-mix(… var(--lane-k) 55%, transparent)` (60% in dark).
- **Layout** (`frontend/src/features/beads/laneGraph.ts`, new, pure, unit-tested):
  - `laneGraph(beads, scopeId, matched, now): LaneGraph` returns `{ boxes, cards, arrows, chips, cycle, width, height }`.
  - It reuses `lanes.ts` (`tracksOf`, `depsOf`, `laneState`, the row order) and `mergeGates.ts` (`gateTarget`, `gateWords`, `gateState`).
  - **Box tiers:** a longest path over the lane-to-lane edges, so a lane sits below the lanes it waits for. A cycle between lanes puts its lanes in one tier and lists them in `cycle`. The "No lane" box takes the last tier.
  - **Cards in a box:** columns come from the dependency layer inside the lane, and cards of one layer stack vertically. Box width and height come from these.
  - **Placement:**
    - Each tier is a row of boxes with gaps.
    - The gap between tiers is tall enough for the chips.
  - **Arrows:**
    - Inside a box: from the right middle of one card to the left middle of the next. When the target is not in the next column, the arrow runs through the gap under the cards.
    - Between lanes: a curve from the bottom middle of the source card to the top edge of the target box, above the column of the target card.
    - Arrows through a gate are dashed while the gate is open.
  - **Chips:** each chip sits on its arrow in the gap between tiers. Chips in one gap are spaced so that none overlaps another (the `linkLabels` idea).
- **View:**
  - `GraphView.tsx`: when `hasLanes(beads, scopeId)`, it renders the lane graph and hides "Only linked"; otherwise it renders as today.
  - `LaneGraphCanvas.tsx` (new) draws the computed layout. The zoom state, fit and Ctrl/⌘-wheel zoom move from `GraphCanvas.tsx` into `useZoom.ts` and `ZoomBar.tsx`, shared by both canvases, so zoom keeps one implementation and the layered canvas stays as it is (planning decision, see `04-plan.md`).
  - `LaneBox.tsx` (new) draws one box. Its header shows the swatch, the name in bold and a `StateWord` on line 1, and an inline `FactList`-style muted line 2 with ellipsis and title.
  - Cards are `GraphNodeButton` with `showLane={false}`. Chips are opaque HTML elements with an icon (`Clock`/`Check`) and words, drawn above the SVG.
- **Keys:** a `laneGraphStep(layout, id, key)` helper. Left and right move within a box in card order. Up and down move to the nearest card in the nearest box of the tier above or below.
- **Unchanged:** `scopeGraph`/`layout`/`place` in `graph.ts` and the Graph of scopes without lanes, the Lanes view, and the lane chips elsewhere.

## Data Flow

The Graph view resolves the scope, and `hasLanes` decides between layers and lane boxes. The lane graph groups the scope's children by lane and finds the tracks that merge gates wait for. It then tiers the boxes, places the cards and routes the arrows and chips, and the canvas draws boxes, arrows, cards and chips in that order (`docs/specs/ui/diagrams/lane-clusters-activity.md`). No backend change; the data is the `BeadSummary` fields of REQ-BEADS-019.

## Error Handling

- **Gate whose track is not drawn:** a chip on the top edge of the waiting box, with no arrow.
- **Cycle between lanes:** the lanes go in one tier, no back arrow is drawn, and the Graph's cycle warning lists them.
- **Cycle inside a lane:** card order falls back to track number, then id.
- **Filters:** a filter that leaves a box empty removes the box. A filter that leaves no card at all shows "No beads match these filters".

## Testing

- **vitest:**
  - `laneGraph.test.ts`:
    - box tiers, box order and the "No lane" tier;
    - card columns and stacking inside a box;
    - arrows that never cross a card or a header rectangle;
    - chips that never overlap;
    - unknown-track chips;
    - lane cycles;
    - colour slots by sorted name, stable under filters;
    - `laneGraphStep`.
  - `GraphView.test.tsx`: lane boxes with lanes; layers and "Only linked" without lanes; no gate node.
  - `LaneBox.test.tsx`: header lines, ellipsis and title, the No lane style.
- **Playwright:**
  - New gin-qa cases for REQ-UI-117 and REQ-UI-118, with specs.
  - TC-UI-176 (merge gate node) is updated to the chip, and the gate-node case moves to the project scope.
  - `readability.spec.ts` gets the Graph of `ex-e12` in its page groups.
- **TC-1:** the live readability check of the Graph of `ex-e12` at 390, 1024, 1440 and 1920px in both themes on the deployed console, with screenshots compared to `docs/specs/ui/assets/2026-11-20/shots/b-*.png`. Look at each screenshot, not only the finding count (`.planning/knowledge/readable-ui.md`).

## Open Technical Questions
