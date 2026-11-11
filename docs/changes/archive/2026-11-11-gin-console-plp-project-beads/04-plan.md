# Plan: Light project beads endpoint for Beads, My Tasks, Milestones and Reports

Epic: gin-console-plp
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder. Diagram: `docs/specs/server/diagrams/project-beads-activity.md`.

## Objective
- `GET /api/projects/beads` returns each configured project with `name`, `path`, `exists` and `beads` (counts, epics and `stale`, or `{"error": …}`, or `null`). It returns no `workflow` and starts no process.
- The Beads page, My Tasks, Milestones and Reports load their project list from it. The Projects page keeps `GET /api/projects`.

Every scenario of the ADDED and MODIFIED REQs has a test naming its REQ. `gin-qa cases check --change gin-console-plp` prints `ok`. TC-1 in `05-tests.md` passes on the Tailscale deploy.

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
- **Problem statement:** four pages wait for `gin state` (and the `bd` calls gin-workflow makes inside it) only to learn the project names, `exists` and `beads.stale`. That takes about 2.6 s on Linux and minutes on native Windows.
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass.
  - `gin specs lint --change gin-console-plp` prints `ok`; `gin specs trace --change gin-console-plp` lists no missing REQ.
- **Global constraints** (from the spec and `AGENTS.md`):
  - The new route starts no process (`gin`, `bd`, anything). It reads only through `SnapshotStore`.
  - Config order is kept. A missing directory gives `exists: false, beads: null`. Unreadable beads give `beads: {"error": …}` (REQ-BEADS-005 message), and the other projects still answer.
  - No `workflow` key in the new response. `GET /api/projects` and the Projects page are unchanged.
  - The route has no cache of its own, and no `Collector`.
  - New and changed tests carry their REQ-ID.
  - Linux, macOS and Windows paths keep working; no new dependency.
- **Non-goals:** a faster Projects page; changing gin-workflow; a cache for the new route.

## Approach Options
### Option 1: a separate `GET /api/projects/beads` route
- **Pros:**
  - A clear contract without `workflow`.
  - The existing `/api/projects` and its REQs stay as they are.
- **Cons:** a second, small response type in the frontend.

### Option 2: `GET /api/projects?workflow=0`
- **Pros:** reuses the `Project` type.
- **Cons:** `workflow: null` already means "directory missing", so the two cases would read the same.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed on 2026-11-11.

## Scope
- **In scope:**
  - `backend/src/gin_console/projects/{models.py,source.py,router.py}` and a new `backend/tests/test_project_beads.py`.
  - `backend/tests/test_collect.py` for the REQ-BEADS-013 scenario.
  - `frontend/src/features/projects/api.ts` and `api.test.ts`.
  - `frontend/src/features/beads/BeadsPage.tsx`, `frontend/src/features/my-tasks/load.ts`, `frontend/src/features/milestones/MilestonesPage.tsx`, `frontend/src/features/reports/ReportsPage.tsx`.
  - The frontend tests that stub `/api/projects` for those pages.
  - `qa/cases/{server,ui,beads}/`.
  - `05-tests.md`.
- **Out of scope:**
  - `projects/collect.py`.
  - `ProjectsPage.tsx`.
  - Any gin-workflow change.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend) and Track 2 (frontend) share no file and Track 2 builds against the response shape in the spec with its own fixtures, so they run together; Track 3 (QA cases) needs the archived-to-be spec only and runs beside them; Track 4 is the human check after all three merge.
```

## Tasks

### Track 1: GET /api/projects/beads
- **Dependencies**: none
- **Requirements**: REQ-SERVER-010, REQ-BEADS-013
- **Files**:
  - Modify `backend/src/gin_console/projects/models.py:18-40` (`ProjectBeads`)
  - Modify `backend/src/gin_console/projects/source.py:1-50` (`build_project_beads`)
  - Modify `backend/src/gin_console/projects/router.py:1-28` (route)
  - Create `backend/tests/test_project_beads.py`
  - Test `backend/tests/test_collect.py` (REQ-BEADS-013 "Project beads without reuse", if it fits there better than in the new file)
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** one model, one function and one route over the existing `count_beads`; the scenarios are written out.
- **Acceptance criteria**:
  - Every scenario of REQ-SERVER-010, and REQ-BEADS-013 "Project beads without reuse", has a passing test naming its REQ.
  - The full backend suite, `ruff` and `mypy` pass.
- **Estimated complexity**: low

Interfaces produced:
```python
# projects/models.py
class ProjectBeads(BaseModel):
    name: str
    path: str
    exists: bool
    beads: Beads | BlockError | None

# projects/source.py
def build_project_beads(entry: ProjectEntry, snapshots: SnapshotStore) -> ProjectBeads:
    exists = entry.path.is_dir()
    return ProjectBeads(
        name=entry.name,
        path=str(entry.path),
        exists=exists,
        beads=count_beads(snapshots, entry.path) if exists else None,
    )

# projects/router.py, inside build_router
@router.get("/projects/beads")
def get_project_beads() -> list[ProjectBeads]:
    return [build_project_beads(entry, snapshots) for entry in settings.projects]
```

Steps:

1. Write `backend/tests/test_project_beads.py`. Build the app with `create_app(settings, static_dir=…, claude_home=tmp_path)` and the default `read_beads`. Write real files with `write_export` from `fake_export.py` and beads from `fake_export.bead`. Tests (comment `# REQ-SERVER-010` above each):
   - `test_server_010_summary_per_project`:
     - Project `alpha` has 3 open beads, 1 in_progress bead and 2 ready ones (use the same rows as the REQ-SERVER-006 test in `test_collect.py`); project `gone` points at a missing path.
     - Expected: `[alpha, gone]` in config order.
     - `alpha`: `exists` true, `beads.open == 3`, `beads.stale` false.
     - `gone`: `exists` false, `beads` None.
     - Neither has a `workflow` key.
   - `test_server_010_no_process`: `monkeypatch.setattr(subprocess, "run", <raise AssertionError>)`, and the same for `subprocess.Popen`. Two projects with files; GET answers 200.
   - `test_server_010_unreadable_beads`: `alpha` has no `issues.jsonl` and `beta` has one. `alpha.beads == {"error": <message containing ".beads/issues.jsonl">}`, and `beta.beads` has counts.
   - `test_server_010_no_projects`: an empty config answers `[]`.
   - `# REQ-BEADS-013` `test_beads_013_project_beads_without_reuse`:
     - Write `.beads/embeddeddolt/db/.dolt/noms/manifest` as `root-1`, then GET.
     - Rewrite the manifest as `root-2` and leave the file alone.
     - GET again at once: `stale` is true.
2. Run `uv run --directory backend pytest tests/test_project_beads.py`; expect 404s, then failures.
3. Implement `ProjectBeads`, `build_project_beads` and the route as in Interfaces. Import `ProjectBeads` and `build_project_beads` in `router.py`, and `ProjectEntry` and `SnapshotStore` in `source.py`; they already exist there.
4. Run:
   ```bash
   uv run --directory backend pytest
   uv run --directory backend ruff check .
   uv run --directory backend mypy
   ```
   Expect all pass.
5. Commit: `git commit -m "feat(projects): GET /api/projects/beads without gin state (gin-console-plp)"`

### Track 2: Pages load projects from /api/projects/beads
- **Dependencies**: none
- **Requirements**: REQ-UI-023, REQ-UI-100, REQ-UI-102, REQ-UI-103
- **Files**:
  - Modify `frontend/src/features/projects/api.ts:31-66` (`ProjectBeads`, guard, `fetchProjectBeads`, `isStale` parameter)
  - Modify `frontend/src/features/beads/BeadsPage.tsx`
  - Modify `frontend/src/features/my-tasks/load.ts`
  - Modify `frontend/src/features/milestones/MilestonesPage.tsx:6,29-31`
  - Modify `frontend/src/features/reports/ReportsPage.tsx:7,44-46`
  - Test `frontend/src/features/projects/api.test.ts`
  - Test `frontend/src/features/beads/BeadsPage.test.tsx`
  - Test `frontend/src/features/beads/ReturnFlow.test.tsx`
  - Test `frontend/src/features/beads/ListPanel.test.tsx`
  - Test `frontend/src/features/my-tasks/load.test.ts`
  - Test `frontend/src/features/my-tasks/MyTasksPage.test.tsx`
  - Test `frontend/src/features/milestones/MilestonesPage.test.tsx`
  - Test `frontend/src/features/reports/ReportsPage.test.tsx`
  - Test `frontend/src/app/App.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one new fetch function and a swap in four pages, but about nine test files stub the old URL and must move without losing coverage.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-023, 100, 102, 103 has a passing test naming its REQ, including both "Not the full projects list" scenarios.
  - `grep -rn "fetchProjects" frontend/src --include=*.tsx --include=*.ts | grep -v test` lists only `projects/api.ts` and `ProjectsPage.tsx`.
  - `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass.
- **Estimated complexity**: medium

Interfaces produced:
```ts
// features/projects/api.ts
export type ProjectBeads = { name: string; path: string; exists: boolean; beads: Beads | BlockError | null };
export function fetchProjectBeads(): Promise<ProjectBeads[]>; // GET /api/projects/beads; errors "Could not load projects (HTTP n)" / "(unexpected response)"
export const isStale: (project: Pick<Project, "beads">) => boolean;
```

Steps:

1. **API.** In `api.test.ts` add (REQ-UI-023):
   - `fetchProjectBeads requests /api/projects/beads and parses`: a stubbed fetch returns `[{name, path, exists, beads: {…, stale: true}}]`, and the result is the same.
   - It rejects a non-array, an item without `name`, and a non-boolean `stale`.
   - It rejects HTTP 500 with "Could not load projects (HTTP 500)".

   Then implement it:
   - Split `isProject` into `isProjectBeads(value)` (name, path, exists, beads with `hasValidStale`) and `isProject = isProjectBeads && workflow check`.
   - `fetchProjectBeads` mirrors `fetchProjects` with the new URL and guard.
   - `isStale` takes `Pick<Project, "beads">`.
2. **Pages.** Replace `fetchProjects`/`Project` with `fetchProjectBeads`/`ProjectBeads` in `BeadsPage.tsx`, `my-tasks/load.ts`, `MilestonesPage.tsx` and `ReportsPage.tsx`. The logic is otherwise unchanged (`filter((p) => p.exists)`, `isStale`).
3. **Tests.**
   - In every test that stubs `"/api/projects"` for these four pages (`BeadsPage`, `ReturnFlow`, `ListPanel`, `MyTasksPage`, `MilestonesPage`, `ReportsPage`, `App`), stub `"/api/projects/beads"` and drop `workflow` from the fixtures. Where a test reaches the Projects page, keep its `/api/projects` stub.
   - In `load.test.ts`, mock `fetchProjectBeads`.
   - Add `REQ-UI-023 the Beads page does not request /api/projects` (no fetched URL equals `/api/projects`).
   - Add `REQ-UI-100 My Tasks does not request /api/projects`.
   - Rename or retarget the REQ-UI-102 "projects fail" test to `/api/projects/beads` answering 500.
   - Keep the REQ-UI-103 tests passing on the new stub.
4. Run `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`, plus the `grep` from the acceptance criteria; expect pass.
5. Commit: `git commit -m "feat(ui): load project lists from /api/projects/beads (gin-console-plp)"`

### Track 3: QA cases
- **Dependencies**: none
- **Requirements**: REQ-SERVER-010, REQ-UI-023, REQ-UI-100, REQ-UI-102, REQ-UI-103, REQ-BEADS-013
- **Files**:
  - Create `qa/cases/server/` (case files for REQ-SERVER-010)
  - Modify or create `qa/cases/ui/` and `qa/cases/beads/` (cases for the MODIFIED REQs; re-pin TC-UI-005..007 and TC-BEADS-015..018)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI, which hands out IDs and pins.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-plp` prints `ok`; no new finding in `gin-qa cases check`.
- **Estimated complexity**: low

Steps:

1. `gin-qa cases plan --change gin-console-plp --format json`; read `qa/guidelines.md` (types `e2e`, `api`, `manual`; `Priority: high | medium | low`).
2. For each `missing` scenario run `gin-qa cases new <capability> --type <type> --title "<title>" --req <REQ-ID>`, then fill in Preconditions, Steps and Expected. Use `api` for REQ-SERVER-010 and REQ-BEADS-013, and `e2e` for the REQ-UI ones.
3. For each `stale` case, update it to the new REQ text, then run `gin-qa cases pin <TC-ID>`.
4. Repeat `gin-qa cases check --change gin-console-plp` until it prints `ok`.
5. Commit: `git commit -m "test(qa): cases for /api/projects/beads (gin-console-plp)"`

### Track 4: Check on the Tailscale deploy
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-SERVER-010, REQ-UI-023, REQ-UI-100
- **Files**:
  - Modify `docs/changes/gin-console-plp-project-beads/05-tests.md` (TC-1 row and result)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and record the user's result.
- **Human gate**: the user walks TC-1 on `https://instance-20260515-2304.tail5ca54e.ts.net:8443` and reports pass or fail.
- **Acceptance criteria**: TC-1 recorded `pass, giangdhwhtbr, <date> (Tailscale build of <commit>)`.
- **Estimated complexity**: low

Steps:

1. Deploy as the deploy memory records, each a separate command:
   - `git -C /home/gin/gin-fam/gin-console merge --ff-only feat/gin-console-plp-project-beads` on the checked-out spec branch.
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`.
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`.
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`.
   - `systemctl --user restart gin-console`.
   - `systemctl --user is-active gin-console`.
   - `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health`, retrying for up to 12 seconds; it should answer `200`.
   - Report the rollback command.
2. Ask the user to walk TC-1 and write the result into `05-tests.md`.

TC-1 (manual, REQ-SERVER-010, REQ-UI-023, REQ-UI-100):
- `curl -s -w '%{time_total}' http://127.0.0.1:8700/api/projects/beads` answers in well under a second, with the four projects and no `workflow`.
- While the user opens the Beads page, My Tasks, Milestones and Reports (after a Refresh), `pgrep -fa "gin state"` stays empty.
- Each of the four pages lists the same projects as before. The Projects page still shows gates.

## Integration
- **Branch**: `feat/gin-console-plp-project-beads`, created from `spec/gin-console-plp-project-beads` after the spec and plan commit. Tracks 1–3 work on their own track branches and merge into it; Track 4 runs on it after those merges.
- **Merge strategy**: parallel-then-merge

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .`, `mypy` pass
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass
- [ ] `gin specs lint --change gin-console-plp` prints `ok`; `gin specs trace --change gin-console-plp` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-plp` prints `ok`
- [ ] TC-1 passes on the Tailscale deploy

## Notes
- `Model:` and `Effort:` come from the main harness catalog (`haiku`, `sonnet`, `opus`; `low` to `max`) using the route rubric. The user may override them before plan approval.
- The Parent Bead (`gin-console-plp`) stays open until the human-confirmed merge. Each track bead closes when its tests and review pass.
- Milestones and Reports also call `gin` for their own data (`gin-workflow milestone …`, reports aggregation reads beads only). This plan changes only how they get the project list.
