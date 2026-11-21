# Epic page with tabs, and the retired Dependencies page

**Context**
Epic gin-console-atl (2026-11-21):
- The page of an epic got the tabs Overview, Graph, Lanes and Discussion (REQ-UI-119 to REQ-UI-121).
- A read-only endpoint answers the epic's gin-workflow stage (REQ-BEADS-020).
- The separate Dependencies page (`GraphPage`) was retired. Its links now redirect (REQ-UI-075).

**Decision/Solution**
- **Where it renders:**
  - `BeadDetailPage` fetches the bead once. When the bead is an epic and the page is not embedded, it renders `EpicPage` with that bead. Tasks and bugs keep their page, and the details panel of an epic keeps its compact form.
  - The header and body are shared through `BeadHeader.tsx` and `BeadBody.tsx`.
  - `BeadBody` has an `overview` prop. On the epic Overview it leaves out the children bar and the Children list, which the Tracks table covers, and it adds a "Description" heading.
- **Tabs:**
  - Tabs use `components/Tabs.tsx`. The open tab is kept in the URL as `tab`, outside `BeadFilters`. `epicPath(project, id, tab, filters)` builds that URL.
  - Like every tab in the console, a tab change uses `navigate(..., { replace: true })`. Back therefore leaves the page instead of stepping through tabs.
  - A tab that depends on loaded data must stay selected while the data loads or fails. Otherwise a deep link flashes the fallback tab. On `?tab=lanes`, Lanes stays selected while the beads are loading or have failed; Overview is the fallback only when the beads load with no lanes.
- **Graph and Lanes tabs:**
  - They reuse `BeadsView` with `fixed={{ view, scope: epicId }}`. While `fixed` is set, `BeadsView`:
    - hides `ViewTabs`, the milestone filter and the project-wide "N of M" count;
    - forces the view, the scope and `milestone: "all"`;
    - loads closed beads;
    - passes `trail={false}`, so `GraphView` and `LanesView` show no scope trail.
  - On the epic page the scope stays the epic. A child with children opens its own bead page.
  - An epic without children shows "No tracks".
- **Overview:**
  - Pure helpers live in `epicOverview.ts`: `epicProgress`, `laneRows` (built on `lanesOf`), `workingDaysLeft`, `trackRows` and `sortTracks`. The names avoid the existing `progressOf` and `laneSummary`.
  - The cards are `ProgressCard`, `WorkflowCard` and `MilestoneCard`, inside the `OverviewCard` shell. The sections are `LaneSummary` and `TracksTable`.
  - The Milestone card takes today and the forecast `finish` from `GET /api/milestones?project=`.
  - `WorkflowCard` shows an unknown stage as "Stage: <stage>".
  - `TableCell` is `whitespace-nowrap`, so a cell that must wrap needs `whitespace-normal`, and a cell that must truncate needs a `max-w`.
  - `FactList`'s `dd` truncates, which clips hover popups, so the cards use their own `Fact`/`Facts`.
  - The Tracks table changes layout with an `@container` query (see [container-queries-for-lists](container-queries-for-lists.md)). Below its breakpoint the whole table scrolls sideways, with Id, Title and State as its first columns; they are not sticky, which was a coordinator decision on REQ-UI-121.
- **Workflow endpoint:**
  - `GET /api/beads/{project}/{id}/workflow` (`beads/router.py`) runs an injected runner, `create_app(run_epic_workflow=collect_epic_workflow)`.
  - It answers 404 before running anything, then serves from a 60 s `KeyedCache` that is dropped on `POST /api/refresh` (`on_refresh`).
  - `collect_epic_workflow` returns `BlockError` instead of raising, and `KeyedCache` keeps whatever the fetch returns. So the fetch raises on `BlockError`; otherwise a 502 would be cached.
- **Dependencies page retired:**
  - `OldGraphLink.tsx` resolves an old `/beads/<p>[/<id>]/graph` link with `useBeads(project, true, true)` and calls `navigate(target, { replace: true })`. The targets: an epic goes to its Graph tab; a bead with children goes to `scope=<id>`; other beads go to `scope=<parent>&select=<id>`. A parent that is a milestone is left out, because `scopeOf` ignores a milestone scope.
  - "View in graph" uses `graphViewPath`. Hide done (REQ-UI-076) and going down with history (REQ-UI-080) are gone.
- **Routing:**
  - React runs child effects before parent effects. So a `navigate()` in a child's mount effect fired before `App`'s `useLocation` had attached its `popstate` listener, and a direct `/beads/<p>/graph` load stayed on "Loading…".
  - `useLocation` (`app/route.ts`) now re-reads the location right after attaching its listener, and keeps the same state object when nothing changed.

**Consequences**
- **Double polling:** the epic page and `BeadsView` each poll `useBeads`, so two requests go out every 10 s on the Graph and Lanes tabs.
- **Hidden lone bead:** an old link to a bead with no parent, children or relations lands on the project Graph with `select=<id>`, but "Only linked" hides that bead, so nothing is selected (TC-UI-220 checks only the URL and the view).
- **Workflow card:** with the example project's minimal `.agent-workflow`, the card shows stage `discuss` and 0 of 5 gates.
- **Tests:**
  - `GraphCanvas` (layers) has no `data-arrow`. Assert its arrows through the hidden list (`aria-label="Dependencies"`) and `data-dimmed`. Only the lane canvas has `data-arrow`.
  - Epic page e2e specs need `stubEpicPage` (`qa/e2e/support/epic.ts`). It stubs the workflow route and `/api/milestones` with `today`. `stubExample` leaves both unstubbed.

**References**
- **Frontend:** `frontend/src/features/beads/{EpicPage.tsx,BeadHeader.tsx,BeadBody.tsx,BeadsView.tsx,epicOverview.ts,EpicOverview.tsx,OverviewCard.tsx,ProgressCard.tsx,WorkflowCard.tsx,MilestoneCard.tsx,LaneSummary.tsx,TracksTable.tsx,OldGraphLink.tsx,graph.ts}`, `frontend/src/app/{App.tsx,route.ts}`
- **Backend:** `backend/src/gin_console/{app.py,beads/router.py}`, `backend/tests/test_beads_workflow_api.py`
- **e2e support:** `qa/e2e/support/{epic.ts,graph.ts}`
- **Specs:** REQ-UI-119..122, REQ-BEADS-020, MODIFIED REQ-UI-048..054, 072, 075, 077..079, 081, 106; change `docs/changes/archive/2026-11-21-gin-console-atl-epic-page/`
- **Beads:** gin-console-atl (tracks .1–.7); related [lanes-and-merge-gates](lanes-and-merge-gates.md), [readable-ui](readable-ui.md), [e2e-parallel-runs-and-ellipsis](e2e-parallel-runs-and-ellipsis.md)

**Scope**
The bead and epic pages, the Graph and Lanes views embedded in other pages, old Dependencies links, client-side routing, and the epic workflow endpoint.
