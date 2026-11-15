# Plan: Project card health from gin state

Epic: gin-console-5ox
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder.

## Objective
`GET /api/projects` carries the project's workspace, team, decision, warnings, remedies and review waivers from `gin state`. It also carries the stage of each epic in progress from `gin state --workflow-id <epic>`. The project card shows these and drops the default-workflow gate chips.

Done when:
- Every scenario of REQ-SERVER-005, REQ-SERVER-006, REQ-UI-003 and REQ-UI-004 (MODIFIED) has a test that names its REQ.
- `gin-qa cases check --change gin-console-5ox` prints `ok`.
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
- **Problem statement:** the console reads only the default workflow's stage and gates. Each epic records its gates under its own workflow id, so the card shows every gate unmet even for a project with shipped or running epics. The workspace, team and health fields of `gin state` are ignored.
- **Success criteria:**
  - Everything in the Objective.
  - Backend pytest, ruff and mypy pass.
  - Frontend test, typecheck, lint and build pass.
  - `gin specs lint --change gin-console-5ox --against master` prints `ok`.
  - `gin specs trace --change gin-console-5ox` lists no missing REQ.
- **Global constraints** (from the spec):
  - The `workflow` block keeps `stage`, `layout` and `gates` for compatibility, and adds `workspace`, `team`, `decision`, `warnings`, `remedies` and `review_waivers`. Each missing or malformed field becomes `null` or `[]`; a bad field does not fail the block.
  - `beads.epics[]` gains `status`. In `GET /api/projects` only, an `in_progress` epic gains `workflow` with `stage`, `gates`, `warnings` and `review_waivers`, or `{error}` when its command fails.
  - `GET /api/projects/beads` starts no process and carries no epic `workflow` (REQ-SERVER-010).
  - The per-epic `gin state --workflow-id <id> --format json` runs with `json_on_failure`, at most 4 per project at once. It is cached with the project result for 5 s (REQ-SERVER-008). It never runs for ready or closed epics.
  - Card:
    - Remove the default-workflow stage and gate chips.
    - Show "workspace · <n> repos" with a "Show repos" disclosure. The disclosure lists path, branch and shape, and marks frozen or missing repos.
    - Show "team · <host>" when team mode is on.
    - Show an alert with "hold", the warnings and the remedies.
    - Show "<n> review waiver(s)" with task, reason and actor.
    - Each epic in progress shows its stage and "⚠ <n>" when it has warnings or waivers, with the details in `title` and in screen-reader text. An epic whose workflow failed shows "stage unknown". A ready epic shows "ready".
  - Read-only, with no new dependency. The Windows and macOS paths of `_run` are untouched. New and changed tests carry their REQ-ID.
- **Non-goals:**
  - Team members, areas or approvals.
  - A project detail page.
  - `gin state` for ready or closed epics.
  - gin-workflow changes.

## Approach Options
### Option 1: per-epic `gin state` inside the cached project collection
- **Summary:** `Collector.get` adds the epic workflows after the beads summary. A small thread pool limits concurrency per project, and the result is cached with the project.
- **Pros:**
  - It uses the documented CLI.
  - It sits inside the existing cache and lock.
  - Failures are isolated per epic.
- **Cons:** extra subprocesses per refresh. In practice that is about 3 for qwikfone, bounded by the epics in progress.

### Option 2: read `.agent-workflow/runtime/events.jsonl` directly
- **Pros:** one file read and no subprocesses.
- **Cons:**
  - It couples the console to gin-workflow internals.
  - ADR 0001 and the "wrap each external source" rule forbid this.
  - It breaks when the event format changes.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed on 2026-11-15 (`03-design.md`).

## Scope
- **In scope:**
  - `backend/src/gin_console/projects/{models.py,collect.py,source.py}`
  - `backend/tests/{fakes.py,test_collect.py}` and the projects API tests
  - `frontend/src/features/projects/{api.ts,ProjectCard.tsx}` and their tests (`ProjectsPage.test.tsx`, `api.test.ts`)
  - QA cases
  - `05-tests.md`
- **Out of scope:**
  - gin-workflow
  - the Beads views
  - My Tasks
  - Reports

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend), Track 2 (project card) and Track 3 (QA cases) share no file and run together, Track 2 building against Track 1's JSON with fixtures; Track 4 checks the merged branch.
```

## Tasks

### Track 1: Workflow health and epic stages from gin state
- **Dependencies**: none
- **Requirements**: REQ-SERVER-005, REQ-SERVER-006
- **Files**:
  - Modify `backend/src/gin_console/projects/models.py:8-35`: `Workflow` gains fields, add `Workspace`, `WorkspaceRepo`, `Team`, `ReviewWaiver` and `EpicWorkflow`, and `Epic` gains `status` and `workflow`.
  - Modify `backend/src/gin_console/projects/collect.py:140-182`: `collect_workflow` maps the new keys, add `collect_epic_workflow`, and `Collector.get` attaches the epic workflows through a `ThreadPoolExecutor(max_workers=4)`.
  - Modify `backend/src/gin_console/projects/source.py:33-38`: `Epic(..., status=r["status"])`.
  - Modify `backend/tests/fakes.py`: the fake `gin state` answers `--workflow-id <id>` from a per-id map, can fail one id, and records the peak number of concurrent calls.
  - Test `backend/tests/test_collect.py` and `backend/tests/test_project_beads.py`.
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded mapping of documented JSON plus a small bounded thread pool inside an existing cache, with written scenarios. The concurrency is a simple fan-out with no shared mutable state.
- **Acceptance criteria**:
  - Every scenario of REQ-SERVER-005 and REQ-SERVER-006, new and existing, has a passing test that names it.
  - A test shows at most 4 concurrent `gin state` calls per project.
  - pytest, ruff and mypy pass.
- **Estimated complexity**: medium

Interfaces produced (Track 2 consumes the JSON):
```py
class WorkspaceRepo(BaseModel): path: str; branch: str | None = None; shape: str | None = None; frozen: bool = False; present: bool = True
class Workspace(BaseModel): root: str; repos: list[WorkspaceRepo] = []
class Team(BaseModel): enabled: bool = False; host: str | None = None; me: str | None = None
class ReviewWaiver(BaseModel): task_id: str; reason: str = ""; actor: str = ""
class Workflow(BaseModel):  # existing stage, layout, gates kept
    workspace: Workspace | None = None; team: Team | None = None; decision: str | None = None
    warnings: list[str] = []; remedies: list[str] = []; review_waivers: list[ReviewWaiver] = []
class EpicWorkflow(BaseModel): stage: str; gates: dict[str, str]; warnings: list[str] = []; review_waivers: list[ReviewWaiver] = []
class Epic(BaseModel): id: str; title: str; status: str; workflow: EpicWorkflow | BlockError | None = None
def collect_epic_workflow(path: Path, epic_id: str) -> EpicWorkflow | BlockError: ...
```

Steps:
1. Write the pytest cases (REQ-SERVER-005):
   - "Workspace, team and health": the fake state has a workspace with 8 repos, team `{enabled: true, host: "github"}`, `decision: "hold"`, warnings and one waiver.
   - "Older gin": without those keys, `workspace` is `null`, `team` is `null`, `decision` is `null`, and the lists are empty.
   - A malformed `workspace` value, such as a string, gives `null` without failing the block.

   Run `uv run --directory backend pytest tests/test_collect.py` and expect a failure. Then implement the models and `collect_workflow`.
2. Write the pytest cases (REQ-SERVER-006):
   - "Stage of an epic in progress": `e-1` is in progress with stage `execute`, and `e-2` is ready with no call made for it.
   - "One epic fails": `e-3` fails and only `e-3` gets `{error}`.
   - "Project beads endpoint unchanged": `GET /api/projects/beads` makes no `gin` call and its epics have `status` and no `workflow`.
   - Concurrency: with 6 epics in progress, the fake's peak concurrent count is 4 or less.
   - An existing scenario: epics carry `status`.

   Implement `collect_epic_workflow`, `Collector.get` and the `status` in `source.py`. The `/api/projects/beads` path must not call `collect_epic_workflow`.
3. Run `uv run --directory backend pytest`, `uv run --directory backend ruff check .` and `uv run --directory backend mypy`, and expect all to pass. Then commit: `git commit -m "feat(projects): workspace, team, health and epic stages from gin state (gin-console-5ox)"`

### Track 2: Project card shows health and epic stages
- **Dependencies**: none (builds on Track 1's JSON with fixtures)
- **Requirements**: REQ-UI-003, REQ-UI-004
- **Files**:
  - Modify `frontend/src/features/projects/api.ts`: types and shape checks for the new `workflow` fields and `Epic.status`/`workflow`. Missing keys default to `null` or `[]`.
  - Modify `frontend/src/features/projects/ProjectCard.tsx`:
    - `WorkflowBlock` (L8-19) becomes `HealthBlock`.
    - `BeadsBlock` (L21-52) epics show the stage, the warning mark, "stage unknown" or "ready".
  - Test `frontend/src/features/projects/ProjectsPage.test.tsx` and `api.test.ts`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded display changes on one card with written scenarios. The disclosure and the accessible warning details need care.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-003 and REQ-UI-004, new and existing, has a passing test that names it.
  - The four frontend checks pass.
- **Estimated complexity**: medium

Interfaces consumed: Track 1's JSON (see Track 1).

Steps:
1. Write `api.test.ts` cases: the new fields are accepted, missing ones default, and an epic without `workflow` is fine. Implement them.
2. Write `ProjectsPage.test.tsx` cases (REQ-UI-003):
   - "Workspace and team": "workspace · 8 repos". "Show repos" lists the 8 repos, and the frozen one is marked. "team · github" appears.
   - "Health alert": an alert holds "hold" and the warning, and "1 review waiver" names `t-1`.
   - "Plain project": none of these appear, and no gate chips appear.

   Implement `HealthBlock`. The disclosure is a `button` with `aria-expanded` controlling a list.
3. Write `ProjectsPage.test.tsx` cases (REQ-UI-004):
   - "Stage per epic": `e-1` shows `execute` and a warning mark "1" whose accessible text names the waiver. `e-2` shows "ready".
   - An epic whose `workflow` is `{error}` shows "stage unknown".

   Implement them.
4. Run the four frontend checks and expect them to pass. Then commit: `git commit -m "feat(projects): project card shows health and epic stages (gin-console-5ox)"`

### Track 3: QA cases
- **Dependencies**: none
- **Requirements**: REQ-SERVER-005, REQ-SERVER-006, REQ-UI-003, REQ-UI-004
- **Files**: cases under `qa/cases/{server,ui}/`: add new ones, and update and pin the stale ones (TC-SERVER-011, TC-UI-047, TC-UI-048, and every case that asserts the default-workflow gate chips of REQ-UI-003).
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-5ox` prints `ok`.
  - `gin-qa cases check` shows no new finding.
- **Estimated complexity**: low

Steps:
1. Record the output of `gin-qa cases check`, then run `gin-qa cases plan --change gin-console-5ox --format json`.
2. Add one case per new scenario: `api` for REQ-SERVER-005 and REQ-SERVER-006, `e2e` for REQ-UI-003 and REQ-UI-004. Each case needs:
   - concrete URLs (`/`);
   - one action per step;
   - Expected wording exactly as the scenario states it.
3. Update the stale cases:
   - A REQ-UI-003 case that expects stage and gate chips now expects none, per "Plain project".
   - Pin each case. Reset the result of any case whose text changed.
4. Repeat until `ok` with no new finding. Then commit: `git commit -m "test(qa): cases for project health and epic stages (gin-console-5ox)"`

### Track 4: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-SERVER-005, REQ-SERVER-006, REQ-UI-003, REQ-UI-004
- **Files**: modify `docs/changes/gin-console-5ox-project-health/05-tests.md` (the TC-1 result).
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and walk TC-1 with Playwright. The user delegated manual validation on 2026-11-15.
- **Acceptance criteria**: TC-1 is recorded as `pass, claude (Playwright on the deployed build of <commit>, n/n checks, screenshots in qa/evidence/<date>-5ox-tc1)`.
- **Estimated complexity**: low

Steps:
1. Deploy from the main checkout on `feat/gin-console-5ox-project-health`:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/projects`, which should print `200`

   Report the rollback command.
2. Write and run a Playwright script at 1440×900 and 390×844 that walks every clause of TC-1. It compares each epic's stage on the card with `gin state --workflow-id <epic> --format json` run in the project. Save screenshots in `qa/evidence/<date>-5ox-tc1/`.
3. Record TC-1 in `05-tests.md`, then commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-5ox)"`

## Integration
- **Branch**: `feat/gin-console-5ox-project-health`
- **Merge strategy**: parallel-then-merge. Tracks 1, 2 and 3 merge in any order, and Track 4 checks the merged branch.

## Validation
- [ ] Backend pytest, ruff and mypy pass
- [ ] Frontend test, typecheck, lint and build pass
- [ ] `gin specs lint --change gin-console-5ox --against master` prints `ok`, and `gin specs trace --change gin-console-5ox` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-5ox` prints `ok`
- [ ] TC-1 passes on the deployed console

## Notes
- The Parent Bead `gin-console-5ox` stays open until the user confirms the merge. Track beads close after their tests and review pass.
- Following the user's solo-work rule, the spec and this plan go in one commit when the plan is approved. Ship merges locally and then pushes `master`.
