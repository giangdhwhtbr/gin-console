# Plan: Reports status and one scope

Epic: gin-console-rm-reports-status
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder. Diagrams: `docs/specs/reports/diagrams/status-section-activity.md`, `status-verdict-state.md`, `team-tab-activity.md`. Use cases: `docs/specs/reports/use-cases/review-milestone-status.md`, `review-team-in-milestone.md`.

## Objective
A PM gets a milestone status report on one screen:
- **Sections:** Reports has five sections at their own paths: Status (new, the default), Team, Delivery, Velocity and Rework (Quality renamed). They are listed in the sidebar from 1024px and shown as a row of links below it.
- **One scope:** one scope (a milestone, or the last 7, 30 or 90 days) for every section, kept in the URL as `milestone` or `days`.
- **Status:** a verdict, five figures with the change since last week, a burn-up in points, the changes since kickoff, the risks and an epic table with verdict, strand, planned and forecast dates and owner.
- **Team KPI v2:** points delivered, estimate accuracy, a trend over the last 6 milestones and an unassigned note.

Done when:
- Every scenario of the 17 added and 16 modified REQs of `02-spec-delta.md` has a test that names its REQ.
- `gin specs lint --change gin-console-rm-reports-status --against master` prints `ok`, and `gin specs trace --change gin-console-rm-reports-status` lists no missing REQ.
- `gin-qa cases check --change gin-console-rm-reports-status` prints `ok`.
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
  - Reports has no verdict, no burn-up, and a different scope per tab: Team uses `milestone`, Delivery and Quality use `days` and `sprint` (`frontend/src/features/reports/ReportsPage.tsx:230-262`), and Velocity uses none.
  - Sections are chosen with `?tab=` (`features/reports/filters.ts:3-4`).
  - The backend reads no history of an epic's milestone or points (`backend/src/gin_console/reports/source.py:13-27`).
  - The Team report counts beads only (`reports/team.py:100-132`).
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Global constraints** (from the spec and the user's decisions of 2026-11-23):
  - **Read-only, no process:** `GET /api/reports`, `/api/reports/team` and `/api/reports/status` read only the snapshot and the interaction log, and never run `gin` or `bd`. The Status section gets planned dates, epic verdicts and `spec_confirmed` from `GET /api/milestones/{project}/{id}`, and forecasts from the Milestones list, both already served.
  - **Paths:** `/reports/status|team|delivery|velocity|rework`. `/reports` and `?tab=` are rewritten with `replace`. `tab=quality` goes to `rework`, and any other tab value goes to `status`.
  - **Scope:** `milestone=<id>` or `days=7|30|90`, never both, and no `sprint`. The default is the team report's milestone, or `days=30` without milestones. Choosing a scope clears `member` and `status`.
  - **Milestone history (REQ-REPORTS-021):**
    - Membership is decided by the last `milestone_moves` entry on or before the day, else the `from` of the first entry, else the current parent since `created_at`.
    - Points are decided by the last `points_history` entry on or before the day. Without entries, the current points apply since `created_at`.
    - Bad history counts as no entry.
  - **Burn-up (REQ-REPORTS-022):** in points. Done is points × (closed tracks ÷ tracks existing that day), or all of them once the epic is closed. Splitting an epic does not move the scope.
  - **Verdict (REQ-REPORTS-027):** Finished, then Not started, then Late (REQ-MILESTONE-UI-023), then At risk, then On track. The pace finish is today plus ⌈open ÷ pace⌉ working days.
  - **Points per member (REQ-REPORTS-034):** an epic's points are shared by its closed tracks. Accuracy is `planned_days_per_point` ÷ the actual days per point, rounded as gin-workflow's `velocity` does.
  - **Planned and Forecast:** Planned is the detail's `planned_start`–`planned_end`. Forecast is `forecast.epics[].planned_end` (with "?" when `assumed`), or the close date for a closed epic.
  - **Plain text and Strung style:** figures, glyphs, strands, tooltips (REQ-UI-132), dates (REQ-UI-131), no chips for data (REQ-UI-140), and no sideways page scroll.
- **Non-goals:** Copy summary and the WBS export (gin-console-rm-wbs-export), reports across projects, a kickoff baseline in gin-workflow, a custom date range, review cycles and waivers (gin-console-rm-review-audit), and per-member trends.

## Approach Options
### Option 1: Backend contract first, then the UI on top
- **Summary:**
  1. The history and dated rework in the source.
  2. The shared scope in the three APIs.
  3. The status report.
  4. The Team KPI v2 data.
  5. The forecast epics.
  6. The UI: sections and scope first, then Status and Team v2 on top.
  7. QA.
  8. Example data and TC-1.
- **Pros:**
  - Each backend track keeps the suite green and is reviewed alone.
  - The UI is built once, against the final JSON.
  - The paths and scope change lands before the two feature UIs that use it.
- **Cons:** from Track 2 to Track 6, the built UI sends `sprint` and reads the old `Report` shape. Nobody deploys between them.

### Option 2: One vertical slice per feature
- **Summary:** sections and scope end to end, then Status end to end, then Team v2 end to end.
- **Pros:** each slice can be seen in the browser.
- **Cons:**
  - `reports/models.py`, `router.py`, `ReportsPage.tsx` and `teamApi.ts` would change in every slice.
  - Backend and frontend reviews would mix in one track, against the role split of `routing.roles`.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the JSON is the contract, as in gin-console-5c4. The scope and history work is shared by Status and Team v2, so it comes first and once.

## Scope
- **In scope:** the REQs of `02-spec-delta.md`, the example data the checks need, the README's Reports section, gin-qa cases, api tests, e2e specs, and TC-1.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: One lane on feat/reports-status; the backend tracks share reports/models.py, router.py and source.py, and the frontend tracks share ReportsPage.tsx, so each track builds on the previous one.
```

## Tasks
### Track 1: Milestone history and dated rework in the reports source
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-021
- **Files**:
  - Create `backend/src/gin_console/reports/history.py`
  - Modify `backend/src/gin_console/reports/models.py:9-30` (`MilestoneMove`, `PointsChange`; new `ReportBead` fields)
  - Modify `backend/src/gin_console/reports/source.py:13-60` (history, blockers, `blocked_since`, reopen and bug dates, child counts, `planned_days_per_point`)
  - Modify `backend/src/gin_console/reports/interactions.py:12-67` (reopen dates)
  - Modify `backend/src/gin_console/reports/router.py:41-44, 85-92` (types only)
  - Test `backend/tests/test_reports_history.py` (new), `backend/tests/test_reports_source.py`, `backend/tests/test_reports_interactions.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a tolerant parser and three new derived fields with exact rules, in one module and its source; the patterns are set by `interactions.py` and `source.py`.
- **Acceptance criteria**:
  - Each REQ-REPORTS-021 scenario has a test named `test_reports_021_*`: moved in after kickoff, moved out, re-estimated, no history, and broken history.
  - `read_beads` fills the new fields.
  - The REQ-REPORTS-019 tests still pass, with `reopens == len(reopened_on)`.
  - The backend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
- `gin_console.reports.models`:
  - `class MilestoneMove(BaseModel)`: `day: date`, `source: str | None` (the entry's `from`), `target: str | None` (its `to`).
  - `class PointsChange(BaseModel)`: `day: date`, `before: int | None` (`from`), `after: int | None` (`to`). A value that is not on `POINT_SCALE` is `None`.
  - `ReportBead` gains:
    - `moves: list[MilestoneMove] = []`;
    - `points_history: list[PointsChange] = []`;
    - `blockers: list[str] = []`: open beads in the store it waits on through its own `blocks` or `blocked-by` dependencies, sorted by id;
    - `blocked_since: datetime | None = None`: the earliest `created_at` of those dependencies;
    - `reopened_on: list[date] = []`;
    - `bug_days: list[date] = []`: the local `created_at` dates of its `discovered-from` bugs;
    - `child_counts: ChildCounts | None = None` (`gin_console.beads.models.ChildCounts`, from `beads.definitions.child_counts`);
    - `planned_days_per_point: float | None = None` (milestone rows, from `metadata.planned_days_per_point` when it is a number above 0, or a numeric string).
- `gin_console.reports.history`:
  - `parse_moves(raw: object) -> list[MilestoneMove]` and `parse_points(raw: object) -> list[PointsChange]`:
    - `raw` is a list, or JSON text of a list, as gin-workflow writes it (a string in `bd` output, a list in the example generator).
    - An entry is kept only when it is a dict with a string `at` that `datetime.fromisoformat` reads (a trailing `Z` is allowed). Its `day` is `.astimezone().date()`.
    - For moves, `from` and `to` must be a string or `None`. For points, an int or `None`.
    - Entries are sorted by `at`, stably.
    - Anything else gives `[]` and never raises.
  - `milestone_on(bead: ReportBead, day: date) -> str | None`: REQ-REPORTS-021 membership. Without moves, it returns `bead.parent` when `day >= bead.created_at.astimezone().date()`, else `None`. The caller checks that the parent is a milestone.
  - `points_on(bead: ReportBead, day: date) -> int | None`: REQ-REPORTS-021 points.
- `gin_console.reports.interactions`:
  - `read_reopens(path: Path) -> dict[str, list[date]]`: the local date of each reopen line's `created_at`, or `date.min` when it is missing or unreadable, so the reopen still counts.
  - `InteractionStore.reopens(project_dir) -> dict[str, list[date]]`.
- `gin_console.reports.source.read_beads(snapshot, project, reopens: Mapping[str, Sequence[date]])`: sets `reopens=len(...)`, `reopened_on`, `bugs=len(bug_days)`, `bug_days`, `moves`, `points_history`, `blockers`, `blocked_since`, `child_counts` and `planned_days_per_point`.

Steps:
1. Write `test_reports_history.py` with the five REQ-REPORTS-021 scenarios as `ReportBead` fixtures. Add parser cases: JSON text, a list, `"oops"`, an entry without `at`, a `to` of 4 (off scale), and a `Z` suffix. Run `uv run --directory backend pytest tests/test_reports_history.py`; expect import errors.
2. Add the models and write `history.py`. Run the tests; they pass.
3. Extend `test_reports_source.py`:
   - a bead with a `blocks` dependency on an open bead created on 2026-11-18 gets `blockers` and `blocked_since`;
   - a closed blocker is left out;
   - a bead with two `discovered-from` bugs gets two `bug_days`;
   - an epic gets `child_counts`;
   - a milestone with `planned_days_per_point: 1.5` gets it.
   
   Extend `test_reports_interactions.py` with reopen dates and a line without `created_at`. Run the tests; the new ones fail.
4. Change `interactions.py`, `source.py` and the router's types until the tests pass. Then run `uv run --directory backend pytest && uv run --directory backend ruff check . && uv run --directory backend mypy`.
5. Commit: `git commit -m "feat(reports): milestone history, blockers and dated rework in the source (gin-console-rm-reports-status)"`

### Track 2: One scope in the reports APIs
- **Dependencies**: Track 1
- **Requirements**: REQ-REPORTS-001, REQ-REPORTS-008, REQ-REPORTS-009, REQ-REPORTS-010
- **Files**:
  - Create `backend/src/gin_console/reports/scope.py`
  - Modify `backend/src/gin_console/reports/team.py:26-244` (helpers move to `scope.py`; period scope; `TeamTotals` values for a period)
  - Modify `backend/src/gin_console/reports/service.py:132-241` (`build_report` takes a scope; `_delivery` without `sprint`)
  - Modify `backend/src/gin_console/reports/models.py:96-188` (`Report`, `TeamTotals`, `TeamReport`)
  - Modify `backend/src/gin_console/reports/router.py:20-101` (`parse_scope`; `milestone` on `/reports`; `days` on `/reports/team`)
  - Test `backend/tests/test_reports_scope.py` (new), `backend/tests/test_reports_service.py`, `backend/tests/test_reports_team.py`, `backend/tests/test_reports_api.py`, `backend/tests/test_reports_team_api.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** moves existing helpers and adds one parameter path per endpoint, with written status codes and scenarios.
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-001, 008, 009 and 010 in the delta has a test. The new ones are milestone, bad input, period scope and period values; the kept ones are renamed if their wording changed.
  - `sprint` appears nowhere in `backend/src`.
  - The backend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
- `gin_console.reports.scope`:
  - `@dataclass(frozen=True) class MilestoneScope: id: str` and `@dataclass(frozen=True) class PeriodScope: days: int`.
  - `Scope = MilestoneScope | PeriodScope`.
  - `day_of(moment: datetime) -> date`, `workday(day: date) -> date` and `workdays(first: date, last: date) -> list[date]`, moved from `team.py` `_day`, `_workday` and `_workdays`.
  - `list_milestones(beads, today) -> tuple[list[TeamMilestone], int]` and `default_milestone(milestones, today) -> TeamMilestone`, moved from `_milestones` and `_default`.
  - `select_milestone(milestones, wanted: str | None, today) -> TeamMilestone | None`: the listed `wanted`, else the default, and `None` when the list is empty.
  - `milestone_scope(tree, beads, milestone_id) -> list[tuple[ReportBead, ReportBead]]`, moved from `_scope`.
  - `period_scope(tree, beads, days, now) -> list[tuple[ReportBead, ReportBead]]`: the REQ-REPORTS-009 period rule. The nearest epic is `tree.epics_of(bead)[0]`, or the bead itself when it has no epic.
- `gin_console.reports.router.parse_scope(milestone: str | None, days: str | None) -> Scope | None | JSONResponse`:
  - `None` means neither key was given.
  - It answers 422 for both keys, for a `days` outside `PERIODS`, or for a `milestone` failing `_MILESTONE`.
  - `_SPRINT` is deleted.
- `build_report(beads, *, now, project, scope: Scope) -> Report`:
  - `Report` has `days: int | None` and `milestone: str | None` in place of `sprint`.
  - For a milestone, the closed beads are those of `milestone_scope`, and the weeks run from the first to the last close, as the sprint path did.
  - The router answers 404 `{"error": "unknown milestone"}` when `scope` names no listed milestone, and uses `PeriodScope(30)` when neither key was given.
- `build_team(beads, *, now, project, scope: Scope | None) -> TeamReport`:
  - `TeamReport.days: int | None`.
  - For a period, `milestone` is `None`, `late_days` is `None`, and `on_time` is `None`. In `TeamTotals`, `working_days`, `elapsed`, `days_left` and `pace_needed` become `int | None` / `float | None`, set to `None` with `late_open` 0. `pace` stays `throughput ÷ 5`. `days` (the `DayRow` list) covers the working days of the period.
- Cache keys become `(project, scope)` with `scope: Scope | None`. Frozen dataclasses hash.

Steps:
1. Write `test_reports_scope.py` (`parse_scope` cases, `period_scope` with the REQ-REPORTS-009 "period scope" scenario, `select_milestone`). Add the new and changed scenarios to the service, team and api tests. Run `uv run --directory backend pytest tests/test_reports_scope.py tests/test_reports_service.py tests/test_reports_team.py tests/test_reports_api.py tests/test_reports_team_api.py`; the new ones fail.
2. Create `scope.py` by moving the helpers, then import them in `team.py`. Run the team tests; the old ones still pass.
3. Change `models.py`, `service.py`, `team.py` and `router.py`. Run the suite and checks.
4. Commit: `git commit -m "feat(reports): one scope, a milestone or a period, for the report APIs (gin-console-rm-reports-status)"`

### Track 3: Status report API
- **Dependencies**: Track 2
- **Requirements**: REQ-REPORTS-020, REQ-REPORTS-022, REQ-REPORTS-023, REQ-REPORTS-024, REQ-REPORTS-025, REQ-REPORTS-026
- **Files**:
  - Create `backend/src/gin_console/reports/status.py`
  - Modify `backend/src/gin_console/reports/models.py` (status models, appended)
  - Modify `backend/src/gin_console/reports/router.py` (`GET /reports/status`, its `KeyedCache`, `on_refresh`)
  - Test `backend/tests/test_reports_status.py` (new), `backend/tests/test_reports_status_api.py` (new)
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** one new module with a clear spec, but intricate day-by-day rules (burn-up rebuild, week-ago values, membership changes) with many edge cases.
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-020, 022, 023, 024, 025 and 026 has a test named `test_reports_0NN_*`.
  - The no-process scenario uses the fakes of `tests/fakes.py`, so no `gin` or `bd` starts.
  - The backend checks pass.
- **Estimated complexity**: high

Interfaces produced (`gin_console.reports.models`):
- `StatusPeriod { kickoff: date | None; working_days: int; elapsed: int; days_left: int }`
- `BeadsKpi { done: int | None; scope: int | None; done_week_ago: int | None; scope_week_ago: int | None }`
- `PointsKpi { done: float | None; scope: float | None; at_kickoff: float | None; done_week_ago: float | None }`
- `PaceKpi { pace: float | None; pace_needed: float | None; pace_week_ago: float | None }`
- `BlockedKpi { count: int; oldest_days: int | None }`
- `ReworkKpi { rate: float | None; rate_week_ago: float | None }`
- `StatusKpis { beads; points; pace; blocked; rework }`
- `BurnupDay { day: date; scope_points: float; done_points: float }`
- `ChangeKind = Literal["epic_added", "epic_removed", "estimated", "re_estimated", "bug_added"]`
- `ScopeChange`:
  - `day`, `kind`, `id`, `title`;
  - `points: int | None = None`;
  - `before: int | None = Field(None, serialization_alias="from")`;
  - `after: int | None = Field(None, serialization_alias="to")`;
  - `epic: TeamEpic | None = None`;
  - `person: str | None = None`.
  
  Serialized by alias: FastAPI's default `response_model_by_alias=True`.
- `Changes { scope_from: float | None; scope_to: float | None; items: list[ScopeChange] }`
- `Blocker { id; title; person: str; blocked: bool }`, `BlockedRisk { id; title; days: int; blocker: Blocker | None }`, `Risks { blocked: list[BlockedRisk]; blocked_more: int; unestimated: list[TeamEpic] }`
- `StatusEpic { id; title; status; points: int | None; person: str; closed_on: date | None; child_counts: ChildCounts }`
- `StatusReport`: `generated_at`, `project`, `today`, `milestones: list[TeamMilestone]`, `undated`, `milestone: str | None`, `days: int | None`, `period: StatusPeriod | None`, `kpis: StatusKpis`, `burnup: list[BurnupDay]`, `changes: Changes`, `risks: Risks`, `epics: list[StatusEpic]`.

`gin_console.reports.status`:
- `build_status(beads, *, now, project, scope: Scope | None) -> StatusReport`, with one function per part:
  - `first_day(m: ReportBead) -> date`: the parsed `kickoff`, else `start`.
  - `epics_on(beads, milestone_id, day) -> list[ReportBead]`: epics whose `milestone_on` is the milestone.
  - `burnup(...) -> list[BurnupDay]`.
  - `kpis(...) -> StatusKpis`.
  - `period_kpis(...) -> StatusKpis`.
  - `changes(...) -> Changes`.
  - `risks(...) -> Risks`.
  - `epic_rows(...) -> list[StatusEpic]`.
- Tracks are the children of an epic in `_Tree.children` that are not prep (`is_prep`). Merge gates are already left out by `read_beads`.
- It reuses `milestone_scope`, `period_scope`, `workdays`, `select_milestone` and `person_key`, and the team figures of REQ-REPORTS-010 for `pace`, `pace_needed` and `rework_rate`, by calling `build_team`'s `_figures` through a small public `team_totals(rows, …)` extracted in this track.
- The wait is `len(workdays(day_of(since) + 1 day, today))`, where `since` is `blocked_since`, or the nearest blocked ancestor's, or `updated_at`.

Steps:
1. Write `test_reports_status.py` with fixtures built from `ReportBead` (dates around Monday 2026-11-23, kickoff Wednesday 2026-11-11, end Wednesday 2026-12-02). Cover every scenario of REQ-REPORTS-022 to 026, plus the REQ-REPORTS-023 period case. Run it; it fails on import.
2. Add the models and write `status.py` part by part, running the matching tests after each part.
3. Write `test_reports_status_api.py` for the REQ-REPORTS-020 scenarios through `create_app` with the existing fakes (default milestone, period, no process and cache, bad input, unreadable snapshot). Add the route. Run the suite and checks.
4. Commit: `git commit -m "feat(reports): status report of a milestone or a period (gin-console-rm-reports-status)"`

### Track 4: Team KPI v2 data
- **Dependencies**: Track 3
- **Requirements**: REQ-REPORTS-034, REQ-REPORTS-035, REQ-REPORTS-010
- **Files**:
  - Create `backend/src/gin_console/reports/points.py`
  - Modify `backend/src/gin_console/reports/team.py` (`points_delivered` and `accuracy` on every figure set, plus `trend` and `unassigned`)
  - Modify `backend/src/gin_console/reports/models.py` (`TeamFigures.points_delivered: float`, `TeamFigures.accuracy: float | None`, `TrendRow`, `Unassigned`, `TeamReport.trend`, `TeamReport.unassigned`)
  - Test `backend/tests/test_reports_points.py` (new), `backend/tests/test_reports_team.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded arithmetic with one cross-check against gin-workflow's numbers; it reuses the scope and history helpers.
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-034 and 035, and REQ-REPORTS-010's new fields, has a test.
  - The "same accuracy as gin-workflow" test uses planned 1.5 and epics of 5 and 3 points taking 6 and 4 working days, and expects 1.2. Its comment cites `gin-workflow/plugins/gin-workflow/src/scripts/workflow_core/milestone.py` `velocity`.
  - The backend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
- `gin_console.reports.points`:
  - `actual_days(epic: ReportBead) -> int | None`: working days from `started_at` to `closed_at`, both included, at least 1, `None` without `started_at`.
  - `delivered(beads, scope: Scope, now) -> list[ReportBead]`: closed epics with points that belong to the milestone today (`milestone_on`), or that closed in the period.
  - `shares(epic: ReportBead, tree: _Tree) -> dict[str, float]`: person, or `Unassigned`, mapped to a share of the closed tracks; `{person of assignee: 1.0}` without closed tracks.
  - `points_delivered(epics, tree, person: str | None) -> float`: `None` means the team.
  - `accuracy(epics, tree, planned: float | None, person: str | None) -> float | None`: `round(planned / round(Σ share·days / Σ share·points, 2), 2)`.
- `TrendRow { id; title; start: date; end: date; closed: int; points_delivered: float; on_time: float | None; rework_rate: float | None; accuracy: float | None }`
- `Unassigned { closed: int; total: int }`

Steps:
1. Write `test_reports_points.py` (shared by tracks, epic without tracks, same accuracy as gin-workflow, no accuracy). Extend `test_reports_team.py` (last six milestones, unassigned count, the new fields on members). Run them; they fail.
2. Write `points.py`. Add the fields in `team.py`. For the trend, `build_team` builds the figures of each of the last 6 started milestones with the same scope helpers.
3. Run the suite and checks. Commit: `git commit -m "feat(reports): points delivered, estimate accuracy and the team trend (gin-console-rm-reports-status)"`

### Track 5: Forecast epics in the Milestones API
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-008
- **Files**:
  - Modify `backend/src/gin_console/milestones/models.py:55-72` (`ForecastEpic`; `Forecast.epics: list[ForecastEpic] = []`)
  - Modify `frontend/src/features/milestones/api.ts:37-47, 170-245` (`ForecastEpic` type; `Forecast.epics`, defaulting to `[]` when absent)
  - Test `backend/tests/test_milestones_api.py`, `frontend/src/features/milestones/api.test.ts`
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** one optional field passed through in a model and a validator, with one scenario.
- **Acceptance criteria**:
  - The "forecast epics" scenario of REQ-MILESTONE-UI-008 passes in both test files.
  - Output from an older gin-workflow without `epics` gives `[]`.
  - Both stacks' checks pass.
- **Estimated complexity**: low

Interfaces produced:
- Python: `ForecastEpic { id: str; milestone: str | None; planned_start: IsoDate; planned_end: IsoDate; estimate_source: Literal["points", "days", "assumed"] | None = None }`.
- TypeScript: `export type ForecastEpic = { id: string; milestone: string | null; planned_start: string; planned_end: string; estimate_source: EstimateSource | null }`, with `Forecast.epics: ForecastEpic[]`.

Steps:
1. Add the scenario test with the GIVEN output of the delta, and a frontend validator test. Run them; they fail.
2. Add the model field and the type. Run both stacks' tests and checks.
3. Commit: `git commit -m "feat(milestones): keep the forecast's epics (gin-console-rm-reports-status)"`

### Track 6: Report sections at their own paths and one scope in the UI
- **Dependencies**: Track 2
- **Requirements**: REQ-REPORTS-012, REQ-REPORTS-017, REQ-REPORTS-018, REQ-REPORTS-033, REQ-UI-063, REQ-UI-088, REQ-UI-091, REQ-UI-093, REQ-UI-095, REQ-UI-129
- **Files**:
  - Create `frontend/src/features/reports/sections.ts`
  - Create `frontend/src/features/reports/ScopeSelect.tsx`
  - Create `frontend/src/features/reports/SectionLinks.tsx` (the row of links inside `TabStrip`)
  - Modify `frontend/src/features/reports/filters.ts` (`Scope` in place of `days`, `sprint`, `tab` and `milestone`)
  - Modify `frontend/src/features/reports/ReportsPage.tsx` (section from the path; scope rules; the links row; no period buttons or sprint field)
  - Modify `frontend/src/features/reports/api.ts:19-87` (`Report.days`, `Report.milestone`; `fetchReport(project, scope)`)
  - Modify `frontend/src/features/reports/teamApi.ts:51-89` (`TeamReport.days`; `fetchTeam(project, scope)`)
  - Modify `frontend/src/features/reports/headlines.ts` (Rework; Team for a period)
  - Modify `frontend/src/features/reports/sectionStore.ts` (`SectionLink.section`)
  - Modify `frontend/src/features/reports/team/TeamSection.tsx`, `team/MilestoneLine.tsx` (no milestone select; period line)
  - Modify `frontend/src/features/reports/velocity/VelocityTab.tsx`, `velocity/VelocityCharts.tsx` (selected milestone marked)
  - Modify `frontend/src/features/reports/DeliverySection.tsx` (scope sentence)
  - Delete `frontend/src/features/reports/QualitySection.tsx` and `QualitySection.test.tsx`, and create `ReworkSection.tsx` and `ReworkSection.test.tsx` (`git mv`, renamed, "No data in this scope")
  - Modify `frontend/src/app/App.tsx:73` (every `/reports` path)
  - Modify `frontend/src/app/Layout.tsx:31, 163` (current on `/reports/*`; sub-items on any Reports path)
  - Modify `frontend/src/app/project.ts:70-88` (a switch keeps the `/reports/<section>` path)
  - Modify `frontend/src/app/origin.ts` (a `/reports/<section>` place is kind `reports`)
  - Test `frontend/src/features/reports/sections.test.ts` (new), `filters.test.ts`, `ScopeSelect.test.tsx` (new), `ReportsPage.test.tsx`, `sections.test.tsx`, `headlines.test.ts`, `api.test.ts`, `teamApi.test.ts`, `team/TeamSection.test.tsx`, `velocity/VelocityTab.test.tsx`, `frontend/src/app/project.test.ts`, `frontend/src/app/App.test.tsx`
- **Provider role**: `frontend`
- **Model:** `opus`
- **Effort:** `medium`
- **Why:** broad context across routing, the shell, the project switcher, the origin and every report section; the URL rules are written out, so the difficulty is breadth, not new logic.
- **Acceptance criteria**:
  - Every scenario of the listed REQs has a test naming it. That covers old `?tab=` links, `/reports` to Status, an unknown section going to not-found, the scope kept across sections, the default scope written with `replace`, both keys giving `milestone`, `sprint` dropped, no milestones giving `days=30`, and picking a scope clearing the member.
  - The Status path renders a placeholder panel "Status" until Track 7, and every other section works.
  - `grep -rn "sprint\|\"quality\"\|tab=" frontend/src/features/reports frontend/src/app` finds only the legacy rewrite and its tests.
  - The frontend checks pass.
- **Estimated complexity**: high

Interfaces produced:
- `features/reports/sections.ts`:
  - `export type ReportSection = "status" | "team" | "delivery" | "velocity" | "rework"`.
  - `SECTIONS` in that order, and `SECTION_LABELS: Record<ReportSection, string>`.
  - `sectionPath(section: ReportSection, search: string): string`.
  - `sectionOf(pathname: string): ReportSection | "index" | "unknown"`.
  - `legacyTarget(pathname: string, search: string): string | null`: the URL to replace with, for `/reports` or a `tab` key (`quality` becomes `rework`, any other value `status`), with `tab` dropped.
- `features/reports/filters.ts`:
  - `export type Scope = { kind: "milestone"; id: string } | { kind: "period"; days: Period } | { kind: "default" }`.
  - `ReportFilters = { project: string; scope: Scope; member: string; status: BeadStatus | "" }`.
  - `parseReportSearch(search)`: a `milestone` wins over `days`.
  - `reportSearch(filters)`: writes `project`, then `milestone` or `days`, `member` and `status`, and never `tab` or `sprint`.
  - `scopeQuery(scope: Exclude<Scope, { kind: "default" }>): URLSearchParams`.
  - `fixedSearch(search: string): string | null`: the search without `sprint` and without `days` when `milestone` is present, or `null` when nothing changes.
- `ScopeSelect({ milestones, scope, onChange }: { milestones: readonly TeamMilestone[]; scope: Scope; onChange: (next: Exclude<Scope, { kind: "default" }>) => void })`:
  - a native `select` labelled "Report scope", after the text "Every report uses";
  - `optgroup`s Active, Planned and Closed, then "Last 7 days", "Last 30 days" and "Last 90 days";
  - `max-w-full` and `truncate`, with `title` on long options.
- `SectionLinks({ links }: { links: readonly SectionLink[] })`: a `nav` labelled "Report sections" with links whose `aria-current="page"` marks the current one, inside the existing `TabStrip` fade and scroll.
- `sectionStore.SectionLink = { section: ReportSection; label: string; headline: string; warn: boolean; href: string }`.
- `fetchReport(project: string, scope: Exclude<Scope, { kind: "default" }>): Promise<Report>` and `fetchTeam(project: string, scope: Scope): Promise<TeamReport>`.
- `VelocityTab({ answer, onRetry, selected }: { …; selected: string | null })`: a marked column is outlined in the identity colour, and the marked table row has `aria-current="true"` and `bg-muted`.
- `teamHeadline(report, finish)` returns `"<n> members"` when `report.days !== null`. `headlines(report)` returns `{ delivery, rework }`.

Steps:
1. Write `sections.test.ts` and the `filters.test.ts` cases for every URL rule. Run `pnpm -C frontend test --run src/features/reports/sections.test.ts src/features/reports/filters.test.ts`; they fail.
2. Write `sections.ts` and the new `filters.ts`, then fix the callers by compiling (`pnpm -C frontend typecheck`).
3. Update `ReportsPage.test.tsx`, `sections.test.tsx` (sidebar), `App.test.tsx` and `project.test.ts` to the paths and scenarios of REQ-UI-088, 095, 129 and 063, and REQ-REPORTS-033. Run them; they fail.
4. Change `App.tsx`, `Layout.tsx`, `project.ts`, `origin.ts` and `ReportsPage.tsx`:
   - The page reads its section with `sectionOf(useLocation().pathname)`.
   - On `"index"`, or when `legacyTarget` or `fixedSearch` is not `null`, it navigates with `replace`.
   - On `"unknown"`, it renders `NotFoundPage`.
   - After the team report answers, it writes the default scope with `replace`.
   - `change(next)` navigates with a history entry for a scope choice.
5. Add `ScopeSelect` and `SectionLinks`. Change the Team section, Velocity, Delivery and the Rework rename. Run all frontend tests and checks.
6. Commit: `git commit -m "feat(reports): report sections at their own paths and one scope (gin-console-rm-reports-status)"`

### Track 7: Status section
- **Dependencies**: Track 3, Track 5, Track 6
- **Requirements**: REQ-REPORTS-027, REQ-REPORTS-028, REQ-REPORTS-029, REQ-REPORTS-030, REQ-REPORTS-031, REQ-REPORTS-032, REQ-UI-095
- **Files**:
  - Create `frontend/src/features/reports/status/statusApi.ts`
  - Create `frontend/src/features/reports/status/verdict.ts`
  - Create `frontend/src/features/reports/status/StatusSection.tsx`, `VerdictPanel.tsx`, `StatusFigures.tsx`, `BurnupChart.tsx`, `ChangesPanel.tsx`, `RisksPanel.tsx` and `EpicTable.tsx`
  - Modify `frontend/src/features/milestones/format.ts` (`addWorkdays`)
  - Modify `frontend/src/features/reports/ReportsPage.tsx` (requests the status report whatever the section; renders `StatusSection`; Status headline)
  - Modify `frontend/src/features/reports/headlines.ts` (`statusHeadline`)
  - Test `frontend/src/features/reports/status/verdict.test.ts`, `statusApi.test.ts`, `StatusSection.test.tsx`, `BurnupChart.test.tsx`, `EpicTable.test.tsx`, `frontend/src/features/milestones/format.test.ts`, `frontend/src/features/reports/headlines.test.ts`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** new components in one feature folder with a clear spec and a confirmed preview, but the verdict and its sentence have many cases, and three requests are joined with partial failures.
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-027 to 032 has a test naming it. Each verdict and sentence case in `verdict.test.ts` uses fixed `today` values from the delta.
  - The REQ-UI-095 headline scenarios ("headlines", "period headlines") pass.
  - The chart has its accessible name.
  - No page scrolls sideways at 390px in the `StatusSection` test with long titles. Tailwind classes are checked, and the real layout is checked in TC-1.
  - The frontend checks pass.
- **Estimated complexity**: high

Interfaces produced:
- `statusApi.ts`: `StatusReport` and its parts as TypeScript types mirroring Track 3 (`ScopeChange` has `from` and `to`). `fetchStatus(project: string, scope: Scope): Promise<StatusReport>` validates the top-level keys as `isTeamReport` does.
- `features/milestones/format.ts`: `addWorkdays(iso: string, n: number): string`, the n-th working day after `iso`, which is `iso` itself for 0.
- `verdict.ts`:
  - `export type VerdictTone = "good" | "risk" | "late" | "idle"`.
  - `export type StatusVerdict = { word: string; tone: VerdictTone; glyph: GlyphState; dashed: boolean; sentence: string; paceFinish: string | null }`.
  - `paceFinish(today: string, open: number, pace: number | null): string | null`.
  - `statusVerdict(report: StatusReport, milestone: TeamMilestone, finish: string | null, unsplit: number): StatusVerdict`, where `finish` is the forecast finish or `null` while unknown, and `unsplit` is the open epic rows without a track.
- `headlines.ts`: `statusHeadline(report: StatusReport, list: MilestoneList | null): Headline | null`, which is `null` for a period.
- `StatusSection({ project, report, list, detail }: { project: string; report: StatusReport; list: MilestoneList | null; detail: { status: "loading" } | { status: "error"; message: string } | { status: "ok"; plan: MilestoneDetail } })`. `StatusSection` itself fetches the detail with `fetchMilestone(project, id, null)` and ignores late answers.
- `BurnupChart({ burnup, end, today, paceFinish, changes }: {...})`: a Recharts `ComposedChart` in `ChartBox`, with `ReferenceLine` for Today and End and a `ReferenceArea` after the end.
- `EpicTable({ project, epics, detail, forecast, today }: {...})`: uses `verdictOf` and `Verdict` from `features/milestones`, and `Strand` with `toStrandCounts`.

Steps:
1. Write `verdict.test.ts` with the six REQ-REPORTS-027 scenarios and the `addWorkdays` test. Run them; they fail. Write `addWorkdays` and `verdict.ts` until they pass.
2. Write `statusApi.ts` with its test.
3. Write `StatusSection.test.tsx` (REQ-REPORTS-028 and 032 scenarios, with `fetch` stubbed for the status report, the detail and the list), `BurnupChart.test.tsx` (REQ-REPORTS-029) and `EpicTable.test.tsx` (REQ-REPORTS-031). Add the REQ-REPORTS-030 cases to `StatusSection.test.tsx`. Run them; they fail.
4. Write the components following `docs/specs/ui/assets/2026-11-22/index.html` (board `reports`). Wire `ReportsPage`, and add `statusHeadline` and its tests. Run all frontend tests and checks.
5. Commit: `git commit -m "feat(reports): Status section with verdict, burn-up, changes, risks and epics (gin-console-rm-reports-status)"`

### Track 8: Team KPI v2 in the Team section
- **Dependencies**: Track 4, Track 6
- **Requirements**: REQ-REPORTS-013, REQ-REPORTS-015, REQ-REPORTS-036
- **Files**:
  - Create `frontend/src/features/reports/team/UnassignedNote.tsx` and `frontend/src/features/reports/team/AcrossMilestones.tsx`
  - Modify `frontend/src/features/reports/teamApi.ts` (`points_delivered`, `accuracy`, `TrendRow`, `trend`, `unassigned`)
  - Modify `frontend/src/features/reports/team/TeamFigures.tsx` (Points delivered, Estimate accuracy; period values)
  - Modify `frontend/src/features/reports/team/MemberTable.tsx` (points and accuracy columns)
  - Modify `frontend/src/features/reports/team/TeamSection.tsx` (note above the table; panel after the chart)
  - Test `frontend/src/features/reports/team/TeamFigures.test.tsx`, `MemberTable.test.tsx`, `UnassignedNote.test.tsx` (new), `AcrossMilestones.test.tsx` (new), `TeamSection.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** two new figures, two columns and two small components in existing Team patterns (`Figures`, `ChartBox`, `MemberTable`).
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-013, 015 and 036 in the delta has a test.
  - The accuracy tooltip names the rule, and the unassigned threshold is 0.2.
  - The frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
- `TrendRow = { id: string; title: string; start: string; end: string; closed: number; points_delivered: number; on_time: number | null; rework_rate: number | null; accuracy: number | null }`.
- `UnassignedNote({ unassigned }: { unassigned: { closed: number; total: number } })` renders nothing below 0.2.
- `AcrossMilestones({ project, trend, selected }: { project: string; trend: readonly TrendRow[]; selected: string | null })`: links use `milestonePath`.

Steps:
1. Add the delta scenarios to the four test files. Run them; they fail.
2. Change the types and components. Run all frontend tests and checks.
3. Commit: `git commit -m "feat(reports): points delivered, estimate accuracy and the trend in the Team section (gin-console-rm-reports-status)"`

### Track 9: QA cases and their tests
- **Dependencies**: Track 7, Track 8
- **Requirements**: REQ-REPORTS-001, REQ-REPORTS-008, REQ-REPORTS-009, REQ-REPORTS-010, REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-015, REQ-REPORTS-017, REQ-REPORTS-018, REQ-REPORTS-020, REQ-REPORTS-021, REQ-REPORTS-022, REQ-REPORTS-023, REQ-REPORTS-024, REQ-REPORTS-025, REQ-REPORTS-026, REQ-REPORTS-027, REQ-REPORTS-028, REQ-REPORTS-029, REQ-REPORTS-030, REQ-REPORTS-031, REQ-REPORTS-032, REQ-REPORTS-033, REQ-REPORTS-034, REQ-REPORTS-035, REQ-REPORTS-036, REQ-UI-063, REQ-UI-088, REQ-UI-091, REQ-UI-093, REQ-UI-095, REQ-UI-129, REQ-MILESTONE-UI-008
- **Files**:
  - Modify and add cases in `qa/cases/reports/`, `qa/cases/ui/` and `qa/cases/milestone-ui/`, as `gin-qa cases plan --change gin-console-rm-reports-status` lists them
  - Create `backend/tests/test_reports_status_cases.py` (api cases for REQ-REPORTS-020 to 026 and 034 to 035, `# TC: <TC-ID>@<hash8>` above each)
  - Modify `qa/e2e/support/reports.ts` (status report mock, `milestone` and `days` in place of `sprint`, `trend`, `unassigned`, `forecast.epics`) and the e2e specs that open `/reports?…tab=` (found with `grep -rln "reports?" qa/e2e`)
  - Create e2e specs under `qa/e2e/reports/` for the new e2e cases
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases and specs from written scenarios in existing patterns; e2e writing stays on the middle model (bd memory `e2e-subagents-use-sonnet`).
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-reports-status` prints `ok`.
  - `gin-qa cases plan --change gin-console-rm-reports-status` lists nothing missing, stale or obsolete.
  - `gin-qa e2e plan` lists none of the change's new or reworded cases as missing or stale.
  - `npx playwright test qa/e2e/ui qa/e2e/beads qa/e2e/milestone-ui qa/e2e/reports --trace off --workers 4` passes on the built UI.
  - The new api tests pass.
- **Estimated complexity**: medium

Steps:
1. Run `gin-qa cases plan --change gin-console-rm-reports-status`. Write, update and re-pin cases per `qa/guidelines.md`. Read each case's title, not its ID, when comparing with older evidence (the `[gin learn]` note of gin-console-5c4).
2. Write the api tests and run `gin-qa tests run --type api <TC-IDs>`.
3. Update `qa/e2e/support/reports.ts` and the old specs. Every spec sets localStorage `gin-console.email` with `addInitScript` (bd memory `e2e-login-gate`).
   - Build the new or stale specs one case at a time against the served built UI, following `/home/gin/.claude/skills/gin-qa/skills/e2e/references/explore-case.md`.
   - Run the full suite, then make one official run with `gin-qa e2e run <TC-IDs>`.
4. Commit: `git commit -m "test(qa): cases and tests for Reports status and one scope (gin-console-rm-reports-status)"`

### Track 10: Example data, README and TC-1 on the deployed console
- **Dependencies**: Track 9
- **Requirements**: REQ-REPORTS-020, REQ-REPORTS-022, REQ-REPORTS-024, REQ-REPORTS-025, REQ-REPORTS-027, REQ-REPORTS-028, REQ-REPORTS-031, REQ-REPORTS-033, REQ-REPORTS-036, REQ-UI-095, REQ-UI-129
- **Files**:
  - Modify `scripts/make_example_project.py:180-460` (the data below)
  - Modify `README.md` (the Reports section: five sections at their paths, one scope, Status, Team KPI v2)
  - Modify `docs/changes/gin-console-rm-reports-status-reports-status/05-tests.md` (TC-1 result)
  - Create `qa/evidence/<date>-reports-status-tc1/` (gitignored)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** generator edits in existing helpers, a README section, then the written check per the deploy and Playwright memories.
- **Acceptance criteria**:
  - `python3 scripts/make_example_project.py` succeeds.
  - On the example project's active milestone `ex-m2`, the Status section shows:
    - a verdict;
    - a burn-up whose scope steps up after kickoff;
    - at least one item of each kind `epic_added`, `re_estimated` and `bug_added`;
    - a blocked chain;
    - an unestimated epic;
    - planned and forecast dates.
  - The Team section shows the unassigned note and Across milestones with at least 3 rows.
  - TC-1 is recorded as `pass, claude (Playwright on the Tailscale build of <commit>, N/N checks, screenshots in qa/evidence/...)`, and no page error occurred.
- **Estimated complexity**: medium

Steps:
1. Change the generator for `ex-m2`:
   - write `points_history` as JSON text on one epic (as `bd` stores it), with a re-estimate from 5 to 8 after the kickoff;
   - add one epic created without points that is estimated after the kickoff;
   - add one bug created after the kickoff under a track;
   - add one blocked track whose blocker is itself blocked;
   - add three closed tracks without an assignee, so that 20% or more of the closed scope is unassigned;
   - give `ex-m1` and two new closed milestones `planned_days_per_point`, closed epics with points, `started_at` and `closed_at`, so the trend has 3 or more rows.
   
   Run the generator and its `check()`.
2. Update the README's Reports section.
3. Deploy, each as its own command:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health`
   - Expect `active` and `200`. The main checkout must be on `feat/reports-status`.
4. Write a Playwright script outside the repo and run it with `NODE_PATH=/home/gin/scotty/node_modules node <script> qa/evidence/<date>-reports-status-tc1`:
   - Set localStorage `gin-console.email`. Run at 1440×900 and 390×844 with deviceScaleFactor 2.
   - Make one check per TC-1 expectation, fail on any `pageerror`, and check that `document.documentElement.scrollWidth <= innerWidth` on every section.
   - Read the key screenshots for layout problems.
5. Commit the generator and README: `git commit -m "docs(reports): example data and README for Reports status (gin-console-rm-reports-status)"`. Record TC-1 in `05-tests.md`, note it on the track bead, and commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-rm-reports-status)"`

## Integration
- **Branch**: `feat/reports-status`
- **Merge strategy**: sequential

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- [ ] `gin specs lint --change gin-console-rm-reports-status --against master` prints `ok`, and `gin specs trace --change gin-console-rm-reports-status` lists no missing REQ.
- [ ] `gin-qa cases check --change gin-console-rm-reports-status` prints `ok`.
- [ ] TC-1 passed on the deployed console.

## Notes
- The user may override `Model:` and `Effort:` before approval.
- The parent bead stays open until a human confirms the merge. Each track bead closes when its tests and review pass.
- Line numbers come from `master` at 3b392bc; anchor edits on content.
- Create track beads with `--no-inherit-labels` (bd memory `track-labels-inherit-export`).
- Between Track 2 and Track 6, the built UI cannot read the report (`sprint` and the old `Report` shape). Do not deploy before Track 10.
- Track 5 has no dependency and may run at any point before Track 7.
- Run the pre-push suite once, at ship (memory `solo-work-defer-commits`). In a track worktree, run `pnpm -C frontend install` and `uv --directory backend sync` before the first commit (bd memory `parallel-worktree-test-flakes`).
