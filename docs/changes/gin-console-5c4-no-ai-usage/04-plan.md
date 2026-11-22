# Plan: Remove AI usage from Reports

Epic: gin-console-5c4
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder; diagram `docs/specs/reports/diagrams/rework-activity.md`; use case `docs/specs/reports/use-cases/review-rework.md`.

## Objective
Reports reads nothing from `metadata.ai_usage`:
- **Removed:** the AI usage and Data coverage tabs, every token, cost and budget figure, and the `gin usage collect` hint.
- **Rework from Beads:**
  - Reopens are counted from `.beads/interactions.jsonl` (cached until the file changes).
  - Bugs found later come from `discovered-from` dependencies.
  - Rework is reopens + bugs.
  - It feeds the Quality tab (rate, reopens, bugs, member and epic tables) and the Team tab's Rework figure and columns.
- **Failed projects** show as a warning above the tabs.

Done when:
- Every scenario of the 1 added and 11 modified REQs of `02-spec-delta.md` has a test that names its REQ.
- The 5 removed REQs have no code, test or QA case left.
- `grep -rn "ai_usage\|gin usage" backend/src frontend/src` finds nothing.
- `gin-qa cases check --change gin-console-5c4` prints `ok`.
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
- **Problem statement:** gin-workflow-wkwb retired AI usage tracking, so nothing writes `metadata.ai_usage` any more. Reports still builds:
  - the AI usage, Quality and Data coverage sections from it (`reports/source.py:32-47`, `reports/service.py:63-458`);
  - the Team Rework figures from it (`reports/team.py:111-216`).
  - Data coverage also tells the user to run the removed `gin usage collect`.
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
  - `gin specs lint --change gin-console-5c4 --against master` prints `ok`, and `gin specs trace --change gin-console-5c4` lists no missing REQ.
- **Global constraints** (from the spec and the user's decisions of 2026-11-22):
  - **Reopen:** a line of `.beads/interactions.jsonl` with `kind` `field_change`, `extra.field` `status`, `extra.old_value` `closed`, and an `extra.new_value` other than `closed`, counted per `issue_id`.
    - A missing file, a non-JSON line or a line of another shape counts nothing and never fails a report.
    - The log is read again only when its size or `mtime_ns` changed.
  - **Bugs found later:** beads of type `bug`, open or closed, with a `discovered-from` dependency on the bead.
  - **Rework:** `rework = reopens + bugs`.
    - `rework_rate` is the share of closed beads with `rework` above 0, `null` when none is closed.
    - Team `rework` is an `int`, never `null`.
  - **Report JSON:** `{generated_at, project, days, sprint, totals: {closed, rework_rate}, delivery, quality: {members, epics}, errors}`. No `usage` or `coverage`.
  - **Tabs:** Team, Delivery, Velocity and Quality. `tab=usage` or `tab=coverage` opens Team. The tab keeps the name Quality.
  - **No interval cache.** The existing 60-second answer cache (`KeyedCache`) stays.
  - **Read-only:** old `ai_usage` metadata is ignored and never removed.
  - **Obsolete QA:** the cases pinned to REQ-REPORTS-002, 003 and 006 and REQ-UI-089 and 092, and their tests, are deleted (approved with the spec).
- **Non-goals:**
  - Review cycles, rejections, findings and waivers (gin-console-rm-review-audit).
  - Renaming Quality (gin-console-rm-reports-status).
  - Caching `GET /api/milestones`.
  - Any change in gin-workflow.

## Approach Options
### Option 1: Backend reader first, then remove usage, then the UI
- **Summary:**
  1. Add the interaction reader and `bugs_found` beside the current code.
  2. Rebuild the report and team models without `ai_usage`.
  3. Change the frontend to the new JSON.
  4. Fix the QA cases and tests.
  5. Deploy and check.
- **Pros:**
  - Each step keeps the backend suite green.
  - The reader is reviewed on its own.
  - The UI changes once, against the final JSON.
- **Cons:** between tracks 2 and 3, the built UI cannot read the new report. Nobody deploys between them, so this is acceptable.

### Option 2: One track per tab
- **Summary:** remove AI usage end to end, then Data coverage, then rebuild Quality.
- **Pros:** each tab is gone in one place.
- **Cons:**
  - The `Report` model, `isReport` and `ReportsPage` would change three times.
  - The tracks would share most files and could not be reviewed apart.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the JSON contract is the boundary. The backend tracks settle it, and the frontend follows once. This matches the "backend first, the models and API JSON are the contract" rule of the roadmap.

## Scope
- **In scope:**
  - The REQs of `02-spec-delta.md`.
  - The example data the checks need.
  - The QA cases, api tests and e2e specs.
  - TC-1.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: One lane; each track changes the JSON contract or the files the next one builds on (reports models, service, ReportsPage), so they run in order on feat/reports-without-ai-usage.
```

## Tasks
### Track 1: Interaction log and bugs found
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-019
- **Files**:
  - Create `backend/src/gin_console/reports/interactions.py`
  - Modify `backend/src/gin_console/beads/definitions.py` (`bugs_found`)
  - Modify `backend/src/gin_console/reports/models.py:62-84` (`ReportBead.reopens`, `ReportBead.bugs`)
  - Modify `backend/src/gin_console/reports/source.py:51-75` (`read_beads` takes reopens and sets both counts)
  - Modify `backend/src/gin_console/reports/router.py:30-115` (takes the store; both endpoints pass the project's reopens)
  - Modify `backend/src/gin_console/app.py:44, 89` (creates `InteractionStore` and passes it)
  - Test `backend/tests/test_reports_interactions.py`, `backend/tests/test_beads_definitions.py`, `backend/tests/test_reports_source.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a small new source with exact parsing and caching rules; the wiring follows `SnapshotStore`.
- **Acceptance criteria**:
  - Each REQ-REPORTS-019 scenario has a test named for it: reopens counted, bugs found later, a missing or broken log, and a read again only on change.
  - `read_beads` sets `reopens` and `bugs` on every `ReportBead`.
  - The backend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
- `gin_console.reports.interactions`:
  - `LOG = Path(".beads/interactions.jsonl")`.
  - `read_reopens(path: Path) -> dict[str, int]`:
    - It reads line by line, using `json.loads` inside `try`.
    - A line counts only when it is a dict with `kind == "field_change"` and a dict `extra` with `field == "status"`, `old_value == "closed"`, `new_value` a string other than `"closed"`, and a string `issue_id`.
    - It returns `{}` on `FileNotFoundError` or `OSError`.
  - `class InteractionStore` with `__init__(self, read: Callable[[Path], dict[str, int]] = read_reopens)`.
    - `reopens(self, project_dir: Path) -> dict[str, int]`: the key is `(st_size, st_mtime_ns)` of `project_dir / LOG`, or `None` when it is missing, in which case it returns `{}` and caches nothing.
    - It reads again only when the key differs from the kept one.
    - A `threading.Lock` guards the dict, as in `SnapshotStore`.
- `gin_console.beads.definitions.bugs_found(snapshot: Snapshot) -> dict[str, int]`: for each target in `snapshot.dependents`, it counts the dependents with kind `discovered-from` whose row has `issue_type == "bug"`.
- `ReportBead.reopens: int = 0` and `ReportBead.bugs: int = 0`.
- `read_beads(snapshot: Snapshot, project: str, reopens: Mapping[str, int]) -> list[ReportBead]` sets `reopens.get(ident, 0)` and `bugs_found(snapshot).get(ident, 0)`. Call `bugs_found` once per call.
- `build_router(settings, snapshots, interactions: InteractionStore, clock, on_refresh)`.

Steps:
1. Write `test_reports_interactions.py` (`# REQ-REPORTS-019`):
   - one test per scenario, writing `.beads/interactions.jsonl` under `tmp_path`;
   - the cache test counts calls with a fake `read` passed to `InteractionStore`, appends a line and bumps the mtime with `os.utime(path, ns=(t, t + 1))`.
   - Add `bugs_found` tests to `test_beads_definitions.py`: a closed bug, an open bug, a task with `discovered-from`, and no dependency.
   - Run `uv run --directory backend pytest tests/test_reports_interactions.py tests/test_beads_definitions.py`. It fails: the modules are missing.
2. Write `interactions.py` and `bugs_found`. Run them again: they pass.
3. Change `ReportBead`, `read_beads`, `build_router` and `create_app`. Update the `read_beads` callers in tests to pass `{}`. Add a `test_reports_source.py` test that a bead gets `reopens` from the mapping and `bugs` from a `discovered-from` bug.
4. Run `uv run --directory backend pytest`, `ruff check .` and `mypy`: all pass.
5. Commit: `git commit -m "feat(reports): reopens from the interaction log and bugs found later (gin-console-5c4)"`

### Track 2: Reports without AI usage
- **Dependencies**: Track 1
- **Requirements**: REQ-REPORTS-001, REQ-REPORTS-005, REQ-REPORTS-007, REQ-REPORTS-009, REQ-REPORTS-010, REQ-REPORTS-016, REQ-REPORTS-019
- **Files**:
  - Modify `backend/src/gin_console/reports/models.py` (remove `:9-60`, `:82-84` usage fields, `:97-151`, `:191-243` usage, point and coverage models; new `Totals`, `QualityRow`, `EpicQuality`, `QualitySection`, `Report`; `TeamBead.rework: int`)
  - Modify `backend/src/gin_console/reports/source.py` (remove `parse_usage` `:32-47` and the `usage`/`usage_problem` fields)
  - Modify `backend/src/gin_console/reports/service.py` (remove `Measured`, `tokens_of`, `_cost`, `_left`, `_left_cost`, `_minus`, `_minus_quality`, `own_share`, `_Tree.own`, `_rate`, `_cache_ratio`, `_member_usage`, `_by_epic`, `_usage`, `_quality_row`, `_coverage`; new `_rework`, `_totals`, `_quality`; `build_report` without `measured`)
  - Modify `backend/src/gin_console/reports/team.py:111-216` (rework from `bead.reopens + bead.bugs`)
  - Test `backend/tests/test_reports_service.py`, `test_reports_source.py`, `test_reports_api.py`, `test_reports_team.py`, `test_reports_team_api.py`, `backend/tests/report_beads.py` (drop the `ai=` and `usage()` helpers)
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** mostly deletion inside one context, with a small new aggregation that the REQ text defines exactly.
- **Acceptance criteria**:
  - Each scenario of the modified REQ-REPORTS-001, 005, 007, 009, 010 and 016 (backend part: `rework` 0) has a test named for it.
  - Tests of the removed REQ-REPORTS-002, 003 and 006 are deleted, including the api tests named `test_tc_reports_046` to `_049`.
  - `grep -rn "ai_usage\|gin usage\|tokens\|cost\|budget" backend/src/gin_console/reports` finds nothing.
  - The backend checks pass.
- **Estimated complexity**: medium

Interfaces produced (JSON contract for Track 3):
- `Totals {closed: int, rework_rate: float | None}`.
- `QualityRow {member: str, closed: int, reopens: int, bugs: int, rework_rate: float | None}`.
- `EpicQuality {project: str, id: str, title: str, closed: int, reopens: int, bugs: int, rework_rate: float | None}`.
- `QualitySection {members: list[QualityRow], epics: list[EpicQuality]}`:
  - members are sorted by `closed` (largest first), then by name, with `Unassigned` last;
  - epics are at most 10, sorted by rework (reopens + bugs) descending, then `closed` descending, then id.
- `Report {generated_at, project, days, sprint, totals, delivery, quality, errors}`.
- `TeamBead.rework: int`. `TeamFigures.rework_rate` is the share of closed beads with `rework > 0`, or `None` when none is closed. `reopens` and `bugs` are sums.
- `_rework(bead: ReportBead) -> int` returns `bead.reopens + bead.bugs`.
- The nearest epic of a bead comes from the existing `_Tree` (the bead itself when it is an epic).

Steps:
1. Rewrite the tests first:
   - REQ-REPORTS-005 "rework rate", "epic rows" and "old ai_usage ignored";
   - REQ-REPORTS-001 "no AI usage in the answer" (an api test on the JSON keys);
   - REQ-REPORTS-007 "all members merged";
   - REQ-REPORTS-010 "rework rate";
   - REQ-REPORTS-009: `rework` 0 when there is no reopen or bug.
   - Delete the usage, coverage, own-share and budget tests.
   - Run `uv run --directory backend pytest tests/test_reports_service.py tests/test_reports_team.py tests/test_reports_api.py`: they fail.
2. Remove the code and models listed in Files, and write `_rework`, `_totals` and `_quality`. Change `team.py` to `_rework`.
3. Run `uv run --directory backend pytest`, `ruff check .` and `mypy`: all pass. Run the grep of the acceptance criteria: nothing found.
4. Commit: `git commit -m "feat(reports): reports without AI usage; rework from Beads (gin-console-5c4)"`

### Track 3: Reports page without AI usage
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-088, REQ-UI-091, REQ-UI-093, REQ-UI-095, REQ-UI-129, REQ-REPORTS-016, REQ-REPORTS-005
- **Files**:
  - Modify `frontend/src/features/reports/api.ts:1-142` (types and `isReport` for the new contract)
  - Modify `frontend/src/features/reports/teamApi.ts:23-40` (`rework: number`)
  - Modify `frontend/src/features/reports/filters.ts:3-4` (`ReportTab` and `TABS`)
  - Modify `frontend/src/features/reports/ReportsPage.tsx:18-40, 183, 349-351` (tabs, no usage or coverage, `ReportErrors` above the tab list)
  - Modify `frontend/src/features/reports/headlines.ts:13-86` (no `gapCount`, usage or coverage)
  - Modify `frontend/src/features/reports/QualitySection.tsx` (figures and two tables)
  - Create `frontend/src/features/reports/ReportErrors.tsx`
  - Delete `frontend/src/features/reports/UsageSection.tsx`, `frontend/src/features/reports/CoverageSection.tsx`
  - Modify `frontend/src/features/reports/format.ts` (remove `formatCost`/`formatTokens` when unused) and `frontend/src/features/reports/colors.ts` (remove `stageColor`/`STAGES` when unused)
  - Modify `frontend/src/features/reports/team/TeamFigures.tsx:18, 171`, `frontend/src/features/reports/team/BeadTable.tsx:30-32, 104-105`, `frontend/src/features/reports/team/MemberTable.tsx:8, 78`, `frontend/src/features/reports/team/beadSort.ts:16-66`
  - Modify `frontend/src/features/reports/reportFixtures.ts`, `frontend/src/features/reports/team/teamFixtures.ts`
  - Test `ReportsPage.test.tsx`, `headlines.test.ts`, `api.test.ts`, `sections.test.tsx`, `filters.test.ts`, `QualitySection.test.tsx`, `ReportErrors.test.tsx`, `team/TeamFigures.test.tsx`, `team/BeadTable.test.tsx`, `team/MemberTable.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** deletion plus one rewritten section and one new banner; the contract is fixed by Track 2.
- **Acceptance criteria**:
  - Each scenario of the modified REQ-UI-088, 091, 093, 095 and 129, and the REQ-REPORTS-016 UI scenario "closed row" (Rework "0"), has a test named for it.
  - `grep -rn "usage\|coverage\|tokens\|formatCost\|gapCount" frontend/src/features/reports` finds only unrelated words (none of the removed features).
  - The frontend checks and `build` pass.
- **Estimated complexity**: medium

Interfaces produced:
- `type ReportTab = "team" | "delivery" | "velocity" | "quality"`. `parseTab` maps anything else, including `usage` and `coverage`, to `team`.
- `ReportErrors({ errors }: { errors: readonly ProjectError[] })`:
  - It renders nothing when `errors` is empty.
  - Otherwise it renders an `Alert` from `components/ui/alert`, warning style, with "Some projects could not be read" and a list `<project>: <error>`.
  - `ReportsPage` places it above the tab list, outside the panels, so it shows on every tab.
- `QualitySection({ report })`:
  - Its figures are Rework rate (`formatPercent` or "—"), Reopens and Bugs found later, each in `Hint` with the `DEFINITIONS` texts `rework`, `reopens` and `bugsFound`, added to `lib/definitions.ts`.
  - It then renders a member table and an epic table; the epic title links to `/beads/<project>/<id>`.
  - Each empty table reads "No data in this period".
- The Team Rework tooltip reads "Rework: closed beads that were reopened (Beads interaction log) or had a bug found later (discovered-from)."

Steps:
1. Rewrite the tests first:
   - the tab list and the retired-tab link (REQ-UI-095);
   - the sidebar sections (REQ-UI-129);
   - the period choice on Delivery and Quality only (REQ-UI-088);
   - the banner on two tabs (REQ-UI-093);
   - the Quality figures, epic link and empty state (REQ-UI-091);
   - the Closed row Rework "0" (REQ-REPORTS-016);
   - `isReport` accepting the new shape and refusing a shape without `quality`.
   - Run `pnpm -C frontend test --run src/features/reports`: they fail.
2. Change the files listed in Files and delete the two sections.
3. Run `pnpm -C frontend test --run`, `typecheck`, `lint` and `build`: all pass.
4. Commit: `git commit -m "feat(reports): Reports page without AI usage (gin-console-5c4)"`

### Track 4: QA cases and their tests
- **Dependencies**: Track 3
- **Requirements**: REQ-REPORTS-001, REQ-REPORTS-005, REQ-REPORTS-007, REQ-REPORTS-009, REQ-REPORTS-010, REQ-REPORTS-016, REQ-REPORTS-019, REQ-UI-088, REQ-UI-091, REQ-UI-093, REQ-UI-095, REQ-UI-129
- **Files**:
  - Delete the cases pinned to the removed REQs (TC-REPORTS-046, 047, 048, 049; TC-UI-078, 079, 080, and any other case `gin-qa cases plan --change gin-console-5c4` reports `obsolete`), with their e2e specs and api tests
  - Modify, re-pin or add cases in `qa/cases/reports/` and `qa/cases/ui/` as `gin-qa cases plan --change gin-console-5c4` lists them; add `api` cases for REQ-REPORTS-019 with tests in `backend/tests/test_rework_api.py`
  - Modify `qa/e2e/support/reports.ts` (mocks without usage, coverage or budget) and the e2e specs that used them (`qa/e2e/reports/tc-reports-051.spec.ts`, `-061`, `qa/e2e/ui/tc-ui-020`, `-025`, `-027`, `-028`, `-029`, `-152`, `-246`, `-247`, `-251`, `qa/e2e/ui/readability.spec.ts`, `qa/e2e/readability-live.js`)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases and specs from written scenarios in existing patterns.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-5c4` prints `ok`.
  - `gin-qa cases plan --change gin-console-5c4` lists nothing missing, stale or obsolete.
  - `gin-qa e2e plan` lists none of the change's new or reworded cases as missing or stale.
  - `npx playwright test qa/e2e/ui qa/e2e/beads qa/e2e/milestone-ui qa/e2e/reports --trace off --workers 4` passes on the built UI.
  - The new api tests pass.
- **Estimated complexity**: medium

Steps:
1. Run `gin-qa cases plan --change gin-console-5c4`. Delete the obsolete cases (approved with the spec) with their specs and tests. Then write, update and re-pin cases per `qa/guidelines.md`.
2. Write the api tests (`# TC: <TC-ID>@<hash8>` above each) and run `gin-qa tests run --type api <TC-IDs>`.
3. Update `qa/e2e/support/reports.ts` and the specs that used the removed fields.
   - Build new or stale specs one case at a time against the served built UI, following `/home/gin/.claude/skills/gin-qa/skills/e2e/references/explore-case.md`.
   - Run the full suite.
   - Then make one official run with `gin-qa e2e run <TC-IDs>`.
4. Commit: `git commit -m "test(qa): cases and tests for Reports without AI usage (gin-console-5c4)"`

### Track 5: Example data and the check on the deployed console
- **Dependencies**: Track 4
- **Requirements**: REQ-REPORTS-001, REQ-REPORTS-005, REQ-REPORTS-019, REQ-UI-088, REQ-UI-091, REQ-UI-093, REQ-UI-095, REQ-UI-129
- **Files**:
  - Modify `scripts/make_example_project.py:6, 118-193, 482` (no `ai_usage`; writes `examples/example-project/.beads/interactions.jsonl` with a few reopens and a few bug beads with `discovered-from` dependencies)
  - Modify `docs/changes/gin-console-5c4-no-ai-usage/05-tests.md` (TC-1 result)
  - Create `qa/evidence/<date>-no-ai-usage-tc1/` (gitignored)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** generator edits, then the written check.
- **Acceptance criteria**:
  - `python3 scripts/make_example_project.py` succeeds and the example project's Quality tab shows reopens and bugs above 0.
  - TC-1 is recorded as `pass, claude (Playwright on the Tailscale build of <commit>, N/N checks, screenshots in qa/evidence/...)`, and no page error occurred.
- **Estimated complexity**: low

Steps:
1. Change the generator:
   - remove `usage()` and `collected=`;
   - write about five reopen lines (`field_change`, status `closed`→`open`) for closed example tasks into `interactions.jsonl`;
   - add two bug beads with `discovered-from` dependencies on closed tasks;
   - update the header docstring.
   - Run it and confirm `example` loads.
2. Deploy, each as its own command:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health`
   - Expected: `active` and `200`.
3. Write a Playwright script outside the repo and run it with `NODE_PATH=/home/gin/gin-fam/gin-console/node_modules node <script> qa/evidence/<date>-no-ai-usage-tc1`:
   - Set localStorage `gin-console.email` and run at 1440×900 and 390×844 with deviceScaleFactor 2.
   - Make one check per TC-1 expectation and fail on any `pageerror`.
   - For the failed-project warning, add a temporary project with a missing directory to a copy of the config, served by a second instance on a spare port with `GIN_CONSOLE_CONFIG`, and stop it after the check.
4. Commit the generator: `git commit -m "test(specs): example data for Reports without AI usage (gin-console-5c4)"`. Look at the key screenshots, record TC-1 in `05-tests.md` and commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-5c4)"`

## Integration
- **Branch**: `feat/reports-without-ai-usage`
- **Merge strategy**: sequential

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- [ ] `gin specs lint --change gin-console-5c4 --against master` prints `ok`, and `gin specs trace --change gin-console-5c4` lists no missing REQ.
- [ ] `gin-qa cases check --change gin-console-5c4` prints `ok`.
- [ ] TC-1 passed on the deployed console.

## Notes
- The user may override `Model:` and `Effort:` before approval.
- The parent bead stays open until a human confirms the merge. Each track bead closes when its tests and review pass.
- Line numbers come from `master` at 8a13790; anchor edits on content.
- At ship, run `bd -C /home/gin/gin-fam/gin-console ship reports-without-ai-usage` so that gin-harness-1u3 sees the capability. Remove the `export:` label from the track beads first, or create them with `--no-inherit-labels` (bd memory `track-labels-inherit-export`).
- Between Track 2 and Track 3, the built UI cannot read the report; do not deploy before Track 5.
