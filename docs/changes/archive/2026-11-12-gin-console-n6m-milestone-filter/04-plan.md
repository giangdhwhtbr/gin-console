# Plan: Milestone filter on Beads and My Tasks

Epic: gin-console-n6m
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder. Diagram: `docs/specs/beads/diagrams/milestone-filter-activity.md`. Use case: `docs/specs/ui/use-cases/filter-by-milestone.md`.

## Objective
- `GET /api/beads` adds `milestone` to each bead. A new `GET /api/beads/milestones?project=` returns the project's milestones and `current`, read from the snapshot. The current-milestone rule lives in one shared function that the Team tab also uses.
- The Beads page has a Milestone filter (URL `milestone`) that defaults to the current milestone, or All when there is none. It also offers All and No milestone, and fetches closed beads for a closed milestone.
- My Tasks has a Project filter (URL `project`) and a Milestone filter (URL `milestone`). The Milestone filter is disabled for All projects, and otherwise defaults to the project's current milestone.

Every scenario of the ADDED and MODIFIED REQs has a test naming its REQ. `gin-qa cases check --change gin-console-n6m` prints `ok`. TC-1 passes on the Tailscale deploy.

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
- **Problem statement:** the Beads page and My Tasks list every bead of a project. Members cannot narrow them to the milestone they work in, and the API does not say which milestone a bead is under.
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
  - `gin specs lint --change gin-console-n6m --against master` prints `ok`, and `gin specs trace --change gin-console-n6m` lists no missing REQ.
- **Global constraints** (from the spec and `AGENTS.md`):
  - Read-only. The new endpoint reads only through `SnapshotStore` and starts no process. Beads keep their weak ETag and gzip behavior (REQ-BEADS-014, REQ-SERVER-011).
  - One current-milestone rule, `beads/milestones.py`. The Team tab keeps its fourth rule (latest closed) and its exclusion of undated milestones, so REQ-REPORTS-008 behaves as before.
  - The current milestone is the first of: the `active` milestone with the earliest `start`; the open milestone whose period holds today; the open milestone with the earliest future `start`. Ties go by `start`, then `id`. Only milestones with both dates qualify. With none, the default is All.
  - A bead's `milestone` comes from walking `snapshot.parents` over the whole export, closed ancestors included, and stops on a cycle.
  - The Beads page still leaves milestone beads out of its views (REQ-MILESTONE-UI-009). The breadcrumb filter count (REQ-UI-076) is unchanged.
  - Linux, macOS and Windows paths are untouched, and no dependency is added.
  - New and changed tests carry their REQ-ID.
- **Non-goals:**
  - A milestone filter on other pages.
  - Editing milestones.

## Approach Options
### Option 1: server adds `milestone` and a milestones endpoint in the beads context
- **Pros:**
  - Correct when closed epics are hidden from the list.
  - Fast (snapshot only).
  - One rule shared with the Team tab.
- **Cons:** a small move of code out of `reports/team.py`.

### Option 2: frontend derives milestones from `/api/beads?closed=1` and `/api/milestones`
- **Cons:**
  - `/api/milestones` runs `gin milestone list`, about 2.6 s, and about 60 s per `bd` call on Windows.
  - It would always need closed beads.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed on 2026-11-12.

## Scope
- **In scope:**
  - Backend:
    - `backend/src/gin_console/beads/{milestones.py (new),models.py,source.py,router.py}`;
    - `backend/src/gin_console/app.py`;
    - `backend/src/gin_console/reports/team.py`;
    - new `backend/tests/test_beads_milestones.py`.
  - Frontend:
    - `frontend/src/features/beads/{api.ts,filters.ts,milestoneChoice.ts (new),MilestoneFilter.tsx (new),BeadFilterBar.tsx,MobileFiltersSheet.tsx,BeadsView.tsx}` and tests;
    - `frontend/src/features/my-tasks/{load.ts,MyTasksPage.tsx}` and tests.
  - QA: `qa/cases/beads/` and `qa/cases/ui/`.
  - `05-tests.md`.
- **Out of scope:**
  - `milestones/` (backend and frontend).
  - The Reports page UI.
  - gin-workflow.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend) and Track 2 (Beads page) share no file and Track 2 builds against the JSON shape in this plan with fixtures, so they run together with Track 4 (QA cases); Track 3 (My Tasks) reuses Track 2's MilestoneFilter and milestoneChoice and waits for it; Track 5 is the human check after all merge.
```

## Tasks

### Track 1: Bead milestone and project milestones API
- **Dependencies**: none
- **Requirements**: REQ-BEADS-001, REQ-BEADS-015
- **Files**:
  - Create `backend/src/gin_console/beads/milestones.py`
  - Modify `backend/src/gin_console/beads/models.py:11-33` (`BeadSummary.milestone`; add `MilestoneOption`, `ProjectMilestones`)
  - Modify `backend/src/gin_console/beads/source.py:85-106` (`_fields` sets `milestone`; add `list_milestones`)
  - Modify `backend/src/gin_console/beads/router.py` (`build_router(settings, snapshots, clock)`; `GET /beads/milestones`)
  - Modify `backend/src/gin_console/app.py:65` (pass `clock` to the beads router)
  - Modify `backend/src/gin_console/reports/team.py:25-101` (`_iso`, `_status` and the first three rules of `_default` call `beads/milestones.py`)
  - Test `backend/tests/test_beads_milestones.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:**
  - Bounded backend work with written scenarios.
  - Moving the rule out of `team.py` must keep every Team tab test green, and the existing tests guard that.
- **Acceptance criteria**:
  - Every scenario of REQ-BEADS-015, and REQ-BEADS-001 "Milestone of a bead", has a passing test naming its REQ.
  - `test_reports_team*.py` and `test_beads_*.py` pass unchanged.
  - The full backend suite, `ruff` and `mypy` pass.
- **Estimated complexity**: medium

Interfaces produced:
```python
# beads/milestones.py
MilestoneStatus = Literal["active", "scheduled", "planned", "closed"]

class Dated(Protocol):
    @property
    def id(self) -> str: ...
    @property
    def status(self) -> MilestoneStatus: ...
    @property
    def start(self) -> date: ...
    @property
    def end(self) -> date: ...

def parse_date(text: object) -> date | None: ...        # YYYY-MM-DD only; None for anything else, e.g. 2026-13-45
def milestone_status(closed: bool, kickoff: object, today: date) -> MilestoneStatus: ...
def current_milestone[T: Dated](milestones: Sequence[T], today: date) -> T | None: ...
    # input in any order; sorts by (start, id); returns the first match of the three rules, else None
def milestone_of(snapshot: Snapshot, ident: str) -> str | None: ...
    # the bead itself when it is a milestone, else its nearest milestone ancestor via snapshot.parents; None on a cycle or none

# beads/models.py
class BeadSummary(BaseModel):  # existing, added field
    milestone: Text | None = None

class MilestoneOption(BaseModel):
    id: Text
    title: Text
    status: Literal["active", "scheduled", "planned", "closed"]
    start: date | None
    end: date | None

class ProjectMilestones(BaseModel):
    milestones: list[MilestoneOption]
    current: Text | None

# beads/source.py
def list_milestones(snapshot: Snapshot, today: date) -> ProjectMilestones: ...

# beads/router.py
def build_router(settings: Settings, snapshots: SnapshotStore, clock: Callable[[], datetime]) -> APIRouter: ...
# GET /api/beads/milestones?project=<name> -> ProjectMilestones; 404 / 502 as GET /api/beads; today = clock().astimezone().date()
```

JSON of `GET /api/beads/milestones`:
`{"milestones": [{"id": "m2", "title": "…", "status": "active", "start": "2026-11-02", "end": "2026-11-27"}], "current": "m2"}`

Steps:

1. **Tests.** Write `backend/tests/test_beads_milestones.py` with the `make` and `Clock` pattern of `test_beads_api.py`; per the `local-fixtures` rule, copy them into the file. Set the clock to 2026-11-12T12:00Z. Build rows with `fake_export.bead`, and give children a parent with `dependencies=[dep(child, parent, "parent-child")]`, which is how `build_snapshot` reads parents. A milestone row is `bead("m2", issue_type="milestone", metadata={"start": "2026-11-02", "end": "2026-11-27", "kickoff": "2026-11-02"})`. Tests, each with a `# REQ-…` comment:
   - `test_beads_015_current_milestone`: `m1` closed, `m2` active, `m3` planned → statuses, and `current == "m2"`.
   - `test_beads_015_period_holds_today`: only `m4`, without kickoff, running 2026-11-02..2026-11-27 → `current == "m4"`.
   - `test_beads_015_no_open_milestone`: all closed → `current is None`.
   - `test_beads_015_undated`: `m5` without `end` → listed with `end is None`, not current. `m6` with `start` "2026-13-45" → `start is None`.
   - `test_beads_015_bad_input`: `project=nope` → 404, and the export failing → 502 with `error`.
   - `test_beads_015_no_process`: monkeypatch `subprocess.run` and `subprocess.Popen` to raise → 200.
   - `test_beads_001_milestone_of_a_bead`: `m2` ← closed epic `e1` ← open task `e1.1`, plus a free task `t9`. `GET /api/beads` (no `closed`) gives `e1.1.milestone == "m2"` and `t9.milestone is None`. With `closed=1`, `m2.milestone == "m2"`.
   - `test_beads_001_parent_cycle`: `a` is the parent of `b` and `b` the parent of `a` → both have `milestone is None`, and the request answers 200.
2. Run `uv run --directory backend pytest tests/test_beads_milestones.py`. Expect it to fail.
3. **Shared rules.** Create `beads/milestones.py` with the Interfaces.
   - `parse_date`: copy `_iso` from `reports/team.py`, including the regex and `ValueError` guard.
   - `milestone_status`: closed → `closed`; else `active` or `scheduled` by kickoff ≤ or > today; else `planned`.
   - `current_milestone`: sort by `(start, id)`, keep the open ones, then return the first of active / period-holds-today / `start > today`, else `None`.
   - `milestone_of`: walk with a `seen` set.
4. **Models, source, router.**
   - Add the model fields. `_fields` adds `"milestone": milestone_of(snapshot, ident)`.
   - `list_milestones` takes the rows with `issue_type == "milestone"`:
     - `status = milestone_status(row.get("status") == "closed", metadata.get("kickoff"), today)`;
     - `start` and `end` come from `parse_date` of `metadata`;
     - `current` = `current_milestone` over those with both dates. Use a small frozen dataclass that satisfies `Dated` for the call.
     - Validate the options with `MilestoneOption`, and skip a row that fails validation, as `list_beads` does.
   - Router: `@router.get("/beads/milestones", response_model=ProjectMilestones)` with `project_dir` and `failure`; `today = clock().astimezone().date()`. Declare it before `/beads/{project}/{bead_id}`.
   - `app.py` passes `clock`.
5. **Team tab on the shared rule.** In `reports/team.py`:
   - replace `_iso` with `parse_date`;
   - make `_status` call `milestone_status(m.status == "closed", m.kickoff, today)`;
   - `_default` becomes `current_milestone(milestones, today)`, falling back to the existing latest-closed rule when it returns `None`.

   Keep the module's behavior: undated milestones are still excluded before the call.
6. Run:
   ```bash
   uv run --directory backend pytest
   uv run --directory backend ruff check .
   uv run --directory backend mypy
   ```
   Expect all to pass, including `test_reports_team.py` and `test_reports_team_api.py` unchanged.
7. Commit: `git commit -m "feat(beads): bead milestone and project milestones API (gin-console-n6m)"`

### Track 2: Milestone filter on the Beads page
- **Dependencies**: none (builds on the JSON in Track 1's Interfaces, with fixtures)
- **Requirements**: REQ-UI-025, REQ-UI-043, REQ-UI-104
- **Files**:
  - Modify `frontend/src/features/beads/api.ts` (`BeadSummary.milestone`, `MilestoneOption`, `ProjectMilestones`, `fetchMilestones`)
  - Modify `frontend/src/features/beads/filters.ts:6-81` (`milestone` in `BeadFilters`, URL, `filterBeads`)
  - Create `frontend/src/features/beads/milestoneChoice.ts`
  - Create `frontend/src/features/beads/MilestoneFilter.tsx`
  - Modify `frontend/src/features/beads/BeadFilterBar.tsx` (render `MilestoneFilter`)
  - Modify `frontend/src/features/beads/MobileFiltersSheet.tsx` (render `MilestoneFilter` in the sheet)
  - Modify `frontend/src/features/beads/BeadsView.tsx:25` (load milestones; resolve the choice; `closed` while a closed milestone is selected)
  - Modify `frontend/src/features/beads/beadFixtures.ts` (`milestone: null` default, milestone fixtures)
  - Test `frontend/src/features/beads/filters.test.ts`, `milestoneChoice.test.ts`, `MilestoneFilter.test.tsx`, `BeadsPage.test.tsx`, `api.test.ts`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded filter that follows the existing Sprint filter pattern (`filters.ts`, `BeadFilterBar.tsx`, `MobileFiltersSheet.tsx`). The default resolution is kept in one pure helper.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-104, REQ-UI-025 "Restored from the URL" and REQ-UI-043 "Filter by milestone" has a passing test naming its REQ.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

Interfaces produced (Track 3 consumes them):
```ts
// features/beads/api.ts
export type MilestoneStatus = "active" | "scheduled" | "planned" | "closed";
export type MilestoneOption = { id: string; title: string; status: MilestoneStatus; start: string | null; end: string | null };
export type ProjectMilestones = { milestones: MilestoneOption[]; current: string | null };
export async function fetchMilestones(project: string): Promise<ProjectMilestones>; // GET /api/beads/milestones?project=; shape-checked like fetchBeads
// BeadSummary gains: milestone: string | null (absent in an old answer → null)

// features/beads/milestoneChoice.ts
export type MilestonesState = { status: "loading" } | { status: "error" } | { status: "ok"; data: ProjectMilestones };
export type MilestoneInEffect = "all" | "none" | string;
export function milestoneInEffect(urlValue: string, state: MilestonesState): MilestoneInEffect;
//   "all"/"none" kept; a listed id kept; "" → current ?? "all"; unknown id, loading or error → "all"
export function isClosedMilestone(choice: MilestoneInEffect, state: MilestonesState): boolean;
export function matchesMilestone(bead: { milestone: string | null }, choice: MilestoneInEffect): boolean;

// features/beads/MilestoneFilter.tsx
export function MilestoneFilter(props: {
  state: MilestonesState; value: MilestoneInEffect; onChange: (value: "all" | "none" | string) => void; disabled?: boolean;
}): JSX.Element; // <select aria-label="Milestone">: All, No milestone, optgroups Active / Planned / Closed; "Milestones unavailable" when error
```

Steps:

1. **Helpers.** Test and implement `milestoneChoice.ts` (REQ-UI-104):
   - an empty URL value with `current` `m2` gives `m2`;
   - `current` null gives `all`;
   - `none` is kept;
   - an unknown id gives `all`;
   - the error state gives `all`;
   - `isClosedMilestone` is true only for a listed closed id;
   - `matchesMilestone`: `none` matches `milestone === null`, and an id matches equality.
2. **API.** Test and implement `fetchMilestones`, which rejects a body without a `milestones` array and maps 404 and 502 like `fetchBeads`. Treat `BeadSummary.milestone` as `string | null`.
3. **Filters.** In `filters.ts`, add `milestone: string` to `BeadFilters`: parse it from `milestone` and write it only when not `""`. `filterBeads(beads, filters, milestone: MilestoneInEffect = "all")` keeps the beads that pass `matchesMilestone`. Add the REQ-UI-025 "Restored from the URL" case with `milestone=m2` to `filters.test.ts`.
4. **Component.** `MilestoneFilter.tsx` is a plain `<select aria-label="Milestone">` styled like the existing selects.
   - Options: All (`all`), No milestone (`none`), then `<optgroup>` Active (`active`), Planned (`scheduled` and `planned`, by `start`) and Closed (latest `end` first).
   - While loading it is disabled; on error it shows one disabled option "Milestones unavailable".
   - Test the groups, the error text and `onChange`.
5. **Beads page.**
   - In `BeadsView.tsx`, keep a `MilestonesState` loaded with `fetchMilestones(project)` whenever the project changes, guarding against a late answer as `useBeads` does.
   - Compute `const milestone = milestoneInEffect(filters.milestone, ms)` and pass it to `filterBeads`.
   - Request closed beads when `filters.closed || namedSprint || isClosedMilestone(milestone, ms)`.
   - Render `MilestoneFilter` in `BeadFilterBar` and in `MobileFiltersSheet`. Choosing a value writes `milestone` to the URL, where `all` and `none` are written literally.

   Page tests in `BeadsPage.test.tsx`, which stubs `/api/beads/milestones` as well:
   - `REQ-UI-104 defaults to the current milestone`;
   - `REQ-UI-104 All and No milestone` (checks the URL `milestone=all`, then `milestone=none`);
   - `REQ-UI-104 closed milestone fetches closed beads` (a request with `closed=1`);
   - `REQ-UI-104 no current milestone shows All`;
   - `REQ-UI-104 milestones unavailable`;
   - `REQ-UI-043 filter by milestone` in the List view (the epic and child shown, the other epic not, no milestone bead);
   - one Board view case that shows the filter applies there.
6. Run:
   ```bash
   pnpm -C frontend test --run
   pnpm -C frontend typecheck
   pnpm -C frontend lint
   pnpm -C frontend build
   ```
   Expect all to pass.
7. Commit: `git commit -m "feat(beads): milestone filter on the Beads page (gin-console-n6m)"`

### Track 3: Project and milestone filters on My Tasks
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-105
- **Files**:
  - Modify `frontend/src/features/my-tasks/load.ts` (`loadMyTasks(email, closed, project)`: one project when set)
  - Modify `frontend/src/features/my-tasks/MyTasksPage.tsx` (Project select; `MilestoneFilter`; URL `project`, `milestone`)
  - Test `frontend/src/features/my-tasks/load.test.ts`, `MyTasksPage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** the same filter reused on one page, with URL state and a disabled state. Track 2 provides the parts.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-105 has a passing test naming its REQ.
  - The existing REQ-UI-100..102 tests pass.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

Steps:

1. **Tests.** In `MyTasksPage.test.tsx`, stub `/api/projects/beads` (projects A and B), `/api/beads?project=…` and `/api/beads/milestones?project=A`. Add:
   - `REQ-UI-105 All projects`: at `/my-tasks` the Project select shows "All projects", the Milestone select is disabled, and tasks of A and B are listed.
   - `REQ-UI-105 project with a current milestone`: choosing A sets the URL `/my-tasks?project=A`, shows `m2` selected, lists only A's tasks with `milestone === "m2"`, and requests only A's beads.
   - `REQ-UI-105 change project clears the milestone`: from `/my-tasks?project=A&milestone=m3`, choosing B gives `/my-tasks?project=B`.
   - `REQ-UI-105 closed milestone lists closed tasks`: choosing closed `m1` requests A's beads with `closed=1`.

   In `load.test.ts`: with `project` set, only that project's beads are requested.
2. **Load.** `loadMyTasks(email, closed, project = "")` requests only `project` when set (still through `fetchProjectBeads` to check that it exists), else every existing project as today.
3. **Page.**
   - Read `project` and `milestone` from the URL, keeping `closed`.
   - The Project `<select aria-label="Project">` lists "All projects" and the existing projects from the loaded `fetchProjectBeads` answer. Load that list once alongside the tasks; reuse the answer `loadMyTasks` already fetches by returning `projects: string[]` in `MyTasks`.
   - With a project, load `MilestonesState` via `fetchMilestones(project)` and compute `milestoneInEffect`.
   - The tasks request uses `closed || isClosedMilestone(...)`. Filter the listed tasks with `matchesMilestone`.
   - Render `MilestoneFilter` with `disabled` when the project is "".
   - Changing the project navigates to `/my-tasks?project=<p>` (plus `closed=1` when set) and drops `milestone`.
4. Run the four frontend checks; expect all to pass.
5. Commit: `git commit -m "feat(my-tasks): project and milestone filters (gin-console-n6m)"`

### Track 4: QA cases
- **Dependencies**: none
- **Requirements**: REQ-BEADS-001, REQ-BEADS-015, REQ-UI-025, REQ-UI-043, REQ-UI-104, REQ-UI-105
- **Files**:
  - Create or modify `qa/cases/beads/` (REQ-BEADS-001, REQ-BEADS-015)
  - Create or modify `qa/cases/ui/` (REQ-UI-025, REQ-UI-043, REQ-UI-104, REQ-UI-105)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-n6m` prints `ok`, with no new finding in `gin-qa cases check`.
- **Estimated complexity**: low

Steps:

1. Run `gin-qa cases plan --change gin-console-n6m --format json`, and read `qa/guidelines.md`.
2. For each missing scenario, run `gin-qa cases new <capability> --type <api|e2e> --title "<title>" --req <REQ-ID>`. Use `api` for the REQ-BEADS cases and `e2e` for the REQ-UI cases. Each case stands alone: project and data in Preconditions, one action per step, and Expected exactly as the spec says. Update and `gin-qa cases pin` the stale cases of the MODIFIED REQs.
3. Repeat `gin-qa cases check --change gin-console-n6m` until `ok`.
4. Commit: `git commit -m "test(qa): cases for the milestone filter (gin-console-n6m)"`

### Track 5: Check on the Tailscale deploy
- **Dependencies**: Track 1, Track 2, Track 3, Track 4
- **Requirements**: REQ-UI-104, REQ-UI-105
- **Files**:
  - Modify `docs/changes/gin-console-n6m-milestone-filter/05-tests.md` (TC-1 result)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and record the user's result.
- **Human gate**: the user walks TC-1 on `https://instance-20260515-2304.tail5ca54e.ts.net:8443` and reports pass or fail.
- **Acceptance criteria**: TC-1 is recorded as `pass, giangdhwhtbr, <date> (Tailscale build of <commit>)`.
- **Estimated complexity**: low

Steps:

1. Deploy as the deploy memory records from the main checkout on `feat/gin-console-n6m-milestone-filter`:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - the health check
   - `curl -s 'http://127.0.0.1:8700/api/beads/milestones?project=qwikfone'`, which should name `qwikfone-uoy4` as `current`
   - Report the rollback command.
2. Ask the user to walk TC-1 and record the result.

## Integration
- **Branch**: `feat/gin-console-n6m-milestone-filter`
- **Merge strategy**: parallel-then-merge. Tracks 1, 2 and 4 merge in any order, Track 3 after Track 2, and Track 5 deploys the merged branch.

## Validation
- [ ] Backend pytest, ruff and mypy pass
- [ ] Frontend test, typecheck, lint and build pass
- [ ] `gin specs lint --change gin-console-n6m --against master` prints `ok`, and `gin specs trace --change gin-console-n6m` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-n6m` prints `ok`
- [ ] TC-1 passes on the Tailscale deploy

## Notes
- The Parent Bead `gin-console-n6m` stays open until the user confirms the merge. Track beads close after their tests and review pass.
- Per the user's solo-work rule, the spec and this plan go in one commit at plan approval, with no push until the epic is done.
