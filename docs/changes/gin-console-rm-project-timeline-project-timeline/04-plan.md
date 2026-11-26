# Plan: Project timeline

Epic: gin-console-rm-project-timeline
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder. Diagram: `docs/specs/milestone-ui/diagrams/project-timeline-activity.md`. Use case: `docs/specs/milestone-ui/use-cases/see-project-timeline.md`.

## Objective

A PM opens `/milestones?project=<name>` and sees every milestone and epic of the project on one calendar axis, with the project finish, the deadline and the lateness in the header:
- **Backend:** `GET /api/milestones?project=` keeps the chained forecast fields gin 3.5.3 already prints (`forecast.milestones`, and per forecast epic `title`, `status`, `lane`, `remaining_days`, `warnings`) and adds `closed_epics` from the Beads snapshot the route already reads.
- **Frontend:** the Milestones page gets the views Timeline (default) and List (today's page), a header finish line in both, and a `ProjectTimeline` view with milestone and epic rows, Weeks / Months / Quarters, today and deadline lines, and "Show closed".

Done when:
- Every scenario of the 6 added REQs (`REQ-MILESTONE-UI-033` to `REQ-MILESTONE-UI-038`) and of the 2 modified REQs (`REQ-MILESTONE-UI-001`, `REQ-MILESTONE-UI-008`) has a test naming its REQ-ID.
- `uv --directory backend run pytest`, `ruff check .`, and `mypy` pass.
- `pnpm -C frontend test --run`, `typecheck`, `lint`, and `build` pass.
- `gin specs lint --change gin-console-rm-project-timeline --against master` prints `ok`, `gin specs trace --change gin-console-rm-project-timeline` reports no missing REQ, and `gin-qa cases check --change gin-console-rm-project-timeline` prints `ok`.

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
  - `ForecastEpic` (`backend/src/gin_console/milestones/models.py:57-62`) keeps only `id`, `milestone`, `planned_start`, `planned_end`, `estimate_source`, and `Forecast` (`models.py:65-74`) has no `milestones`; pydantic ignores the extra keys, so the chained forecast of gin-workflow-6yoq never reaches the browser.
  - The Milestones page (`frontend/src/features/milestones/MilestonesPage.tsx:81-117`) is a list with a forecast card; no view puts the milestones and epics on a time axis.
  - The milestone Gantt's axis (`gantt.ts:22-50`, `boundsOf`, `axisOf`) is built from one `MilestoneDetail` and cannot serve a project-wide axis.
- **Success criteria:** the REQs above, with the tests and checks of the Objective.
- **Global constraints** (from the spec and the user decisions of 2026-11-26):
  - **Read-only:** no new route, no new process; the closed epics come from the snapshot `get_milestones` already reads (`milestones/router.py:76-80`).
  - **Older gin:** every new forecast field has a default, so a gin without them still answers 200 (REQ-MILESTONE-UI-008 "output from an older gin-workflow").
  - **Closed epics:** closed beads with `issue_type` `epic` and the label `roadmap`; `milestone` from `milestone_of` (`beads/milestones.py:57-67`) of the epic's parent chain (the epic itself is never a milestone); `start` the local date of `started_at`, else of `created_at`; `end` the local date of `closed_at`; a closed epic without `closed_at` is left out; `closed_epics` is `null` when the snapshot cannot be read.
  - **Views:** `view=timeline` or `view=list`; a missing or unknown `view` shows the Timeline and the page does not write `view`; changing the view requests nothing again; `view` and `closed` survive a project switch (`app/project.ts:74` `KEPT` already holds them), `zoom` does not (REQ-UI-123).
  - **Axis:** calendar days, one equal step per day: 24px (Weeks), 6px (Months, default), 2px (Quarters); Saturdays and Sundays shaded only in Weeks; today always inside the span; opens scrolled so that today is near the left edge.
  - **Rows:** closed milestones by `start` (with "Show closed"), then `forecast.milestones` in order, then other open milestones with dates by `start`, then "Not in a milestone"; epics of a group in the order of `forecast.epics`; closed epics before open ones; one row per epic, the lane as a number.
  - **States:** "No open work to forecast", "Forecast unavailable: <error>", "No open epics", "assumed estimate" with a dashed outline, "Closed epics unavailable: Beads could not be read".
  - **The milestone Gantt is not changed.** `usePan`, `useLabelWidth`, `markerSides` and the `LOOK` colours are imported or mirrored, not moved.
- **Non-goals:** every project on one timeline; dependency arrows; dragging bars; exporting the timeline as an image; any change to the milestone page's Gantt.

## Approach Options
### Option 1: Extend `/api/milestones`, new ProjectTimeline view
- **Summary:** Track 1 keeps the forecast fields and adds `closed_epics` in the backend. Track 2 writes the pure timeline rules (`timeline/axis.ts`) and the API types. Track 3 builds the view switch, the header line and `ProjectTimeline`. Track 4 writes the QA cases and e2e specs.
- **Pros:** one request feeds both views; the server already reads the snapshot; the rules of rows, bounds, scale and ticks live in one pure module that vitest covers without rendering; the milestone Gantt is untouched.
- **Cons:** a second axis implementation beside the Gantt's.

### Option 2: Join in the browser
- **Summary:** the page also fetches `/api/beads?closed=1` and joins closed epics in TypeScript.
- **Pros:** less backend code.
- **Cons:** rejected at discuss: two requests and a client-side join of every bead of the project on each load.

### Option 3: Generalise the Gantt
- **Summary:** make `GanttChart.tsx` serve both pages.
- **Cons:** rejected at discuss: a 550-line component pinned by REQ-MILESTONE-UI-011 to 015 changes for both pages.

### Recommended Approach
- **Selected option:** Option 1, confirmed at discuss on 2026-11-26.
- **Rationale:** matches "backend first, the models and API JSON are the contract" of the roadmap's way of working, and keeps the two charts independent.

## Scope
- **In scope:** `REQ-MILESTONE-UI-033` to `REQ-MILESTONE-UI-038`; modified `REQ-MILESTONE-UI-001` and `REQ-MILESTONE-UI-008`; the gin-qa cases and e2e specs of these REQs, and the existing e2e specs that open `/milestones` and expect the list.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend/src/gin_console/milestones and backend/tests) and Track 2 (frontend/src/features/milestones/timeline/axis.ts and the types in api.ts) share no file, so they run at once in their own worktrees; Track 3 waits for Track 2, and Track 4 for Tracks 1 and 3.
```

## Tasks

### Track 1: Chained forecast fields and closed epics in the Milestones API
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-008
- **Files**:
  - Modify `backend/src/gin_console/milestones/models.py:57-83` (`ForecastEpic` fields, `ForecastMilestone`, `Forecast.milestones`, `ClosedEpic`, `MilestoneList.closed_epics`)
  - Modify `backend/src/gin_console/milestones/source.py:68-90` (add `closed_epics(snapshot)` and `with_history(listing, snapshot)` after `with_epic_states`)
  - Modify `backend/src/gin_console/milestones/router.py:17-24,69-80` (import and apply `with_history`)
  - Test `backend/tests/test_milestones_source.py` (closed epics rules)
  - Test `backend/tests/test_milestones_api.py` (new forecast fields through the route, `closed_epics`, unreadable snapshot)
  - Modify `backend/tests/fake_gw.py:6-24` only to add a `LIST_CHAINED` constant with a chained `forecast` (keep `LIST` unchanged)
- **Interfaces**:
  - Consumes: `EpicWarning` (`models.py:85-88`, `code`, `days`, `count`), `IsoDate`, `Text` (`models.py:11-14`), `Snapshot` (`beads/snapshot.py`: `rows`, `parents`), `milestone_of` (`beads/milestones.py:57-67`), `with_epic_states` (`source.py:68-90`), `KeyedCache`, `snapshots.get` (`router.py:56-80`). Test helpers: `make`, `Clock`, `_epics_of` (`tests/test_milestones_api.py:40-56,451-455`), `FakeGw`, `LIST`, `SHOW` (`tests/fake_gw.py`), `bead`, `dep`, `write_export` (`tests/fake_export.py`).
  - Produces (`models.py`):
    ```python
    class ForecastEpic(BaseModel):
        id: Text
        milestone: Text | None
        planned_start: IsoDate
        planned_end: IsoDate
        estimate_source: Literal["points", "days", "assumed"] | None = None
        title: Text | None = None
        status: Text | None = None
        lane: int | None = None
        remaining_days: int | None = None
        warnings: list[EpicWarning] = Field(default_factory=list)

    class ForecastMilestone(BaseModel):
        id: Text
        start: IsoDate | None = None
        finish: IsoDate | None = None
        overflow_days: int = 0

    class Forecast(BaseModel):  # existing fields unchanged, plus:
        milestones: list[ForecastMilestone] = Field(default_factory=list)

    class ClosedEpic(BaseModel):
        id: Text
        title: Text
        milestone: Text | None
        start: IsoDate
        end: IsoDate

    class MilestoneList(BaseModel):  # existing fields unchanged, plus:
        closed_epics: list[ClosedEpic] | None = None
    ```
    `EpicWarning` moves above `ForecastEpic` in the file (it is defined at `models.py:85` today); its fields do not change.
  - Produces (`source.py`):
    - `closed_epics(snapshot: Snapshot) -> list[ClosedEpic]`: for each row with `issue_type == "epic"`, `status == "closed"`, `"roadmap"` in `labels` and a parsable `closed_at`: `milestone = milestone_of(snapshot, parent)` where `parent = snapshot.parents.get(id)` (None without a parent), `start` = local date of `started_at` else of `created_at` (`datetime.fromisoformat(...).astimezone().date().isoformat()`), `end` = local date of `closed_at`; a row whose stamps do not parse is left out; sorted by (`start`, `id`).
    - `with_history(listing: MilestoneList, snapshot: Snapshot | None) -> MilestoneList`: `listing.model_copy(update={"closed_epics": None if snapshot is None else closed_epics(snapshot)})`.
  - Produces (`router.py`): `get_milestones` returns `with_history(with_epic_states(listing, snapshot), snapshot)`.
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded additions to one module's models and one pure function over the snapshot, with the cases written in REQ-MILESTONE-UI-008; the route change is one line.
- **Steps**:
  1. In `test_milestones_api.py`, add tests named for REQ-MILESTONE-UI-008: "Chained milestones" (`forecast.milestones` with `M2` and `M4` null dates passes through unchanged), "forecast epics" rewritten to assert every printed key (`title`, `status`, `lane`, `remaining_days`, `warnings` as `[{"code": "overflow", "days": 42, "count": None}]`), "Closed epics" (export rows `m1` milestone, `e-2` epic closed with label `roadmap` and parent `m1`, `started_at` 2026-10-12T09:00:00Z, `closed_at` 2026-10-28T09:00:00Z; `e-3` closed `roadmap` epic without parent and without `started_at`, `created_at` 2026-10-01T09:00:00Z, `closed_at` 2026-10-09T09:00:00Z; `e-4` closed epic without `roadmap`; `e-5` open `roadmap` epic) expecting exactly `e-2` and `e-3`, and "Closed epics unreadable" (`read_beads` raising `BeadsError`, response 200 with `closed_epics: None`). Keep the existing "output from an older gin-workflow" test and add that `forecast.milestones` is `[]` and epic `warnings` is `[]` when the output lacks them. Run `uv --directory backend run pytest tests/test_milestones_api.py -k 008`; expect failures.
  2. In `test_milestones_source.py`, unit tests of `closed_epics`: nearest milestone through a parent epic (`e-6` under epic `e-1` under `m1` gives `m1`), a closed epic without `closed_at` left out, a malformed `closed_at` left out, the order by `start` then `id`.
  3. Implement the models, `closed_epics`, `with_history`, and the router line. Run the tests until they pass.
  4. Run `uv --directory backend run pytest`, `uv --directory backend run ruff check .`, `uv --directory backend run mypy`; commit.
- **Acceptance criteria**:
  - Every scenario of REQ-MILESTONE-UI-008 (old and new) has a test naming `REQ-MILESTONE-UI-008`.
  - The existing milestones tests pass unchanged, except the "forecast epics" assertion widened to every key.
  - `pytest`, `ruff check .`, and `mypy` pass.
- **Estimated complexity**: low

### Track 2: Timeline rules and API types
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-035, REQ-MILESTONE-UI-036, REQ-MILESTONE-UI-037
- **Files**:
  - Modify `frontend/src/features/milestones/api.ts:37-49` (types), `api.ts:146-172` (`isForecastEpic`, `isForecast`, `withEpics`), `api.ts:192-200` (`isList` accepts `closed_epics`)
  - Modify `frontend/src/features/milestones/milestoneFixtures.ts:22-43` (fixtures `forecastEpic`, `forecastMilestone`, `closedEpic`; `list` and `forecast` defaults gain `closed_epics: []` and `milestones: []`)
  - Create `frontend/src/features/milestones/timeline/axis.ts`
  - Test `frontend/src/features/milestones/timeline/axis.test.ts`
  - Test `frontend/src/features/milestones/api.test.ts` (parsing of the new fields and of older output)
- **Interfaces**:
  - Consumes: `MilestoneList`, `MilestoneEntry`, `Forecast`, `EpicWarning`, `EstimateSource` (`api.ts`), `dayOf`, `isoOf`, `isWeekend`, `mondayOf` (`gantt.ts:11-18,178`), `formatDate` (`lib/dates.ts:33`).
  - Produces (`api.ts`):
    - `ForecastEpic = { id: string; milestone: string | null; planned_start: string; planned_end: string; estimate_source: EstimateSource | null; title: string | null; status: string | null; lane: number | null; remaining_days: number | null; warnings: EpicWarning[] }`
    - `ForecastMilestone = { id: string; start: string | null; finish: string | null; overflow_days: number }`
    - `Forecast` gains `milestones: ForecastMilestone[]`; `ClosedEpic = { id: string; title: string; milestone: string | null; start: string; end: string }`; `MilestoneList` gains `closed_epics: ClosedEpic[] | null`. `withEpics` fills the defaults (`[]`, `null`) for output that lacks them; `fetchMilestones` returns `closed_epics: null` when the key is missing.
  - Produces (`timeline/axis.ts`):
    - `type Zoom = "weeks" | "months" | "quarters"`; `zoomOf(param: string | null): Zoom` (`months` for null or another value); `DAY_WIDTH: Record<Zoom, number> = { weeks: 24, months: 6, quarters: 2 }`.
    - `type Bar = { from: string; to: string }`; `type EpicRow = { kind: "epic"; id: string; title: string; status: string; closed: boolean; bar: Bar; lane: number | null; remaining: number | null; over: number | null; assumed: boolean; warned: boolean; label: string }` (`label` the accessible name of REQ-MILESTONE-UI-035, e.g. "Multi-currency pricing: planned 11 Dec – 2 Feb, 38 days left, 42 days over", plus ", assumed estimate" for `assumed`); `type Group = { kind: "milestone"; id: string; title: string; status: string; window: Bar | null; overrun: Bar | null; finish: string | null; noOpenEpics: boolean; epics: EpicRow[] } | { kind: "none"; epics: EpicRow[] }`.
    - `timelineGroups(list: MilestoneList, showClosed: boolean): Group[]`: the order and contents of REQ-MILESTONE-UI-035 and 037; `overrun` is `{ from: end + 1 day, to: chained finish }` only when the chained finish is after `end`; `finish` is the chained `finish` for an open milestone and the entry's `finish` for a closed one; `noOpenEpics` when the `forecast.milestones` entry has `start` and `finish` null; with `forecast.error` set, epic rows of open epics are dropped and `overrun` is null (REQ-MILESTONE-UI-038); a forecast epic whose `milestone` names no listed milestone goes to the `none` group; the `none` group is left out when empty.
    - `spanOf(groups: Group[], forecast: Forecast | null, today: string): { first: number; last: number }`: day numbers (`dayOf`) from the earliest bar start to the latest of the bar ends, `forecast.finish`, `forecast.deadline` and today.
    - `ticksOf(zoom: Zoom, first: number, last: number): { day: number; label: string }[]`: Weeks: each Monday, `formatDate` without year ("21 Dec"); Months: the 1st of each month (and `first` itself as the first tick), "Nov 2026" for January and for the first tick, else "Dec"; Quarters: the 1st of January, April, July and October, "Q1 2027" (and `first` as the first tick labelled with its quarter).
    - `xOfDay(day: number, first: number, zoom: Zoom): number` = `(day - first) * DAY_WIDTH[zoom]`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** pure functions with a clear spec, but many interacting rules (group order across closed, chained and unchained milestones, overrun, error mode, unlisted milestones, tick labels across year ends at three zooms), so the effort goes up while the scope stays bounded.
- **Steps**:
  1. `axis.test.ts` first, each test naming its REQ-ID: the three scenarios of REQ-MILESTONE-UI-035 ("Milestone and its epics" with `ex-m2` and `ex-e13`, checking `window`, `overrun` 2026-12-05 to 2027-07-02 and the `label` text; "Not in a milestone" with 13 epics; "Order of groups"), REQ-MILESTONE-UI-037 "Show closed" (closed milestones first, closed epic rows before open ones, `finish` of `ex-m0b` 2026-10-13) and "Off by default", REQ-MILESTONE-UI-036 "Zoom" (`DAY_WIDTH.quarters` 2, `ticksOf("quarters", …)` labels "Q4 2026", "Q1 2027") and "Weeks across a year end" (2026-12-21 to 2027-01-15: "21 Dec", "28 Dec", "4 Jan", "11 Jan"), `spanOf` including today and the deadline, `zoomOf` defaults, and the REQ-MILESTONE-UI-038 rules that live here (`noOpenEpics`, `assumed`, error mode). Run `pnpm -C frontend test --run src/features/milestones/timeline`; expect failures.
  2. Add the parser cases (new fields kept; older output gets `milestones: []`, `warnings: []`, `title: null`, `closed_epics: null`). Run; expect failures.
  3. Implement the types, the parsers, the fixtures and `axis.ts`. Run the tests until they pass.
  4. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`; commit.
- **Acceptance criteria**:
  - The scenarios of REQ-MILESTONE-UI-035 and 037 and the zoom, tick and span rules of REQ-MILESTONE-UI-036 have unit tests naming the REQ-ID.
  - No component file changes in this track.
  - `vitest`, `typecheck`, and `lint` pass.
- **Estimated complexity**: medium

### Track 3: Views, header finish line and the Timeline view
- **Dependencies**: Track 2
- **Requirements**: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-033, REQ-MILESTONE-UI-034, REQ-MILESTONE-UI-035, REQ-MILESTONE-UI-036, REQ-MILESTONE-UI-037, REQ-MILESTONE-UI-038
- **Files**:
  - Modify `frontend/src/features/milestones/MilestonesPage.tsx:32-117` (read `view`, `closed`, `zoom`; the View links; `ProjectFinish` under the title; `MilestoneTable` loads once and renders the list or `ProjectTimeline`)
  - Create `frontend/src/features/milestones/ProjectFinish.tsx`
  - Create `frontend/src/features/milestones/timeline/ProjectTimeline.tsx`
  - Test `frontend/src/features/milestones/ProjectFinish.test.tsx`
  - Test `frontend/src/features/milestones/timeline/ProjectTimeline.test.tsx`
  - Test `frontend/src/features/milestones/MilestonesPage.test.tsx` (existing list tests open `/milestones?project=alpha&view=list`; new view tests)
  - Modify `frontend/src/lib/definitions.ts` only if a tooltip sentence is needed for the overrun hatch
- **Interfaces**:
  - Consumes: `timelineGroups`, `spanOf`, `ticksOf`, `xOfDay`, `zoomOf`, `DAY_WIDTH`, `Group`, `EpicRow`, `Zoom` (`timeline/axis.ts`), `isWeekend`, `dayOf`, `isoOf`, `markerSides` (`gantt.ts`), `usePan` (`usePan.ts:7`), `useLabelWidth` (`useLabelWidth.ts:16`), `Link` (`app/Link`), `navigate`, `useLocation` (`app/route`), `milestonePath`, `milestonesPath`, `fetchMilestones` (`api.ts`), `beadPath` (`features/reports/format.ts:3`), `MilestoneStatus` (`MilestoneStatus.tsx`), `formatDate` (`lib/dates.ts`), `MilestoneError`, `useLoad`, the state styles of the Gantt's `LOOK` (`GanttChart.tsx:62-70`, mirrored as a local map, not imported, since it is not exported).
  - Produces:
    - `ProjectFinish({ forecast, today }: { forecast: Forecast | null; today: string })`: nothing for `null`; "Forecast unavailable: <error>" (destructive) when `error`; else "Project finishes <date>" or "Project finish not estimated", "deadline <date>", "<n> working days late" with a warning icon.
    - `ProjectTimeline({ project, list, zoom, showClosed, onZoom, onShowClosed }: { project: string; list: MilestoneList; zoom: Zoom; showClosed: boolean; onZoom: (zoom: Zoom) => void; onShowClosed: (on: boolean) => void })`: the zoom group (`aria-pressed`), the "Show closed" checkbox, the sticky label column (`useLabelWidth`) with links, the scroller (`usePan`) with ticks, weekend shading in Weeks, the Today and Deadline lines and chips (`markerSides`), bars with `aria-label` from `EpicRow.label` inside an `aria-hidden` chart, hatched overrun, dashed assumed bars, Done style for closed rows, the texts of REQ-MILESTONE-UI-038, and a `useLayoutEffect` that scrolls today near the left edge on mount and on zoom change.
    - `MilestonesPage`: `view` from the URL (`timeline` unless `view=list`), `<nav aria-label="View">` of two `Link`s marked `aria-current="page"`, writing `view=list` or removing `view`; `closed=1` and `zoom` written with `navigate(..., { replace: false })` and kept across view changes; `MilestoneTable` fetches once per project and passes the data to either view, so switching views requests nothing.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded component over the pure rules of Track 2, following the Gantt's drawing patterns; the edge cases are in `axis.ts`, so the component mostly renders.
- **Steps**:
  1. Change the existing list tests of `MilestonesPage.test.tsx` to open `/milestones?project=alpha&view=list` and confirm they still pass on the current code. Then add, naming the REQ-IDs: REQ-MILESTONE-UI-033 "Default view" and "List" (one `/api/milestones` request across the switch), view kept on a project switch through `switchProject`; REQ-MILESTONE-UI-034 the three scenarios in `ProjectFinish.test.tsx`; REQ-MILESTONE-UI-035, 036, 037, 038 in `ProjectTimeline.test.tsx` (bars and hatched overrun, "Not in a milestone", zoom buttons writing `zoom`, Today and Deadline lines, weekend shading only in Weeks, "Show closed" writing `closed=1`, every state text, bar names, title links to `milestonePath` and the epic bead page); REQ-MILESTONE-UI-001 that the List view still shows the columns and the forecast card. Run `pnpm -C frontend test --run src/features/milestones`; expect failures.
  2. Implement `ProjectFinish.tsx`, `ProjectTimeline.tsx` and the page changes. Run until the tests pass.
  3. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`; commit.
- **Acceptance criteria**:
  - The scenarios of REQ-MILESTONE-UI-033, 034 and 038, the rendering parts of 035, 036 and 037, and the List view of 001 have tests naming the REQ-ID.
  - The milestone page's Gantt files (`GanttChart.tsx`, `gantt.ts`, `GanttTab.tsx`) are not modified.
  - `vitest`, `typecheck`, `lint`, and `build` pass.
- **Estimated complexity**: medium

### Track 4: QA cases and e2e specs for the Project timeline
- **Dependencies**: Track 1, Track 3
- **Requirements**: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-033, REQ-MILESTONE-UI-034, REQ-MILESTONE-UI-035, REQ-MILESTONE-UI-036, REQ-MILESTONE-UI-037, REQ-MILESTONE-UI-038
- **Files**:
  - Modify and add cases in `qa/cases/milestone-ui/`, as `gin-qa cases plan --change gin-console-rm-project-timeline` lists them (today: REQ-MILESTONE-UI-033 to 038 missing; TC-MILESTONE-UI-001 to 004, 022 to 031, 073, 074, 086 to 088, 092, 093, 111 and 112 stale)
  - Modify `backend/tests/test_milestones_api.py` only for TC-named tests of new `api` cases of REQ-MILESTONE-UI-008 (the type's glob is `backend/tests/test_*_api.py`)
  - Modify the e2e specs under `qa/e2e/milestone-ui/` that open `/milestones?project=…` and expect the list (add `view=list`), and create e2e specs under `qa/e2e/milestone-ui/` for the new e2e cases
  - Modify `qa/e2e/support/` stubs only if a `/api/milestones` stub lacks the new fields the specs need
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases and specs from written scenarios in the existing gin-qa patterns; e2e writing stays on the middle model, as the user asked for e2e and test agents.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-project-timeline` prints `ok`, `gin-qa cases plan --change gin-console-rm-project-timeline` lists nothing missing, stale or obsolete, and `gin-qa e2e plan` lists none of the change's cases as missing or stale.
  - The new and changed e2e specs pass on the built UI with a Playwright config outside the repo on port 8702 (port 8701 is held by another server; the repo config has `reuseExistingServer: true`), `--trace off`, including the Timeline at 390px without horizontal page scroll, Quarters, "Show closed", the late header and the error state; the whole `qa/e2e/milestone-ui` folder is run once and every failure this change causes is fixed.
- **Estimated complexity**: medium

## Integration
- **Branch**: `feat/rm-project-timeline` (the spec branch; it is checked out in `.planning/worktrees/gin-console-rm-project-timeline`)
- **Merge strategy**: parallel-then-merge: Tracks 1 and 2 at once in worktrees from `feat/rm-project-timeline`; Track 3 after Track 2 merges into it; Track 4 after Tracks 1 and 3 merge.
- **Shared checkout**: other sessions may use the main checkout and other worktrees (gin-console-rm-evidence-images is planned at the same time); this epic never switches the main checkout. Merges into `feat/rm-project-timeline` run in its worktree; before the final merge to `master`, compare `origin/master` with the branch base, because another epic may have shipped.

## Validation
- [ ] `uv --directory backend run pytest`, `uv --directory backend run ruff check .`, and `uv --directory backend run mypy` pass
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, and `pnpm -C frontend build` pass
- [ ] `gin specs lint --change gin-console-rm-project-timeline --against master` prints `ok` and `gin specs trace --change gin-console-rm-project-timeline` reports no missing REQ
- [ ] `gin-qa cases check --change gin-console-rm-project-timeline` prints `ok`
- [ ] Manual check on the built UI: the Timeline of gin-workflow (13 epics under "Not in a milestone", "Project finishes 22 Dec", "deadline 11 Dec", "7 working days late"), of example (Quarters, "Show closed" adding ex-m0a, ex-m0b, ex-m1), and of gin-console; the List view unchanged; the page at 390px.

## Notes
- The user may override `Model:` and `Effort:` before plan approval.
- Provider roles describe responsibility rather than filename patterns.
- The existing frontend and e2e tests of the Milestones page assume the list; with the Timeline as the default view, Track 3 moves the vitest ones to `view=list` and Track 4 the e2e ones.
- qwikfone's `gin milestone list` fails today (bd refuses a schema migration); its Milestones page shows the existing error with Retry, which is not this epic's to fix.
- The roadmap still lists this epic under Unassigned; moving it into a milestone is a `/gin:roadmap --milestone` decision, not part of this plan.
- Deliverable merge-holds apply exclusively to the Parent Bead (`gin-console-rm-project-timeline`). Individual track beads close after tests and review pass so dependents unblock.
