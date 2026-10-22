# Design: Beads graph

Epic: gin-console-61l

## Architecture
Frontend only, in `frontend/src/features/beads/`; no backend change, because `BeadSummary` already carries `parent` and `blocked_by` (REQ-BEADS-010).

- `graph.ts` (pure): `epicsOf(beads)`, `graphOf(beads, epicId, showClosed)` returning nodes (with `external` flag) and edges, `layerOf(graph)` (longest path, cycle-safe, returns the cycle members), `chainOf(graph, id)` (transitive blockers and blocked).
- `GraphView.tsx`: epic picker, SVG drawing, selection, keyboard, side panel (reuses `BeadDetailPage embedded` as the Tree view does).
- `GraphNode.tsx`: one node (id, `P<n>`, title, icon + state label, left-edge tint).
- `filters.ts`: `graph` joins `VIEWS`; new URL parameter `epic`; `select` keeps its meaning. `ViewTabs.tsx` gets the tab. `BeadDetailPage.tsx` shows "View graph" for an epic.
- `index.css`: state colour tokens `--state-ready|progress|blocked|done|deferred`, a light and a dark value each (contrast at least 4.5:1).

The SVG is hand-drawn, layered by longest path, scrolling horizontally. Decision and upgrade threshold in `docs/adr/0002-hand-drawn-graph-svg.md`.

## Data Flow
`BeadsView` loads the beads once (REQ-UI-030) and passes them to `GraphView`. `graphOf` walks `parent` from the chosen epic, keeps edges whose both ends are drawn, and adds blockers outside the epic as `external` nodes. Selection and epic live in the URL, so a reload restores them.

## Error Handling
Load errors and retry are those of `BeadsView`. An unknown `epic` or one that is not an epic falls back to the picker. A cycle is detected during layering: members are placed by a depth-limited pass, the rest are drawn normally, and a warning names the members.

## Testing
`graph.test.ts` (chain, diamond, nesting, external blocker, cycle, closed hidden, chain highlight), `GraphView.test.tsx` (picker, nodes and arrows, click and keyboard, Escape, empty states, state labels, hidden edge list), `ViewTabs` and `filters` tests for the new view and `epic`, a `BeadDetailPage` test for the link. Tests carry the REQ-ID in their name. Gate: `pnpm -C frontend typecheck && lint && test --run && build`.
