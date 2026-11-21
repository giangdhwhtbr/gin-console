# Plan: Epic page with tabs

Epic: gin-console-atl
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder. Mockup: `docs/specs/ui/assets/2026-11-21/epic-page/` (the Graph tab shots predate gin-console-csp; REQ-UI-117 and REQ-UI-106 as shipped win).
Code evidence: researcher report 2026-11-21 (file:line citations below).

## Objective
- **Epic page:** the page of an epic has the tabs Overview · Graph · Lanes · Discussion under its header, with the open tab kept in the URL as `tab`.
- **Overview:** the Progress, Workflow and Milestone cards, the Lanes summary, the Tracks table and the description.
- **Workflow data:** a new read-only endpoint answers the epic's workflow from `gin state`, cached 60 s.
- **Dependencies page:** retired. Its links redirect, and "View dependencies" becomes "View in graph", or the Graph tab on an epic.

Done when:
- Every scenario of the ADDED, MODIFIED and REMOVED REQs has a test named with its REQ, or its removal shows in the tests.
- `gin-qa cases check --change gin-console-atl` prints `ok`.
- TC-1 passes on the deployed console.

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | weakest | `low` |
| Bounded implementation with a clear spec | middle | `medium` |
| Cross-module change, security, migration, concurrency | strongest | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- **Problem statement:**
  - The epic page is sparse: facts, description and a plain children list.
  - The Dependencies page is a second, clunky graph next to the Graph view. It has no filters and no Lanes view, so the user cannot reach Lanes from an epic.
- **Success criteria:**
  - Everything in the Objective.
  - The backend checks pass: `pytest`, `ruff`, `mypy`.
  - The frontend checks pass: `test --run`, `typecheck`, `lint`, `build`.
  - The e2e suites stay green.
  - `gin specs lint --change gin-console-atl --against master` prints `ok`, and `trace` lists no missing REQ.
- **Global constraints** (from the spec and the design):
  - **Read-only:** the endpoint runs only `gin state`, never a write. No new dependency.
  - **Backend endpoint** (REQ-BEADS-020):
    - Command:
      - `GET /api/beads/{project}/{bead_id}/workflow` runs `collect_epic_workflow(path, id)` (`backend/src/gin_console/projects/collect.py:191`).
      - `create_app` injects the runner: a new parameter that defaults to `collect_epic_workflow`, so tests pass a fake.
    - 404 before running anything:
      - an unknown project (`project_dir`, `beads/router.py:32`);
      - a bad id (`valid_id`, `beads/source.py:89`);
      - a bead that is not in the export (`get_bead` over `snapshots`, as `/comments` does at `beads/router.py:94`).
    - Cache:
      - `KeyedCache(timedelta(seconds=60), clock)` (`beads/service.py:8`), keyed by (project, id). Its `clear` is registered on `on_refresh`, as in `milestones/router.py:31`.
      - `collect_epic_workflow` returns `BlockError` instead of raising, so the fetch must raise on it (as `milestones/router.py:45` does). A failure is then never cached and the route answers 502 `{"error": <message>}`.
  - **Epic page:**
    - **Where it renders:**
      - `BeadDetailPage` renders `EpicPage` when `bead.issue_type === "epic"` and the page is not embedded. Tasks and bugs keep today's page.
      - The bead is fetched once, through the existing `fetchBead` (`BeadDetailPage.tsx:48-61`).
    - **Header:** the header (title, badges, capabilities, `FactList`; `BeadDetailPage.tsx:149-192`) is extracted into `BeadHeader`, which both pages use.
    - **Tabs:**
      - Reuse `components/Tabs.tsx`, with `role=tabpanel` as `MilestonePage.tsx:75-76` does.
      - `tab` stays out of `BeadFilters`. A local `epicPath(project, id, tab, filters)` builds the URL from `filtersToSearch(filters)` plus `tab`.
    - **Graph and Lanes tabs:**
      - Render `BeadsView` with a new optional prop `fixed: { view: "graph" | "lanes"; scope: string }`.
      - While `fixed` is set, `BeadsView`:
        - hides `ViewTabs` and the milestone filter;
        - forces `view`, `scope` and `milestone: "all"`;
        - loads closed beads for `hasLanes`;
        - hides the `ScopeTrail` of `GraphView` and `LanesView` (`GraphView.tsx:77`, `LanesView.tsx:70`).
      - Opening a child that has children opens that child's bead page instead of moving the scope. On the epic page the scope stays the epic.
      - An epic without children shows "No tracks" instead of falling back to the project graph (`scope.ts:6`).
    - **Discussion tab:** `CommentList`, or "No comments" when `comment_count` is 0.
  - **Overview:**
    - **Data sources:**
      - The bead detail and `useBeads(project, true, true)` for the tracks, lanes, gates and states.
      - `fetchEpicWorkflow` for the Workflow card. It reuses `EpicWorkflow` and `ReviewWaiver` from `features/projects/api.ts:26`.
      - `fetchMilestones` from `features/milestones/api.ts:222` (`MilestoneList`, entries with `start`, `end`, `finish`, `status`, `title`) for the Milestone card.
    - **Pure helpers** in `epicOverview.ts`: `epicProgress`, `laneRows` (built on `lanesOf(...).rows`, `lanes.ts:211`), `workingDaysLeft`, `trackRows` and `sortTracks`. The names avoid `progressOf` (`graph.ts:66`) and `laneSummary` (`lanes.ts:322`).
    - `workingDaysLeft` builds on `workdaysAfter` (`features/milestones/format.ts:23`).
  - **Dependencies page retired:**
    - **Removed:** `GraphPage.tsx`, its tests, `graphRoute`'s page, the Dependencies branch of `Breadcrumb.tsx:92-122`, and the `graphScope` prop of `BeadDetailPage` and `DetailsPanel`.
    - **`graphPath`:** removed with its last caller (`graph.ts:51`). "View in graph" uses a new `graphViewPath(bead)`.
    - **Old links:** `OldGraphLink`, a small component, loads `useBeads(project, true, true)`, resolves the target of REQ-UI-075 and calls `navigate(target, { replace: true })`, as `MilestonePage.tsx:40-43` does. While it loads it shows "Loading…". For an unknown bead it shows "Bead not found" with a link to the Beads page.
  - **Selection:** the Graph and Lanes tabs select nothing at first (REQ-UI-051, REQ-UI-106 as shipped), and Escape selects nothing (REQ-UI-052).
  - **Readability:** see `.planning/knowledge/readable-ui.md`, `lanes-and-merge-gates.md` and `e2e-parallel-runs-and-ellipsis.md`. Look at the screenshots, not only the detector count.
  - **Rules:** new and changed tests carry their REQ-ID.
- **Non-goals:** new data for task and bug pages, editing anything, lane colours outside the Graph boxes and the epic page, and any change to the Beads page views beyond the `fixed` option.

## Approach Options
### Option 1: branch inside `BeadDetailPage`, reuse `BeadsView` with a `fixed` option
- **Summary:**
  - The bead is fetched once, and `BeadDetailPage` hands an epic to `EpicPage`.
  - The Graph and Lanes tabs reuse `BeadsView`, so they keep its filtering (`BeadsView.tsx:58-68`), filter bar and count.
- **Pros:**
  - One fetch.
  - No copy of the `matched`/`lanesMatched` logic.
  - The tabs behave exactly like the Beads views.
- **Cons:** `BeadsView` gains one prop, and the header extraction touches a large test file (`BeadDetailPage.test.tsx`, 715 lines).

### Option 2: a separate `EpicPage` route and its own graph/lanes wiring
- **Summary:** App routes epics to `EpicPage`, which fetches and filters on its own.
- **Cons:**
  - The route cannot know the bead type before the fetch.
  - It would copy about 30 lines of `BeadsView` filtering, with the drift risk that bug gin-console-9ix.9 showed.

### Recommended Approach
- **Selected option:** Option 1.

## Scope
- **In scope:** the Objective and the Global constraints.
- **Out of scope:** the non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (workflow endpoint), Track 2 (retire the Dependencies page) and Track 5 (QA cases) touch separate files and run together; Track 3 (epic page shell) shares BeadDetailPage.tsx and App.tsx with Track 2 and starts after it; Track 4 (Overview) fills the shell of Track 3 and calls the endpoint of Track 1; Track 6 (automated tests for the cases) needs Tracks 1-5; Track 7 checks the merged branch on the deployed console.
```

## Tasks

### Track 1: Workflow endpoint of an epic
- **Dependencies**: none
- **Requirements**: REQ-BEADS-020
- **Files**:
  - Modify `backend/src/gin_console/app.py:36-46,78-83` (a new `run_epic_workflow` parameter; pass it and `on_refresh` to `build_beads_router`)
  - Modify `backend/src/gin_console/beads/router.py` (the new route, its `KeyedCache` and the 502 answer)
  - Test: create `backend/tests/test_beads_workflow_api.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one route in an existing router, with a known cache and runner pattern (`milestones/router.py`). The one pitfall, a cached `BlockError`, is spelled out.
- **Acceptance criteria**:
  - pytest tests named with REQ-BEADS-020 cover:
    - "Stage of an epic" (200 with stage, gates, warning, empty `review_waivers`);
    - "Command fails" (502 with `error`, a second request runs the command again);
    - "Unknown bead" (404, and the fake records no call), plus an unknown project (404);
    - the 60 s cache: one call for two requests, a second call after 61 s of the fake clock;
    - `POST /api/refresh` dropping it.
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
- **Estimated complexity**: low

Interfaces produced:
```python
# app.py
def create_app(..., run_epic_workflow: Callable[[Path, str], EpicWorkflow | BlockError] = collect_epic_workflow) -> FastAPI
# beads/router.py
def build_beads_router(settings: Settings, snapshots: ..., clock: ..., run_epic_workflow: Callable[[Path, str], EpicWorkflow | BlockError], on_refresh: list[Callable[[], None]]) -> APIRouter
# GET /api/beads/{project}/{bead_id}/workflow -> 200 EpicWorkflow | 404 | 502 {"error": str}
```

Steps:
1. Write `test_beads_workflow_api.py`, using `make()` from `tests/test_beads_api.py:25-50` and `fake_export` rows, with a recording fake runner. Run `uv run --directory backend pytest tests/test_beads_workflow_api.py` (fails).
2. Implement the route, cache and wiring. Run the tests (pass), then the full backend checks.
3. Commit: `git commit -m "feat(beads): workflow of an epic (gin-console-atl)"`

### Track 2: Retire the Dependencies page
- **Dependencies**: none
- **Requirements**: REQ-UI-048, REQ-UI-049, REQ-UI-050, REQ-UI-051, REQ-UI-052, REQ-UI-053, REQ-UI-054, REQ-UI-072, REQ-UI-075, REQ-UI-077, REQ-UI-078, REQ-UI-079, REQ-UI-081, REQ-UI-106 (all but the "Graph tab of an epic" scenario), REQ-UI-122; REMOVED REQ-UI-076, REQ-UI-080
- **Files**:
  - Delete `frontend/src/features/beads/GraphPage.tsx`, `GraphPage.test.tsx`
  - Create `frontend/src/features/beads/OldGraphLink.tsx`, `OldGraphLink.test.tsx`
  - Modify `frontend/src/app/App.tsx:25,67-73` (`graphRoute` renders `OldGraphLink`)
  - Modify `frontend/src/app/App.test.tsx:275` (REQ-UI-075 routes)
  - Modify `frontend/src/features/beads/Breadcrumb.tsx:92-122`, `Breadcrumb.test.tsx:108` (no Dependencies branch, REQ-UI-072)
  - Modify `frontend/src/features/beads/BeadDetailPage.tsx:34-43,192-200`, `BeadDetailPage.test.tsx:545-562`: "View in graph" (REQ-UI-053). The button is not offered on an epic; Track 3 adds the Graph tab. The `graphScope` prop goes.
  - Modify `frontend/src/features/beads/DetailsPanel.tsx` (no `graphScope`)
  - Modify `frontend/src/features/beads/graph.ts:51`, `graph.test.ts:212` (`graphPath` replaced by `graphViewPath`; remove the helpers only `GraphPage` used: `relationsOf`, `ancestorsOf`, if no other caller)
  - Test: modify `frontend/src/features/beads/{GraphView,GraphCanvas,graph}.test.ts(x)`, so that every scenario of the modified REQs that only `GraphPage.test.tsx` covered gets a Graph view test named with its REQ
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** it spans routing, breadcrumb, the bead page and many REQs whose scenarios must be re-covered on the Graph view after the page's tests go. Many edge cases, but no new design.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-075 has a test: project, epic (to `?tab=graph`), bead with children, bead without children, with and without a parent, selection kept, unknown bead, no extra history entry (`replace`).
  - REQ-UI-053 scenarios, including "Epic" (no button) and "Details panel".
  - REQ-UI-072 has no Dependencies crumb.
  - The scenarios of REQ-UI-048..052, 054, 077..079, 081 and 106 have Graph view tests named with their REQ. That includes the new REQ-UI-051 "Epic" (no selection at first) and REQ-UI-052 "Escape" (select nothing).
  - No `GraphPage`, `graphPath`, `graphScope` or "View dependencies" is left in `frontend/src` (`grep -rn`).
  - A browser check on a temporary console (port 8724, example regenerated into `/tmp/ex-atl2`):
    - `/beads/example/ex-e12/graph` lands on `/beads/example/ex-e12?tab=graph` (the epic page tab exists only after Track 3; until then the bead page is fine);
    - `/beads/example/graph` lands on the project Graph view;
    - a task page offers "View in graph";
    - screenshots looked at.
  - Full frontend checks pass.
- **Estimated complexity**: high

Interfaces produced:
```ts
// graph.ts
export function graphViewPath(project: string, bead: Pick<BeadSummary, "id" | "parent">, hasChildren: boolean): string
// /beads?project=<p>&view=graph&scope=<id> | ...&scope=<parent>&select=<id> | ...&select=<id>
// OldGraphLink.tsx
export function OldGraphLink({ project, id, select }: { project: string; id: string | null; select: string }): JSX.Element
// epic target: `/beads/<p>/<id>?tab=graph` (+ `&select=<s>` when kept)
```

Steps:
1. Write the failing tests:
   - REQ-UI-075 for `OldGraphLink` and `App`;
   - REQ-UI-053 for the bead page;
   - REQ-UI-072 for the breadcrumb;
   - Graph view tests for each scenario of the modified REQs not yet covered there (list them from `GraphPage.test.tsx` before deleting it).
   Run `pnpm -C frontend test --run src/features/beads src/app` (fails).
2. Implement. Delete `GraphPage` and its test. Run the tests (pass).
3. Build and run the browser check, then look at the screenshots. Run the full frontend checks.
4. Commit: `git commit -m "feat(beads): retire the Dependencies page for the Graph view (gin-console-atl)"`

### Track 3: Epic page with tabs
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-119, REQ-UI-106 ("Graph tab of an epic"), REQ-UI-122 (the tabs' canvases)
- **Files**:
  - Create `frontend/src/features/beads/BeadHeader.tsx` (extracted from `BeadDetailPage.tsx:149-192`)
  - Create `frontend/src/features/beads/EpicPage.tsx`, `EpicPage.test.tsx`
  - Modify `frontend/src/features/beads/BeadDetailPage.tsx` (an epic, when not embedded, renders `EpicPage`; others keep their page) and `BeadDetailPage.test.tsx` (epic cases move to `EpicPage.test.tsx`; task and bug cases unchanged)
  - Modify `frontend/src/features/beads/BeadsView.tsx:20-31` (the `fixed` prop) and `BeadsView`/`BeadsPage` tests
  - Modify `frontend/src/features/beads/GraphView.tsx:67,77`, `LanesView.tsx:70` (a `trail` prop, default true; open a child with children as a bead page when the scope is fixed)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** a cross-module refactor of the bead page, the `BeadsView` option, URL handling and keyboard tabs. The header extraction must keep 45 existing bead-page tests green.
- **Acceptance criteria**:
  - The scenarios of REQ-UI-119 have tests: "Opens on Overview", "Tab in the URL", "No Lanes tab without lanes", "Not an epic".
  - Left and Right change the tab, with `aria-selected` on the open tab.
  - An unknown `tab` opens Overview.
  - Discussion shows "Discussion (N)" and "No comments" at 0.
  - REQ-UI-106 "Graph tab of an epic": the epic is the scope, nothing is selected and no panel shows. A click selects and keeps `select` on the epic page URL.
  - The Graph and Lanes tabs keep the canvas contract of REQ-UI-122 (class and height). An epic without children reads "No tracks".
  - The Overview tab shows the description and text sections of REQ-UI-038. Track 4 adds the cards above them.
  - A browser check on a temporary console (port 8725, `/tmp/ex-atl3`) of `/beads/example/ex-e12` and `?tab=graph|lanes|discussion` at 390 and 1440 in both themes:
    - the readability detector finds nothing;
    - the wheel over the Graph tab canvas scrolls the page;
    - screenshots looked at.
  - Full frontend checks pass.
- **Estimated complexity**: high

Interfaces produced:
```ts
// BeadHeader.tsx
export function BeadHeader({ project, bead }: { project: string; bead: BeadDetail }): JSX.Element
// EpicPage.tsx
export type EpicTab = "overview" | "graph" | "lanes" | "discussion";
export function epicPath(project: string, id: string, tab: EpicTab, filters?: BeadFilters): string
export function EpicPage({ project, bead }: { project: string; bead: BeadDetail }): JSX.Element
// BeadsView.tsx
fixed?: { view: "graph" | "lanes"; scope: string }
```

Steps:
1. Write `EpicPage.test.tsx` and the `BeadsView` `fixed` tests. Run them (fail).
2. Extract `BeadHeader`, and run `BeadDetailPage.test.tsx` (still green). Implement `EpicPage` and `fixed`. Run the tests (pass).
3. Build, run the browser check and look at the screenshots. Run the full frontend checks.
4. Commit: `git commit -m "feat(beads): epic page with Overview, Graph, Lanes and Discussion tabs (gin-console-atl)"`

### Track 4: Epic overview
- **Dependencies**: Track 1, Track 3
- **Requirements**: REQ-UI-120, REQ-UI-121
- **Files**:
  - Create `frontend/src/features/beads/epicOverview.ts`, `epicOverview.test.ts`
  - Create `frontend/src/features/beads/EpicOverview.tsx`, `ProgressCard.tsx`, `WorkflowCard.tsx`, `MilestoneCard.tsx`, `LaneSummary.tsx`, `TracksTable.tsx`, and their `*.test.tsx`
  - Modify `frontend/src/features/beads/api.ts` (`fetchEpicWorkflow`)
  - Modify `frontend/src/features/beads/EpicPage.tsx` (Overview renders `EpicOverview` above the description)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded components and pure helpers with exact scenarios and existing helpers to build on (`lanesOf`, `stateOf`, `isMergeGate`, `isPrep`, `workdaysAfter`).
- **Acceptance criteria**:
  - Every scenario of REQ-UI-120 has a test: "Progress by state", "Points", "Workflow stage", "Workflow unavailable", "Milestone forecast late".
  - Every scenario of REQ-UI-121 has a test: "Lanes summary", "No lanes section", "Tracks table", "Sort by a column".
  - Also covered:
    - "No workflow", "No milestone", "Milestones unavailable" and "No points";
    - warnings and waivers on hover and focus;
    - `aria-sort`;
    - the table under 1024px keeps Id, Title and State and scrolls sideways.
  - A browser check on a temporary console (port 8726, `/tmp/ex-atl4`) of the Overview of `ex-e12` and `ex-e3` at 390, 1024, 1440 and 1920 in both themes:
    - the readability detector finds nothing;
    - compared with `assets/2026-11-21/epic-page/shots/overview-light.png` and `overview-dark.png`;
    - screenshots looked at.
  - Full frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
```ts
// api.ts
export async function fetchEpicWorkflow(project: string, id: string): Promise<EpicWorkflow> // EpicWorkflow from features/projects/api.ts; throws with the server's error on 502
// epicOverview.ts
export function epicProgress(children: readonly BeadSummary[]): { closed: number; total: number; byState: Record<GraphState, number>; points: { done: number; total: number } | null }
export function laneRows(beads: readonly BeadSummary[], epicId: string, now: Date): LaneBoard["rows"]
export function workingDaysLeft(today: string, end: string): number // Monday to Friday, both days counted
export type TrackRow = { id: string; title: string; state: GraphState; lane: string | null; assignee: string | null; points: number | null; blockedBy: string[] }
export function trackRows(beads: readonly BeadSummary[], epicId: string): TrackRow[]
export function sortTracks(rows: readonly TrackRow[], column: Exclude<keyof TrackRow, "blockedBy">, direction: "ascending" | "descending"): TrackRow[]
```

Steps:
1. Write `epicOverview.test.ts` and the component tests from the scenarios. Run them (fail).
2. Implement the helpers, then the components, and wire them into `EpicPage`. Run the tests (pass).
3. Build, run the browser check and look at the screenshots. Run the full frontend checks.
4. Commit: `git commit -m "feat(beads): epic overview cards, lanes summary and tracks table (gin-console-atl)"`

### Track 5: QA cases
- **Dependencies**: none
- **Requirements**: REQ-UI-119, REQ-UI-120, REQ-UI-121, REQ-BEADS-020, and the MODIFIED and REMOVED REQs of the delta
- **Files**:
  - Create cases in `qa/cases/ui/` (e2e) for:
    - REQ-UI-119, REQ-UI-120 and REQ-UI-121;
    - the new scenarios of REQ-UI-075 (epic to the Graph tab, bead with children);
    - REQ-UI-106 "Graph tab of an epic".
  - Create cases in `qa/cases/beads/` (api) for REQ-BEADS-020.
  - Modify, re-pin or remove the 48 cases pinned to changed REQs:
    - TC-UI-063..077, 086..090, 097..112, 122, 127..130, 192..198, and any milestone-ui case that visits `/graph` (`tc-milestone-ui-020`).
    - A case that opens the Dependencies page moves to the Graph view, the epic page Graph tab or a redirect, as its REQ now reads.
    - A case whose REQ was removed, or whose behaviour went with the page (see "Dropped with the Dependencies page" in `01-proposal.md`), is removed with `gin-qa`.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** writing cases from written scenarios, but 48 existing cases need one judgement each: keep, rewrite or remove.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-atl` prints `ok`.
  - `gin-qa cases check` shows no new finding.
  - No case still opens `/beads/<p>/graph` or `/beads/<p>/<id>/graph`, except to check the redirect.
- **Estimated complexity**: medium

Steps:
1. Run `gin-qa cases check --change gin-console-atl` and `gin-qa cases plan --change gin-console-atl`. Write, update, re-pin and remove cases per `qa/guidelines.md` and the gin-qa cases skill: explicit URLs, one action per step, a blank line after Priority, stubbable preconditions.
2. Commit: `git commit -m "test(qa): cases for the epic page and the retired Dependencies page (gin-console-atl)"`

### Track 6: Automated tests for the cases
- **Dependencies**: Track 1, Track 2, Track 3, Track 4, Track 5
- **Requirements**: REQ-UI-119, REQ-UI-120, REQ-UI-121, REQ-BEADS-020, REQ-UI-075, REQ-UI-106, REQ-UI-110
- **Files**:
  - Create or modify the specs of the new and changed e2e cases under `qa/e2e/ui/` (and `qa/e2e/milestone-ui/` for `tc-milestone-ui-020`), and delete the specs of removed cases. The specs that visit `/graph` today are tc-ui-098, 099, 108..112, 122, 127..129 and `tc-milestone-ui-020`.
  - Modify `qa/e2e/ui/readability.spec.ts:201` and `qa/e2e/readability-live.js:54`: the "bead graph" visits become the epic page tabs of `ex-e12`.
  - api tests for the REQ-BEADS-020 cases, in `backend/tests/test_beads_workflow_api.py`, traced with `gin-qa tests`.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** specs in the existing patterns, one per written case, plus moving old specs from the retired page.
- **Acceptance criteria**:
  - `npx playwright test qa/e2e/ui qa/e2e/milestone-ui --trace off --workers 4` passes on the built UI.
  - Each new geometry or scroll measurement waits for `settled()` (`qa/e2e/support/lanes.ts`).
  - `gin-qa e2e plan` and `gin-qa tests plan` list none of the change's cases as missing or stale.
  - `gin-qa cases check --change gin-console-atl` prints `ok`.
- **Estimated complexity**: medium

Steps:
1. Write and update the specs and api tests per the gin-qa e2e and tests skills. Build the UI, then run and fix the specs until they pass. Report a product defect instead of changing product code.
2. Commit: `git commit -m "test(e2e): epic page tabs, overview and old Dependencies links (gin-console-atl)"`

### Track 7: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3, Track 4, Track 5, Track 6
- **Requirements**: REQ-UI-110, REQ-UI-119, REQ-UI-120, REQ-UI-121
- **Files**:
  - Modify `docs/changes/gin-console-atl-epic-page/05-tests.md` (TC-1 result)
  - Create `qa/evidence/<date>-atl-tc1/` (gitignored, kept on disk)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** run the written check and record it.
- **Acceptance criteria**: TC-1 is recorded as passed, by claude, with Playwright on the deployed build:
  - the live readability check over the epic page tabs of `ex-e12` and `ex-e3` at 390, 1024, 1440 and 1920 in both themes finds nothing;
  - `/beads/example/ex-e12/graph` lands on the Graph tab;
  - screenshots are compared with the mockup and looked at.
- **Estimated complexity**: low

Steps:
1. Regenerate the example project and deploy the merged branch:
   ```
   python3 scripts/make_example_project.py
   pnpm -C frontend build && uv --directory backend sync && systemctl --user restart gin-console
   ```
   `/api/projects` must return 200.
2. Run `node qa/e2e/readability-live.js --base http://127.0.0.1:8700 --project example --out qa/evidence/<date>-atl-tc1/live`. It must report 0 findings.
3. Take and look at the screenshots:
   - the Overview and Graph tabs of `ex-e12` at 390 and 1440 in both themes;
   - the Lanes and Discussion tabs at 1440.
4. Record TC-1 and commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-atl)"`

## Integration
- **Branch**: `feat/epic-page`
- **Merge strategy**: parallel-then-merge.
  - Tracks 1, 2 and 5 run in worktrees on `feat/epic-page-t<N>`.
  - Track 3 starts from `feat/epic-page` after Track 2 merges.
  - Track 4 starts after Tracks 1 and 3 merge.
  - Merge order: 1, 5, 2, 3, 4. Track 6 runs after Tracks 1-5, and Track 7 on the merged branch.

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .` and `mypy` pass
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass
- [ ] `npx playwright test --trace off` passes
- [ ] `gin specs lint --change gin-console-atl --against master` prints `ok`, and `trace` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-atl` prints `ok`
- [ ] TC-1 passes on the deployed console, with screenshots looked at

## Notes
- Track beads close after tests and review pass. Only the epic waits for the human-confirmed merge at ship.
- The user may override `Model:` and `Effort:` before approval.
- Decision taken in the plan, inside the spec's "the epic as the scope" (REQ-UI-119): on the epic page, opening a child that has children opens that child's bead page instead of moving the scope, and the scope trail is hidden. The page's own breadcrumb (REQ-UI-072) places the epic.
