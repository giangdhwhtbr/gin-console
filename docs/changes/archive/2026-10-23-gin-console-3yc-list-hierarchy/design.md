# Design: One hierarchical List view

Epic: gin-console-3yc

## Architecture
Frontend only, in `frontend/src/features/beads/` and `frontend/src/app/`. No backend change, no new dependency.

- `ListView.tsx` (renamed from `TreeView.tsx`) and `ListRow.tsx` (from `TreeRow.tsx`): the Tree's engine with a new look. A toolbar ("Expand all", "Collapse all"), column headings from 768px, the rows, and the details panel (`BeadDetailPage embedded`) from 1024px. A row is a grid: chevron button (lucide icon), id in the monospace face, title link, `StateMark`, `TypeBadge`, `P<n>`, the two `CountBadge`s, up to three labels from 768px, assignee, last update; an epic adds `n/m closed` with a small progress bar. Indent by level; below 768px the row is two lines.
- `tree.ts`: keeps the hierarchy part (`treeIndex`, `treeRows`, `keepSet`, `allBranches`, `ancestorsOf`); the Blocking branch (`blocked_by`, "also above", blocker count, the `mode` argument) is deleted. The node limit with "N more not shown" stays for very large projects.
- `BeadTable.tsx`, `TreeToolbar` Blocking switch, the Tree tab: deleted. `filters.ts`: `"tree"` leaves `VIEWS`, the `tree` parameter leaves `BeadFilters`; `select` stays and now belongs to the List.
- `returnState.ts` (new), in the style of `discussion.ts`: a module store over `sessionStorage`, key `gin-console-beads-return`, holding `{ search: string, open: Record<project, string[]> }`; storage that throws leaves the value in memory for the visit. `BeadsPage` writes `search` whenever its URL changes; `ListView` writes the open branches of its project and reads them on mount (ids that no longer exist are ignored).
- `Breadcrumb.tsx` (new): `<nav aria-label="Breadcrumb">` with an ordered list; used by `BeadDetailPage` instead of the "Back to beads" link when it is not embedded (the embedded panel keeps "Open page"). It reads `returnState.search` when its project is the bead's project, else falls back to `/beads?project=<project>`.

## Data Flow
`BeadsView` loads the beads once and the filters apply as before. Opening a bead (a card, a row title, a relation link) navigates to the bead page; `returnState` is not touched, so a bead-to-bead walk keeps the place the user started from. The breadcrumb's first link goes to `/beads` + the remembered `search`; `ListView` then mounts with the remembered open branches.

## Error Handling
A remembered `search` that names a view that no longer exists (for example `tree`) falls back to the List through `parseFilters`. A remembered project different from the bead's is ignored. Refused storage keeps the values in memory for the visit.

## Testing
The Tree tests become List tests; `tree.test.ts` loses the Blocking cases; new tests for `returnState`, the breadcrumb, the open branches after a remount, and an integration test of the reported flow (Board with filters, open a card, use the breadcrumb, land on the same Board and filters). Manual cases in `tests.md`: the look on a laptop and a phone in light and dark.
