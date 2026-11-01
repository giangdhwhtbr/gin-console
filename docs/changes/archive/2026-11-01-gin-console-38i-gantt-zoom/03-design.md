# Design: Gantt zoom

Epic: gin-console-38i

## Architecture
This change touches only the frontend `milestones` feature. Nothing changes in the backend, gin-workflow, the milestones API or the beads API, and no dependency is added. The confirmed mockup (`01-proposal.md`) is the visual reference: the console's tokens and Geist type, rows 56 px high (36 px for a child), beads 24 px high, and a label column 300 px wide on wide screens and 168 px otherwise.

`frontend/src/features/milestones/`:
- `gantt.ts` holds the pure logic, so it can be tested without layout:
  - `Zoom = "1w" | "2w" | "all"` and `zoomOf(param)`, which maps anything else to `"all"`.
  - `axisOf(plan, dayWidth, zoom)`. In a zoomed mode it also extends the plan to whole Monday–Sunday weeks, so a period that opens on a Monday before the plan still has columns.
  - `fitDayWidth(first, last, width, floor)`. Working days share what the 8 px weekend columns leave of `width`, and are never narrower than `floor`: 14 px for the whole milestone, 24 px when zoomed. When the floor applies, the chart scrolls.
  - `openingDay(plan, axis)` gives the Monday of the week of `today`, or of the plan's first day (REQ-MILESTONE-UI-011).
  - `stepDay(firstInView, direction, zoom)` gives the next or previous Monday one or two weeks away, clamped to the axis.
  - `dependencyArrows(epics, axis)` returns `{from, to, path, late}`. The path leaves A's last bead, runs down the day boundary between beads, and enters B's first bead from the left. When B starts on the day after A, the path takes a short detour above B's row.
  - `chainOf(epics, id)` returns the epics upstream and downstream of `id`.
  - `childrenOf(beads, epicId)` returns the beads whose `parent` is the epic, sorted by id.
- `GanttChart.tsx` reads the scroller's width with a `ResizeObserver`; without one it reads `clientWidth` once. It draws the whole axis at the fitted day width, an absolutely placed SVG layer for the arrows under the bars, the zoom toolbar and the ‹ › pager. It keeps the pointed epic and the set of expanded epics in component state. The current effect that scrolls to today on `plan.id` becomes a layout effect keyed on `plan.id` and `zoom`: it scrolls to `openingDay`. A refresh keeps `scrollLeft` (REQ-MILESTONE-UI-012).
- `usePan.ts` (new, about 30 lines) is a hook on the scroller: mouse pointer events with the left button, a 4 px threshold, pointer capture, `scrollLeft = start − dx`, and a capturing `click` listener that swallows the click that ends a drag. Touch and trackpads use native scrolling. The hook is active only when the chart is wider than its scroller.
- `GanttTab.tsx` calls `useBeads(project, true)` (open and closed beads, refreshed every 10 s as on the Beads pages) and passes the children of each epic to the chart. A loading or failed beads state passes no children.
- `api.ts`: `milestonePath(project, id, tab, start, zoom)` writes `zoom` only for `1w` and `2w`. `MilestonePage.tsx` reads `zoom` with `zoomOf` and keeps it when the tab or the kick-start date changes.

## Data Flow
1. `MilestonePage` reads `tab`, `start` and `zoom` from the URL, loads the plan as today, and passes `zoom` to `GanttTab`.
2. `GanttTab` loads the project's beads alongside the plan and passes `childrenOf` each epic, or nothing until they load.
3. `GanttChart` measures its width, computes `fitDayWidth` for the zoom's span, builds the axis, and scrolls to `openingDay` on first draw or a zoom change.
4. Choosing a zoom navigates with `replace` to the new URL, which redraws from step 1. Scrolling, dragging and ‹ › change only `scrollLeft`, and the label of days in view is derived from it.
5. Pointing at or focusing an epic sets the highlighted chain. Expanding an epic inserts its child rows, and the arrows are recomputed from the new row positions.

## Error Handling
- A missing or unknown `zoom` shows the whole milestone (REQ-MILESTONE-UI-011).
- A beads request that is loading or failed draws the Gantt without expand buttons. The Gantt shows no extra error, because the plan is still correct and the Graph tab reports beads errors already.
- A `depends_on` id that is not an epic of the milestone draws no arrow. External blockers keep the warning text of REQ-MILESTONE-UI-003.
- A milestone without epics keeps the current empty state and shows no toolbar.

## Testing
- vitest `gantt.test.ts`, one case per rule, each named with its REQ-ID: `zoomOf`, `fitDayWidth` (fill and floor), `axisOf` extended to whole weeks, `openingDay` (today inside and outside the plan), `stepDay` (snaps to Monday, clamps), `dependencyArrows` (arrow, outside id ignored, adjacent-day detour, `late`), `chainOf`, `childrenOf`.
- vitest `MilestonePage.test.tsx` and a new `GanttChart.test.tsx`, with the scroller width stubbed:
  - REQ-MILESTONE-UI-011: zoom buttons, `zoom=2w` in the URL, unknown zoom, zoom kept with the preview.
  - REQ-MILESTONE-UI-012: ‹ disabled at the start, › moves the label; the click that ends a drag does not navigate.
  - REQ-MILESTONE-UI-013: label lines and the title after the bar.
  - REQ-MILESTONE-UI-014: arrows by `data-from` and `data-to`, the chain highlight on hover and focus.
  - REQ-MILESTONE-UI-015: expand, count, child row text and link, beads failure.
- jsdom has no layout, so real dragging, swiping and the look at each zoom are checked by hand (`05-tests.md`).
- `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` must pass.
