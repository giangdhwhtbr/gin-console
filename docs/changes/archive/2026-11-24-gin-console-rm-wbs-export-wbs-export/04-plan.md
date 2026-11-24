# Plan: WBS export and summary

Epic: gin-console-rm-wbs-export
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder. Diagrams: `docs/specs/milestone-ui/diagrams/wbs-export-activity.md`, `docs/specs/reports/diagrams/status-section-activity.md`. Use cases: `docs/specs/milestone-ui/use-cases/export-wbs.md`, `docs/specs/reports/use-cases/review-milestone-status.md`.

## Objective

Give a PM a downloadable work breakdown (Excel, CSV for Jira, Markdown) for a project or a milestone, and a one-click Copy summary button on Reports Status:
- **Backend WBS export:** `GET /api/milestones/{project}/wbs?format=xlsx|csv|md[&milestone=<id>]` builds an ordered, numbered WBS from the Beads snapshot joined with `gin` milestone dates/estimates, degrades gracefully when `gin` fails, and serializes Excel (`openpyxl`, outline-grouped, `WBS` + `About` sheets), Jira-compatible CSV, or Markdown.
- **Milestone UI:** `Export WBS` menu with three direct download links in both `MilestonePage` (milestone-scoped) and `MilestonesPage` (project-scoped).
- **Reports Status:** `Copy summary` button in `StatusSection` copying the verdict, KPIs, risks, and epic table as Markdown with `"Copied"` / `"Couldn't copy"` feedback.

Done when:
- Every scenario of the 9 added REQs (`REQ-MILESTONE-UI-026`..`032`, `REQ-REPORTS-037`..`038`) has a test naming its REQ-ID.
- `uv --directory backend run pytest`, `ruff check .`, and `mypy` pass.
- `pnpm -C frontend test --run`, `typecheck`, `lint`, and `build` pass.
- `gin specs lint --change gin-console-rm-wbs-export --against master` prints `ok`, and `gin specs trace --change gin-console-rm-wbs-export` reports no missing REQ.

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
  - gin-console has no file download or export endpoint (`milestones/router.py` only serves JSON for `/milestones` and `/milestones/{project}/{milestone_id}`).
  - No backend code builds WBS numbers, rolls up milestone/epic estimates and `% done`, or writes `.xlsx` / Jira `.csv` / `.md` tables.
  - `StatusSection.tsx` renders the verdict, KPIs, risks, and epic table, but has no way to copy a Markdown status summary to the clipboard.
- **Success criteria:**
  - All 9 new REQs implemented and verified with unit/API/component tests carrying REQ-IDs.
  - Generated `.xlsx` opens cleanly in `openpyxl` with outline levels, date/percent cells, formula-injection protection, and `About` sheet.
  - Generated `.csv` matches Jira External System Import conventions (parents before children, `Fix Version`, `Original Estimate` in seconds, `blocked` label, repeated `Link "Blocks"` columns).
  - Backend and frontend lint, typecheck, test, and build checks all pass.
- **Global constraints** (from the spec and user decisions 2026-11-24):
  - **Read-only:** never mutate projects or Beads.
  - **Shared definitions (`beads/definitions.py`):** done is `is_done` (closed); blocked is `is_blocked`; progress uses `child_counts` (tracks only); person is normalized `assignee` (`person_key`) or `"Unassigned"`, NEVER `owner` (REQ-UI-135); prep tasks (`row_is_prep`) and merge gates (`is_merge_gate`) are excluded; closed beads are included.
  - **Single CSV format:** CSV is in Jira External System Import layout with WBS columns appended at the end; milestones are omitted as issue rows and carried as `Fix Version` on descendant issues. Jira imports a `Link "Blocks"` cell as the outward link (`<row> blocks <cell>`), so the link sits on the blocker's row; `Issue ID` is the row position from `1`; Jira allows one sub-task level.
  - **Estimate column:** epics use `gin` `estimate_days`, else `assumed_days` with `(assumed)` (gin leaves `estimate_days` null for an assumed estimate); milestones sum their epics; tasks use `estimated_minutes / 480` when set, else blank.
  - **Beads export unreadable:** `BeadsError` returns 502 with `error`, as the Beads router does.
  - **Degraded `gin` CLI:** `MilestonesError` from `gin milestone list`/`show` must not fail the export — return HTTP 200 from Beads snapshot alone with `X-WBS-Warning` header, `About` sheet note, and Markdown callout.
  - **Route order:** `GET /milestones/{project}/wbs` must be registered before `GET /milestones/{project}/{milestone_id}`.
  - **Copy summary:** frontend-only in `StatusSection.tsx`, hidden on period scope and while loading/errored, using `navigator.clipboard.writeText` with 2 s `"Copied"` and inline `"Couldn't copy"` error state.
- **Non-goals:** MS Project (`.mpp`/`.xml`), PDF export, persisting WBS baselines, a separate non-Jira CSV format, Copy summary on period scopes or non-Status report sections.

## Approach Options
### Option 1: Backend WBS pipeline (builder → serializers → route) + parallel frontend Copy summary
- **Summary:** Build `wbs.py` (Track 1), then `wbs_formats.py` + `openpyxl` (Track 2), then the route in `milestones/router.py` (Track 3). Run `ExportWbsMenu` on `MilestonePage` and `MilestonesPage` (Track 4) and Copy summary on Reports Status (`summaryMarkdown.ts` + `CopySummaryButton.tsx` + `StatusSection.tsx`, Track 5) in parallel with Tracks 1–3.
- **Pros:**
  - Clean separation of responsibilities: tree/rules (`wbs.py`), serialization (`wbs_formats.py`), HTTP wiring (`router.py`), and two disjoint frontend feature folders (`features/milestones/` vs `features/reports/status/`).
  - Tracks 4 and 5 have zero file overlap with Tracks 1–3 or with each other and can execute concurrently in parallel worktrees.
  - Each track is independently testable with existing fakes (`FakeGw`, `fake_export`) and `vitest`.
- **Cons:** Track 4 is checked against the real endpoint only after Track 3 merges; its tests rely on the URL contract fixed in `REQ-MILESTONE-UI-026`.

### Option 2: Combine builder, serializers, and route into one large backend track
- **Summary:** Put `wbs.py`, `wbs_formats.py`, `pyproject.toml`, and `router.py` in a single track.
- **Pros:** Fewer track handoffs.
- **Cons:** Oversized diff mixing tree logic, `openpyxl`/Jira CSV formatting, and HTTP routing; harder to review and reject independently.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** Matches the repo's bounded-context architecture and small-track review discipline; keeps `wbs.py` pure and free of `openpyxl`/HTTP imports, and allows Track 5 to run in parallel without merge conflicts.

## Scope
- **In scope:** `REQ-MILESTONE-UI-026` through `REQ-MILESTONE-UI-032`, `REQ-REPORTS-037`, and `REQ-REPORTS-038`.
- **Out of scope:** non-goals listed above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: All tracks run on the Claude main harness. Track 4 (frontend/src/features/milestones/ExportWbsMenu) and Track 5 (Reports Copy summary in frontend/src/features/reports/status/) are disjoint from Tracks 1-3 (backend/milestones WBS pipeline) and from each other, so they run concurrently in parallel worktrees while Tracks 1->2->3 execute in dependency order.
```

## Tasks

### Track 1: WBS row builder (`milestones/wbs.py`)
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-027, REQ-MILESTONE-UI-028
- **Files**:
  - Create `backend/src/gin_console/milestones/wbs.py`
  - Test `backend/tests/test_wbs.py`
- **Interfaces**:
  - Consumes: `Snapshot` (`beads/snapshot.py:24-32`), `is_done`, `is_blocked`, `child_counts`, `person_key` (`beads/definitions.py:12-85`), `row_is_prep` (`beads/prep.py:13`), `is_merge_gate` (`beads/lanes.py:74`), `points_of` (`beads/kinds.py:18`, story points on the scale), `MilestoneList`, `MilestoneDetail`, `EpicPlan`, `ForecastEpic` (`milestones/models.py:42-135`).
  - Field sources: an epic's estimate is `EpicPlan.estimate_days`, else `EpicPlan.assumed_days` with `estimate_assumed = True`; planned dates of an epic come from its milestone's `EpicPlan`, or from `listing.forecast.epics` for an epic without a milestone; a task's estimate is the row's `estimated_minutes / 480`; an epic's forecast end when closed is the date of the row's `closed_at`.
  - Produces:
    - `WbsRow(BaseModel)`: `wbs: str`, `level: int` (1-based), `id: str`, `parent_id: str | None`, `milestone_title: str | None`, `name: str`, `issue_type: str` (raw), `type_label: str` (plain), `status: Literal["Open", "In progress", "Blocked", "Done"]`, `blocked: bool`, `assignee: str` (`person_key` or `"Unassigned"`), `assignee_email: str | None` (raw email when `"@"` in assignee else normalized handle or `None`), `points: int | None`, `estimate_days: float | None`, `estimate_assumed: bool`, `planned_start: date | None`, `planned_end: date | None`, `forecast_end: date | None`, `percent_done: float | None` (`0.0..1.0`), `depends_on_wbs: list[str]` (WBS numbers in scope, else bead id), `depends_on_ids: list[str]` (raw blocker ids).
    - `WbsDocument(BaseModel)`: `project: str`, `scope_label: str`, `milestone_id: str | None`, `generated_at: datetime`, `warning: str | None`, `rows: list[WbsRow]`.
    - `build_wbs(project: str, snapshot: Snapshot, listing: MilestoneList | None, details: Mapping[str, MilestoneDetail], *, milestone_id: str | None = None, generated_at: datetime, warning: str | None = None) -> WbsDocument`.
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** Bounded single-module business logic with clear rules (ordering, cycle guard, rollups, `child_counts`, assignee identity, and `Depends on` resolution) reusing existing `definitions.py` helpers.
- **Acceptance criteria**:
  - Tests in `backend/tests/test_wbs.py` name `REQ-MILESTONE-UI-027` and `REQ-MILESTONE-UI-028` and cover: milestone scope numbering (`1`, `1.1`, `1.1.1`), project scope root ordering (milestones by start then id → unassigned epics → parentless non-epics), depth > 3, cycle guard, exclusion of `prep` and merge gates, closed bead inclusion, `is_blocked`/`is_done` status mapping, `assignee` never reading `owner`, milestone & epic `points`/`estimate_days`/`percent_done` rollups, an assumed epic estimate taken from `assumed_days` and counted in the milestone sum, planned dates of an epic without a milestone taken from `forecast.epics`, a task estimate from `estimated_minutes`, `forecast_end` (date of `closed_at` vs forecast `planned_end`), in-scope vs external `Depends on`, and empty scope.
  - `uv --directory backend run pytest tests/test_wbs.py`, `ruff check .`, and `mypy` pass.
- **Estimated complexity**: medium

### Track 2: WBS serializers (`milestones/wbs_formats.py`) and `openpyxl` dependency
- **Dependencies**: Track 1
- **Requirements**: REQ-MILESTONE-UI-029, REQ-MILESTONE-UI-030, REQ-MILESTONE-UI-031
- **Files**:
  - Modify `backend/pyproject.toml:6-20` (add `"openpyxl>=3.1"` to `dependencies` and `"types-openpyxl"` to the `dev` group, since `openpyxl` ships no type hints and mypy runs strict)
  - Modify `backend/uv.lock` (lock both via `uv --directory backend lock`)
  - Create `backend/src/gin_console/milestones/wbs_formats.py`
  - Test `backend/tests/test_wbs_formats.py`
- **Interfaces**:
  - Consumes: `WbsDocument`, `WbsRow` from `gin_console.milestones.wbs`.
  - Produces:
    - `to_xlsx(doc: WbsDocument) -> bytes` (sheets `WBS` and `About`, `freeze_panes = "A2"`, autofilter, bold level 1, `outlineLevel = max(0, row.level - 1)`, real `date` cells `YYYY-MM-DD`, numeric `0%` cells, formula-injection guard `_safe_cell`).
    - `to_csv(doc: WbsDocument) -> str` (UTF-8 Jira External System Import layout: `Issue ID` as the row position from `1`, `Parent ID`, `Issue Type` Epic/Task/Bug/Sub-task with one sub-task level, `Summary`, `Status` To Do/In Progress/Done, `Labels` with `blocked`, `Assignee` email/handle/blank, `Story Points`, `Original Estimate` in integer seconds at `28800 s/day`, ISO `Start date`/`Due date`, `Fix Version`, repeated `Link "Blocks"` columns on the blocker's row holding the `Issue ID`s it blocks (inverted from `depends_on_ids`), `WBS`, `Forecast end`, `% done`, `Depends on`, `Bead ID`; milestones omitted as rows; parents before children; `_safe_cell`).
    - `to_markdown(doc: WbsDocument) -> str` (`# <project> WBS — <scope>`, `Generated: <YYYY-MM-DD HH:MM UTC>`, optional `> Warning: <msg>`, GFM table with pipe/newline escaping).
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** Three pure serializers with strict formatting specs (`openpyxl` outline grouping/types, Jira CSV column/estimate/link rules, Markdown escaping, formula-injection guard) and one new runtime dependency.
- **Acceptance criteria**:
  - Tests in `backend/tests/test_wbs_formats.py` name `REQ-MILESTONE-UI-029`, `REQ-MILESTONE-UI-030`, and `REQ-MILESTONE-UI-031`:
    - `to_xlsx` output loads in `openpyxl.load_workbook`, verifying `WBS` and `About` sheets, `freeze_panes == "A2"`, autofilter, outline levels `0/1/2`, `date` values, `0%` format, formula-injection guard on `=SUM(A1)`, and warning row on `About`.
    - `to_csv` verifies Jira column order, `Issue ID` numbering from `1`, milestone omission + `Fix Version`, parent-before-child order, `Sub-task` for child of task and a grandchild sub-task parented to the nearest non-sub-task ancestor, `Original Estimate` seconds (`2 days -> 57600`), `Status` + `blocked` label, `Link "Blocks"` on the blocker's row (`t2` blocks `t1`) with repeated columns, an out-of-file blocker named only in `Depends on`, and formula-injection guard.
    - `to_markdown` verifies heading, generated line, warning callout, and `|` / newline escaping.
  - `uv --directory backend run pytest tests/test_wbs_formats.py`, `ruff check .`, and `mypy` pass (including mypy strict compatibility with `openpyxl`).
- **Estimated complexity**: medium

### Track 3: WBS download endpoint (`milestones/router.py`)
- **Dependencies**: Track 1, Track 2
- **Requirements**: REQ-MILESTONE-UI-026
- **Files**:
  - Modify `backend/src/gin_console/milestones/router.py:59` (register `GET /milestones/{project}/wbs` before `GET /milestones/{project}/{milestone_id}`)
  - Modify `backend/tests/fake_gw.py:55-70` (let `FakeGw` fail one command, e.g. `show` only, while the other answers)
  - Test `backend/tests/test_milestones_wbs_api.py`
- **Interfaces**:
  - Consumes: `build_wbs` (`milestones/wbs.py`), `to_xlsx`, `to_csv`, `to_markdown` (`milestones/wbs_formats.py`), `list_milestones`, `show_milestone`, `MilestonesError` (`milestones/source.py`), the router's existing `lists` and `details` `KeyedCache`s, `SnapshotStore` (`beads/snapshot.py`), `BeadsError` (`beads/errors.py`), `clock` (`clock.py`).
  - Produces: HTTP route `GET /api/milestones/{project}/wbs?format=xlsx|csv|md[&milestone=<id>]` returning `Response` with `Content-Type`, `Content-Disposition: attachment; filename="<project>[-<milestone>]-wbs-<YYYY-MM-DD>.<ext>"`, and optional `X-WBS-Warning` header; 502 `{"error": ...}` on `BeadsError`. Project scope calls `show_milestone` once per listed milestone through the `details` cache.
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** Bounded FastAPI route wiring with strict validation (404/422/502), cache reuse for `list_milestones`/`show_milestone`, and graceful degraded fallback on `MilestonesError`.
- **Acceptance criteria**:
  - Tests in `backend/tests/test_milestones_wbs_api.py` name `REQ-MILESTONE-UI-026` and use `FakeGw` + `fake_export` + `Clock` (no real `gin`/`bd`):
    - Milestone `.xlsx`, project `.csv`, and `.md` downloads return 200 with exact `Content-Type` and `Content-Disposition` filenames.
    - Unknown project (404), unknown milestone (404), invalid `format` (422), missing `format` (422), invalid `milestone` chars (422), unreadable Beads export (502 with `error`).
    - `gin milestone show` failing while `list` answers, and both failing, each return 200 with snapshot rows, blank `gin` fields, `X-WBS-Warning` header, and warning in `About`/Markdown.
    - Existing `test_milestones_api.py` tests remain green (route order does not shadow `/{project}/{milestone_id}`).
  - `uv --directory backend run pytest`, `ruff check .`, and `mypy` pass.
- **Estimated complexity**: medium

### Track 4: `ExportWbsMenu` on `MilestonePage` and `MilestonesPage`
- **Dependencies**: none (the URL contract is fixed in `REQ-MILESTONE-UI-026`)
- **Requirements**: REQ-MILESTONE-UI-032
- **Files**:
  - Create `frontend/src/features/milestones/ExportWbsMenu.tsx`
  - Modify `frontend/src/features/milestones/MilestonePage.tsx:123-135` (`MilestoneHeader` already receives `project` but does not destructure it; render `<ExportWbsMenu project={project} milestone={plan.id} />` next to `<Legend verdicts />`)
  - Modify `frontend/src/features/milestones/MilestonesPage.tsx:58` (turn the `h1` into a flex header row with `<ExportWbsMenu project={selected} />` when `selected !== ""`)
  - Test `frontend/src/features/milestones/ExportWbsMenu.test.tsx`, `frontend/src/features/milestones/MilestonePage.test.tsx`, `frontend/src/features/milestones/MilestonesPage.test.tsx`
- **Interfaces**:
  - Consumes: `Button` (`@/components/ui/button`), `@base-ui/react` menu/popover or accessible disclosure menu, URL helper building `/api/milestones/${encodeURIComponent(project)}/wbs?format=${fmt}` (+ `&milestone=${encodeURIComponent(milestone)}` when set).
  - Produces: `ExportWbsMenu({ project, milestone }: { project: string; milestone?: string })` rendering an `Export WBS` button that opens a menu with three `<a download>` links (`Excel (.xlsx)`, `CSV for Jira (.csv)`, `Markdown (.md)`).
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** Small menu component on the existing `@base-ui/react` `menu`, wired into two existing page headers with unit/page tests.
- **Acceptance criteria**:
  - Tests name `REQ-MILESTONE-UI-032` and verify:
    - `ExportWbsMenu` opens on click and renders 3 `<a download>` links for `xlsx`, `csv`, and `md` with properly encoded `project` and optional `milestone` params.
    - `MilestonePage` renders `Export WBS` in the header with `milestone=<id>`.
    - `MilestonesPage` renders `Export WBS` in the header without `milestone`.
  - `pnpm -C frontend test --run`, `typecheck`, `lint`, and `build` pass.
- **Estimated complexity**: low

### Track 5: `summaryMarkdown` and `CopySummaryButton` on Reports Status
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-037, REQ-REPORTS-038
- **Files**:
  - Create `frontend/src/features/reports/status/statusView.ts` (pure helpers moved out of the three components below)
  - Modify `frontend/src/features/reports/status/EpicTable.tsx:14-67` (move `compareRows` and the per-row verdict, planned, and forecast texts into `epicRows`; render from it)
  - Modify `frontend/src/features/reports/status/RisksPanel.tsx:30-34` (move the risk list, including the unapproved-spec epics from `detail`, into `riskItems`; render from it)
  - Modify `frontend/src/features/reports/status/StatusFigures.tsx:42-123` (move the five figures and their week-on-week texts into `kpiFigures`; render from it)
  - Create `frontend/src/features/reports/status/summaryMarkdown.ts`
  - Create `frontend/src/features/reports/status/CopySummaryButton.tsx`
  - Modify `frontend/src/features/reports/status/StatusSection.tsx:78-83` (render `<CopySummaryButton>` in the milestone header row)
  - Test `frontend/src/features/reports/status/summaryMarkdown.test.ts`, `frontend/src/features/reports/status/CopySummaryButton.test.tsx`, `frontend/src/features/reports/status/StatusSection.test.tsx`; existing `EpicTable.test.tsx` and `StatusSection.test.tsx` stay green
- **Interfaces**:
  - Consumes: `StatusReport`, `StatusKpis`, `Risks`, `StatusEpic` (`statusApi.ts`), `TeamMilestone` (`reports/teamApi.ts`), `StatusVerdict` (`verdict.ts`), `MilestoneDetail`, `EpicPlan`, `ForecastEpic` (`features/milestones/api.ts`), `verdictOf` (`features/milestones/gantt.ts`), `formatDate`/`formatRange` (`lib/dates.ts`), `Button` (`@/components/ui/button`), the 2 s `Copied` pattern of `features/milestones/CopyCommand.tsx`.
  - Produces:
    - `statusView.ts`: `epicRows(epics, detail, forecast, today)` (rows in `EpicTable` order with verdict, planned, and forecast texts), `riskItems(risks, detail)` (the items `RisksPanel` lists, as text plus bead ids), and `kpiFigures(kpis, milestone, today)` (label, value, and week-on-week text of the five figures).
    - `type StatusSummaryInput = { report: StatusReport; milestone: TeamMilestone; verdict: StatusVerdict; detail: MilestoneDetail | null; forecast: readonly ForecastEpic[] | null }`.
    - `summaryMarkdown(input: StatusSummaryInput): string` built from the `statusView.ts` helpers, formatting `# <title> (<start> – <end>)`, `Generated: <YYYY-MM-DD>` (`report.today`), `**Verdict:** <word> — <sentence>`, `## KPIs` (5 bullets with week-on-week deltas), `## Risks` (bullets or `None.`), and `## Epics` Markdown table (`Epic | Verdict | Progress | Planned | Forecast | Assignee`) matching `EpicTable` order with `|` / newline escaping.
    - `CopySummaryButton({ buildText }: { buildText: () => string })` calling `navigator.clipboard.writeText`, showing `Copied` for 2 s on success and inline `Couldn't copy` on rejection/unavailable clipboard.
  - Visibility: `StatusSection` renders only for a loaded milestone report (period scopes, loading, and errors are handled by its parent), so the button shows whenever the section does; while the milestone detail loads or after it fails, the summary uses `—` as REQ-REPORTS-037 states.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** Moves three components' text logic into shared pure helpers, then adds a Markdown formatter and a small clipboard button with timer cleanup and error state, isolated to `features/reports/status/`.
- **Acceptance criteria**:
  - Tests name `REQ-REPORTS-037` and `REQ-REPORTS-038` and verify:
    - `summaryMarkdown` produces exact sections for a full milestone report, outputs `None.` when there are no risks, outputs `—` for Verdict/Planned/Forecast when milestone detail failed, and escapes `|` and newlines.
    - `CopySummaryButton` writes Markdown to clipboard, shows `Copied` for 2 s, and shows `Couldn't copy` when `writeText` rejects.
    - `StatusSection` renders `Copy summary` when a milestone is loaded and omits it on period scopes or loading/error states.
    - `EpicTable`, `RisksPanel`, and `StatusFigures` render unchanged after the move (existing tests pass).
  - `pnpm -C frontend test --run`, `typecheck`, `lint`, and `build` pass.
- **Estimated complexity**: medium

## Integration
- **Branch**: `feat/wbs-export`
- **Merge strategy**: parallel-then-merge (Tracks 4 and 5 merge independently; Tracks 1–3 merge sequentially onto `feat/wbs-export`).

## Validation
- [ ] `uv --directory backend run pytest` passes
- [ ] `uv --directory backend run ruff check .` and `uv --directory backend run mypy` pass
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, and `pnpm -C frontend build` pass
- [ ] `gin specs lint --change gin-console-rm-wbs-export --against master` prints `ok`
- [ ] `gin specs trace --change gin-console-rm-wbs-export` reports no missing REQ
- [ ] Manual check: open Milestones list and a Milestone page, download `.xlsx`, `.csv`, and `.md` WBS files; open `/reports/status` for a milestone and click `Copy summary`.

## Notes
- The user may override `Model:` and `Effort:` before plan approval.
- Provider roles describe responsibility rather than filename patterns (`backend` and `frontend` are both configured in `.agent-workflow/generated/effective-config.yaml`).
- Deliverable merge-holds (e.g. "remain open until human-confirmed merge") apply exclusively to the Parent Bead (`gin-console-rm-wbs-export`). Individual track beads must close upon passing tests and code review to unblock downstream dependent tracks.
