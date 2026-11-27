# Project timeline on the Milestones page

**Context**
Epic `gin-console-rm-project-timeline` adds Timeline (default) and List views to the Milestones page: every milestone and epic of a project on one calendar axis from the chained forecast of `gin milestone list --all --json` (gin-workflow-6yoq, gin 3.5.3), the project finish in the header, and closed history behind "Show closed".

**Decision/Solution**
- Data: gin 3.5.3 already returned `forecast.milestones` (chained `start`, `finish`, `overflow_days`) and per-epic `title`, `status`, `lane`, `remaining_days` and `warnings` (`{code, days}`), but the console's models dropped them silently (no `extra="forbid"`). `milestones/models.py` now keeps them with defaults so older output still parses, and `closed_epics` comes from the Beads snapshot the route already reads (`with_history` after `with_epic_states`; `null` when the export cannot be read).
- Frontend: `features/milestones/timeline/axis.ts` holds the pure rules (group order, overrun, span, ticks, `DAY_WIDTH` 24/6/2 px for Weeks/Months/Quarters); `ProjectTimeline.tsx` renders them and copies the Gantt's colours because `LOOK` in `GanttChart.tsx` is not exported; the milestone Gantt is unchanged. A deadline before the span draws no line; tick labels that would overlap are left out.
- The URL keeps `view`, `closed` and `zoom`; the project redirect and the switcher write only `project` (`pathWith`), the switcher dropping `zoom` as REQ-UI-123 says.
- Adding required fields to the exported `ForecastEpic` type breaks the typecheck of tests that build its literals (`reports/status/EpicTable.test.tsx`, `summaryMarkdown.test.ts`): build them with the `forecastEpic` fixture of `milestoneFixtures.ts`.
- `formatDate` drops the year only inside the year of today, so a scenario text without a year needs today in the same year in its test.
- e2e: a Forecast stub needs a string `forecast.start` (`isForecast` refuses null); a scroll check needs an axis wide enough to scroll, or Today cannot land 40 px from the label column.

**Consequences**
- The Milestones page opens on the Timeline; old links without `view` open it too, and `view=list` keeps today's list.

**References**
- `docs/changes/archive/2026-11-27-gin-console-rm-project-timeline-project-timeline/`
- `backend/src/gin_console/milestones/{models,source,router}.py`, `frontend/src/features/milestones/timeline/`, `frontend/src/features/milestones/MilestonesPage.tsx`
- Beads: `gin-console-rm-project-timeline` (`.1` to `.4`)

**Scope**
The milestones context, backend and frontend, and its gin-qa cases and e2e helpers.
