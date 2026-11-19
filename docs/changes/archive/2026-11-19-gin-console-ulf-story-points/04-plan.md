# Plan: Story points and velocity KPIs

Epic: gin-console-ulf
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder.

## Objective
The console shows gin-workflow story points next to days (Gantt, Beads List row, bead page, Delivery table) and the team's velocity KPIs (say/do on the Milestones list, a velocity line on the milestone page, days per point on the forecast card, and a Reports Velocity tab), all from gin's own figures and never per member.

Done when:
- Every scenario of REQ-MILESTONE-UI-021 and REQ-REPORTS-018 (ADDED) and REQ-MILESTONE-UI-001, -008, -013, -016, REQ-BEADS-001, REQ-REPORTS-004, REQ-UI-090, REQ-UI-095, REQ-UI-109 (MODIFIED) has a test that names its REQ.
- `gin-qa cases check --change gin-console-ulf` prints `ok`.
- TC-1 passes on the deployed console with the regenerated example project.

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
- **Problem statement:** gin-workflow scores roadmap epics in story points and reports `days_per_point`, per-milestone `velocity` and per-epic points in `gin milestone list/show --json`. gin-console drops those keys, shows no points, and its Delivery estimate table leaves out every pointed epic (no `estimated_minutes`).
- **Success criteria:**
  - Everything in the Objective.
  - Backend pytest, ruff and mypy pass; frontend test, typecheck, lint and build pass.
  - `gin specs lint --change gin-console-ulf --against master` prints `ok`; `gin specs trace --change gin-console-ulf` lists no missing REQ.
- **Global constraints** (from the spec):
  - New keys are additive and optional: an older gin without them still loads; each missing key is `null` and its UI is hidden or "–".
  - Figures are gin's, unchanged; the console never recomputes `days_per_point`, commitment or accuracy. The only console arithmetic is Delivery's `days_per_point = round(actual_days / points, 1)` for closed pointed epics, from the snapshot.
  - Points are valid only as one of 1, 2, 3, 5, 8, 13, 21 (an `int`, not a `bool`); anything else reads as no points.
  - Reports backend never runs `gin`; the Velocity tab calls `GET /api/milestones?project=` from the browser, only once the tab is selected.
  - Team level only: no figure per member anywhere.
  - Formats: say/do as a whole percent ("62%"), days per point and planned to one decimal ("1.4"), accuracy to two decimals ("0.86"), points as "<p> pt".
  - Read-only console, no new dependency (Recharts is already used by Reports). New and changed tests carry their REQ-ID. Lists with fixed columns switch layout by container query (`.planning/knowledge/container-queries-for-lists.md`).
- **Non-goals:** setting points from the console, per-member figures, recomputing gin figures, a `gin` call from the Reports backend, gin-workflow changes.

## Approach Options
### Option 1: pass gin's new keys through and read points from the snapshot
- **Summary:** extend the milestones models with defaulted fields; read `metadata.points` in the beads and reports snapshot readers; the Velocity tab fetches the Milestones API in the browser.
- **Pros:** no new process, no duplicated gin logic, older gin keeps working.
- **Cons:** the Velocity tab makes one gin call per project when opened (cached 5 s).

### Option 2: the Reports backend calls `gin milestone list`
- **Summary:** a server-side velocity endpoint.
- **Pros:** one request from the page.
- **Cons:** a second place running gin with its own cache and errors.

### Option 3: compute velocity from the snapshot
- **Summary:** reimplement commitment, say/do and days per point.
- **Pros:** no gin call.
- **Cons:** duplicates gin's rules (kick-start snapshot, `milestone_moves`, last 10 epics) and drifts.

### Recommended Approach
- **Selected option:** Option 1, confirmed in discuss on 2026-11-19.
- **Rationale:** gin owns the figures; the console only shows them.

## Scope
- **In scope:** milestones models; beads and reports snapshot readers; Delivery estimate rows; milestones list, forecast card, milestone page velocity line, Gantt points prefix; Beads List row and bead page points; Reports Velocity tab and headline; Delivery table points rows; example project data; QA cases; TC-1.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Tracks 1 (backend), 2 (milestones and beads UI), 4 (example data) and 5 (QA cases) share no file and run together; Track 3 (Reports UI) reuses Track 2's milestones API types and starts after it; Track 6 checks the merged branch on the deployed console.
```

## Tasks

### Track 1: Backend: milestone keys, bead points, Delivery rows
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-008, REQ-BEADS-001, REQ-REPORTS-004
- **Files**:
  - Modify `backend/src/gin_console/milestones/models.py:22-100` (add `DaysPerPoint`, `Velocity`; new fields on `MilestoneEntry`, `MilestoneList`, `EpicPlan`, `MilestoneDetail`)
  - Modify `backend/src/gin_console/beads/models.py:30-45` (`BeadSummary.points`, `points_reason`)
  - Modify `backend/src/gin_console/beads/source.py:125-160` (`_points(raw)` and `_fields`)
  - Modify `backend/src/gin_console/reports/models.py:62-100` (`ReportBead.points`, `EstimateRow.estimate_days: float | None`, `points`, `days_per_point`)
  - Modify `backend/src/gin_console/reports/source.py` (read `points` into `ReportBead`)
  - Modify `backend/src/gin_console/reports/service.py:350-381` (`_delivery` keeps pointed epics)
  - Test `backend/tests/test_milestones_source.py`, `backend/tests/test_milestones_api.py`, `backend/tests/test_beads_source.py`, `backend/tests/test_beads_api.py`, `backend/tests/test_reports_service.py`, `backend/tests/test_reports_source.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** additive pydantic fields and one filter change in existing modules, with written scenarios.
- **Acceptance criteria**:
  - The "story points" and "output from an older gin-workflow" scenarios of REQ-MILESTONE-UI-008, the "Story points" scenario of REQ-BEADS-001 and the "points" scenario of REQ-REPORTS-004 have passing tests naming them; existing tests still pass.
  - pytest, ruff and mypy pass.
- **Estimated complexity**: low

Interfaces produced (Tracks 2 and 3 consume the JSON):
```py
# milestones/models.py
class DaysPerPoint(BaseModel): value: float; measured_epics: int = 0; assumed: bool = False
class Velocity(BaseModel):
    committed_points: int | None = None; completed_points: int = 0; added_points: int = 0
    say_do: float | None = None; days_per_point: float | None = None
    planned_days_per_point: float | None = None; accuracy: float | None = None
class MilestoneEntry(BaseModel): ...; velocity: Velocity | None = None
class MilestoneList(BaseModel): ...; days_per_point: DaysPerPoint | None = None
class EpicPlan(BaseModel): ...; points: int | None = None; points_reason: str | None = None
    estimate_source: Literal["points", "days", "assumed"] | None = None
    actual_days: int | None = None; actual_days_per_point: float | None = None
class MilestoneDetail(BaseModel): ...; days_per_point: DaysPerPoint | None = None; velocity: Velocity | None = None
# beads/models.py
class BeadSummary(BaseModel): ...; points: int | None = None; points_reason: str | None = None
# reports/models.py
class ReportBead(BaseModel): ...; points: int | None = None
class EstimateRow(BaseModel): project: str; id: str; title: str; estimate_days: float | None; points: int | None = None; actual_days: int; days_per_point: float | None = None
```
A shared helper `POINT_SCALE = frozenset({1, 2, 3, 5, 8, 13, 21})` and `points_of(metadata: object) -> int | None` live in `beads/kinds.py` (accepts only `type(value) is int` in the scale) and are reused by `reports/source.py`.

Steps:
1. Tests (REQ-MILESTONE-UI-008): `test_milestones_source.py` parses a list with `days_per_point` and `velocity` and a show with an epic carrying the five points keys, and asserts the serialized output equals the input values; an older payload without them gives `null` for each. `test_milestones_api.py` checks the same through `GET /api/milestones?project=P` and `GET /api/milestones/P/M1` with a fake `run_gw`. Run `uv run --directory backend pytest tests/test_milestones_source.py tests/test_milestones_api.py` (fails), add the models, run (passes).
2. Tests (REQ-BEADS-001 "Story points"): `e-1` with `metadata: {"points": 5, "points_reason": "new endpoint and UI"}`, `e-2` with `points: 4`, `e-3` with `points: "5"`, and one with `points: true` give `5`/reason and `null`/`null` for the others. Implement `points_of` and `_fields`. Run (passes).
3. Tests (REQ-REPORTS-004 "points"): a closed epic without `estimated_minutes`, `metadata.points: 5`, started Monday 2026-11-02 and closed Tuesday 2026-11-10 gives `EstimateRow(estimate_days=None, points=5, actual_days=7, days_per_point=1.4)`; the existing 2400-minute scenario keeps `points: None`, `days_per_point: None`. Change `_delivery`'s filter to `issue_type == "epic" and (b.estimated_minutes or b.points)`. Run (passes).
4. Run `uv run --directory backend pytest`, `uv run --directory backend ruff check .`, `uv run --directory backend mypy`; all pass. Commit: `git commit -m "feat(milestones): story points and velocity from gin, points in beads and delivery (gin-console-ulf)"`

### Track 2: Milestones and Beads UI show points and velocity
- **Dependencies**: none (builds against the JSON above)
- **Requirements**: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-021, REQ-UI-109
- **Files**:
  - Modify `frontend/src/features/milestones/api.ts:5-150` (`DaysPerPoint`, `Velocity` types; fields on `MilestoneEntry`, `MilestoneList`, `EpicPlan`, `MilestoneDetail`; lenient guards)
  - Modify `frontend/src/features/milestones/format.ts` (`percent`, `oneDecimal`, `twoDecimals`)
  - Modify `frontend/src/features/milestones/MilestonesPage.tsx` (Say/do column and header, stacked row value; container query size per the design)
  - Modify `frontend/src/features/milestones/ForecastCard.tsx` (days per point line)
  - Create `frontend/src/features/milestones/MilestoneVelocity.tsx`
  - Modify `frontend/src/features/milestones/MilestonePage.tsx` (render `MilestoneVelocity` in the header)
  - Modify `frontend/src/features/milestones/GanttChart.tsx:381-387` (points prefix)
  - Modify `frontend/src/features/beads/api.ts` (`points`, `points_reason`)
  - Modify `frontend/src/features/beads/ListRow.tsx:40` and `frontend/src/features/beads/BeadDetailPage.tsx:80-175` (points display)
  - Test `frontend/src/features/milestones/{api.test.ts,format.test.ts,MilestonesPage.test.tsx,ForecastCard.test.tsx,MilestonePage.test.tsx,GanttChart.test.tsx}`, `frontend/src/features/beads/{ListView.test.tsx,BeadDetailPage.test.tsx}`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded UI additions across existing components with exact texts in the spec; the list grid needs care (container query) but follows a recorded pattern.
- **Acceptance criteria**:
  - Every scenario of REQ-MILESTONE-UI-001 "say/do", -013 "points", -016 "days per point", -021 (all three) and REQ-UI-109 "Pointed epic" has a passing test naming it; older payloads without the keys still render as before.
  - The Milestones list keeps a visible title column at 800, 1024, 1280 and 1440 px windows (checked with Playwright on a built UI, numbers in the report).
  - test, typecheck, lint and build pass.
- **Estimated complexity**: medium

Interfaces produced (Track 3 consumes):
```ts
export type DaysPerPoint = { value: number; measured_epics: number; assumed: boolean };
export type Velocity = {
  committed_points: number | null; completed_points: number; added_points: number;
  say_do: number | null; days_per_point: number | null; planned_days_per_point: number | null; accuracy: number | null;
};
// MilestoneEntry.velocity?: Velocity | null; MilestoneList.days_per_point?: DaysPerPoint | null
// EpicPlan.points?: number | null (+ points_reason, estimate_source, actual_days, actual_days_per_point)
// MilestoneDetail.days_per_point?: DaysPerPoint | null; MilestoneDetail.velocity?: Velocity | null
export function percent(ratio: number): string;     // 0.62 -> "62%"
export function oneDecimal(n: number): string;      // 1.4 -> "1.4", 1 -> "1.0"
export function twoDecimals(n: number): string;     // 0.86 -> "0.86"
export function velocityOf(value: unknown): Velocity | null;       // lenient reader
export function daysPerPointOf(value: unknown): DaysPerPoint | null;
```

Steps:
1. Tests: `api.test.ts` (guards accept the new keys, read missing/malformed as null, keep older payloads valid); `format.test.ts` (`percent`, `oneDecimal`, `twoDecimals`); `MilestonesPage.test.tsx` "REQ-MILESTONE-UI-001 say/do"; `ForecastCard.test.tsx` "REQ-MILESTONE-UI-016 days per point" ("1.4 days per point", "1.0 days per point (assumed)", none without the key); `MilestonePage.test.tsx` "REQ-MILESTONE-UI-021 Kicked off / Not kicked off / Older gin-workflow"; `GanttChart.test.tsx` "REQ-MILESTONE-UI-013 points" ("5 pt · 7d", "3 pt · 1d left"); `ListView.test.tsx` and `BeadDetailPage.test.tsx` "REQ-UI-109 Pointed epic". Run `pnpm -C frontend test --run src/features/milestones src/features/beads` (fails).
2. Implement api and format helpers, `MilestonesPage` column (and the container query size so the title keeps at least 10rem), `ForecastCard`, `MilestoneVelocity`, `MilestonePage`, `GanttChart`, beads `api.ts`, `ListRow`, `BeadDetailPage`. Run the tests (pass).
3. `pnpm -C frontend build`, then measure the Milestones list title width at 800/1024/1280/1440 with an ad-hoc Playwright script under /tmp against a temporary console (port 8712, project `example`), stop it by its PID.
4. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`; all pass. Commit: `git commit -m "feat(milestones): points and velocity on the milestones pages and beads views (gin-console-ulf)"`

### Track 3: Reports Velocity tab and Delivery points rows
- **Dependencies**: Track 2 (milestones `api.ts` types and `velocityOf`/`daysPerPointOf`, `format.ts` helpers)
- **Requirements**: REQ-REPORTS-018, REQ-UI-095, REQ-UI-090
- **Files**:
  - Modify `frontend/src/features/reports/filters.ts:3-4` (`ReportTab` and `TABS` gain `velocity` after `delivery`)
  - Modify `frontend/src/features/reports/ReportsPage.tsx` (Velocity tab panel, request only once selected)
  - Modify `frontend/src/features/reports/headlines.ts` (Velocity headline)
  - Create `frontend/src/features/reports/velocity/VelocityTab.tsx`, `VelocityFigures.tsx`, `VelocityCharts.tsx`, `VelocityTable.tsx`, `velocity.ts` (milestone selection and ordering)
  - Modify `frontend/src/features/reports/api.ts:60-70` (`EstimateRow` with `estimate_days: number | null`, `points`, `days_per_point`)
  - Modify `frontend/src/features/reports/DeliverySection.tsx:82-100` (points rows)
  - Test `frontend/src/features/reports/{ReportsPage.test.tsx,headlines.test.ts,sections.test.tsx,filters.test.ts}`, create `frontend/src/features/reports/velocity/{VelocityTab.test.tsx,velocity.test.ts}`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a new tab following the existing Reports sections and charts, with exact scenarios; one new data path (milestones API per project) with per-project errors.
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-018, REQ-UI-095 "velocity tab" and "keyboard", and REQ-UI-090 "points row" has a passing test naming it; existing Reports tests still pass.
  - The milestones list is requested only after the Velocity tab is selected, once per project.
  - test, typecheck, lint and build pass.
- **Estimated complexity**: medium

Interfaces:
```ts
// velocity.ts
export type VelocityPoint = { id: string; title: string; start: string | null; velocity: Velocity };
export function velocityMilestones(list: MilestoneList): VelocityPoint[]; // committed_points !== null || completed_points > 0, by start ascending
export function latestSayDo(points: readonly VelocityPoint[]): VelocityPoint | null; // latest start with say_do !== null
// VelocityTab({ projects }: { projects: readonly string[] }) — one block per project, fetchMilestones per project
```

Steps:
1. Tests: `velocity.test.ts` (selection, order, latest say/do); `VelocityTab.test.tsx` "REQ-REPORTS-018 Milestones with velocity / Assumed days per point / Nothing kicked off yet / All projects with one failing" with `fetch` stubbed; `ReportsPage.test.tsx` "REQ-UI-095 velocity tab" (URL `tab=velocity`, one `/api/milestones?project=alpha` request, headline "1.4 d/pt") and "keyboard" (Right from Delivery selects Velocity); `filters.test.ts` (`velocity` parses); `sections.test.tsx` "REQ-UI-090 points row". Run `pnpm -C frontend test --run src/features/reports` (fails).
2. Implement filters, `velocity.ts`, the four components (Recharts `BarChart` grouped committed/completed and `LineChart` days per point and planned, inside `ChartBox`, colors from `colors.ts`), `ReportsPage` wiring and headline, `api.ts` and `DeliverySection`. Run the tests (pass).
3. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`; all pass. Commit: `git commit -m "feat(reports): velocity tab and points in the delivery estimates (gin-console-ulf)"`

### Track 4: Example project with story points
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-021, REQ-REPORTS-018 (data for TC-1)
- **Files**:
  - Modify `scripts/make_example_project.py:225-530` (milestone metadata `committed_points` and `planned_days_per_point` on `ex-m1` and `ex-m2`; epics with `metadata.points`, `points_reason`, `points_history` in place of most `estimated_minutes`, keeping one day-estimated epic; closed pointed epics in `ex-m1` with `started_at`/`closed_at`)
  - Modify `scripts/README.md` (what the points data shows)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** data must satisfy gin's velocity rules (kick-start snapshot keys, closed epics with points and timestamps) so every KPI is non-null; checked against the real `gin milestone` output.
- **Acceptance criteria**:
  - After `python3 scripts/make_example_project.py` (the command in `scripts/README.md`), `gin milestone list --all --json` in `examples/example-project` reports `days_per_point.assumed: false`, `ex-m1` with non-null `committed_points`, `say_do` and `accuracy`, `ex-m2` with non-null `committed_points`, and `gin milestone show ex-m2 --json` has epics with `points` and `estimate_source: "points"`.
  - `uv run --directory backend ruff check ../scripts` passes.
- **Estimated complexity**: low

Steps:
1. Read gin-workflow's story-points rules in `/home/gin/gin-fam/gin-workflow/docs/reference/cli.md` (the `gin milestone` section) for the metadata keys.
2. Edit the generator, run it, and check the JSON above with `jq`. Commit: `git commit -m "chore(example): story points and a kicked-off commitment in the example project (gin-console-ulf)"`

### Track 5: QA cases
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-021, REQ-BEADS-001, REQ-REPORTS-004, REQ-REPORTS-018, REQ-UI-090, REQ-UI-095, REQ-UI-109
- **Files**:
  - Create cases under `qa/cases/milestone-ui/`, `qa/cases/reports/`, `qa/cases/beads/`, `qa/cases/ui/` for each new scenario
  - Modify and re-pin the existing cases of the modified REQs
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** mechanical case writing from written scenarios with the gin-qa cases skill.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-ulf` prints `ok`, and `gin-qa cases check` shows no new finding.
  - Each case stands alone, one action per step, concrete URLs or data.
- **Estimated complexity**: low

Steps:
1. `gin-qa cases plan --change gin-console-ulf`; write the missing cases per `qa/guidelines.md` and the `gin-qa:cases` skill; update and re-pin stale ones.
2. `gin-qa cases check --change gin-console-ulf` (ok) and `gin-qa cases check`. Commit: `git commit -m "test(qa): cases for story points and velocity (gin-console-ulf)"`

### Track 6: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3, Track 4, Track 5
- **Requirements**: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-021, REQ-REPORTS-018, REQ-UI-090, REQ-UI-095, REQ-UI-109
- **Files**:
  - Modify `docs/changes/gin-console-ulf-story-points/05-tests.md` (TC-1 result)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** run a written check with Playwright and record the result.
- **Acceptance criteria**: TC-1 is recorded as pass, claude (Playwright on the deployed build of <commit>, n/n checks, screenshots in qa/evidence/<date>-ulf-tc1).
- **Estimated complexity**: low

Steps:
1. On the merged feature branch: `python3 scripts/make_example_project.py`, then `pnpm -C frontend build && uv --directory backend sync && systemctl --user restart gin-console`; `curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/projects` prints 200.
2. Playwright at 1440×900 and 390×844 on project `example`, comparing each figure with `gin milestone list --all --json` / `show ex-m2 --json`: Gantt points prefix, List row and bead page points, Milestones say/do and forecast days per point, milestone velocity line, Reports › Velocity figures, charts and table, Delivery pointed row; no sideways scroll.
3. Record TC-1 in `05-tests.md` and commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-ulf)"`

## Integration
- **Branch**: `feat/gin-console-ulf-story-points`
- **Merge strategy**: parallel-then-merge (tracks 1, 2, 4, 5 in worktrees on `feat/gin-console-ulf-story-points-t<N>`; Track 3 starts from the branch after Track 2 merges; merge order 1, 2, 3, 4, 5, then Track 6 on the merged branch)
