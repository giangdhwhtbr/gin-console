# Dependency graph per bead

Epic: gin-console-s77
Date: 2026-10-24

## Why
Most epics of the user's projects have a real order of work: 22 of 31 epics of qwikfone, 29 of 32 of gin-workflow and 10 of 16 of gin-console have blocking relations between their own tasks, with chains up to 9 layers and one epic of 52 tasks. The List shows which task belongs to which epic but not the order, and the Graph tab that exists is hard to use: it hides closed beads (most epics are closed history, so they come out empty), sits among the views with a separate epic picker, is laid out left to right, has no zoom, leaves the details panel empty when an epic is chosen, and its details panel (like the List's) scrolls the whole page instead of itself.

## What Changes
- The Graph tab and the epic picker go. A **Dependencies page** takes their place for a scope: the project at `/beads/<project>/graph` (link "Dependencies" next to the project picker) or a bead at `/beads/<project>/<id>/graph` (primary button "View dependencies" on the bead page and in the details panel, shown only when there is something to draw).
- One model for every level: the page of the project or of a bead with children draws its direct children; each blocking relation between beads under them, at any depth, is lifted to an arrow between the two children that hold them ("n links" when several). A roadmap of epics, an epic of sub-epics and an epic of tasks are drawn the same way, with no special case for the `roadmap` label.
- Double-click a node (or "View dependencies" in the panel) goes down one level with a history entry; the breadcrumb lists the path back up; the heading bar links the scope bead's own blockers and blocked beads.
- Closed beads are drawn (with a "Hide done" switch); "Only linked", on at first on the project page, hides nodes without arrows; beads outside the scope are drawn dimmed on both sides. A bead without children draws itself, everything that blocks it above and everything it blocks below.
- Top-down layout with the nodes ordered inside a layer to limit crossing arrows, nodes in the language of the cards, a window-high canvas with zoom (`+`, `−`, `Fit`, `Ctrl` + wheel) and native scrolling for panning.
- The bead being viewed is selected from the start, so the details panel is never empty.
- Every right-hand panel (the List's details, the Dependencies page's details, the discussion column of the bead page) stays in view and scrolls on its own from 1024px.
- No backend change and no new dependency (the hand-drawn SVG of ADR 0002 stays).

Design reference: https://claude.ai/artifact/WTC31iQ9PznEVjY79rAYgG (private; boards Bead page, Dependencies laptop and phone).

## User Stories

### US-1: See the order of an epic's work
As a developer, I want an epic's tasks drawn in the order they depend on each other, done tasks included, so that I see the sequence, the critical chain and what is stuck.
REQ: REQ-UI-075, REQ-UI-076, REQ-UI-048, REQ-UI-049

Acceptance criteria:
- The tasks of the epic are drawn top-down from the tasks without blockers to those that wait longest, with arrows from blocker to blocked.
- Closed tasks are drawn too, whatever "Show closed" says, and a "Hide done" switch leaves them out.
- A blocker outside the epic is drawn dimmed with a dashed border.

### US-2: See what blocks a task
As a developer, I want the chain behind a blocked task, so that I know what to unblock first.
REQ: REQ-UI-075

Acceptance criteria:
- The page of a task draws it, everything that blocks it above, and everything it blocks below, directly or not.

### US-3: Find the graph from the bead
As a developer, I want a button on the bead, so that I reach its graph in one click and come back to where I was.
REQ: REQ-UI-053, REQ-UI-072, REQ-UI-081

Acceptance criteria:
- The bead page and the details panel offer "View dependencies" for an epic with tasks and for a bead with a blocker or a blocked bead, and not otherwise.
- The breadcrumb of the Dependencies page ends with the bead and "Dependencies".

### US-6: Read the project from the top and go down
As a developer, I want the order of the top-level epics of a project, drawn from the relations of the epics and of their tasks, and to open any epic into its own graph, so that I follow a roadmap from the top to the tasks.
REQ: REQ-UI-075, REQ-UI-079, REQ-UI-080, REQ-UI-081, REQ-UI-050, REQ-UI-054

Acceptance criteria:
- The project page draws the beads without a parent with an arrow wherever they or the beads under them block each other, and hides the beads without arrows until "Only linked" is turned off.
- A double click on a node shows its own graph, and Back or the breadcrumb goes up again.
- The same works at any depth, for example a roadmap epic whose children are epics.

### US-4: Read and move on a big graph
As a developer looking at a 50-task epic, I want to zoom, fit and move between nodes, so that I can read it on a laptop or a phone.
REQ: REQ-UI-077, REQ-UI-051, REQ-UI-052

Acceptance criteria:
- `+`, `−`, `Fit` and `Ctrl` + wheel zoom the canvas; scrolling pans.
- The bead being viewed is selected at first and the details panel shows it.
- Arrow keys follow the arrows; on a phone two buttons jump to the blockers and to the blocked beads.

### US-5: Scroll a side panel on its own
As a developer, I want the panel at the right to scroll by itself, so that reading a long bead does not move the page or lose my place in the list.
REQ: REQ-UI-078, REQ-UI-045

Acceptance criteria:
- From 1024px the details panels and the discussion column stay in view and scroll inside themselves when their content is taller than the window.

## Capabilities Affected
`ui`: ten requirements modified (REQ-UI-030, 045, 048, 049, 050, 051, 052, 053, 054, 072), one removed (REQ-UI-047), seven added (REQ-UI-075 to 081).

## Non-goals
Minimap, search inside the graph, an epic switcher, expanding a node in place (going down opens its own page), a special case for the `roadmap` label, counting an ancestor's relations as a task's own on the page of a bead without children, dragging nodes, remembering the zoom, keeping the scroll position, backend changes, a new library (React Flow stays a later option, see ADR 0002).

## Success Criteria
A user opens the project page, sees the order of its top-level epics, goes down into one of them, including a closed one, and reads the order of its tasks without opening a bead; a long bead in any side panel scrolls inside the panel; the Graph tab and the epic picker are gone. `pnpm typecheck`, `lint`, `test --run` and `build` pass.
