# Design: Retire the Projects page and page project filters

Epic: gin-console-k4l

## Architecture

The console keeps its single-process layout (ADR 0001). The `projects` context stays, but only for `GET /api/projects/beads` (the list the switcher reads, REQ-UI-123) and the epic workflow helper. The work is deletion in both stacks, one redirect, and two pages that follow the switcher. Order: backend first (the frontend no longer calls the endpoint), then the frontend, then docs.

### Backend

- `backend/src/gin_console/projects/router.py`: delete the `GET /projects` route (`get_projects`), the `Collector` and its `on_refresh.append(collector.clear)`, and the `ThreadPoolExecutor`, `Project`, `Collector` and `build_project` imports. `GET /projects/beads` stays as it is.
- `backend/src/gin_console/projects/source.py`: delete `build_project` and the `Collector` and `Project` imports. `count_beads` and `build_project_beads` stay.
- `backend/src/gin_console/projects/collect.py`: delete `Collector` (with `Result`, `BeadsReader`, `TTL_SECONDS` and the `threading`, `time`, `Callable` imports that only it uses), `collect_workflow` and `_with_epic_workflows` (with `EPIC_STATE_WORKERS` and the `ThreadPoolExecutor` import). Stay: `CollectError`, `_child_env`, `_find_bash`, `_resolve_cmd`, `_run`, `_exit_error`, `run_text`, `run_json`, `_optional`, `_strings`, `_waivers` and `collect_epic_workflow` (the epic WorkflowCard, REQ-BEADS-020).
- `backend/src/gin_console/projects/models.py`: delete `Project`, `Workflow`, `Workspace`, `WorkspaceRepo` and `Team`. Stay: `BlockError`, `ReviewWaiver`, `EpicWorkflow`, `Epic`, `Beads`, `PullResult` and `ProjectBeads`. `Epic.workflow` stays (always `null` in `GET /api/projects/beads`) so that answer is byte for byte what it is today.
- `backend/src/gin_console/app.py` (line 86): `build_projects_router(settings, snapshots, pulls, on_refresh)` loses its `on_refresh` argument, because only the `Collector` used it. `on_refresh` still holds `snapshots.clear` and the milestones and reports caches, so `POST /api/refresh` (REQ-BEADS-012) drops one cache fewer.
- `backend/src/gin_console/reports/router.py`: delete `ALL` (line 21) and the `project == ALL` branches of `fetch` (lines 45-71), the `project != ALL` guard of `get_report` (lines 82-85, which becomes the one unknown-project check), and the cache comment on line 95. An unknown name, `all` included, answers 404 as any unconfigured project does. `reports/models.py` loses `ProjectError` (line 96) and `Report.errors` (line 109); `reports/service.py` loses its `errors` parameter (lines 217 and 243).

### Frontend

- `frontend/src/features/projects/`: delete `ProjectsPage.tsx`, `ProjectCard.tsx`, `PullLine.tsx` and their tests (`ProjectsPage.test.tsx`, `ProjectCard.test.tsx`). In `api.ts` keep `fetchProjectBeads`, `ProjectBeads`, `BlockError`, `isBlockError`, `isStale`, `pullOf`, `pullError` and `PullResult`; delete `fetchProjects`, `Project`, `isProject`, `Workflow`, `WorkspaceRepo` and the other types only the page used, and their cases in `api.test.ts`; `ProjectBeads` (today a `Pick` of `Project`) is written out in full. `formatAge` and `formatTimes` in `lib/format.ts` are used only by `PullLine.tsx`; delete them with their tests in `lib/format.test.ts`.
- `frontend/src/app/App.tsx`: drop the `ProjectsPage` import (line 8). The `pathname === "/"` branch (lines 77-78) renders a redirect: `navigate(projectHref("/my-tasks", current), { replace: true })` once the project list has loaded, or `navigate("/my-tasks", { replace: true })` when no project is configured (REQ-UI-099). A route segment that does not decode already falls through to `NotFoundPage` (REQ-UI-022).
- `frontend/src/app/Layout.tsx`: delete the Projects entry of `NAV` (line 28) and the `LayoutGrid` import. The My Tasks entry becomes `projectHref("/my-tasks", project)`. `NAV` feeds the sidebar, the icon rail and the phone bottom bar, so one change gives four links everywhere (REQ-UI-055). `beadOrigin` (line 15) needs no change once `"projects"` leaves `OriginKind`.
- `frontend/src/app/origin.ts`: remove `"projects"` from `KINDS` (line 4). A value stored earlier with that kind reads as a Beads place (`parse` already maps an unknown kind). Reports and My Tasks now remember the current project, so the `project === null` branch of `originFor` (a place that fits any project, used by Projects, My Tasks and Reports with "All projects") has no user left unless no project is configured; the developer removes it if no kind can still hold `null`. The Beads and milestone rule stays (REQ-UI-073).
- `frontend/src/app/project.ts`: `projectHref` accepts `"/my-tasks"` (line 69); `switchProject` handles `/my-tasks` like `/beads`, keeping `closed` and dropping `milestone` (line 75); `isUnknownProject` keeps its `"all"` exception (line 61) so an old Reports link is rewritten, not reported as unknown (REQ-UI-088, REQ-UI-126).
- `frontend/src/app/NotFoundPage.tsx`: the link list (lines 16-27) becomes Beads (`/beads?project=<current>`) and My Tasks (`/my-tasks?project=<current>`) (REQ-UI-125).
- `frontend/src/features/reports/ReportsPage.tsx`: delete the project select (lines 216-235) and the `"all"` choice: `selected` (lines 68-70), the page title and remembered place (lines 72-75), `teamWanted` (line 98), the Velocity headline (line 180), the "Pick a project to see its team" line (line 267) and the `projects={selected === "all" ? names : [selected]}` of `VelocityTab` (lines 281-284) lose their `all` cases. The existing rewrite of a missing `project` (line 79) also rewrites `project=all`, with `replace`. Delete `ReportErrors.tsx` (and its test) and its use on line 249; `reports/api.ts` loses `ProjectError` and `errors` (lines 19, 28 and the guard on line 59).
- `frontend/src/features/my-tasks/MyTasksPage.tsx`: delete the Project select (lines 76-94), the Project column (its `TableHead` and the `TableCell` that shows the project), `disabled={project === ""}` of the Milestone filter (line 98) and the null project of `rememberOrigin` (line 35). The empty state gets a link "Open the Beads page" to `projectHref("/beads", project)`, and the page says no projects are configured when the list of projects is empty (REQ-UI-100). The page resolves the current project as Beads does (`resolveProject`, `isUnknownProject`, `UnknownProject`, `rememberProject`) and writes `?project=` into the URL with `replace`. `load.ts` loads one project: `loadMyTasks(email, closed, project)` takes the resolved name, not `""`, drops the all-projects branch, and `compareTasks` no longer breaks ties by project (line 21).
- `frontend/src/features/beads/` keeps `PullNote` and `StaleNote`; they now show for the current project only, because the page loads one project.
- `qa/e2e/support/api.ts` (line 140) stops answering `/api/projects`; e2e specs follow the cases (see Testing).

### Docs and living specs (named here, edited at ship or by the developer)

- `README.md`: delete the "Project Dashboard" line of Features (line 9).
- `docs/roadmap.md`: in the milestone "Trust and wayfinding", the Demo cell of the summary table (line 34) and its Demo line (line 93) say "the blocked count matches on Projects, Beads and Reports"; they become "Beads and Reports". The entry "Overview for leads" (Scope, line 253) ends with "Whether it replaces Projects as the home page is decided in discuss."; it becomes a note that gin-console-k4l retired the Projects page and `/` goes to My Tasks until the Overview takes it. The Scope line of "One set of definitions" (line 144) names Projects as history and stays.
- `scripts/make_example_project.py` (line 6): the docstring lists "and Projects"; drop it.
- Living diagrams and use cases that name the Projects page or "All projects": `docs/specs/server/diagrams/project-health-activity.md` (delete, with its link in `server/spec.md`), `server/diagrams/project-beads-activity.md` (no change needed), `beads/diagrams/bead-counts-activity.md` (line 3), `beads/diagrams/pull-status-state.md` (line 3), `reports/diagrams/team-tab-activity.md` and `velocity-tab-activity.md` (the "All projects?" branch), `reports/use-cases/review-team-in-milestone.md` (1a), `review-velocity.md` (1a), `review-rework.md` (2e), `ui/diagrams/my-tasks-activity.md` (the `GET /api/projects` step and the all-projects path), `ui/use-cases/filter-by-milestone.md` (3a) and `read-a-definition.md` (line 14). A technical change carries no diagrams of its own, so `gin specs archive` leaves these files alone and the developer edits them in the same epic.

## Data Flow

No new flow. `/` becomes a client-side redirect to a page that already exists; Reports and My Tasks read the current project that REQ-UI-124 already defines. `GET /api/projects` stops existing, so FastAPI answers 404 and no `gin state` runs for the project list any more.

## Error Handling

- An old bookmark to `/` lands on the My Tasks page of the current project. With no configured project it lands on `/my-tasks`, which says no projects are configured (REQ-UI-100).
- An old `/reports?project=all` link is rewritten to the current project. `GET /api/reports?project=all` answers 404 (REQ-REPORTS-001), so a stale tab that still asks for it shows the Reports error state with Retry.
- A stale frontend that still asks `GET /api/projects` gets 404, not `index.html` (REQ-SERVER-004).
- A route segment that does not decode shows the not-found page (REQ-UI-022, REQ-UI-125).
- A project whose directory is missing stays hidden by the switcher. No new UI is added for it.

## Testing

- vitest, each test named with its REQ:
  - REQ-UI-099: `/` replaces itself with `/my-tasks?project=<current>` without a history entry, and with `/my-tasks` when no project exists, where the page says no projects are configured.
  - REQ-UI-022: an undecodable segment shows the not-found page.
  - REQ-UI-055, REQ-UI-057, REQ-UI-099, REQ-UI-124: four links in order, each with `?project=<current>`, no link to `/`; no link is marked on `/nope`.
  - REQ-UI-088, REQ-UI-093, REQ-UI-095, REQ-UI-105: Reports and My Tasks follow the switcher and have no project select; `?project=all` is rewritten; no `errors` warning; the Team tab has no "Pick a project" state; the Milestone select of My Tasks is always enabled.
  - REQ-UI-100, REQ-UI-102, REQ-UI-103, REQ-BEADS-018: My Tasks asks the beads of the current project only, has no Project column, offers "Open the Beads page" when nothing matches, and shows its error, its stale note and its pull note.
  - REQ-UI-123, REQ-UI-126: the switcher on `/my-tasks` keeps `closed` and drops `milestone`; `?project=zzz` on My Tasks shows the unknown-project notice.
  - REQ-UI-125, REQ-UI-063, REQ-UI-073, REQ-UI-072, REQ-UI-127, REQ-UI-061: not-found links, the My Tasks title, the remembered places without "Projects", the long project name in the switcher.
  - Delete the tests of REQ-UI-001 to REQ-UI-007 and of `PullLine`.
- pytest, each test named with its REQ:
  - REQ-SERVER-004: `GET /api/projects` answers 404; REQ-SERVER-010 and REQ-SERVER-006: `GET /api/projects/beads` answers as before (counts, epics without `workflow`, no process).
  - REQ-REPORTS-001 and REQ-REPORTS-007: `project=all` answers 404; the single-project 502 is not cached.
  - REQ-BEADS-003, REQ-BEADS-005, REQ-BEADS-013, REQ-BEADS-021: their `/api/projects` cases in `tests/test_app.py`, `test_beads_api.py`, `test_beads_lanes_api.py`, `test_definitions_api.py` and `test_collect.py` move to `/api/projects/beads` or go with the code.
  - Delete the tests of the removed REQ-SERVER-005, REQ-SERVER-007 and REQ-SERVER-008 in `tests/test_collect.py`. The Windows and `_child_env` cases (REQ-SERVER-009) and the `collect_epic_workflow` cases stay.
- Checks: `uv run --directory backend pytest`, `ruff check .` and `mypy` (strict); `pnpm -C frontend test --run`, `typecheck`, `lint` and `build`.
- Source sweep: `grep -rnE "fetchProjects|ProjectsPage|Collector|/api/projects" backend/src frontend/src` finds only `/api/projects/beads`.
- QA: `gin-qa cases plan --change gin-console-k4l` will list the cases of the removed REQs as obsolete (for example TC-UI-047, TC-UI-048, TC-UI-137, TC-UI-139, TC-UI-140, TC-UI-151 and the TC-SERVER cases of REQ-SERVER-003 to REQ-SERVER-008). Deleting them needs the user's yes. Cases that open `/` as a precondition (TC-UI-275) need a new URL or a new element for their REQ. The e2e specs under `qa/e2e/` follow the cases.
- TC-1 in `05-tests.md`: Claude runs Playwright on the Tailscale build at 1440 and 390 px.

## Risks

- Old bookmarks to `/` land on My Tasks, not on a list of projects. Nothing in the console links to `/` after this epic: the brand mark is not a link, so only the address itself opens it.
- QA cases and e2e specs that open `/` as a precondition, or stub `/api/projects`, fail until they get a new URL (`/beads?project=example`) or a new element.
- The information only the Projects page showed is gone (see the proposal's Assumptions). A cross-project health view can come back with epic gin-console-rm-overview.
- The frontend and the backend are built and served together (ADR 0001), so a page that asks `GET /api/projects` and a server that answers 404 meet only in a stale browser tab, which a reload fixes.
- `Epic.workflow` stays in the model as a field that is always `null`, to keep `GET /api/projects/beads` unchanged. A later epic may drop it.

## Open Technical Questions

<!-- In team mode, a discuss run by a member with no technical role lists each technical point it does not
     decide here, one per line: `- TQ-1: <question>`. Plan asks the technical member about each one and adds an
     indented `Decision: <answer>` line right under it. `gin record plan-approved` refuses while a question has no
     decision. Leave the section empty when there is none. -->
