# Plan: Retire the Projects page and page project filters

Epic: gin-console-k4l
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder (technical epic; the file-by-file changes are under `03-design.md` `## Architecture`).

## Objective
The project switcher of gin-console-rm-nav-shell is the one place to choose a project:
- The Projects page is gone. `/` opens My Tasks of the current project.
- `GET /api/projects` and its `gin state` collector are gone; `GET /api/projects/beads` is unchanged.
- Reports and My Tasks have no project select and follow the switcher. My Tasks lists the current project only, without a Project column, and an empty list links to the Beads page.

Done when:
- Every scenario of the 44 modified REQs that the code renders has a test that names its REQ; the tests of the 11 removed REQs are gone.
- `gin-qa cases check --change gin-console-k4l` prints `ok`.
- TC-1 passes on the deployed console.

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | weakest | `low` |
| Bounded implementation with a clear spec | middle | `medium` |
| Cross-module change, security, migration, concurrency | strongest | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- **Problem statement:** the Projects page and the project selects of Reports and My Tasks duplicate the switcher, and `GET /api/projects` runs `gin state` per project (about 2.6 s each) every 10 s while the page is open.
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass; `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
  - `grep -rnE "fetchProjects|ProjectsPage|Collector|/api/projects" backend/src frontend/src` finds only `/api/projects/beads`.
  - `gin specs lint --change gin-console-k4l --against master` prints `ok`; `gin specs trace --change gin-console-k4l` lists no missing REQ.
- **Global constraints** (user decisions of 2026-11-23, verbatim from the proposal):
  - Technical epic; remove in both stacks.
  - `/` is replaced, with no history entry, by `/my-tasks?project=<current project>`, or `/my-tasks` while no project is configured.
  - The "Main" navigation holds Beads, My Tasks, Milestones and Reports, each with `?project=<current project>`; no link to `/`.
  - Reports and My Tasks follow the switcher; `?project=all` is rewritten to the current project; `GET /api/reports?project=all` answers 404.
  - My Tasks: current project only, no Project column, "No tasks assigned to <email>" with a link "Open the Beads page", the unknown-project notice of REQ-UI-126, the switcher keeps `closed` and drops `milestone` there.
  - `GET /api/projects/beads` and `Epic.workflow` (always `null`) stay byte for byte; `collect_epic_workflow`, `run_json`, `CollectError` and `_run` stay.
  - Read-only console; no new dependency.
- **Non-goals:** a cross-project overview (gin-console-rm-overview); changes to `/api/projects/beads`; the switcher's own UI.

## Approach Options
### Option 1: Backend removal, then the shell, then each page, then docs and QA
- **Summary:** one track per concern in dependency order.
- **Pros:** each track is a small, reviewable deletion with its own tests.
- **Cons:** seven tracks for a low-complexity epic.

### Option 2: One frontend track and one backend track
- **Summary:** all frontend changes in one track.
- **Pros:** fewer handoffs.
- **Cons:** one large diff across the shell, Reports and My Tasks; harder to review.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the user chose "remove in both stacks"; small tracks keep each review focused, and the QA track needs the final behaviour.

## Scope
- **In scope:** the 11 removed and 44 modified REQs of `02-spec-delta.md`; the living diagrams and use cases listed in `03-design.md`; README, roadmap and generator docstring; QA cases and e2e specs; TC-1.
- **Out of scope:** the non-goals above.
- **Approved with this plan:** deleting the gin-qa cases pinned only to the 11 removed REQs (Track 6), which the gin-qa process would otherwise ask about one by one.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: One lane (roadmap AI capacity 1); the frontend tracks share app/project.ts, Layout.tsx and the e2e support stubs, so they run in order on feat/retire-projects-page.
```

## Tasks
### Track 1: Retire GET /api/projects and the all-projects report
- **Dependencies**: none
- **Requirements**: REQ-SERVER-003, REQ-SERVER-004, REQ-SERVER-005, REQ-SERVER-006, REQ-SERVER-007, REQ-SERVER-008, REQ-BEADS-003, REQ-BEADS-005, REQ-BEADS-012, REQ-BEADS-013, REQ-BEADS-016, REQ-BEADS-020, REQ-BEADS-021, REQ-REPORTS-001, REQ-REPORTS-007, REQ-REPORTS-019
- **Files**:
  - Modify `backend/src/gin_console/projects/router.py` (delete `get_projects`, the `Collector` and its refresh hook)
  - Modify `backend/src/gin_console/projects/source.py` (delete `build_project`)
  - Modify `backend/src/gin_console/projects/collect.py` (delete `Collector`, `collect_workflow`, `_with_epic_workflows` and what only they use)
  - Modify `backend/src/gin_console/projects/models.py` (delete `Project`, `Workflow`, `Workspace`, `WorkspaceRepo`, `Team`)
  - Modify `backend/src/gin_console/app.py:86` (`build_projects_router` without `on_refresh`)
  - Modify `backend/src/gin_console/reports/router.py:21,45-95`, `backend/src/gin_console/reports/models.py:96,109`, `backend/src/gin_console/reports/service.py:217,243` (no `all`, no `errors`)
  - Test `backend/tests/test_collect.py`, `backend/tests/test_app.py`, `backend/tests/test_beads_api.py`, `backend/tests/test_beads_lanes_api.py`, `backend/tests/test_definitions_api.py`, `backend/tests/test_project_beads.py`, `backend/tests/test_reports_api.py` (and any other file `grep -rln "/api/projects\b\|project=all\|ALL" backend/tests` lists)
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** deletions with exact targets in the design; the care is keeping `/api/projects/beads` and the epic workflow helper intact.
- **Acceptance criteria**:
  - `GET /api/projects` answers 404 and `GET /api/projects/beads` answers exactly as before (a test compares the body); both named for REQ-SERVER-004 / REQ-SERVER-006 / REQ-SERVER-010.
  - `GET /api/reports?project=all` answers 404 (REQ-REPORTS-001); a single-project 502 is not cached (REQ-REPORTS-007).
  - The modified scenarios of REQ-BEADS-003, -005, -012, -013, -016, -020, -021 and REQ-REPORTS-019 pass against `/api/projects/beads` or single-project reports.
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass; `grep -rn "Collector\|collect_workflow\|build_project\b" backend/src` prints nothing.
- **Estimated complexity**: medium

Steps:
1. Write the new tests first: `test_server_004_projects_endpoint_retired` (404) and a REQ-SERVER-010/006 test that `/api/projects/beads` returns counts and epics with `workflow: null` and runs no process; `test_reports_001_all_is_not_a_project` (404). Run them: the first two fail on today's code only where they assert the 404.
2. Delete the code per `03-design.md` Backend. Move the `/api/projects` cases of the tests listed under Files to `/api/projects/beads` where the REQ still applies (REQ-BEADS-013/016 `stale` and `pull`, REQ-BEADS-021 counts); delete the cases of the removed REQ-SERVER-005/007/008; keep the REQ-SERVER-009 (Windows, `_child_env`) and `collect_epic_workflow` cases.
3. Run `uv run --directory backend pytest`, `uv run --directory backend ruff check .`, `uv run --directory backend mypy`: all pass.
4. Commit: `git commit -m "feat(server): retire GET /api/projects and the all-projects report (gin-console-k4l)"`

### Track 2: No Projects page; `/` opens My Tasks
- **Dependencies**: none
- **Requirements**: REQ-UI-001, REQ-UI-002, REQ-UI-003, REQ-UI-004, REQ-UI-005, REQ-UI-006, REQ-UI-007, REQ-UI-022, REQ-UI-055, REQ-UI-057, REQ-UI-061, REQ-UI-063, REQ-UI-072, REQ-UI-073, REQ-UI-096, REQ-UI-099, REQ-UI-110, REQ-UI-124, REQ-UI-125, REQ-UI-127, REQ-UI-132, REQ-UI-139
- **Files**:
  - Delete `frontend/src/features/projects/ProjectsPage.tsx`, `frontend/src/features/projects/ProjectCard.tsx`, `frontend/src/features/projects/PullLine.tsx` and their tests
  - Modify `frontend/src/features/projects/api.ts` (keep `fetchProjectBeads` and its types; delete `fetchProjects`, `Project`, `Workflow` and page-only types) and `frontend/src/features/projects/api.test.ts`
  - Modify `frontend/src/lib/format.ts`, `frontend/src/lib/format.test.ts` (delete `formatAge`, `formatTimes`)
  - Modify `frontend/src/app/App.tsx:8,77-78` (redirect of `/`)
  - Modify `frontend/src/app/Layout.tsx:15,27-32` (four NAV links; My Tasks with `?project=`)
  - Modify `frontend/src/app/origin.ts:4` (no `projects` kind)
  - Modify `frontend/src/app/project.ts:61-75` (`projectHref("/my-tasks")`, `switchProject` on `/my-tasks` keeps `closed`, drops `milestone`)
  - Modify `frontend/src/app/NotFoundPage.tsx:16-27` (links to Beads and My Tasks)
  - Test `frontend/src/app/App.test.tsx`, `frontend/src/app/Layout.test.tsx`, `frontend/src/app/NotFoundPage.test.tsx`, `frontend/src/app/origin.test.ts`, `frontend/src/app/project.test.ts`, `frontend/src/app/document.test.ts`, `frontend/src/app/restore.test.tsx`, `frontend/src/features/beads/beadFixtures.ts:61-69`, `frontend/src/features/milestones/milestoneFixtures.ts:92`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** removal plus one redirect and a NAV change at known sites; many tests pin the old nav and titles.
- **Acceptance criteria**:
  - REQ-UI-099 "Home address" (replace, no history entry) and "Home address without projects" have tests; REQ-UI-022 "Undecodable segment" shows the not-found page.
  - The "Main" navigation has four links in order with `?project=<current>` and no link to `/` (REQ-UI-055, -057); not-found links (REQ-UI-125); no "Projects" title or remembered place (REQ-UI-063, -072, -073); the modified scenarios of REQ-UI-061, -096, -110, -124, -127, -132, -139 pass.
  - No test of REQ-UI-001 to -007 or of `PullLine` remains; `grep -rnE "fetchProjects|ProjectsPage|PullLine|formatAge" frontend/src` prints nothing.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

Steps:
1. Update the tests first, each named with its REQ: `App.test.tsx` (`/` → `/my-tasks?project=a` with `replace`; no projects → `/my-tasks`; an undecodable segment shows "Page not found"), `Layout.test.tsx` (four links), `NotFoundPage.test.tsx`, `document.test.ts` (no "Projects" title), `origin.test.ts` (a stored `projects` kind reads as a Beads place), `project.test.ts` (`projectHref("/my-tasks")`, `switchProject` on `/my-tasks`). Run them: they fail.
2. Apply `03-design.md` Frontend for these files; delete the page files, their tests and the format helpers; fixtures stop stubbing `/api/projects`.
3. Run `pnpm -C frontend test --run`, `typecheck`, `lint`, `build`: all pass.
4. Commit: `git commit -m "feat(ui): no Projects page, / opens My Tasks (gin-console-k4l)"`

### Track 3: Reports follows the switcher
- **Dependencies**: Track 1, Track 2
- **Requirements**: REQ-UI-088, REQ-UI-093, REQ-UI-095, REQ-REPORTS-017, REQ-REPORTS-018, REQ-REPORTS-019
- **Files**:
  - Modify `frontend/src/features/reports/ReportsPage.tsx:68-80,98,180,216-235,249,267,281-284`
  - Delete `frontend/src/features/reports/ReportErrors.tsx` and its test
  - Modify `frontend/src/features/reports/api.ts:19,28,59` (no `ProjectError`, no `errors`)
  - Modify the Velocity tab component and its test (one project)
  - Test `frontend/src/features/reports/ReportsPage.test.tsx`, `frontend/src/features/reports/sections.test.tsx`, `frontend/src/features/reports/api.test.ts`, the velocity tests
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** removing one choice that several tabs branch on; the scenarios name each branch.
- **Acceptance criteria**:
  - No `aria-label="Project"` select on Reports; `/reports?project=all…` and `/reports` without a project are rewritten (replace) to the current project (REQ-UI-088 "Old link for all projects", "shared link").
  - No `errors` warning (REQ-UI-093 "failure"); no "All projects" headline rule (REQ-UI-095); no "Pick a project" state (REQ-REPORTS-017); Velocity for the current project only (REQ-REPORTS-018).
  - `grep -rn '"all"' frontend/src/features/reports` prints nothing; `pnpm -C frontend test --run`, `typecheck`, `lint` pass.
- **Estimated complexity**: medium

Steps:
1. Update the tests to the modified scenarios with their REQ names. Run them: they fail.
2. Apply `03-design.md` Frontend (ReportsPage, ReportErrors, api.ts, Velocity).
3. Run `pnpm -C frontend test --run`, `typecheck`, `lint`: pass.
4. Commit: `git commit -m "feat(reports): Reports follows the project switcher (gin-console-k4l)"`

### Track 4: My Tasks follows the switcher
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-100, REQ-UI-101, REQ-UI-102, REQ-UI-103, REQ-UI-105, REQ-UI-123, REQ-UI-126, REQ-UI-140, REQ-BEADS-018
- **Files**:
  - Modify `frontend/src/features/my-tasks/MyTasksPage.tsx:30-99` (no Project select or column; current project from `resolveProject`; unknown-project notice; empty state link; no-projects state)
  - Modify `frontend/src/features/my-tasks/load.ts:21-40` (one project; `compareTasks` without the project tie-break)
  - Test `frontend/src/features/my-tasks/MyTasksPage.test.tsx`, `frontend/src/features/my-tasks/load.test.ts`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** the page takes the Beads page's project pattern; the scenarios list each state.
- **Acceptance criteria**:
  - REQ-UI-100: only the current project's beads are requested; no Project column; "Nothing assigned" shows the link "Open the Beads page" to `/beads?project=<current>`; "No projects" says none are configured.
  - REQ-UI-105: the Milestone select is always enabled, `current` by default; a project change clears `milestone`.
  - REQ-UI-101, -102, -103 and REQ-BEADS-018: Show closed keeps the project; the error, stale note and pull note concern the current project.
  - REQ-UI-123 "Choose on My Tasks" and REQ-UI-126 (unknown project) and REQ-UI-140 "Table row" pass.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` pass.
- **Estimated complexity**: medium

Steps:
1. Update the tests to the modified scenarios with their REQ names. Run them: they fail.
2. Apply `03-design.md` Frontend (MyTasksPage, load.ts), reusing `resolveProject`, `isUnknownProject`, `UnknownProject`, `rememberProject` and `projectHref` as the Beads page does.
3. Run `pnpm -C frontend test --run`, `typecheck`, `lint`: pass.
4. Commit: `git commit -m "feat(ui): My Tasks follows the project switcher (gin-console-k4l)"`

### Track 5: Docs, roadmap and living diagrams
- **Dependencies**: Track 3, Track 4
- **Requirements**: REQ-DEPLOY-002, REQ-DOCKER-003, REQ-DOCKER-005
- **Files**:
  - Modify `README.md:9` (no "Project Dashboard")
  - Modify `docs/roadmap.md:34,93,253`
  - Modify `scripts/make_example_project.py:6` (docstring)
  - Delete `docs/specs/server/diagrams/project-health-activity.md` and its link in `docs/specs/server/spec.md`
  - Modify `docs/specs/beads/diagrams/bead-counts-activity.md`, `docs/specs/beads/diagrams/pull-status-state.md`, `docs/specs/reports/diagrams/team-tab-activity.md`, `docs/specs/reports/diagrams/velocity-tab-activity.md`, `docs/specs/reports/use-cases/review-team-in-milestone.md`, `docs/specs/reports/use-cases/review-velocity.md`, `docs/specs/reports/use-cases/review-rework.md`, `docs/specs/ui/diagrams/my-tasks-activity.md`, `docs/specs/ui/use-cases/filter-by-milestone.md`, `docs/specs/ui/use-cases/read-a-definition.md`
- **Provider role**: `docs`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** text edits at listed lines; the diagrams lose one branch each.
- **Acceptance criteria**:
  - No file under `README.md`, `docs/roadmap.md`, `docs/specs/*/diagrams` or `docs/specs/*/use-cases` names the Projects page, `GET /api/projects` (other than `/beads`) or "All projects" (`grep -rnE "Projects page|/api/projects([^/]|$)|All projects" README.md docs/roadmap.md docs/specs/*/diagrams docs/specs/*/use-cases`), except history the design keeps (roadmap line 144).
  - `gin specs lint --change gin-console-k4l --against master` prints `ok`.
- **Estimated complexity**: low

Steps:
1. Apply the edits listed in `03-design.md` "Docs and living specs"; diagrams drop the "All projects?" decision and its edges, keeping valid mermaid.
2. Run the grep and `gin specs lint --change gin-console-k4l --against master`.
3. Commit: `git commit -m "docs: no Projects page in README, roadmap and diagrams (gin-console-k4l)"`

### Track 6: QA cases and their tests
- **Dependencies**: Track 5
- **Requirements**: REQ-SERVER-004, REQ-SERVER-006, REQ-BEADS-003, REQ-BEADS-005, REQ-BEADS-012, REQ-BEADS-013, REQ-BEADS-016, REQ-BEADS-018, REQ-BEADS-020, REQ-BEADS-021, REQ-REPORTS-001, REQ-REPORTS-007, REQ-REPORTS-017, REQ-REPORTS-018, REQ-REPORTS-019, REQ-UI-022, REQ-UI-055, REQ-UI-057, REQ-UI-061, REQ-UI-063, REQ-UI-072, REQ-UI-073, REQ-UI-088, REQ-UI-093, REQ-UI-095, REQ-UI-096, REQ-UI-099, REQ-UI-100, REQ-UI-101, REQ-UI-102, REQ-UI-103, REQ-UI-105, REQ-UI-110, REQ-UI-123, REQ-UI-124, REQ-UI-125, REQ-UI-126, REQ-UI-127, REQ-UI-132, REQ-UI-139, REQ-UI-140, REQ-DEPLOY-002, REQ-DOCKER-003, REQ-DOCKER-005
- **Files**:
  - Delete the cases in `qa/cases/` pinned only to the removed REQs (REQ-UI-001 to -007, REQ-SERVER-003, -005, -007, -008), as `gin-qa cases plan --change gin-console-k4l` lists them under `obsolete`, and their e2e specs and api tests
  - Modify, re-pin or replace the `stale` cases it lists, and the cases that open `/` or stub `/api/projects` as a precondition
  - Modify `qa/e2e/support/api.ts:140` (no `/api/projects` stub)
  - Create or modify the e2e specs under `qa/e2e/{ui,beads,reports,server}/` and the api tests under `backend/tests/` traced to cases
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases from written scenarios in existing patterns; the obsolete deletions were approved with this plan.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-k4l` prints `ok`; `gin-qa cases plan --change gin-console-k4l` prints `nothing to do`.
  - `gin-qa e2e plan` and `gin-qa tests plan` list none of the change's cases as missing or stale, and no orphan spec.
  - `gin-qa e2e run ui beads milestone-ui reports` passes (fix specs that select the removed page or select; report product defects, never change product code).
- **Estimated complexity**: medium

Steps:
1. Run `gin-qa cases plan --change gin-console-k4l --format json`; delete the obsolete cases (approved), update and re-pin the stale ones per `qa/guidelines.md`.
2. Write or update the e2e specs and api tests; build the UI with `pnpm -C frontend build`; run them until they pass; pin them.
3. Run the official `gin-qa e2e run ui beads milestone-ui reports` and `gin-qa tests run --type api` for the change's api cases.
4. Commit: `git commit -m "test(qa): cases and specs without the Projects page (gin-console-k4l)"`

### Track 7: Check on the deployed console
- **Dependencies**: Track 6
- **Requirements**: REQ-UI-099, REQ-UI-055, REQ-UI-100, REQ-UI-088, REQ-UI-125, REQ-UI-110, REQ-DEPLOY-002
- **Files**:
  - Modify `docs/changes/gin-console-k4l-retire-projects/05-tests.md` (TC-1 result)
  - Create `qa/evidence/<date>-k4l-tc1/` (gitignored, kept on disk)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** run the written TC-1 and record it.
- **Acceptance criteria**:
  - TC-1 is recorded as `pass, claude (Playwright on the Tailscale build of <commit>, N/N checks, screenshots in qa/evidence/...)` with the exact N/N.
  - No page error occurred.
- **Estimated complexity**: low

Steps:
1. Deploy the branch, one command at a time: `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`; `pnpm -C /home/gin/gin-fam/gin-console/frontend build`; `uv --directory /home/gin/gin-fam/gin-console/backend sync`; `systemctl --user restart gin-console`; `systemctl --user is-active gin-console`; `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health` → `active` and `200`.
2. Write a Playwright script outside the repo; run it with `NODE_PATH=/home/gin/scotty/node_modules node <script> qa/evidence/<date>-k4l-tc1` against `http://127.0.0.1:8700` with localStorage `gin-console.email` set, at 1440×900 and 390×844, deviceScaleFactor 2, light and dark. Checks (one per TC-1 expectation in `05-tests.md`):
   - `/` becomes `/my-tasks?project=<current>` and Back does not return to `/`;
   - the navigation has four links, none to `/`; `/api/projects` answers 404; `/api/projects/beads` answers 200;
   - Reports has no project select and `/reports?project=all` becomes the current project;
   - My Tasks has no Project column and no project select; switching the project in the switcher changes the list; an empty list shows "Open the Beads page";
   - `/nope` links to Beads and My Tasks;
   - no page error; screenshots of each page.
3. Look at the key screenshots; record TC-1 in `05-tests.md` with the N/N of `results.json`. Commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-k4l)"`

## Integration
- **Branch**: `feat/retire-projects-page`
- **Merge strategy**: sequential

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- [ ] `gin specs lint --change gin-console-k4l --against master` prints `ok`, and `gin specs trace --change gin-console-k4l` lists no missing REQ.
- [ ] `gin-qa cases check --change gin-console-k4l` prints `ok`.
- [ ] TC-1 passed on the deployed console.

## Notes
- The user may override `Model:` and `Effort:` before approval.
- The parent bead stays open until a human confirms the merge. Each track bead closes when its tests and review pass.
- Line numbers come from `master` at d1e597d and drift after earlier tracks; anchor edits on content.
- Local `master` is 2 commits ahead of `origin/master` (the vitest pool change); the branch is based on it.
