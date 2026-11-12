# Design: Milestone filter

Epic: gin-console-n6m

## Architecture

Backend (`backend/src/gin_console/beads/`):
- `milestones.py` (new, pure): `parse_date(text) -> date | None`, `milestone_status(row, today) -> status`, `current_milestone(milestones, today) -> id | None` (the three rules of REQ-BEADS-015), and `milestone_of(snapshot, ident) -> id | None`, which walks `snapshot.parents` from the bead up, stopping on a cycle, and returns the first bead of type `milestone`.
- `models.py`: `BeadSummary` gains `milestone: Text | None = None`; new `MilestoneOption` (`id`, `title`, `status`, `start`, `end`) and `ProjectMilestones` (`milestones`, `current`).
- `source.py`: `list_beads` sets `milestone` from `milestone_of` over the whole snapshot, so closed ancestors that are left out of the list still count; new `list_milestones(snapshot, today) -> ProjectMilestones`.
- `router.py`: `GET /api/beads/milestones?project=` in the beads router, with the same 404 and 502 handling as `GET /api/beads`; `today` comes from the injected `clock`, so `build_router` takes `clock` and `create_app` passes it.
- `reports/team.py`: its milestone status and the first three default rules call `beads/milestones.py` (reports already depends on `beads` for the snapshot). It keeps its fourth rule (latest closed milestone) and its own exclusion of undated milestones, so REQ-REPORTS-008 behaves as before.

Frontend:
- `features/beads/api.ts`: `BeadSummary.milestone`, and `fetchMilestones(project)` with a shape check.
- `features/beads/filters.ts`: `milestone` in `BeadFilters` (`""` = default, `all`, `none` or an id), parsed and written to the URL; `filterBeads` takes the resolved milestone (`all`, `none` or an id) and matches `bead.milestone`.
- `features/beads/MilestoneFilter.tsx` (new): the grouped single-select, reused by the Beads filter bar, the mobile sheet and My Tasks.
- `features/beads/BeadsPage.tsx` and the filter bar and mobile sheet: load the milestones with the project, resolve the default, and request `closed=1` while a closed milestone is selected.
- `features/my-tasks/MyTasksPage.tsx` and `load.ts`: Project select from `GET /api/projects/beads`, Milestone select from `fetchMilestones` once a project is chosen; the list is filtered in the browser.

## Data Flow

See `docs/specs/beads/diagrams/milestone-filter-activity.md` and the use case `docs/specs/ui/use-cases/filter-by-milestone.md`.

1. The page reads `project`, `milestone` and the other filters from the URL.
2. It requests `GET /api/beads?project=P[&closed=1]` and `GET /api/beads/milestones?project=P` together.
3. The milestone in effect is the URL value, else `current`, else `all`.
4. A closed milestone in effect makes the bead request use `closed=1`.
5. The beads are filtered in the browser by `bead.milestone`.

## Error Handling

- `GET /api/beads/milestones` answers 404 and 502 like `GET /api/beads`. In the frontend a failure shows "Milestones unavailable" in the select and the list behaves as "All"; it never blocks the bead list.
- A milestone id in the URL that is not in `milestones` (deleted or mistyped) behaves as "All", and the select shows "All".
- A cycle in the parent chain stops the walk; the bead then has `milestone` `null`.

## Testing

- `backend/tests/test_beads_milestones.py`: the scenarios of REQ-BEADS-015 and the new scenario of REQ-BEADS-001, through the HTTP API with `fake_export`.
- The Team tab tests (`test_reports_team.py`, `test_reports_team_api.py`) pass unchanged after the rule moves.
- Vitest: `filters.test.ts` (parse, write, `filterBeads` by milestone), `MilestoneFilter.test.tsx`, `BeadsPage.test.tsx` (REQ-UI-104 scenarios and REQ-UI-043 "Filter by milestone"), `MyTasksPage.test.tsx` (REQ-UI-105).
- Manual TC-1 on the Tailscale deploy.

## Open Technical Questions
