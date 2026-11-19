# Design: Story points and velocity KPIs

Epic: gin-console-ulf

## Architecture

- **Milestones backend (`backend/src/gin_console/milestones/models.py`)**, every new field with a default so older gin output still parses (REQ-MILESTONE-UI-008):
  - `DaysPerPoint {value: float, measured_epics: int, assumed: bool}`.
  - `Velocity {committed_points: int | None, completed_points: int, added_points: int, say_do: float | None, days_per_point: float | None, planned_days_per_point: float | None, accuracy: float | None}`, the counts defaulting to 0 and the rest to `None`.
  - `MilestoneList.days_per_point`, `MilestoneDetail.days_per_point`: `DaysPerPoint | None = None`.
  - `MilestoneEntry.velocity`, `MilestoneDetail.velocity`: `Velocity | None = None`.
  - `EpicPlan`: `points: int | None = None`, `points_reason: str | None = None`, `estimate_source: Literal["points", "days", "assumed"] | None = None`, `actual_days: int | None = None`, `actual_days_per_point: float | None = None`.
  - `milestones/source.py` and `router.py` are unchanged: the models re-serialize what gin printed.
- **Beads backend (`beads/source.py`, `beads/models.py`)**: `BeadSummary.points: int | None` and `points_reason: str | None`, read in `_fields` from `raw["metadata"]` (a dict) with `points` accepted only as an `int` (not `bool`) in `{1, 2, 3, 5, 8, 13, 21}` and `points_reason` only as a `str` when `points` is set (REQ-BEADS-001).
- **Reports backend (`reports/models.py`, `reports/source.py`, `reports/service.py`)**:
  - `ReportBead.points: int | None`, read from the snapshot metadata the same way.
  - `EstimateRow.estimate_days: float | None`, new `points: int | None` and `days_per_point: float | None`.
  - `_delivery` keeps closed epics with `estimated_minutes` or `points` (REQ-REPORTS-004); `days_per_point = round(actual_days / points, 1)`.
  - No `gin` call: the Velocity tab reads the Milestones API from the browser.
- **Frontend, milestones (`features/milestones/`)**:
  - `api.ts`: `DaysPerPoint`, `Velocity` types and lenient guards (missing, `null` or malformed reads as `null`), the epic keys on `EpicPlan`.
  - `MilestonesPage.tsx`: a Say/do cell and header (a `5rem` column, so seven columns) and the same value in the stacked row. The extra 5rem moves the point where the columns fit: keep the title column at least 10rem by raising the container query from `@4xl` to `@5xl` if needed (see `.planning/knowledge/container-queries-for-lists.md`).
  - `ForecastCard.tsx`: "<x> days per point" with "(assumed)".
  - `MilestoneVelocity.tsx` (new): the header line of REQ-MILESTONE-UI-021, rendered by `MilestonePage.tsx` next to the integration/deadline/away line.
  - `GanttChart.tsx`: the size text gains the "<p> pt · " prefix (REQ-MILESTONE-UI-013).
  - Number formats in `features/milestones/format.ts`: `percent(0.62) = "62%"`, `oneDecimal(1.4) = "1.4"`, `twoDecimals(0.86) = "0.86"`.
- **Frontend, beads (`features/beads/`)**: `api.ts` gains `points` and `points_reason`; `ListRow.tsx` shows "<complexity> · <p> pt" (REQ-UI-109); `BeadDetailPage.tsx` shows "Points <p>" and the reason.
- **Frontend, reports (`features/reports/`)**:
  - `filters.ts` and `ReportsPage.tsx`: the tab `velocity` between Delivery and AI usage, its headline (REQ-UI-095).
  - `velocity/VelocityTab.tsx` (new) with `VelocityFigures.tsx`, `VelocityCharts.tsx` (Recharts, as the other report charts: a grouped column chart and a line chart) and `VelocityTable.tsx`; data from `fetchMilestones(project)` of `features/milestones/api.ts`, one block per project for "All projects" (REQ-REPORTS-018).
  - `DeliverySection.tsx`: estimate cell "<n>d" or "<p> pt", the chip for day estimates, "<x> d/pt" for pointed rows (REQ-UI-090).
- **Example project (`scripts/make_example_project.py`)**: epics with `metadata.points`, `points_reason` and `points_history` instead of `estimated_minutes` (keeping one day-estimated epic), closed milestone `ex-m1` with `committed_points` and `planned_days_per_point` and closed pointed epics with `started_at`/`closed_at`, and active `ex-m2` kicked off with a commitment, so `gin milestone list --all --json` reports velocity values.

## Data Flow

See `docs/specs/reports/diagrams/velocity-tab-activity.md` (Velocity tab) and `docs/specs/milestone-ui/diagrams/milestone-velocity-activity.md` (milestone page and list). Use case: `docs/specs/reports/use-cases/review-velocity.md`.

## Error Handling

- **Older gin without the new keys**: the models default them to `null`; the UI hides the say/do value ("–"), the days per point line, the velocity header and the Gantt prefix; the Velocity tab shows "No kicked-off milestones with points yet".
- **Before kick-start**: `committed_points` and `say_do` are `null`; the list shows "–", the header "Not kicked off", and the milestone is left out of the Velocity charts unless it already completed points.
- **Malformed `metadata.points`** (string, `4`, boolean): read as no points; the bead keeps its day estimate if any.
- **Velocity tab request fails** for a project: that project's block shows the error and cause like the Milestones page (REQ-MILESTONE-UI-005); other projects still render.
- **Division**: Delivery `days_per_point` only for `points > 0` (always, by the scale check).

## Testing

- **pytest**:
  - `test_milestones_api.py`/`test_milestones_source.py`: the story-points scenario and the older-gin scenario of REQ-MILESTONE-UI-008 (values round-trip unchanged; missing keys come back `null`).
  - `test_beads_api.py`/`test_beads_source.py`: REQ-BEADS-001 story points (valid, off-scale, string).
  - `test_reports_*.py`: REQ-REPORTS-004 points row (7 weekdays, 5 points, 1.4) and the existing estimate scenario.
- **vitest**: milestones `api.test.ts` (guards), `MilestonesPage.test.tsx` (say/do), `ForecastCard.test.tsx` (days per point), `MilestoneVelocity` / `MilestonePage.test.tsx` (REQ-MILESTONE-UI-021), `GanttChart.test.tsx` (points prefix), beads `ListView.test.tsx` and `BeadDetailPage.test.tsx` (REQ-UI-109), reports `ReportsPage.test.tsx` (tab and headline), `VelocityTab.test.tsx` (REQ-REPORTS-018 scenarios), `DeliverySection.test.tsx` (points row).
- **QA**: cases for the new and changed scenarios, re-pinned cases of the modified REQs.
- **TC-1** (Playwright on the deployed console, example project regenerated): Gantt "pt · d", List row and bead page points, Milestones say/do and forecast days per point, the milestone velocity line, Reports › Velocity charts and table, Delivery pointed row; 1440×900 and 390×844.

## Open Technical Questions
