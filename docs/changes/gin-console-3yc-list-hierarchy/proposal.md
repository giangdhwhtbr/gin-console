# One hierarchical List view

Epic: gin-console-3yc
Date: 2026-10-23

## Why
The List and the Tree look alike and the Tree looks poor. The List is a flat table that hides which task belongs to which epic; the Tree shows that but has its own look, its own panel and a Blocking mode that the per-bead dependency graph (epic gin-console-s77) will answer better. Two more problems came up in use: the "Back to beads" link of a bead page always goes to the default List, so a user who opened a bead from the Board lands in the List with every filter gone, and the open branches of a hierarchy are lost whenever the user leaves the page.

## What Changes
- The List view shows the beads as an indented hierarchy (epic, tasks, sub-tasks) with aligned columns, the state, type and indicators of the card language, an epic's progress, and the Tree's selection panel, keyboard navigation and "keep the match with its ancestors" filtering.
- The Tree tab, the Blocking mode and the flat table are removed.
- On a phone a row is two lines and a tap on it opens the bead page.
- The Beads page remembers its place (view, filters) in the browser tab, and the bead page shows a breadcrumb `Beads › Board · 2 filters › parent › bead` whose first link returns to exactly that place; the open branches of the List are remembered too.
- No backend change and no new dependency.

## User Stories

### US-1: Read the work as a hierarchy
As a developer, I want the List to show epics with their tasks indented under them, so that I see how the work is organised and how far each epic is.
REQ: REQ-UI-024, REQ-UI-041, REQ-UI-043, REQ-UI-044

Acceptance criteria:
- Tasks appear under their epic, siblings ordered by priority and then by last update.
- A search or a filter shows the matching beads with their ancestors and opens the branches that lead to them.
- Each row shows state, type, priority, indicators, assignee and update time, and an epic shows how many of its children are closed.

### US-2: Browse and read at once
As a developer, I want to click a row and read the bead beside the list and move with the keyboard, so that I can go through many beads quickly.
REQ: REQ-UI-045, REQ-UI-046

Acceptance criteria:
- Clicking a row selects it and shows its details and discussion in a panel (from 1024px).
- The arrow keys move through the rows and open and close branches; Enter selects.
- On a phone a tap on a row opens the bead page.

### US-3: Come back to where I was
As a developer who opened a bead from the Board with filters on, I want to go back to that Board with those filters, so that I do not have to set them again.
REQ: REQ-UI-072, REQ-UI-073, REQ-UI-074

Acceptance criteria:
- The bead page shows a breadcrumb whose first link returns to the view and filters I came from.
- After returning to the List, the branches I had opened are still open.
- Without a remembered place the breadcrumb and the link return to the default List of the project.

### US-4: One list, fewer views
As a developer, I want the views to be List, Board, Focus and Graph, so that I do not have to choose between two similar views.
REQ: REQ-UI-030

Acceptance criteria:
- There is no Tree tab; a link with `view=tree` shows the List.

## Capabilities Affected
`ui`: seven requirements modified (REQ-UI-024, 030, 041, 043, 044, 045, 046), one removed (REQ-UI-042), three added.

## Non-goals
Restoring the scroll position, a flat table, a Blocking mode (the per-bead graph, epic gin-console-s77, answers it), new filters (epic gin-console-r4m), the bug and reopen indicators (epic gin-console-le3).

## Success Criteria
A user can open a bead from any view and come back to the same view with the same filters and open branches; the List shows the hierarchy with the card language; the Tree tab and Blocking mode are gone. `pnpm typecheck`, `lint`, `test --run` and `build` pass.
