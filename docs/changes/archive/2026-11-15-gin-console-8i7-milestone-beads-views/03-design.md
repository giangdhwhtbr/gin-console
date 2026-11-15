# Design: Milestone beads views

Epic: gin-console-8i7

## Architecture

Frontend only. The backend and its APIs do not change.

- **Graph view in the Beads views** (`frontend/src/features/beads/`):
  - `filters.ts`: `VIEWS` gains `graph`. `BeadFilters` gains `scope` (the URL param `scope`, kept by `parseFilters` and `filtersToSearch`). An old `view=graph&epic=…` link parses to the Graph view, and `epic` is dropped.
  - A new `GraphView.tsx` sits beside `ListView`, `BoardView` and `FocusView` and is chosen by `BeadsView`. It reuses `scopeGraph` and `GraphCanvas` and the `BeadDetailPage embedded` side panel that `GraphPage` uses. It renders the "Only linked" switch, "n without dependencies", the cycle warning, the outside-beads note and the scope breadcrumb.
  - `graph.ts` gains a pure helper that keeps a node when its bead or a descendant is in the set of matching beads. `GraphView` passes it the beads that the existing filter pipeline in `BeadsView` keeps, so search, filters and "Show closed" match the other views. `scopeGraph` keeps working on all loaded beads, milestone beads included, so arrows and outside beads stay correct; the helper then drops the nodes that do not match.
  - The scope is chosen in this order:
    1. `filters.scope` when it names a loaded bead with children.
    2. Else the milestone in effect (`milestoneInEffect`) when it is a milestone id.
    3. Else the project (`null`).
  - `useBeads(..., keepMilestones)` already returns milestone beads on request. `BeadsView` asks for them and filters them out of List, Board and Focus as today (REQ-MILESTONE-UI-009).
  - `BeadsView` and `BeadFilterBar` gain an optional `fixedMilestone?: string`. When it is set, the Milestone select is hidden and `filters.milestone` is pinned to that id before matching. `BeadsPage` passes nothing, so it behaves as today.
  - `BeadsPage` drops the "Dependencies" link next to the project picker.
- **Milestone page** (`frontend/src/features/milestones/`):
  - `MilestonePage.tsx`: the tabs become `gantt` and `beads`. `tab=graph` is replaced in the URL by `tab=beads&view=graph`. The Beads panel renders `BeadsView project={project} fixedMilestone={id} filters={parseFilters(search)} onChange={…}`. Its `onChange` writes `filtersToSearch(next)` merged with `tab=beads`, `start` and `zoom`.
  - `api.ts` `milestonePath` widens `tab` to `"gantt" | "beads"` and takes an optional extra query, so tab changes keep only `start` and `zoom`.
  - `MilestoneGraph.tsx` is removed. The Graph view takes its place, and its tests move to `GraphView` and `MilestonePage` tests.
- **Remembered place** (`frontend/src/features/beads/returnState.ts`): it stores a path and query, not only the Beads query. `BeadsPage` stores `/beads?…`, and the milestone page's Beads tab stores `/milestones/<p>/<id>?tab=beads&…`. The bead page's `Breadcrumb` labels the first link "Beads", or the milestone id when the stored path is a milestone page, followed by the view name and the filter count.

## Data Flow

- Milestone page tab selection and the Beads tab: `docs/specs/milestone-ui/diagrams/milestone-beads-tab-activity.md`.
- Graph view scope, filtering and actions: `docs/specs/ui/diagrams/graph-view-activity.md`.
- User flow: `docs/specs/ui/use-cases/browse-milestone-beads.md`.

`BeadsView` loads the beads once with `useBeads(project, closed, true)` and passes them to whichever view is shown, so changing view never makes a new request (REQ-UI-030). The Gantt tab keeps its own `fetchMilestone` and `useBeads` calls.

## Error Handling

- The beads request fails: the Beads tab shows the error and Retry of the Beads views (REQ-UI-027).
- `scope` names a bead that does not exist or has no children: the Graph view ignores it and draws the milestone or project.
- The milestones request fails on the Beads page: the Milestone select says "Milestones unavailable" and the Graph view draws the project (REQ-UI-104).
- Storing the remembered place fails: it is kept for the visit, as today (REQ-UI-073).
- On the milestone page, an unknown `tab` falls back to Gantt.

## Testing

- vitest, each test name or comment carrying its REQ-ID:
  - `filters.test.ts`: `view=graph`, `scope`, and the old `epic` link (REQ-UI-030, REQ-UI-106).
  - `graph.test.ts`: the filter-to-nodes helper (REQ-UI-106).
  - New `GraphView.test.tsx`: the scope order, filters, "Only linked" default, select and details panel, drill-down and breadcrumb, opening a leaf, and "No beads match these filters" (REQ-UI-106, REQ-UI-081).
  - `BeadsPage.test.tsx`: no "Dependencies" link, and the Graph view on the Beads page (REQ-UI-081, REQ-UI-104).
  - `MilestonePage.test.tsx`: the tabs, the pinned milestone without a select, the URL round trip, keeping `start` and `zoom`, the `tab=graph` redirect, and a closed milestone (REQ-MILESTONE-UI-018, REQ-MILESTONE-UI-002).
  - `milestoneFixtures.ts` gains the `/api/beads/milestones` route.
  - `returnState` and Breadcrumb tests cover a milestone page as the remembered place (REQ-UI-072, REQ-UI-073).
- One manual case, TC-1, run with Playwright on the deployed console with the example project and saved screenshots (05-tests.md).

## Open Technical Questions
