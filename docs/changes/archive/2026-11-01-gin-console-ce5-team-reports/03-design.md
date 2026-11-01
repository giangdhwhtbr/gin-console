# Design: Team reports

Epic: gin-console-ce5

## Architecture
A new bounded context `reports` (ADR 0001), backend and frontend, plus a navigation change. No gin-workflow change, no new config key, nothing written to disk or to Beads.

Backend (`backend/src/gin_console/reports/`):
- `models.py`: `ReportBead` (id, project, title, issue_type, status, assignee, parent, labels, created_at, started_at, closed_at, updated_at, estimated_minutes, usage) where `usage` is the parsed `ai_usage` or a marker for missing or unreadable; the response model `Report` with `generated_at`, `usage`, `delivery`, `quality`, `coverage` and `errors`.
- `source.py`: `read_beads(run, cwd, project) -> list[ReportBead]` runs `bd list --all --limit 0 --json` through the existing `BdRunner` (`beads/source.py`), raising `BeadsError` as REQ-BEADS-005 does. `bd list` omits absent keys (`parent`, `labels`, `started_at`, `estimated_minutes`) and stores `ai_usage` as a JSON string, so every field is optional and `ai_usage` is parsed here.
- `service.py`: pure functions over `list[ReportBead]`, a `now` and the filters. `select()` applies the period or sprint; `own_share()` subtracts the children's usage from an epic per model, role and stage and clamps at 0 (REQ-REPORTS-002, mirroring the "top" rule of gin-workflow `usage.report`); `usage_section()`, `delivery_section()`, `quality_section()` and `coverage_section()` build each section. Percentiles use `statistics.quantiles(method="inclusive")`; weekdays are counted with `datetime.weekday()`. The descendants of an epic are found through `parent`, and a bead's epic is its nearest ancestor of type `epic`.
- `router.py`: `GET /reports` validates `project`, `days` and `sprint`, then reads a `KeyedCache[(project, days, sprint), Report]` (`beads/service.py`) with a 60-second TTL. For `all`, it reads each configured project in turn, collects `BeadsError` per project into `errors`, and raises 502 only when every project failed. `KeyedCache` keeps no error.
- `app.py`: include the router, sharing the injected `bd` runner and clock as the beads router does.

Frontend (`frontend/src/features/reports/`):
- `api.ts`: types and a parser for the `Report` answer.
- `ReportsPage.tsx`: filter bar bound to the URL query, KPI row, and the four sections; loaded with `React.lazy` from `App.tsx`, so Recharts lands in the Reports chunk only.
- `UsageSection.tsx`, `DeliverySection.tsx`, `QualitySection.tsx`, `CoverageSection.tsx`: Recharts `BarChart` (stacked, horizontal for members, vertical columns for weeks) and `ScatterChart`, shadcn tables, colors from the existing theme tokens so light and dark both work. The copy button reuses the milestones `CopyCommand`.
- `app/Layout.tsx`: replace the Sessions entry of `NAV` with Reports (`/reports`, a chart icon from `lucide-react`). `App.tsx` keeps the `/sessions` routes and adds `/reports`.
- New dependency: `recharts` (decided 2026-11-01 by the user over hand-made SVG), about 100 KB gzip in its own chunk.

## Data Flow
1. The page reads `project`, `days` and `sprint` from the URL and requests `GET /api/reports?...`.
2. The router answers from the 60-second cache or runs `bd list --all` per selected project.
3. `service.py` parses `ai_usage`, selects the beads, computes the own shares, then the four sections.
4. The page renders the sections; a change of filter updates the URL and requests again, dropping any late answer.

## Error Handling
- Unknown project: 404. Bad `days` or `sprint`: 422, no `bd` command.
- `bd` failing in a single project: 502 with `error`, not cached. With `all`, partial answers with `errors`; 502 only when every project failed.
- Unreadable or unknown-version `ai_usage`: the bead is left out of the usage and quality sections and listed in coverage.
- Missing or inverted timestamps: the bead is left out of that time only.
- Frontend: request failure shows the error with Retry; `errors` shows a warning above the sections; an empty section says "No data in this period".

## Testing
- pytest (`backend/tests/test_reports*.py`), with `FakeBd` answering `list --all` per project and failing on demand, and the injected clock:
  - REQ-REPORTS-001: default period, sprint selection, cache hit within 60 s, 404 and 422 without a `bd` call.
  - REQ-REPORTS-002: epic minus children, clamp at 0, null cost kept absent, and a cross-check that the tree total equals the sum of the top-level `ai_usage` (gin-workflow's rule).
  - REQ-REPORTS-003 to 006: member rows and `Unassigned`, open epic with closed children, percentiles, missing start, working days, rework rate, scatter points without epics, not collected and unreadable usage.
  - REQ-REPORTS-007: partial `all`, single failure not cached, members merged across projects.
- vitest (`frontend/src/features/reports/*.test.tsx`, `app/Layout.test.tsx`, `app/App.test.tsx`): REQ-UI-088 to 093 scenarios (URL filters, charts and tables rendered from a fixture, point click navigation, copy command, empty, error with Retry, partial warning, late answer) and REQ-UI-008, 055, 057 (navigation links, current link, `/sessions` still rendered). Recharts needs a sized container in jsdom; tests stub `ResponsiveContainer` with a fixed size.
- `uv run --directory backend pytest`, `ruff check`, `mypy`, and `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` must pass; the build shows a separate Reports chunk.
- A browser check on the Tailscale deployment is listed in `05-tests.md`.
