# Design: Reports tabs

Epic: gin-console-xza

## Architecture
The page still makes one `GET /api/reports` request per project, period and sprint. The tabs only change which part of that answer is drawn. No dependency is added. The weekly column chart and the scatter stay on recharts (`ChartBox.tsx`); bars that need a tooltip per row are drawn in HTML; the tab list reuses `@/components/Tabs`.

### Backend (`backend/src/gin_console/reports/`)
- `models.py`:
  - `Totals` gains `cache_ratio: float | None`.
  - `DeliverySection` gains `overall: TimeRow`, with key `all`.
- `service.py`:
  - `_totals` computes the cache ratio with the same formula as `_member_usage`, over `m.own.models` of every measured bead. The ratio is not taken from the `models` rows, because those rows are built from `roles` and can miss tokens.
  - `_delivery` sets `overall=_times(closed, lambda _: "all")[0]` when `closed` is not empty. Otherwise it sets `TimeRow(key="all", cycle=None, lead=None)`.

### Frontend (`frontend/src/features/reports/`)
- `filters.ts`:
  - `ReportFilters` gains `tab: ReportTab`. `ReportTab` is one of `"delivery" | "usage" | "quality" | "coverage"`, and `TABS` lists them in that order.
  - `parseReportSearch` falls back to `delivery` when `tab` is missing or unknown.
  - `reportSearch` always writes `tab`.
  - `fetchReport` takes `Pick<ReportFilters, "project" | "days" | "sprint">`.
  - The fetch key in `ReportsPage` stays `[project, days, sprint, attempt]`, so a tab change makes no new request.
- `@/components/Tabs`:
  - `TabItem` gains an optional `hint?: ReactNode`, drawn as a second, smaller line under the label.
  - The tab list gets `overflow-x-auto`, and the tabs get `shrink-0 whitespace-nowrap`, so the list scrolls sideways when the window is narrow.
  - `MilestonePage` and `DetailTabs` pass no `hint`. Their tabs look the same as before.
- `ReportsPage.tsx`, from top to bottom:
  - The header: the title and "Generated" on the left, the Project select on the right.
  - The `errors` warning.
  - The `Tabs`, whose hints come from `headlines(report)`.
  - One `role="tabpanel"` (`id="panel-<tab>"`, `aria-labelledby="tab-<tab>"`). It holds:
    1. the Period and Sprint controls and their explanatory line;
    2. the loading, error and Retry states of REQ-UI-093;
    3. `<Figures items={figures(tab, report)} />`;
    4. the selected tab's section.
- `headlines.ts` (new) holds pure functions:
  - `headlines(report)`: the four tab headlines.
  - `gapCount(report)`: the gap count of REQ-UI-095.
  - `figures(tab, report)`: the figure row of each tab, built from `totals`, `delivery.overall`, `delivery.wip` and `quality.members`.
- `Figures.tsx` (new) replaces `KpiRow.tsx`: a `<dl>` row of label and value pairs, without card borders, as in the mockup.
- Every section drops its own `h2` title, because the tab names it. Its sub-headings become `h2`.
- `BarRows.tsx` (new): horizontal bars in HTML.
  - One focusable `li` per row, with `aria-label` set to the row's detail.
  - The bars are drawn as `div` widths, stacked by segment.
  - The detail shows as a tooltip on hover and on focus.
  - Used for tokens per member by stage (AI usage) and in progress per member (Delivery). HTML bars give each row its own focus and tooltip, which recharts does not give per bar.
- `RangeChart.tsx` (new): one focusable `li` per key, with a dot at the median and a tick at p85 on a shared day axis, in HTML, for the same reason.
- `DeliverySection.tsx`:
  - It keeps the recharts weekly column chart and drops the weekly table.
  - Two `RangeChart`s replace the two time tables. A `By type / By member` switch is kept in local state.
  - It adds the oldest-in-progress table, the `BarRows` of in progress per member, and the estimate table with a chip from `estimateDiff` in `format.ts`.
- `UsageSection.tsx`:
  - `BarRows` replaces the recharts member chart and the member table; the bar's detail carries the member figures.
  - The stage share becomes one segmented `div` and a text line.
  - The epic table gains a budget meter (`role="meter"`).
  - The models table keeps model, role, tokens and estimated cost.
- `QualitySection.tsx`:
  - The scatter gets two `Scatter` series (No rework, Some rework) and a legend.
  - A rework-by-member table is added.
  - A findings list is summed over `quality.members`.
  - The epic table and the beads-by-rework table go.
- `CoverageSection.tsx`: five `Block`s (heading with a count badge, an all-clear sentence at 0), then the Unassigned line and the fixed note.
- Colors: stages and types keep the fixed order of `colors.ts` (`var(--series-N)`). The warning color is the existing `state-blocked` token, which the milestone pages also use for lateness. No new token is added.

## Data Flow
1. `ReportsPage` parses `project`, `days`, `sprint` and `tab` from the URL (REQ-UI-088, REQ-UI-095).
2. On a project, period or sprint change, it fetches the report. On a tab change, it only redraws.
3. When the report arrives, `headlines(report)` fills the tab hints, and the panel draws the selected section with the report's part for that section.
4. Picking a tab or changing a filter calls `navigate('/reports' + reportSearch(next), { replace: true })`, as the filters do today.

## Error Handling
- The report is loading or has failed: the tab list shows the names without headlines. The panel shows the loading text, or the error with Retry (REQ-UI-093).
- A section has no rows: it shows "No data in this period" instead of the chart (REQ-UI-093).
- A missing value: `overall.cycle` or `overall.lead` absent, `totals.cache_ratio` or `totals.rework_rate` null, or no member rows for review cycles per bead. Each shows "—".
- A cost is absent: "no price" (REQ-UI-088). A budget with an absent cost shows "no price" in place of the meter.
- Some projects failed in "All projects": the warning above the tabs names them, and the Data coverage count includes them.

## Testing
- Backend, pytest in `backend/tests/test_reports_service.py`, each test named with its REQ-ID:
  - REQ-REPORTS-003: total cache ratio.
  - REQ-REPORTS-004: overall median over mixed types, and overall absent when nothing closed.
  - `test_reports_api.py` checks that both fields are in the JSON.
- Frontend, vitest, each case named with its REQ-ID:
  - `filters.test.ts` (REQ-UI-095): tab parse and fallback, and `reportSearch` keeping project, days and sprint.
  - `headlines.test.ts` (REQ-UI-095): the four headlines, "no price", "—", "1 gap", and the gap sum with errors.
  - `format.test.ts` (new, REQ-UI-090): the estimate chip for +2, −2, −0.5 and 0.
  - `ReportsPage.test.tsx`:
    - REQ-UI-095: shared link opens the Quality tab; unknown tab selects Delivery; picking a tab updates the URL and does not refetch; Right moves the selection.
    - REQ-UI-088: the period is kept across tabs.
    - REQ-UI-093: the existing loading, error and late-answer cases.
  - `sections.test.tsx`:
    - REQ-UI-089: member bar detail holds the figures; budget meter at 117% with warning; "No budget".
    - REQ-UI-090: By member switch; no estimate table.
    - REQ-UI-091: figures; point click; two scatter series.
    - REQ-UI-092: copy command; empty block sentence.
- `MilestonePage.test.tsx` and the bead detail tests run unchanged, to check that `Tabs` without `hint` still works.
- jsdom has no layout. The sideways scroll at 400px and the match with the mockup screenshots are checked by hand (`05-tests.md`), on the Tailscale deploy.
- `pnpm -C frontend test --run`, `typecheck`, `lint`, `build`, and backend `pytest`, `ruff` and `mypy` must pass.
