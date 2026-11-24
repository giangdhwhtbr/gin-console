# Design: Wbs export

Epic: gin-console-rm-wbs-export

## Architecture

- **Backend (`backend/src/gin_console/milestones/`):**
  - `wbs.py`: pure builder `build_wbs(...) -> WbsDocument` taking the project name, optional milestone id, Beads snapshot (`BeadSummary` list + raw deps), `MilestoneList` (for project forecast, `days_per_point`, and the planned dates of epics without a milestone from `forecast.epics`), and per-milestone `MilestoneDetail` map (for epic planned dates, `estimate_days`, and `assumed_days`). Project scope runs `gin milestone show` once per listed milestone through the router's `details` cache. Reuses `beads/definitions.py` (`is_done`, `is_blocked`, `child_counts`) and `reports/service.py` (`member_of` / `person_key`) — never reads `owner`.
  - `wbs_formats.py`: three pure serializers — `to_xlsx(doc) -> bytes` (`openpyxl`), `to_csv(doc) -> str` (Jira External System Import layout, UTF-8), and `to_markdown(doc) -> str` (GFM table). Formula-injection guard shared by `to_xlsx` and `to_csv`; pipe/newline escaper in `to_markdown`.
  - `router.py`: new route `GET /api/milestones/{project}/wbs` registered **before** `GET /api/milestones/{project}/{milestone_id}` so the static segment `wbs` never collides with a milestone id. Calls the injected `BeadsSource` and `MilestoneSource` (preserving testability with fakes).
  - `backend/pyproject.toml`: add `openpyxl>=3.1` to runtime dependencies.
- **Frontend (`frontend/src/features/milestones/`):**
  - `ExportWbsMenu.tsx`: small popover/dropdown button (`Export WBS`) rendering three `<a download>` links for `xlsx`, `csv`, and `md`.
  - Mounted in `MilestonePage.tsx` (header title row next to `<Legend verdicts />`, with `milestone={id}`) and `MilestonesPage.tsx` (header row, project-wide).
- **Frontend (`frontend/src/features/reports/status/`):**
  - `summaryMarkdown.ts`: pure function formatting the already-joined Status view model (verdict, KPIs, risks, epic rows) into Markdown per `REQ-REPORTS-037`. The epic row order and texts, risk items, and KPI change texts come from pure helpers moved out of `EpicTable.tsx`, `RisksPanel.tsx`, and `StatusFigures.tsx`, so the summary and the screen share one implementation.
  - `CopySummaryButton.tsx`: button in `StatusSection.tsx` header using `navigator.clipboard.writeText` with 2 s `"Copied"` confirmation and inline `"Couldn't copy"` error state.

## Data Flow

- WBS export flow: [WBS export activity](docs/specs/milestone-ui/diagrams/wbs-export-activity.md) (use case: [Export a WBS](docs/specs/milestone-ui/use-cases/export-wbs.md)).
- Reports Status & Copy summary flow: [Status section activity](docs/specs/reports/diagrams/status-section-activity.md) (use case: [Review the status of a milestone](docs/specs/reports/use-cases/review-milestone-status.md)).

## Error Handling

- **404 Not Found:** unknown `project` in config, or `milestone` id not found as a milestone bead in the project's snapshot.
- **422 Unprocessable Entity:** missing or unsupported `format`, or `milestone` containing characters outside `[A-Za-z0-9._-]`.
- **502 Bad Gateway:** the project's Beads export cannot be read (`BeadsError`); the body carries `error`, as in the Beads router.
- **Degraded `gin` CLI:** if `MilestoneSource.list` or `MilestoneSource.show` raises a `gin` error, the endpoint catches it, logs/records a human-readable warning, builds the WBS from the Beads snapshot alone (leaving `gin`-derived planned dates, forecast end, and epic estimates blank), and surfaces the warning via `X-WBS-Warning` response header, Excel `About` sheet, and Markdown header callout (CSV remains clean for Jira).
- **Empty scopes & cycles:** empty project or milestone with no children produces valid headers/files; `parent-child` cycles are broken with a visited set so each bead is emitted at most once.
- **Clipboard failure:** `CopySummaryButton` catches rejected `navigator.clipboard.writeText` promises (or missing `navigator.clipboard`) and displays an inline `"Couldn't copy"` message.

## Testing

- **Backend (`pytest`):**
  - `tests/test_wbs.py`: tree construction, project/milestone root ordering, deterministic numbering, depth > 3, cycle guard, exclusion of `prep` and merge gates, closed bead inclusion, `is_done`/`is_blocked`/`child_counts` rollups, assignee vs `owner`, cross-scope `Depends on`, degraded `gin` fallback, empty scope.
  - `tests/test_wbs_formats.py`: `to_xlsx` parsed back with `openpyxl` (sheets, freeze panes, autofilter, outline levels, date/percent cell types, formula-injection guard, `About` sheet); `to_csv` Jira columns, `Fix Version`, parent-before-child ordering, `Original Estimate` seconds, `blocked` label, repeated `Link "Blocks"` columns, formula guard; `to_markdown` heading, warning callout, pipe/newline escaping.
  - `tests/test_milestones_wbs_api.py`: `GET /api/milestones/{project}/wbs` for all 3 formats, `Content-Disposition`/`Content-Type`/`X-WBS-Warning` headers, 404/422/502 cases, using existing fakes (no real `gin`/`bd`).
- **Frontend (`vitest`):**
  - `ExportWbsMenu.test.tsx`, `MilestonePage.test.tsx`, `MilestonesPage.test.tsx`: menu opens and renders the 3 download links with expected URLs and `download` attribute.
  - `summaryMarkdown.test.ts`: full milestone summary, no-risks case, degraded milestone detail (`—`), pipe/newline escaping.
  - `CopySummaryButton.test.tsx` / `StatusSection.test.tsx`: hidden on period scope and loading/error, clipboard success (`Copied` for 2 s), clipboard rejection (`Couldn't copy`).

## Open Technical Questions
