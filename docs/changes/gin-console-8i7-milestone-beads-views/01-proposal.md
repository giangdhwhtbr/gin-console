# Milestone beads views

Epic: gin-console-8i7
Kind: capability
Date: 2026-11-15

## Why

The milestone page (`/milestones/<project>/<id>`) has two tabs, Gantt and Graph. The Gantt lists child beads only under an expanded epic, and the Graph tab draws the milestone's epics only, without filters or a details panel. To read every bead of a milestone with the List, Board or Focus view, a team member leaves for the Beads page and picks the milestone there, and the bead page then returns to the Beads page rather than to the milestone.

The Dependencies graph is one more way to see the same beads. Today it is a separate page, reached by a link next to the project picker, and it ignores the filters of the Beads page.

## What Changes

- The milestone page has two tabs, Gantt and Beads, kept in the URL as `tab` (`gantt` when absent). An old link with `tab=graph` opens the Beads tab on the Graph view.
- The Beads tab embeds the Beads views with the milestone fixed to this milestone and no Milestone select. Its search, filters, view and selection are kept in the milestone page's URL with the names the Beads page uses. Changing tab keeps only `start` and `zoom`.
- The Beads views gain a fourth view, Graph (`view=graph`), on the Beads page and on the milestone page's Beads tab. It shares the loaded beads, the search and the filters with List, Board and Focus:
  - It draws the selected milestone, or the project when "All" or "No milestone" is selected, with the nodes, arrows and outside beads of the Dependencies page.
  - A node is drawn when it or one of its descendants matches the search and filters.
  - "Only linked" is the graph's own switch.
  - Selecting a node opens the details panel.
  - Opening a node with children draws its children in place (`scope=<id>`), with a breadcrumb back up. Opening a node without children opens its bead page.
- The Graph view replaces the link "Dependencies" next to the project picker. The Dependencies page (`/beads/<project>/graph`, `/beads/<project>/<id>/graph`) and the "View dependencies" button stay.
- The bead page's breadcrumb returns to the place the bead was opened from: the Beads page or the milestone page's Beads tab, with its view and filters.

## User Stories

### US-1: Beads of a milestone without leaving it
As a team member, I want to read every bead of a milestone in the List, Board, Focus or Graph view from the milestone page, so that I can follow the milestone's work without leaving its context.
REQ: REQ-MILESTONE-UI-018, REQ-MILESTONE-UI-002, REQ-UI-104

Acceptance criteria:
- The milestone page of `ex-m2` shows the tabs Gantt and Beads. The Beads tab lists only beads whose milestone is `ex-m2` and shows no Milestone select.
- Choosing Board, then a status filter, keeps `tab=beads&view=board&status=…` in the URL. Reloading the page shows the same view and filters.
- Going to Gantt and back to Beads keeps the Gantt's `start` and `zoom` and drops the Beads filters.
- `?tab=graph` opens the Beads tab on the Graph view.

### US-2: Graph as a view of the filtered beads
As a team member, I want a Graph view next to List, Board and Focus that follows the same search and filters, so that I can see the dependencies of exactly the beads I am looking at.
REQ: REQ-UI-106, REQ-UI-030, REQ-UI-081, REQ-MILESTONE-UI-002

Acceptance criteria:
- On the Beads page with milestone `ex-m2`, the Graph view draws the epics of `ex-m2` and marks beads outside it as dashed.
- Filtering by assignee `bao` leaves only the nodes where `bao` is assigned the node or one of its descendants.
- Selecting a node shows its details panel. Opening epic `ex-e4` draws its tasks, with a breadcrumb back to `ex-m2`. Opening a task without children opens its bead page.
- The Beads page has no "Dependencies" link next to the project picker. The Dependencies page and "View dependencies" still work.

### US-3: Back to where the bead was opened
As a team member, I want the bead page's breadcrumb to return to the milestone page's Beads tab when I opened the bead there, so that I do not lose the milestone, view and filters.
REQ: REQ-UI-072, REQ-UI-073

Acceptance criteria:
- After opening a bead from the Board of the milestone page `ex-m2` with one filter, the breadcrumb reads "ex-m2 › Board · 1 filter". Its first link returns to that tab, view and filter.
- After opening a bead from the Beads page, the breadcrumb is unchanged.

## Capabilities Affected

- `milestone-ui`: ADDED REQ-MILESTONE-UI-018. MODIFIED REQ-MILESTONE-UI-002 (the Graph tab becomes the Graph view of the Beads tab).
  - Diagram: `docs/specs/milestone-ui/diagrams/milestone-beads-tab-activity.md`.
- `ui`: ADDED REQ-UI-106. MODIFIED REQ-UI-030, REQ-UI-072, REQ-UI-073, REQ-UI-081, REQ-UI-104.
  - Diagram: `docs/specs/ui/diagrams/graph-view-activity.md`.
  - Use case: `docs/specs/ui/use-cases/browse-milestone-beads.md`.
- Assets: none.

## Non-goals

- Changing the Gantt tab, the Dependencies page, or the "View dependencies" button.
- Drawing every bead of a milestone, epics and tasks, on one canvas.
- Layout fixes for long text and long ids, and laying out unlinked nodes vertically. These belong to epic gin-console-21h.
- A shared beads cache across tabs: each tab loads its beads as it does today.

## Success Criteria

- Every scenario of the ADDED and MODIFIED requirements has an automated test that carries its REQ-ID.
- TC-1 passes on the deployed console with the example project, checked by Playwright with screenshots.
