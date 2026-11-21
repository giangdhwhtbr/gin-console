# Design: Epic page

Epic: gin-console-atl

## Architecture

- **Backend** (`backend/src/gin_console/beads/router.py`, beads capability):
  - Route: `GET /api/beads/{project}/{bead_id}/workflow` returns `EpicWorkflow` (the existing model in `projects/models.py`).
  - Command: it reuses `collect_epic_workflow(path, epic_id)` from `projects/collect.py`, injected like the other commands so tests use fakes.
  - Caching: one 60 s cache keyed by (project, id), dropped by `POST /api/refresh`.
  - Status codes: 404 for an unknown project or bead; 502 with `{"error"}` for a `BlockError`.
- **Frontend: epic page** (`frontend/src/features/beads/`):
  - **`EpicPage.tsx` (new):** rendered by the bead route when `issue_type === "epic"` and the page is not embedded.
    - It shares the header with `BeadDetailPage`: an extracted `BeadHeader` with title, badges and `FactList`, plus a Milestone fact.
    - It holds the tab list (`role="tablist"`, the `tab` URL param through `route.ts`, Left/Right keys).
  - **Overview** (`EpicOverview.tsx`): `ProgressCard`, `WorkflowCard`, `MilestoneCard`, `LaneSummary` and `TracksTable`, then the existing description and text sections.
  - **Data:** the epic detail (`/api/beads/{p}/{id}`) and the project's beads (`useBeads(project, true)`) give tracks, lanes, gates and states.
    - `/api/beads/{p}/{id}/workflow` feeds the Workflow card.
    - `useMilestones(project)` / `GET /api/milestones?project=` feed the Milestone card.
  - **Graph tab:** renders `GraphView` with filters forced to `scope=<epic>` and the shared filter bar. Selection uses `select` on the epic page URL; nothing is selected at first (REQ-UI-106 as shipped by gin-console-csp). Lane boxes come from gin-console-5qw, in tiers from left to right since gin-console-csp.
  - **Lanes tab:** renders `LanesView` with `scope=<epic>`.
  - **Discussion tab:** the existing comments component.
  - **Pure helpers** (`epicOverview.ts`): `progressOf(tracks)` returning counts by `stateOf` and points done/total; `laneSummary(beads, epicId, now)` built on `lanes.ts`; `workingDaysLeft(today, end)`; `sortTracks(rows, column, direction)`.
- **Frontend: Dependencies page retired:**
  - `GraphPage.tsx` is removed.
  - `routes.ts` maps `/beads/<p>/graph` and `/beads/<p>/<id>/graph` to a `redirectFromGraph` step that replaces the URL:
    - an epic goes to its page with `tab=graph`;
    - another bead with children goes to the Beads Graph view with `scope=id`;
    - otherwise it goes to its parent's (or the project's) Graph view with `select=id`.
  - `graphPath` callers move to the new targets.
  - "View dependencies" becomes "View in graph" (non-epic) and disappears on epics (REQ-UI-053).
  - Behaviour that lived only on the page (heading bar, Hide done, going down with history) goes with it. The Graph view's breadcrumb and "Show closed" cover them.
- **Unchanged:** the Beads page views, the bead page of tasks and bugs, and the details panel.

## Data Flow

- **Page:** the epic page loads the bead detail and the project's beads (shared cache), then the workflow and milestones in parallel; each card shows its own loading or error state (`docs/specs/ui/diagrams/epic-page-activity.md`).
- **Workflow endpoint:** runs `gin state` once per epic per minute (`docs/specs/beads/diagrams/epic-workflow-activity.md`).

## Error Handling

- **Workflow:** a 502 or a network error shows the error inside the Workflow card only. No stage shows "No workflow".
- **Milestones:** if milestones are unavailable, the card says "Milestones unavailable". No milestone shows "No milestone".
- **Unknown `tab`:** opens Overview. `tab=lanes` on an epic without lanes opens Overview.
- **Old Dependencies links:** links to beads that no longer exist keep the existing "Bead not found" page.

## Testing

- **pytest:** `test_beads_workflow_api.py` covers REQ-BEADS-020: the stage, a failure that is not cached, a 404 that runs no command, the cache and a refresh.
- **vitest:**
  - `epicOverview.test.ts`: progress counts, points, working days, sort.
  - `EpicPage.test.tsx`: tabs, URL, keys, the Lanes tab only with lanes, a task page unchanged.
  - Card tests: workflow states and errors, milestone states.
  - `TracksTable.test.tsx`: columns, gates in Blocked by, `aria-sort`.
  - Redirect tests for each old URL shape.
  - The `GraphPage` tests are removed. Their behaviours that live on are covered by Graph view tests named for the modified REQs.
- **Playwright:**
  - New gin-qa cases for REQ-UI-119 to REQ-UI-121 and the redirects.
  - The cases and specs of the Dependencies page (TC-UI-096..112 and the others pinned to the modified or removed REQs) are rewritten or removed.
  - `readability.spec.ts` replaces its Dependencies page visit with the epic page tabs.
- **TC-1:** the live readability check over the epic page tabs of `ex-e12` and `ex-e3` at 390, 1024, 1440 and 1920px in both themes, with screenshots compared to the confirmed mockup.

## Open Technical Questions
