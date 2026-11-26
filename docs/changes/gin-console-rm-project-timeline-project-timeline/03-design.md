# Design: Project timeline

Epic: gin-console-rm-project-timeline

## Architecture

Backend (`backend/src/gin_console/milestones`):
- `models.py`: `ForecastMilestone` (`id`, `start`, `finish`, `overflow_days`); `Forecast.milestones: list[ForecastMilestone] = []`; `ForecastEpic` gains `title`, `status`, `lane`, `remaining_days`, `warnings: list[EpicWarning]` (`code`, `days`), each with a default so output without them still parses; `ClosedEpic` (`id`, `title`, `milestone`, `start`, `end`); `MilestoneList.closed_epics: list[ClosedEpic] | None = None`.
- `source.py`: `closed_epics(snapshot) -> list[ClosedEpic]`, the closed epics labelled `roadmap` with the nearest milestone among their parents, `start` from `started_at` else `created_at`, `end` from `closed_at`, local dates; a row without `closed_at` is left out.
- `router.py`: the list route already joins the snapshot for epic states (`with_epic_states`); the same step sets `closed_epics`, and leaves it `null` when the snapshot read fails, as it already swallows that `BeadsError`.

Frontend (`frontend/src/features/milestones`):
- `api.ts`: the new types and fields.
- `MilestonesPage.tsx`: reads `view` (`timeline` default, `list`), `closed` and `zoom` from the URL; renders a `ViewTabs`-style `<nav aria-label="View">`, the header finish line (`ProjectFinish.tsx`), and either `ProjectTimeline` or today's list (unchanged under `view=list`).
- `timeline/axis.ts` (new, pure): `timelineRows(list, showClosed)`, `scaleOf(zoom)` (px per day), `ticksOf(zoom, from, to)` (Mondays, months, quarters), `boundsOf(rows, forecast, today)`, `xOf(day)`.
- `timeline/ProjectTimeline.tsx` (new): sticky label column (`useLabelWidth`), scroller with `usePan`, header ticks, today and deadline lines with the chip placement of `markerSides`, milestone rows and epic rows; the zoom group and "Show closed".
- The milestone Gantt (`GanttChart.tsx`, `gantt.ts`) is not changed; shared helpers are imported, not moved, unless a move is the only way to import them.

## Data Flow

- [Project timeline activity](docs/specs/milestone-ui/diagrams/project-timeline-activity.md) (use case: [See the project timeline](docs/specs/milestone-ui/use-cases/see-project-timeline.md)).

## Error Handling

- `gin milestone list` fails (502): both views show the error and Retry, as today (REQ-MILESTONE-UI-008).
- `forecast` null: the header has no finish line; the Timeline says "No open work to forecast" and still shows the closed history when "Show closed" is on.
- `forecast.error`: the header shows "Forecast unavailable: <error>"; milestone windows are drawn without forecast bars or overrun.
- A chained milestone with `start` and `finish` null: its window only, labelled "No open epics".
- An epic with `estimate_source` `assumed`: dashed outline and "assumed estimate" in its name.
- `closed_epics` null with "Show closed" on: the note "Closed epics unavailable: Beads could not be read"; closed milestones still show.
- A forecast epic whose `milestone` is not listed: under "Not in a milestone".

## Testing

- `pytest`: `test_milestones_source.py` / `test_milestones_api.py` additions: the new forecast fields, older output without them, `closed_epics` (roadmap only, nearest milestone, `created_at` fallback, missing `closed_at`), `null` when the snapshot fails.
- `vitest`: `axis.test.ts` (rows order, bounds, scale, ticks across a year end, quarters), `ProjectTimeline.test.tsx` (bars, overrun hatch, not-in-a-milestone group, today and deadline lines, zoom keys, show closed, states, accessible names, links), `ProjectFinish.test.tsx`, `MilestonesPage.test.tsx` (default Timeline, `view=list`, view kept across projects).
- QA track: gin-qa cases and Playwright specs for the header, the zooms, "Show closed", the states, and the page at 390px.

## Open Technical Questions
