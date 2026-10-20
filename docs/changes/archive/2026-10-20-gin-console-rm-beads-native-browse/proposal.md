# Browse beads

Epic: gin-console-rm-beads-native
Date: 2026-10-20

## Why
The console shows a Beads summary per project but sends the user to Scotty to see a single bead. The epic's goal is to view, search and filter beads natively and then retire Scotty. It is too large for one plan, so it is split into three changes under the same epic: A browse (this change), B Board and Focus, C Scotty parity and retirement.

## What Changes
- A new backend context `beads/` serves `GET /api/beads?project=` (list) and `GET /api/beads/{project}/{id}` (detail with dependencies, dependents and children) by running read-only `bd` commands, cached for 5 seconds.
- A Beads list page (project select, search, filters, "Show closed", 10-second refresh) and a bead page (fields, plain-text description, dependencies, dependents, epic children with progress).
- The epic links on the Projects page now open the console's own bead page; the project-name link to Scotty stays until change C.

## User Stories
### US-1: Browse the beads of a project
As the console owner, I want to list the beads of any configured project in the console, so that I no longer need Scotty just to see what exists.
REQ: REQ-BEADS-001, REQ-UI-022, REQ-UI-023, REQ-UI-024, REQ-UI-027

Acceptance criteria:
- A project's unfinished beads are listed with id, title, type, status, priority, labels, assignee and last update, most important first, and the list refreshes by itself.

### US-2: Find a bead
As the console owner, I want to search and filter, and to reach closed beads when I need them, so that I can find old and new work quickly.
REQ: REQ-UI-025, REQ-UI-026

Acceptance criteria:
- Search and filters combine, survive a reload and can be shared as a link; closed beads appear only when asked for.

### US-3: Understand one bead
As the console owner, I want a bead's description and its relationships, so that I can see what blocks it, what it blocks and how far an epic has got.
REQ: REQ-BEADS-002, REQ-UI-028

Acceptance criteria:
- The page shows fields, description, dependencies, dependents and epic children with progress, each related bead linking inside the console.

### US-4: Go from the dashboard to the bead
As the console owner, I want an active epic on a project card to open in the console, so that the dashboard no longer depends on Scotty links.
REQ: REQ-UI-005, REQ-UI-022

Acceptance criteria:
- Clicking an epic on a project card opens `/beads/<project>/<id>` inside the console.

### US-5: Safe and understandable failures
As the console owner, I want read-only access, clear errors and no crashes on odd data, so that the page can stay open.
REQ: REQ-BEADS-003, REQ-BEADS-004, REQ-BEADS-005, REQ-BEADS-006, REQ-UI-029

Acceptance criteria:
- Only read-only commands with fixed arguments run; bad ids, missing `bd`, timeouts and malformed data produce a clear error and never a 500 or a blank page.

## Capabilities Affected
- `beads` (new): ADDED REQ-BEADS-001..006.
- `ui`: ADDED REQ-UI-022..029; MODIFIED REQ-UI-005.

## Non-goals
Board and Focus views, lanes, grouping by assignee (change B); Scotty parity sign-off and retirement, removing the Scotty link on project names, the Tailscale change (change C); dependency graph, comment text, Markdown rendering, searching descriptions, merging several projects in one list, any write.

## Success Criteria
All scenarios have tests; on the live host `/beads` lists the unfinished beads of qwikfone (83 of 496) and of gin-workflow, search and filters work, a bead opens with its relations, and the epics on the Projects page open inside the console.
