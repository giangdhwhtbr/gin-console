# Design: Dependency graph per bead

Epic: gin-console-s77

## Architecture
Frontend only, in `frontend/src/features/beads/`, `frontend/src/app/` and `docs/adr/`. No backend change, no new dependency.

- `graph.ts` (kept and extended): `graphOf(beads, epicId, hideDone)` draws all descendants (closed too unless `hideDone`); new `neighbourhoodOf(beads, id)` returns the bead, its transitive blockers and its transitive blocked beads; layering stays the longest path with the cycle guard; a new ordering pass sorts the nodes of each layer by the average column of their blockers (barycenter, a few sweeps, ties by priority then id); `place()` becomes top-down with a node of 184 by 64 px, a gap of 24 px between columns and 56 px between layers; `step()` follows the new directions.
- `GraphPage.tsx` (new, replaces `GraphView.tsx`): loads the beads once with the same refresh as `BeadsView`, builds the graph for the epic or the neighbourhood, holds `select` in the URL (replace, not push), shows the epic heading bar, the "Hide done" switch, the canvas, and the details panel (`BeadDetailPage embedded`) from 1024px or a bottom sheet with two jump buttons under it.
- `GraphCanvas.tsx` (new, from the drawing part of `GraphView`): a scroll container as high as the window left under the header, an inner box scaled with CSS `transform`, the zoom controls and the percentage; `Ctrl`/`⌘` + wheel zooms; the hidden list of arrows for assistive technology stays.
- `GraphNode.tsx`: id (monospace) and `P<n>`, title, `StateMark`, left edge by state (`stateEdge`), as a card.
- Entry: `BeadDetailPage` shows the button "View dependencies" (the primary button style) when the bead is an epic with children, or a bead whose `dependencies` or `dependents` hold a `blocks` relation; the same page, embedded in the List's panel, shows it too.
- Route: `App.tsx` maps `/beads/<project>/<id>/graph` to `GraphPage`; `filters.ts` drops `"graph"` from `VIEWS` and the `epic` parameter, so `view=graph` shows the List (`ViewTabs` loses the tab); `GraphView.tsx` and the epic picker are deleted.
- `Breadcrumb.tsx` takes an optional `section`; on the Dependencies page it ends with the bead's id as a link and "Dependencies" as the current page.
- `SidePanel` classes (a shared constant, `side-panel.ts`): `lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:overscroll-contain`, plus `tabIndex={0}` and an `aria-label` where the panel is not already a named landmark; used by `ListView`, `GraphPage` and the discussion column of `BeadDetailPage`.
- `docs/adr/0002-hand-drawn-graph-svg.md`: a note that the hand-drawn SVG stays, and that React Flow is considered again for dragging nodes, a minimap or a graph of the whole project, not for zoom.

## Data Flow
`GraphPage` takes `fetchBeads(project, true)` (closed included, because the page always draws closed beads) and refreshes every 10 seconds like the other pages. The epic's descendants or the task's neighbourhood come from `parent` and `blocked_by` of the loaded beads; the focus bead is the one of the URL.

## Error Handling
Not found, load error with Retry (the last data stays when a refresh fails), a cycle warning, and "No dependencies" when there is nothing to draw, as in the discussion. An unknown `select` falls back to the focus bead.

## Testing
`graph.test.ts` (neighbourhood, closed beads, ordering, top-down places, steps), `GraphPage.test.tsx` (the cases of the REQs), routing and button tests, class tests for the side panels, the breadcrumb test; the old Graph view tests go. Manual cases in `tests.md`.
