# Story points and velocity from gin milestone

**Context**
Epic gin-console-ulf (2026-11-19) shows gin-workflow story points and velocity KPIs (capability `story-points`, gin-workflow-y7d6). gin owns every figure; the console only shows them.

**Decision/Solution**
- `gin milestone list/show --json` adds, without changing `schema: 1`: `days_per_point {value, measured_epics, assumed}` (list and show), `velocity {committed_points, completed_points, added_points, say_do, days_per_point, planned_days_per_point, accuracy}` (each list entry and the shown milestone), and per epic `points`, `points_reason`, `estimate_source`, `actual_days`, `actual_days_per_point`. The milestones models give every new key a default so an older gin still parses (`backend/src/gin_console/milestones/models.py`).
- Points also live in the bead metadata (`points`, `points_reason`, `points_history`), so the Beads views and Reports read them from the snapshot through `points_of` (`beads/kinds.py`): only an `int` (not `bool`) in 1, 2, 3, 5, 8, 13, 21.
- The Reports Velocity tab calls `GET /api/milestones?project=` from the browser, only once the tab is selected; the Reports backend never runs gin. Delivery's only console arithmetic is `round(actual_days / points, 1)` for closed pointed epics.
- gin rules that shape test data: `committed_points` and `planned_days_per_point` are stored on the milestone at kick-start; a pointed epic needs the `roadmap` label; `days_per_point` counts working days from `started_at` to `closed_at` of the last 10 closed pointed epics, so epics that each span a whole milestone give unrealistic values; `added_points` comes from `milestone_moves` after the kickoff. `bd import` accepts `points_history` and `milestone_moves` as lists in metadata.
- The Milestones list grid uses `@min-[60rem]:` with seven columns (see [container-queries-for-lists](container-queries-for-lists.md)).

- `actual_days` (gin `milestone.py`, console `reports/points.py`) counts working days Monday to Friday from `started_at` to `closed_at`, at least 1, so an epic done on a weekend or within a day is 1 whatever its size. Trust and wayfinding (gin-console-6bd) had 5 epics of 3 to 13 points at 1 day each, hence 0.11 days per point: that shows the floor more than the effort.

**Consequences**
- The example project's milestone epics now carry `roadmap`, so its forecast card shows and `ex-m2` has many warnings.
- `say_do` of an active milestone reads 0% until its pointed epics close.

**References**
- `backend/src/gin_console/{milestones/models.py,beads/kinds.py,reports/service.py}`, `frontend/src/features/milestones/{api.ts,format.ts,MilestoneVelocity.tsx}`, `frontend/src/features/reports/velocity/`
- Change: `docs/changes/archive/2026-11-19-gin-console-ulf-story-points/`; evidence `qa/evidence/2026-11-19-ulf-tc1/`
- gin-workflow: `docs/reference/cli.md` (gin milestone), `.planning/specs/2026-11-19-story-points-design.md`
- Beads: gin-console-ulf (tracks .1–.6)

**Scope**
Any view of estimates, points or velocity, and example data for milestones.
