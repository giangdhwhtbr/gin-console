# Retire the Projects page and page project filters

Epic: gin-console-k4l
Kind: technical
Points: 5 (1 page and 1 endpoint removed, 2 page filters dropped, 11 removed and 44 modified REQs, low: deletions in both stacks plus a redirect)
Date: 2026-11-23

<!-- Kind is capability, technical, or parity; for technical epics see technical-design.md. -->

## Why

The project switcher of epic gin-console-rm-nav-shell (REQ-UI-123, REQ-UI-124) holds the current project for every page. That made two things redundant: the Projects page, which lists the projects, and the project select on the Reports and My Tasks pages, which picks one or "All projects".

The Projects page is also the costly page. `GET /api/projects` runs `gin state` for each project, about 2.6 s each, and the page asks again every 10 seconds while it is open. The page shows facts that few people use: project path, workspace repos, team mode, hold decisions, review waivers, counts and active epics.

User decisions 2026-11-23:
- This is a technical epic: no user stories, use cases or activity diagrams.
- `/` goes to the My Tasks page of the current project (`/my-tasks?project=<current project>`). The Projects page is removed, not hidden.
- Reports and My Tasks follow the switcher. They have no project select and no "All projects".
- The "Main" navigation link of My Tasks carries `?project=<current project>`, like Beads, Milestones and Reports.
- My Tasks shows the "No project <name> is configured" notice for an unknown `?project=` (REQ-UI-126), like Beads.
- The switcher works on My Tasks: it keeps `closed` and drops `milestone`.
- The Project column of the My Tasks table is dropped, because every row is the current project.
- When nothing is assigned to the user, My Tasks says so and links to the Beads page of the current project.
- Remove the page, its endpoint and the code that only the endpoint used, in both stacks.

## What Changes

- **Frontend:** the Projects page, its card and its pull line are deleted. `/` redirects to `/my-tasks?project=<current project>` without a history entry (to `/my-tasks` when no project is configured). The "Main" navigation holds four links: Beads, My Tasks, Milestones, Reports. The not-found page links to Beads and My Tasks. "Projects" is no longer a remembered place of the breadcrumb and has no page title.
- **Reports:** no project select and no "All projects". The page always shows the current project. An old URL with `project=all` is rewritten to the current project. The Team "Pick a project" state, the report `errors` warning and the "no headline while All projects" rules go. Velocity shows the current project only.
- **My Tasks:** it is the landing page. No project select and no Project column. It lists the beads of the current project, keeps `?project=` in the URL like Beads, and its Milestone select is always enabled. An empty list offers a link "Open the Beads page". With no project configured it says no projects are configured.
- **Backend:** `GET /api/projects` is removed and answers 404 like any unknown `/api/*` path. The code only it used goes: `build_project`, the `Project` and `Workflow` models (with workspace, team, decision, remedies and review waivers), `Collector`, `collect_workflow`, `_with_epic_workflows` and the 5-second reuse. `GET /api/projects/beads` stays as it is. `GET /api/reports` no longer accepts `project=all`, so the multi-project report and its `errors` list go.
- **Docs:** README, `docs/roadmap.md` and the living diagrams and use cases that name the Projects page or "All projects" follow (listed in the design).

## User Stories

None: a technical epic.

## Capabilities Affected

- `ui`:
  - REMOVED REQ-UI-001 to REQ-UI-007 (the Projects page).
  - MODIFIED REQ-UI-022, REQ-UI-055, REQ-UI-057, REQ-UI-061, REQ-UI-063, REQ-UI-072, REQ-UI-073, REQ-UI-088, REQ-UI-093, REQ-UI-095, REQ-UI-096, REQ-UI-099, REQ-UI-100, REQ-UI-101, REQ-UI-102, REQ-UI-103, REQ-UI-105, REQ-UI-110, REQ-UI-123, REQ-UI-124, REQ-UI-125, REQ-UI-126, REQ-UI-127, REQ-UI-132, REQ-UI-139, REQ-UI-140.
- `server`:
  - REMOVED REQ-SERVER-003, REQ-SERVER-005, REQ-SERVER-007, REQ-SERVER-008 (`GET /api/projects`, its workflow block, per-block errors, 5-second reuse).
  - MODIFIED REQ-SERVER-004 (a scenario that `GET /api/projects` answers 404), REQ-SERVER-006 (it now describes the `beads` summary of `GET /api/projects/beads`, which REQ-SERVER-010 points at).
- `beads`: MODIFIED REQ-BEADS-003, REQ-BEADS-005, REQ-BEADS-012, REQ-BEADS-013, REQ-BEADS-016, REQ-BEADS-018 (no pull line on a card, the notes stay), REQ-BEADS-020, REQ-BEADS-021.
- `reports`: MODIFIED REQ-REPORTS-001, REQ-REPORTS-007, REQ-REPORTS-017, REQ-REPORTS-018, REQ-REPORTS-019.
- `deploy`: MODIFIED REQ-DEPLOY-002 (the smoke scenario loads the My Tasks page).
- `docker`: MODIFIED REQ-DOCKER-003, REQ-DOCKER-005 (the switcher lists the project; the My Tasks page opens).
- `config`, `milestone-ui`: no change.
- Assets: none.

## Assumptions

- The information that only the Projects page showed is dropped: project path and "missing" badge, workspace repos (frozen or missing), team mode, the project-level hold decision with its warnings and remedies, project-level review waivers, the active-epics list and the per-project counts at a glance.
- Epic gin-console-rm-overview may bring a cross-project health view back.
- A project whose directory is missing stays hidden by the switcher, as today, with no new UI.
- The epic is not placed in a milestone; the user decides.
- `GET /api/projects/beads` answers exactly as today, including `workflow: null` on its epics.
- The brand mark is not a link (`frontend/src/app/Layout.tsx`), so after this change nothing links to `/` except the address itself (old bookmarks, typing it). The specs say nothing about the logo.

## Non-goals

- A replacement cross-project overview (epic gin-console-rm-overview).
- Changes to `GET /api/projects/beads`.
- The switcher's UI.

## Success Criteria

- Every scenario of the modified requirements has a test that names its REQ.
- `gin specs lint --change gin-console-k4l --against master` prints `ok`.
- No file under `frontend/src` or `backend/src` refers to `fetchProjects`, `ProjectsPage`, `Collector` or `GET /api/projects`, except `/api/projects/beads`.
- Backend and frontend checks and the full test suites pass.
- TC-1 (05-tests.md) passes on the Tailscale build: `/` opens My Tasks of the current project, the navigation has four links, Reports and My Tasks follow the switcher, an old `/reports?project=all` link is rewritten, and `GET /api/projects` answers 404.
