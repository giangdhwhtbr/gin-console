# Design: Remove AI usage from Reports

Epic: gin-console-5c4

## Architecture

- **Interaction log:** `backend/src/gin_console/reports/interactions.py` (new). It is the one module that knows `.beads/interactions.jsonl`.
  - `read_reopens(path: Path) -> dict[str, int]` counts, per `issue_id`, the `field_change` lines on `status` whose `old_value` is `closed` and whose `new_value` is not `closed`.
  - Lines that are not JSON, or not of that shape, are skipped.
  - A missing file gives `{}`.
  - `InteractionStore` keeps the last result per path with the file's size and `mtime_ns`, and parses again only when they change. This follows `beads/snapshot.py` `SnapshotStore`.
  - It is created in `create_app` and injected into the reports router, like the snapshot store.
- **Bugs found later:** counted from the snapshot by `beads/definitions.py` `bugs_found(snapshot) -> dict[str, int]`: per target, the beads of type `bug` that have a `discovered-from` dependency on it. `beads/source.py` (REQ-UI-086) already uses the same relation.
- **Reports source:** `reports/source.py` `read_beads(snapshot, project, reopens)` sets `ReportBead.reopens` and `ReportBead.bugs`. The `usage` and `usage_problem` fields and `parse_usage` are removed.
- **Report building:**
  - `reports/service.py` keeps `_delivery` and the tree helpers.
  - It removes `own_share`, `_usage`, `_coverage`, the cost and token helpers and `Measured`.
  - A new `_quality` builds the member and epic rows of REQ-REPORTS-005, with `rework = reopens + bugs` per bead.
- **Models:** `reports/models.py` drops `Tokens`, `StageUsage`, `Findings`, `Quality` (the `ai_usage` one), `Budget`, `AiUsage`, `MemberUsage`, `EpicUsage`, `BeadUsage`, `StageRow`, `ModelRow`, `UsageSection`, `Point`, `CoverageBead`, `SourceIssue` and `Coverage`.
  - `Totals` becomes `{closed, rework_rate}`.
  - `QualityRow` becomes `{member or epic fields, closed, reopens, bugs, rework_rate}`.
  - `QualitySection` becomes `{members, epics}`.
  - `Report` becomes `{generated_at, project, days, sprint, totals, delivery, quality, errors}`.
- **Team:** `reports/team.py` reads `bead.reopens + bead.bugs` instead of `tree.own(bead).quality`. `TeamBead.rework` becomes `int`.
- **Frontend:**
  - `features/reports/api.ts` and `teamApi.ts` drop the usage, coverage and budget types and validators. `isReport` checks `totals.closed`, `totals.rework_rate`, `delivery`, `quality` and `errors`.
  - `filters.ts`: `ReportTab` is `team | delivery | velocity | quality`.
  - `ReportsPage.tsx` drops the AI usage and Data coverage tabs and renders `ReportErrors` (new) above the tab list.
  - `headlines.ts` drops the usage and coverage headlines and `gapCount`.
  - `QualitySection.tsx` is rewritten to the figures and two tables.
  - `UsageSection.tsx` and `CoverageSection.tsx` are deleted, and so are `format.ts` `formatCost`/`formatTokens` and `colors.ts` `stageColor`/`STAGES` if nothing else uses them.
  - Team: `TeamFigures`, `MemberTable` and `BeadTable` keep Rework. `rework` is a number, and the Rework tooltip names the Beads sources.
- **Example data:** `scripts/make_example_project.py` drops its `usage()` generator and `collected=`. It writes `examples/example-project/.beads/interactions.jsonl` with a few reopens, and a few bug beads with `discovered-from` dependencies.

## Data Flow

- `docs/specs/reports/diagrams/rework-activity.md`: from the request to the Quality rows and the Team figures, with the log cache and the missing-log path.
- Use case: `docs/specs/reports/use-cases/review-rework.md`.
- `GET /api/reports` → `SnapshotStore.get(project)` + `InteractionStore.reopens(project)` → `read_beads` (with reopens and bugs) → `build_report` → JSON. The existing 60-second answer cache of REQ-REPORTS-001 stays.
- `GET /api/reports/team` takes the same path into `team.py`.

## Error Handling

- **Missing or unreadable log:** a missing `interactions.jsonl` (the example project before regeneration, or a project not exported yet) counts no reopens. An unreadable line is skipped, and a file that cannot be read is treated as missing. The report never fails on the log.
- **Failed projects:** they stay under `errors` (REQ-REPORTS-007) and are shown above the tabs (REQ-UI-093).
- **Old `ai_usage` metadata** is ignored.
- **Old links:** a stale browser tab holding an old `tab=usage` or `tab=coverage` URL opens Team.

## Testing

- **Backend (pytest), each test naming its REQ:**
  - `test_reports_interactions.py`: the REQ-REPORTS-019 scenarios. They cover reopen counting with all status pairs, a missing file, a bad line, a line without `extra`, and the cache, which reads again only after the size or mtime changes (with `os.utime` and an append).
  - `bugs_found` units.
  - `test_reports_service.py`: the REQ-REPORTS-005 rows, epic ordering and the old `ai_usage` being ignored.
  - `test_reports_team.py`: REQ-REPORTS-010 `rework_rate`.
  - `test_reports_api.py`: REQ-REPORTS-001 "no AI usage in the answer" and REQ-REPORTS-007 "all members merged".
  - Tests of removed behaviour (usage, coverage, own share, budget) are deleted.
- **Frontend (vitest):**
  - The tab list and the retired-tab redirect.
  - `ReportErrors` above the tabs on every tab.
  - The Quality view's figures, tables and empty state.
  - Team Rework with numbers.
  - The validators, and headlines without usage or coverage.
- **QA:**
  - Delete the cases of the removed REQs and their e2e specs and api tests.
  - Re-pin or reword the cases of the modified REQs.
  - Add cases for REQ-REPORTS-019 and the new scenarios.
  - Update the `qa/e2e/support/reports.ts` mocks.
  - Run the full e2e suite.
- **TC-1:** Playwright on the Tailscale build, at 1440px and 390px:
  - no AI usage or Data coverage tab or sidebar section;
  - the Quality figures and tables for `example` (generated reopens and bugs) and qwikfone (real reopens);
  - a failed-project warning above the tabs on two tabs (a project made to fail with a temporary config);
  - `tab=coverage` opens Team.

## Risks

- **Stale frontend:** the report JSON shape changes, so a stale `frontend/dist` cannot read it. Deploy builds the frontend and restarts the service together.
- **Fewer reopens:** interaction logs started in October 2026, so the reopen counts of earlier beads are lower than the old `ai_usage` values. The tooltip names the source.

## Open Technical Questions
