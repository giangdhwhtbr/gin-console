# Plan: Bugs view

Epic: gin-console-rm-bugs-view
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder. Diagram: `docs/specs/reports/diagrams/bugs-section-activity.md`. Use case: `docs/specs/reports/use-cases/see-where-bugs-come-from.md`.

## Objective

A PM or a QA opens `/reports/bugs` and sees, for one project and the selected milestone or period, where the bugs come from (by source epic, "Source unknown" last), how many were opened and closed each week, and every open bug with its age, oldest first:
- **Backend:** `GET /api/reports/bugs?project=&milestone=|days=` builds the bugs report from the Beads snapshot already read for the other reports.
- **Frontend:** a sixth report section, Bugs, after Rework, with its headline "<n> open bugs", its page title and its place in the sidebar and in the row of section links.

Done when:
- Every scenario of the 6 added REQs (`REQ-REPORTS-039` to `REQ-REPORTS-044`) and the changed scenarios of the 4 modified REQs (`REQ-REPORTS-033`, `REQ-UI-063`, `REQ-UI-095`, `REQ-UI-129`) have a test naming the REQ-ID.
- `uv --directory backend run pytest`, `ruff check .`, and `mypy` pass.
- `pnpm -C frontend test --run`, `typecheck`, `lint`, and `build` pass.
- `gin specs lint --change gin-console-rm-bugs-view --against master` prints `ok`, `gin specs trace --change gin-console-rm-bugs-view` reports no missing REQ, and `gin-qa cases check --change gin-console-rm-bugs-view` prints `ok`.

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
  - Reports shows a bug only as rework of a closed bead: `_bug_days` (`backend/src/gin_console/reports/source.py:72-79`) counts the `discovered-from` bugs of each bead, and the Rework section (`frontend/src/features/reports/ReworkSection.tsx`) sums them as "Bugs found later". A bug without that link is in no report.
  - No report gives the age of an open bug, the bugs per week, or the epic a bug comes from.
  - `ReportBead` (`backend/src/gin_console/reports/models.py:24-56`) keeps no `discovered-from` targets of a bead, only the bug dates of its targets.
- **Success criteria:** the REQs above, with the tests and checks of the Objective.
- **Global constraints** (from the spec and the user decisions of 2026-11-25):
  - **Read-only:** never mutate projects or Beads; no new process: the report reads the snapshot (`SnapshotStore`) as `/reports/team` does.
  - **Bug:** `issue_type == "bug"`; merge gates are already left out by `read_beads` (`source.py:101`).
  - **Source epic (REQ-REPORTS-040):** first `discovered-from` target by id that is in the project and is an epic or has one among its parents (`Tree.epics_of`, `reports/scope.py:41-43`); else the nearest epic among the bug's parents; else unknown. A cycle stops at the first bead met twice (`Tree._lineage`).
  - **Dates:** every date is a local date (`day_of`, `reports/scope.py:59-60`); no comparison between datetimes, so naive and aware stamps never meet.
  - **Period:** a milestone from its `start` to the earlier of its `end` and `today`, `null` before its start; a period of N days from `today - N` to `today`; the milestone is chosen as REQ-REPORTS-008 does (`list_milestones`, `select_milestone`).
  - **Open bugs:** every bug whose status is not `closed`, deferred included, whatever the scope.
  - **A row without a valid `created_at`** is already left out by `read_beads` (`ValidationError`, `source.py:139-140`); nothing new handles it.
  - **Person:** `person_key(assignee)` (`beads/definitions.py`), shown as "Unassigned" when `null`, never the owner.
  - **Cache and errors:** 60 s `KeyedCache`, cleared by `POST /api/refresh`; 404, 422 and 502 exactly as `/reports/team` (`reports/router.py:113-127`).
  - **Frontend:** no new chart library: `BarRows` (`features/reports/BarRows.tsx`, no caller today) draws the weeks; carnelian (`--color-destructive`) is the colour of bugs and errors only.
- **Non-goals:** bugs by capability; bugs found by QA versus found later; filing, editing or closing bugs; several projects in one report; CSV export; any change to REQ-REPORTS-019, to the Rework section or to `/api/beads`.

## Approach Options
### Option 1: One backend track, then the section and its wiring as two frontend tracks
- **Summary:** Track 1 builds the bugs report and its endpoint (`reports/bugs.py`, models, `found_in` in `source.py`, the route). Track 2 builds the Bugs section and its pure helpers against the response type written in this plan, in parallel with Track 1. Track 3 adds `bugs` to the sections and loads the bugs report in `ReportsView`. Track 4 writes the QA cases and e2e specs.
- **Pros:**
  - Tracks 1 and 2 touch disjoint folders (`backend/` and `frontend/src/features/reports/bugs/`) and run at once.
  - Track 3 is the only one that edits `ReportsView.tsx` and the tests that list five sections, so the shared files change in one review.
  - Each track has its own test cycle (`pytest` for Track 1, `vitest` for Tracks 2 and 3, Playwright for Track 4).
- **Cons:** Track 2 codes against the response type of this plan before Track 1 exists; a mismatch shows only when Track 4 runs the e2e specs.

### Option 2: Compute the report in the browser from `/api/beads`
- **Summary:** fetch the beads of the project and compute source epics, weeks and ages in TypeScript.
- **Pros:** no backend change.
- **Cons:** rejected at discuss: `/api/beads` holds no `discovered-from` targets, the page would load every bead of a project, and the period and milestone rules already live in `reports/scope.py`.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed at discuss (one endpoint, server decides every count), matches how Team and Status are built (`team.py`, `status.py` as pure builders, one route each), and lets the backend and the section run in parallel.

## Scope
- **In scope:** `REQ-REPORTS-039` to `REQ-REPORTS-044`; modified `REQ-REPORTS-033`, `REQ-UI-063`, `REQ-UI-095`, `REQ-UI-129`; the README section list; the gin-qa cases and e2e specs of these REQs.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend/src/gin_console/reports and backend/tests) and Track 2 (frontend/src/features/reports/bugs plus three shared frontend modules it only appends to) share no file, so they run at once in their own worktrees; Track 3 waits for Track 2, and Track 4 for Tracks 1 and 3.
```

## Tasks

### Track 1: Bugs report and endpoint
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-039, REQ-REPORTS-040, REQ-REPORTS-041, REQ-REPORTS-042
- **Files**:
  - Modify `backend/src/gin_console/reports/models.py:24-56` (add `found_in: list[str] = Field(default_factory=list)` to `ReportBead`; add the models below after `StatusReport`)
  - Modify `backend/src/gin_console/reports/source.py:91-141` (`read_beads` fills `found_in`)
  - Create `backend/src/gin_console/reports/bugs.py`
  - Modify `backend/src/gin_console/reports/router.py:1-127` (docstring names REQ-REPORTS-039; one `KeyedCache` and the route `GET /reports/bugs`)
  - Test `backend/tests/test_reports_bugs.py`
  - Test `backend/tests/test_reports_bugs_api.py`
  - Test `backend/tests/test_reports_source.py` (one test for `found_in`)
- **Interfaces**:
  - Consumes: `ReportBead`, `TeamMilestone` (`reports/models.py`), `Tree`, `day_of`, `list_milestones`, `select_milestone`, `MilestoneScope`, `PeriodScope`, `Scope` (`reports/scope.py`), `person_key` (`beads/definitions.py`), `Snapshot.dependents` (`beads/snapshot.py:24-32`: `dependents[target]` holds `(issue_id, type)`), `KeyedCache` (`beads/service.py`), `parse_scope`, `find`, `beads_of`, `_message` (`reports/router.py`). Test helpers: `row`, `closed`, `snap` (`tests/report_beads.py`), `make`, `Clock`, `milestone` (pattern of `tests/test_reports_team_api.py:1-60`), `FakeExport`, `bead`, `write_export` (`tests/fake_export.py`).
  - Produces (`reports/models.py`):
    ```python
    class BugPeriod(BaseModel):
        start: date
        end: date

    class BugFigures(BaseModel):
        total: int
        opened: int
        closed: int
        open_now: int
        oldest_open_days: int | None
        median_close_days: float | None

    class BugWeek(BaseModel):
        start: date  # the Monday of the ISO week
        opened: int
        closed: int

    class BugEpic(BaseModel):
        id: str | None  # None: the row of unknown source
        title: str | None
        opened: int
        closed: int
        open_now: int

    class EpicRef(BaseModel):
        id: str
        title: str

    class OpenBug(BaseModel):
        id: str
        title: str
        priority: int | None
        assignee: str | None  # person_key of the assignee
        age_days: int
        epic: EpicRef | None

    class BugsReport(BaseModel):
        generated_at: datetime
        project: str
        today: date
        milestone: str | None
        days: int | None
        period: BugPeriod | None
        figures: BugFigures
        weeks: list[BugWeek]
        epics: list[BugEpic]
        open: list[OpenBug]
    ```
  - Produces (`reports/bugs.py`):
    - `source_epic(tree: Tree, bug: ReportBead) -> ReportBead | None` (REQ-REPORTS-040: for each id of `bug.found_in`, `tree.index.get((bug.project, id))`, then `tree.epics_of(target)[0]` when not empty; else `tree.epics_of(bug)[0]` when not empty; else `None`).
    - `bug_period(beads: list[ReportBead], today: date, scope: Scope | None) -> tuple[str | None, int | None, BugPeriod | None]` (the `milestone`, `days` and `period` of REQ-REPORTS-039).
    - `build_bugs(beads: list[ReportBead], *, now: datetime, project: str, scope: Scope | None) -> BugsReport`.
  - Produces (`reports/source.py`): `found_in` is the sorted ids `t` for which `(bead id, "discovered-from")` is in `snapshot.dependents[t]`, built once per `read_beads` call by inverting `snapshot.dependents`.
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** one bounded module in the existing reports pattern with a clear spec, but intricate rules with many edge cases: link order, bug-from-bug, parent cycles, ISO weeks across a year end, clipped weeks, medians, a milestone past its end or not started.
- **Steps**:
  1. `test_reports_bugs.py` first, one test per scenario of REQ-REPORTS-040, 041 and 042, each naming its REQ-ID, built with `row`, `closed` and `snap` and `read_beads(snap(rows), "alpha", {})`, with `now` such that `day_of(now)` is 2026-11-25 (use a local-midnight-safe time such as `datetime(2026, 11, 25, 12, tzinfo=UTC)` and dates that do not depend on the time zone). Add: a merge gate bug left out; `epics` sums equal to `figures.opened` and `figures.closed`; `open` sorted by age, priority, id. Run `uv --directory backend run pytest tests/test_reports_bugs.py`; expect import errors.
  2. Add the models and `found_in` (`source.py`), with the `found_in` test in `test_reports_source.py` (a bug with links to `t-9` and `t-1` has `found_in == ["t-1", "t-9"]`; a `blocks` link is not in it).
  3. Write `bugs.py`: `is_bug`, `source_epic`, `bug_period`, the counts, `weeks` from the Monday of `period.start` in 7-day steps while the Monday is on or before `period.end`, `median` from `statistics.median` rounded with `round(x, 1)`, `max(0, …)` for a close before the creation. Run the tests until they pass.
  4. `test_reports_bugs_api.py`: each scenario of REQ-REPORTS-039 through the app (`make`, `Clock`, `FakeExport`), including the cache (same `generated_at` at +20 s, a newer one after `POST /api/refresh`), the 404/422 matrix, and a 502 then 200 (a runner that raises `BeadsError` once). Add the route in `router.py` as `get_team` is written: `find`, `parse_scope`, `bugs.get((entry.name, scope), lambda: build_bugs(beads_of(entry), now=clock(), project=entry.name, scope=scope))`, `except (BeadsError, RecursionError)` → 502.
  5. Run `uv --directory backend run pytest`, `uv --directory backend run ruff check .`, `uv --directory backend run mypy`; commit.
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-039 to REQ-REPORTS-042 has a test naming its REQ-ID, in `test_reports_bugs.py` or `test_reports_bugs_api.py`.
  - The existing reports tests pass unchanged (`found_in` is a new field with a default).
  - `pytest`, `ruff check .`, and `mypy` pass.
- **Estimated complexity**: medium

### Track 2: Bugs section component
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-043, REQ-REPORTS-044
- **Files**:
  - Create `frontend/src/features/reports/bugs/bugsApi.ts`
  - Create `frontend/src/features/reports/bugs/BugsSection.tsx`
  - Create `frontend/src/features/reports/bugs/bugsFixtures.ts`
  - Modify `frontend/src/features/reports/headlines.ts` (append `bugsHeadline`)
  - Modify `frontend/src/lib/definitions.ts` (append five keys)
  - Modify `frontend/src/features/reports/colors.ts` (append `BUG_COLORS`)
  - Test `frontend/src/features/reports/bugs/bugsApi.test.ts`
  - Test `frontend/src/features/reports/bugs/BugsSection.test.tsx`
  - Test `frontend/src/features/reports/headlines.test.ts` (append the `bugsHeadline` tests)
- **Interfaces**:
  - Consumes: `failure` (`features/reports/api.ts`), `scopeQuery`, `Scope` (`features/reports/filters.ts`), `field` (`lib/guards.ts`), the pattern of `fetchStatus` (`features/reports/status/statusApi.ts:139-147`), `Figures` (`features/reports/Figures.tsx`, `hints` by label), `BarRows`, `BarRow`, `Segment` (`features/reports/BarRows.tsx`), `Table*` (`components/ui/table.tsx`, its container already scrolls sideways), `Link` (`app/Link`), `beadPath`, `formatPercent` (`features/reports/format.ts`), `formatDate` (`lib/dates.ts`), `plural` (`features/milestones/format.ts`), `DEFINITIONS` (`lib/definitions.ts`), `Headline` (`features/reports/headlines.ts`).
  - Produces:
    - `bugsApi.ts`: the types `BugPeriod`, `BugFigures`, `BugWeek`, `BugEpic`, `EpicRef`, `OpenBug`, `BugsReport`, field for field as the Track 1 models (dates as ISO strings, `null` for `None`); `isBugsReport(value: unknown): value is BugsReport`; `fetchBugs(project: string, scope: Scope): Promise<BugsReport>` requesting `/api/reports/bugs` with the scope query (none for the default scope), throwing `failure(response)` when not ok, and `Error("Could not load the bugs report (unexpected response)")` for another shape.
    - `BugsSection.tsx`: `BugsSection({ project, report }: { project: string; report: BugsReport })`, which renders REQ-REPORTS-043 and the empty states of REQ-REPORTS-044 (`figures.total === 0`, no opened or closed, empty `epics`, empty `open`). It holds one state, `all: boolean`, for "Show all <n>".
    - `headlines.ts`: `bugsHeadline(report: BugsReport): Headline` ("No open bugs", "1 open bug", "<n> open bugs"; `warn: false`).
    - `definitions.ts`: `bugsOpened`, `bugsClosed`, `bugsOpenNow`, `bugsOldest`, `bugsMedian`. `bugsOpened` reads "Opened: bugs created in this scope, from every source. Bugs found later in Rework counts only the bugs linked discovered-from to a closed bead." and `bugsClosed` says the same of closed bugs; `bugsOpenNow` says the count is of every open bug, deferred ones included, whatever the scope.
    - `colors.ts`: `BUG_COLORS = { opened: "var(--color-destructive)", closed: "var(--color-state-done)" } as const`.
    - `bugsFixtures.ts`: `bugsReport(overrides?: Partial<BugsReport>): BugsReport`, used by the tests of Tracks 2 and 3.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded presentational component and a fetch helper in existing patterns, with every text and state written in the spec.
- **Steps**:
  1. `BugsSection.test.tsx` first, one test per scenario of REQ-REPORTS-043 and the empty-state scenarios of REQ-REPORTS-044 ("Project without bugs", "Only old open bugs", "Not started"), each naming its REQ-ID; plus: the share note hidden when no bug of unknown source was opened; "Unassigned" for a `null` assignee; `P<priority>` and "—" for `null` figures; the week label is `formatDate(start, today)`. Run `pnpm -C frontend test --run src/features/reports/bugs`; expect failures.
  2. `bugsApi.test.ts`: the query for a milestone, a period and the default scope; a 502 throws its `error`; an unexpected body throws.
  3. Write `bugsApi.ts`, `bugsFixtures.ts`, `BUG_COLORS`, the definitions and `BugsSection.tsx`: headings "Bugs per week", "Bugs by epic", "Open bugs"; each week a `BarRow` `{ key: formatDate(w.start, report.today), segments: [opened, closed], total: "<n> opened, <m> closed", detail: "Week of <date>: <n> opened, <m> closed" }`; a legend list with a swatch and the words Opened and Closed; the open bugs table cut at 20 rows until "Show all <n>" is pressed. Run the tests until they pass.
  4. `headlines.test.ts`: `bugsHeadline` for 0, 1 and 25 open bugs; write `bugsHeadline`.
  5. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`; commit.
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-043 and the three empty-state scenarios of REQ-REPORTS-044 have a test naming the REQ-ID.
  - No file outside the list changes; `BarRows.tsx` is used as it is.
  - `vitest`, `typecheck`, and `lint` pass.
- **Estimated complexity**: medium

### Track 3: Bugs in the Reports page
- **Dependencies**: Track 2
- **Requirements**: REQ-REPORTS-033, REQ-REPORTS-044, REQ-UI-063, REQ-UI-095, REQ-UI-129
- **Files**:
  - Modify `frontend/src/features/reports/sections.ts:1-9` (add `bugs` last to `ReportSection`, `SECTIONS` and `SECTION_LABELS`)
  - Modify `frontend/src/features/reports/ReportsView.tsx:18-372` (load the bugs report whatever the section, its headline, its panel)
  - Modify `README.md:358-366` ("Five sections" becomes "Six sections", and a Bugs line after Rework)
  - Test `frontend/src/features/reports/sectionPaths.test.ts:5-7` (six sections)
  - Test `frontend/src/features/reports/ReportsPage.test.tsx` (the lists of sections at lines 404-412, 442 and 762, the fetch stubs for `/api/reports/bugs`, and the new tests below)
  - Test `frontend/src/app/Layout.test.tsx:291` (six sections in the sidebar)
  - Test `frontend/src/app/App.test.tsx:250-252` (add `/reports/bugs?project=alpha` with `Reports · Bugs · alpha · gin-console`)
- **Interfaces**:
  - Consumes: `fetchBugs`, `BugsReport` (`features/reports/bugs/bugsApi.ts`), `BugsSection` (`features/reports/bugs/BugsSection.tsx`), `bugsHeadline` (`features/reports/headlines.ts`), `bugsReport` (`features/reports/bugs/bugsFixtures.ts`); in `ReportsView.tsx`, the pattern of the status report: `SettledStatus`, `StatusAnswer`, `answersStatus`, `statusAttempt`, the effect at lines 140-157, the Retry alert at lines 315-323.
  - Produces: in `ReportsView.tsx`, `type SettledBugs = { status: "error"; message: string } | { status: "ok"; report: BugsReport }`, `type BugsAnswer = { base: string; requested: Scope; value: SettledBugs }`, `answersBugs(answer: BugsAnswer, base: string, scope: Scope): boolean` (same rule as `answersStatus`), state `settledBugs` and `bugsAttempt`; `headlineFor("bugs")` returns `bugsHeadline(report)` once loaded, else `null`; the `bugs` branch shows "Loading bugs…", the alert "The bugs report could not be loaded" with Retry, or `<BugsSection project={selected} report={bugsReport} />`. The page title becomes `Reports · Bugs · <project> · gin-console` through `SECTION_LABELS` with no other change.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded wiring that copies the status report's loading pattern in one component, plus updates to tests that list the sections.
- **Steps**:
  1. Update the section lists in `sectionPaths.test.ts`, `ReportsPage.test.tsx` and `Layout.test.tsx` to six sections and add, naming the REQ-IDs: `/reports/bugs` shows the Bugs panel and its headline "25 open bugs" (REQ-UI-095 "bugs section and headline": from Rework, opening Bugs requests no new report); the headline is absent while the bugs report loads and after it fails; the scope is kept and the bugs report is requested for it (REQ-REPORTS-033); a 502 then Retry then 200 shows the report, and a late answer for 30 days after picking 7 days is not shown (REQ-REPORTS-044 "Failure" and "Late answer"); the document title is `Reports · Bugs · alpha · gin-console` (REQ-UI-063, in `App.test.tsx`); the sidebar lists Bugs after Rework (REQ-UI-129). Stub `/api/reports/bugs` with `bugsReport()` wherever the page tests stub `/api/reports/status`. Run `pnpm -C frontend test --run src/features/reports src/app`; expect failures.
  2. Add `bugs` to `sections.ts` and wire `ReportsView.tsx`; in `README.md`, change "Five sections" to "Six sections" and add after the Rework line `- **Bugs** (`/reports/bugs`): Bugs by source epic ("Source unknown" last), opened and closed per week, and every open bug with its age, oldest first.` Run the tests until they pass.
  3. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`; commit.
- **Acceptance criteria**:
  - The changed scenarios of REQ-UI-095, REQ-UI-129, REQ-UI-063 and REQ-REPORTS-033, and the "Failure" and "Late answer" scenarios of REQ-REPORTS-044, have tests naming the REQ-ID.
  - `vitest`, `typecheck`, `lint`, and `build` pass.
- **Estimated complexity**: medium

### Track 4: QA cases and e2e specs
- **Dependencies**: Track 1, Track 3
- **Requirements**: REQ-REPORTS-033, REQ-REPORTS-039, REQ-REPORTS-040, REQ-REPORTS-041, REQ-REPORTS-042, REQ-REPORTS-043, REQ-REPORTS-044, REQ-UI-063, REQ-UI-095, REQ-UI-129
- **Files**:
  - Modify and add cases in `qa/cases/reports/` and `qa/cases/ui/`, as `gin-qa cases plan --change gin-console-rm-bugs-view` lists them (today: 6 REQs missing; TC-REPORTS-089, TC-UI-025 to TC-UI-031, TC-UI-142, TC-UI-152, TC-UI-246 to TC-UI-248 and TC-UI-250 stale)
  - Modify `qa/e2e/support/api.ts` only if a stub for `/api/reports/bugs` is missing
  - Modify the e2e specs of the stale cases that list five sections, and create e2e specs under `qa/e2e/reports/` for the new e2e cases
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases and specs from written scenarios in the existing gin-qa patterns; e2e writing stays on the middle model, as the user asked for e2e and test agents.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-bugs-view` prints `ok`, `gin-qa cases plan --change gin-console-rm-bugs-view` lists nothing missing, stale or obsolete, and `gin-qa e2e plan` lists none of the change's cases as missing or stale.
  - The new and changed e2e specs pass on the built UI (`npx playwright test qa/e2e/reports qa/e2e/ui --trace off`, on port 8702 with a config outside the repo when 8701 is taken), including a project without bugs and `/reports/bugs` at 390px without horizontal page scroll.
- **Estimated complexity**: medium

## Integration
- **Branch**: `feat/rm-bugs-view` (the spec branch; it is checked out in `.planning/worktrees/gin-console-rm-bugs-view`)
- **Merge strategy**: parallel-then-merge: Tracks 1 and 2 at once in worktrees from `feat/rm-bugs-view`; Track 3 after Track 2 merges into it; Track 4 after Tracks 1 and 3 merge.
- **Shared checkout**: another session uses the main checkout on `feat/rm-requirements`; this epic never switches that checkout. Merges into `feat/rm-bugs-view` run in its worktree; the final merge to `master` is asked at ship, after comparing `origin/master` with the branch base.

## Validation
- [ ] `uv --directory backend run pytest`, `uv --directory backend run ruff check .`, and `uv --directory backend run mypy` pass
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, and `pnpm -C frontend build` pass
- [ ] `gin specs lint --change gin-console-rm-bugs-view --against master` prints `ok` and `gin specs trace --change gin-console-rm-bugs-view` reports no missing REQ
- [ ] `gin-qa cases check --change gin-console-rm-bugs-view` prints `ok`
- [ ] Manual check on the built UI: `/reports/bugs` for gin-workflow (many bugs, most of unknown source) and for gin-console, a milestone and each period, the headline in the sidebar, the page at 390px.

## Notes
- The user may override `Model:` and `Effort:` before plan approval.
- Provider roles describe responsibility rather than filename patterns.
- REQ-UI-063 is also modified by gin-console-rm-requirements in another session; the epic that ships second re-writes its MODIFIED block (`gin specs hash`, `gin specs lint`).
- The roadmap entry of the epic is updated with this plan (scope, features and capability `reports`, as decided at discuss).
- Deliverable merge-holds apply exclusively to the Parent Bead (`gin-console-rm-bugs-view`). Individual track beads close after tests and review pass so dependents unblock.
