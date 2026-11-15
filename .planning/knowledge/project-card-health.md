# Project card health and per-epic stages

**Context**
Epic gin-console-5ox (2026-11-15) replaced the project card's default-workflow stage and gate chips with health from `gin state`: workspace repos, team, `decision`, `warnings`, `remedies` and `review_waivers`, plus the stage of each in-progress epic from `gin state --workflow-id <epic>`.

**Decision/Solution**
- `collect_workflow` maps the new keys leniently: a missing or malformed optional key becomes `None` or `[]` and never fails the workflow block, so an older gin still works (`backend/src/gin_console/projects/collect.py`).
- Per-epic `gin state` runs only for `in_progress` epics, through `ThreadPoolExecutor(max_workers=4)` inside `Collector.get`, with `json_on_failure=True` (a finished workflow exits 1). One failing or timed-out epic gets `{error}` alone. The result shares the 5 s project cache.
- `/api/projects/beads` (REQ-SERVER-010) never runs a process, so its epics carry `status` and `"workflow": null`. The frontend treats null and absent alike.
- The frontend shape guard accepts any object for `workflow`, so the card guards every new list with a `list()` helper (`Array.isArray` or `[]`). Without it a malformed field threw in render and blanked the whole Projects page, which has no error boundary.

**Consequences**
- A cold `GET /api/projects` can take the default-state timeout plus one timeout per four hung epics; the cache bounds repeat cost. Starting epic calls alongside the default `gin state` would cut it.
- No test pins "default `gin state` fails, epic stages still collected"; the fake `gin` fails `--workflow-id` calls too when `fail={"state": …}`.

**References**
- `backend/src/gin_console/projects/{collect.py,models.py,source.py}`, `backend/tests/fakes.py`, `frontend/src/features/projects/{ProjectCard.tsx,api.ts}`
- Change: `docs/changes/archive/2026-11-15-gin-console-5ox-project-health/`; evidence `qa/evidence/2026-11-15-5ox-tc1/`
- Beads: gin-console-5ox (tracks .1–.4)

**Scope**
Reading new `gin state` fields into the console, and any frontend field the shape guard does not validate.
