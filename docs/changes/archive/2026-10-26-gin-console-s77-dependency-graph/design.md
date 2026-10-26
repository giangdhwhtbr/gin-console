# Design: Dependency graph per bead

Epic: gin-console-s77

## Architecture
Frontend only, in `frontend/src/features/beads/`, `frontend/src/app/` and `docs/adr/`. No backend change, no new dependency.

- `graph.ts` (kept and extended): `scopeGraph(beads, scopeId | null, {hideDone, onlyLinked})` takes the direct children of the scope (the beads without a parent for the project) as nodes; a map from every bead to the node that holds it (walking `parent`, with a guard against parent loops) lifts each `blocked_by` relation to an arrow between two nodes, drops it when both ends map to the same node, merges arrows of one pair with the list of their relations (count for the label and for the hidden list), drops relations that touch the scope bead itself and keeps relations with beads outside the scope as outside nodes on both sides; new `neighbourhoodOf(beads, id)` returns the bead, its transitive blockers and its transitive blocked beads; layering stays the longest path with the cycle guard; a new ordering pass sorts the nodes of each layer by the average column of their blockers (barycenter, a few sweeps, ties by priority then id); `place()` becomes top-down with a node of 184 by 64 px, a gap of 24 px between columns and 56 px between layers; `step()` follows the new directions.
- `GraphPage.tsx` (new, replaces `GraphView.tsx`): one component for both routes; loads the beads once with the same refresh as `BeadsView`, builds the scope graph when the scope is the project or has children and the neighbourhood otherwise, holds `select` in the URL (replace, not push) and goes down on double click or "View dependencies" with `navigate` (push), shows the heading bar (name or id, "n of m done", the scope bead's own blockers and blocked beads as links), the "Hide done" and "Only linked" switches, the canvas, and the details panel (`BeadDetailPage embedded`) from 1024px or a bottom sheet with two jump buttons under it.
- `GraphCanvas.tsx` (new, from the drawing part of `GraphView`): a scroll container as high as the window left under the header, an inner box scaled with CSS `transform`, the zoom controls and the percentage; `Ctrl`/`⌘` + wheel zooms; the hidden list of arrows for assistive technology stays.
- `GraphNode.tsx`: id (monospace) and `P<n>`, title, `StateMark`, left edge by state (`stateEdge`), as a card; a node with children adds "n of m done" and an open icon; arrows of several relations carry the "n links" label.
- Entry: `BeadDetailPage` shows the button "View dependencies" (the primary button style) when the bead is an epic with children, or a bead whose `dependencies` or `dependents` hold a `blocks` relation; the same page, embedded in the List's panel, shows it too.
- Route: `App.tsx` maps `/beads/<project>/graph` and `/beads/<project>/<id>/graph` to `GraphPage`; `BeadsView` shows the link "Dependencies" next to the project picker; `filters.ts` drops `"graph"` from `VIEWS` and the `epic` parameter, so `view=graph` shows the List (`ViewTabs` loses the tab); `GraphView.tsx` and the epic picker are deleted.
- `Breadcrumb.tsx` takes an optional `graph` path (the ancestors of the scope bead from the top); on a Dependencies page it reads place, "Dependencies" (project page), the ancestors as links to their pages, and the scope bead as the current page.
- `SidePanel` classes (a shared constant, `side-panel.ts`): `lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:overscroll-contain`, plus `tabIndex={0}` and an `aria-label` where the panel is not already a named landmark; used by `ListView`, `GraphPage` and the discussion column of `BeadDetailPage`.
- `docs/adr/0002-hand-drawn-graph-svg.md`: a note that the hand-drawn SVG stays, and that React Flow is considered again for dragging nodes or a minimap, not for zoom or for the project page (going down one level keeps every page small).

## Data Flow
`GraphPage` takes `fetchBeads(project, true)` (closed included, because the page always draws closed beads) and refreshes every 10 seconds like the other pages. The epic's descendants or the task's neighbourhood come from `parent` and `blocked_by` of the loaded beads; the focus bead is the one of the URL.

## Error Handling
Not found, load error with Retry (the last data stays when a refresh fails), a cycle warning, and "No dependencies" when there is nothing to draw, as in the discussion. An unknown `select` falls back to the focus bead.

## Testing
`graph.test.ts` (scope nodes, lifted arrows at any depth, merged arrows and counts, same-node relations dropped, outside beads on both sides, parent loops, neighbourhood, closed beads, ordering, top-down places, steps), `GraphPage.test.tsx` (the cases of the REQs), routing and button tests, class tests for the side panels, the breadcrumb test; the old Graph view tests go. Manual cases in `tests.md`.
