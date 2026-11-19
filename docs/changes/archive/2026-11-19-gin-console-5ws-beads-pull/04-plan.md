# Plan: Beads pull

Epic: gin-console-5ws
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder.

## Objective
"Refresh data" runs `bd dolt pull` in every configured project with a Dolt remote before it drops the caches, a `beads.pull_interval` setting pulls on a schedule in the server, and the console shows each project's last pull on its card and a note on the Beads and My Tasks pages when it failed.

Done when:
- Every scenario of REQ-BEADS-016, REQ-BEADS-017, REQ-BEADS-018, REQ-CONFIG-006 (ADDED) and REQ-BEADS-003, REQ-BEADS-012 (MODIFIED) has a test that names its REQ.
- `gin-qa cases check --change gin-console-5ws` prints `ok`.
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
- **Problem statement:** the console never runs `bd` (REQ-BEADS-003), so beads pushed to a project's Dolt remote from other machines appear only after someone runs `bd dolt pull` by hand in that project. Refresh only drops caches.
- **Success criteria:**
  - Everything in the Objective.
  - Backend pytest, ruff and mypy pass; frontend test, typecheck, lint and build pass.
  - `gin specs lint --change gin-console-5ws --against master` prints `ok` and `gin specs trace --change gin-console-5ws` lists no missing REQ.
- **Global constraints** (from the spec):
  - The only `bd` command the server runs is `bd dolt pull`, in a configured project's directory, on `POST /api/refresh` and on the schedule. Reading routes (`/api/projects`, `/api/projects/beads`, bead lists, beads, comments, milestones, reports) start no process.
  - Pull every project that exists and does not set `pull: false`, at most four at a time over the whole server, 30 seconds each; never two pulls of one project at once (a second pull waits for the running one and takes its result).
  - Result per project, in memory: `at` (ISO 8601), `status` `ok` (exit 0), `no_remote` (non-zero exit whose output contains "no remote"), `error` (otherwise; error is the last non-empty output line, "bd dolt pull timed out", or "bd not found"). `pull` is `null` when not pulled since start or `pull: false`.
  - Refresh pulls, waits, drops every cache and answers 204 even when a pull failed. The scheduled pull runs `pull_interval` after start and after each run ends, drops the caches, logs failed projects; no setting or `0` means no scheduled pull.
  - Config: top-level `beads.pull_interval` is `0` or `<n>s|<n>m|<n>h` of at least one minute; project `pull` is a strict boolean, default true; anything else stops startup naming the field.
  - Card: "pulled " plus `formatAge` (REQ-UI-018), "no Dolt remote", or "pull failed: <error>" as an error, full `at` as `title`; nothing when `pull` is null or missing. Beads page (selected project) and My Tasks: "Pulling Beads of <project> failed: <error>. Run `bd dolt pull` in <path>." once per failed project.
  - No `bd export`, push, commit or conflict resolution. No new dependency. The Windows path of `_run` stays untouched. New and changed tests carry their REQ-ID. Tests never start `bd`: the runner is injected into `create_app`.
- **Non-goals:** SSH in the Docker image, per-project intervals, a separate pull button, browser-side timers, gin-workflow or bd changes.

## Approach Options
### Option 1: server-side pull service shared by Refresh and the scheduler
- **Summary:** `beads/pull.py` holds `PullService` (runner, pool of 4, per-project in-flight futures, results) and `PullScheduler` (daemon thread from a FastAPI lifespan). Refresh calls `pull_all()` before its clears; the project routes read `result(name)`.
- **Pros:** one place runs `bd` and owns the concurrency rules; the frontend only reads a field; tests inject one fake.
- **Cons:** the server gains its first long-lived thread and its first write path.

### Option 2: a separate `POST /api/pull` called by the button before `/api/refresh`
- **Summary:** the frontend sequences pull and refresh; the scheduler calls the same service.
- **Pros:** `/api/refresh` keeps its meaning.
- **Cons:** two requests per click, more frontend state, the same service anyway.

### Recommended Approach
- **Selected option:** Option 1, confirmed in discuss on 2026-11-19.
- **Rationale:** one entry point for `bd`, no frontend sequencing, and `RefreshButton` already stays busy until the POST ends.

## Scope
- **In scope:** config settings, pull service and scheduler, refresh change, `pull` field in both project routes, card line, failed-pull note on Beads and My Tasks, README, AGENTS.md and `config.example.yaml`, QA cases, TC-1.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend), Track 2 (frontend) and Track 3 (QA cases) share no file and run together, Track 2 building against the `pull` JSON fixed in this plan; Track 4 checks the merged branch on the deployed console.
```

## Tasks

### Track 1: Pull service, scheduler, refresh and settings
- **Dependencies**: none
- **Requirements**: REQ-BEADS-016, REQ-BEADS-017, REQ-BEADS-003, REQ-BEADS-012, REQ-CONFIG-006
- **Files**:
  - Modify `backend/src/gin_console/config.py:19-55` (add `BeadsSettings`, `ProjectEntry.pull`, `Settings.beads`)
  - Create `backend/src/gin_console/beads/pull.py` (`PullResult`, `PullRun`, `BdRunner`, `run_bd_pull`, `PullService`, `PullScheduler`)
  - Modify `backend/src/gin_console/app.py:33-60` (`run_bd` and `schedule_pulls` parameters, lifespan, refresh pulls first)
  - Modify `backend/src/gin_console/projects/models.py:69-82` (`Project.pull`, `ProjectBeads.pull`)
  - Modify `backend/src/gin_console/projects/source.py:45-65` (`build_project` and `build_project_beads` take the pull result)
  - Modify `backend/src/gin_console/projects/router.py:13-31` (take the `PullService`, pass `result(entry.name)`)
  - Modify `config.example.yaml` (commented `beads: {pull_interval: 5m}` and one `pull: false`)
  - Modify `README.md` (lines saying the console never runs bd; a "Pulling Beads" section: settings, SSH key without passphrase for the systemd service, Docker limitation, conflicts are resolved by hand)
  - Modify `AGENTS.md` (the "Read-only" bullet names the one exception, `bd dolt pull`, see ADR 0003)
  - Create `backend/tests/test_pull.py`
  - Test `backend/tests/test_config.py`, `backend/tests/test_beads_api.py`, `backend/tests/test_beads_snapshot.py`, `backend/tests/test_reports_api.py`, `backend/tests/test_reports_team_api.py`, `backend/tests/test_project_beads.py`, `backend/tests/test_app.py` (every test that posts `/api/refresh` passes a fake `run_bd`)
- **Provider role**: `backend`
- **Model:** `opus`
- **Effort:** `high`
- **Why:** concurrency (a shared pool, per-project in-flight futures that a second caller joins, a long-lived scheduler thread with clean shutdown) and the first write path through an external CLI, across config, app wiring and two routes.
- **Acceptance criteria**:
  - Every scenario of REQ-BEADS-016, REQ-BEADS-017, REQ-CONFIG-006 and the MODIFIED REQ-BEADS-003 and REQ-BEADS-012 has a passing test that names it.
  - A test shows at most four concurrent pulls with six projects, and one shows a second `pull_all` joins a running pull of the same project (one runner call).
  - No test starts a real `bd`: `grep -rn "api/refresh" backend/tests` shows each such test building the app with a fake `run_bd`.
  - pytest, ruff and mypy (strict) pass.
- **Estimated complexity**: high

Interfaces produced (Track 2 consumes the JSON):
```py
# beads/pull.py
PULL_TIMEOUT_SECONDS = 30.0
PULL_WORKERS = 4
class PullResult(BaseModel):
    at: datetime
    status: Literal["ok", "no_remote", "error"]
    error: str | None = None
class PullRun(NamedTuple):
    returncode: int
    output: str  # stdout and stderr joined
class BdRunner(Protocol):
    def __call__(self, cwd: Path) -> PullRun: ...  # raises CollectError on timeout or a missing command
def run_bd_pull(cwd: Path) -> PullRun: ...  # _run(["bd", "dolt", "pull"], cwd, PULL_TIMEOUT_SECONDS)
class PullService:
    def __init__(self, projects: Sequence[ProjectEntry], run_bd: BdRunner, clock: Callable[[], datetime]) -> None: ...
    def pull_all(self) -> dict[str, PullResult]: ...  # project name -> result of this run
    def result(self, name: str) -> PullResult | None: ...
class PullScheduler:
    def __init__(self, service: PullService, interval: float, after: Callable[[], None]) -> None: ...
    def run_once(self) -> None: ...  # pull_all, log errors, after()
    def start(self) -> None: ...  # daemon thread: while not stop.wait(interval): run_once()
    def stop(self) -> None: ...
# config.py
class BeadsSettings(BaseModel): pull_interval: float = 0  # seconds, parsed from 0 or "<n>s|m|h", >= 60 unless 0
class ProjectEntry(BaseModel): ...; pull: StrictBool = True
class Settings(BaseModel): ...; beads: BeadsSettings = Field(default_factory=BeadsSettings)
# projects/models.py
class Project(BaseModel): ...; pull: PullResult | None = None
class ProjectBeads(BaseModel): ...; pull: PullResult | None = None
# app.py
def create_app(..., run_bd: BdRunner = run_bd_pull, schedule_pulls: bool = True) -> FastAPI: ...
```
JSON of `pull`: `{"at": "2026-11-19T04:00:00Z", "status": "ok" | "no_remote" | "error", "error": null | "<text>"}` or `null`.

Steps:
1. REQ-CONFIG-006 in `backend/tests/test_config.py`: `5m` gives 300, `0` and absent give 0, `90s` gives 90, `30s` and `5x` and `5` fail with a `ConfigError` naming `beads.pull_interval`, `pull: "no"` fails naming `pull`, `pull` defaults to true. Run `uv run --directory backend pytest tests/test_config.py` (fails), then implement:
   ```py
   _DURATION = re.compile(r"^(\d+)([smh])$")
   _UNIT = {"s": 1, "m": 60, "h": 3600}
   class BeadsSettings(BaseModel):
       model_config = ConfigDict(extra="forbid")
       pull_interval: float = 0
       @field_validator("pull_interval", mode="before")
       @classmethod
       def _duration(cls, value: object) -> float:
           if value in (0, "0"):
               return 0.0
           match = _DURATION.match(value) if isinstance(value, str) else None
           if match is None:
               raise ValueError("must be 0 or a duration such as 90s, 5m or 1h")
           seconds = int(match[1]) * _UNIT[match[2]]
           if seconds < 60:
               raise ValueError("must be 0 or at least one minute")
           return float(seconds)
   ```
   `ProjectEntry.pull: StrictBool = True`; `Settings.beads: BeadsSettings = Field(default_factory=BeadsSettings)`. Run again (passes).
2. REQ-BEADS-016 in `backend/tests/test_pull.py` with a `FakeBd` (records `cwd` per call, answers from a per-path map of `PullRun` or exception, can sleep, tracks running and peak counts under a lock): pull each project; four at a time (six projects, 50 ms each, peak ≤ 4 and > 1); opted out and missing directory skipped with `result` `None`; "no remote" output gives `no_remote`; merge-conflict output gives `error` with the last non-empty line; `CollectError("bd timed out")` gives "bd dolt pull timed out" and `CollectError("bd not found")` gives "bd not found"; a second `pull_all` started while A's pull runs makes one runner call for A and both runs return the same result. Run (fails), then implement `pull.py`:
   - `PullService` owns one `ThreadPoolExecutor(max_workers=PULL_WORKERS)`, a `threading.Lock` guard, `_running: dict[str, Future[PullResult]]` and `_results: dict[str, PullResult]`.
   - `_start(entry)` under the guard returns the running future for `entry.name` or submits `_run_one(entry)` and records it.
   - `_run_one` calls the runner, classifies, and under the guard stores the result and removes `_running[entry.name]` (no done-callbacks, so no lock re-entry).
   - `pull_all` starts every entry with `entry.pull and entry.path.is_dir()`, `concurrent.futures.wait`s on them and returns `{name: future.result()}`.
   - `run_bd_pull` wraps `projects.collect._run(["bd", "dolt", "pull"], cwd, PULL_TIMEOUT_SECONDS)` and joins stdout and stderr.
   Run (passes).
3. REQ-BEADS-017 in `test_pull.py`: `run_once` calls `pull_all` then `after`, and logs `"pull of A failed: <error>"` at WARNING for an `error` result (`caplog`); `start` with `interval=0.05` runs at least twice within 0.3 s and `stop` ends the thread (`thread.is_alive()` false); an exception in `pull_all` is logged and the loop goes on. Implement `PullScheduler` with a `threading.Event`. Run (passes).
4. REQ-BEADS-012 and REQ-BEADS-003 in `test_beads_api.py`: build the app with `FakeBd`; `POST /api/refresh` calls the runner once per project before the snapshot is dropped (the fake records the call, then the next list request reads the file again), answers 204 when a pull fails, and the project's `pull.status` is `error` in `GET /api/projects/beads`; "Only pull": with `subprocess.run` patched to record, refresh with the default runner records only `["bd", "dolt", "pull"]` calls, one per project directory; "No bd process" adds `GET /api/projects/beads`. In `app.py`: `pulls = PullService(settings.projects, run_bd, clock)`; `refresh()` calls `pulls.pull_all()` before the clears; a lifespan starts `PullScheduler(pulls, settings.beads.pull_interval, after=lambda: [c() for c in on_refresh])` when `schedule_pulls and settings.beads.pull_interval > 0` and stops it on shutdown. Pass `pulls` to `build_projects_router`; fill `pull` in `build_project` and `build_project_beads` from `pulls.result(entry.name)` when `entry.pull`. Update every existing test that posts `/api/refresh` to pass `run_bd=FakeBd()`. Run `uv run --directory backend pytest` (passes).
5. Docs: README, AGENTS.md, `config.example.yaml` as listed in Files.
6. Run `uv run --directory backend pytest`, `uv run --directory backend ruff check .`, `uv run --directory backend mypy`; all pass. Commit: `git commit -m "feat(beads): refresh and a scheduled pull run bd dolt pull (gin-console-5ws)"`

### Track 2: Pull line on the card and failed-pull note
- **Dependencies**: none (builds against the `pull` JSON above)
- **Requirements**: REQ-BEADS-018
- **Files**:
  - Modify `frontend/src/features/projects/api.ts:40-95` (`PullResult` type, `pull?` on `Project`, `"pull"` in `ProjectBeads`, `pullOf()` lenient reader, `pullFailed()` predicate)
  - Create `frontend/src/features/projects/PullLine.tsx`
  - Modify `frontend/src/features/projects/ProjectCard.tsx` (render `PullLine` under the beads block)
  - Create `frontend/src/features/beads/PullNote.tsx`
  - Modify `frontend/src/features/beads/BeadsPage.tsx:20-75` (keep failed pulls from `fetchProjectBeads`, render `PullNote` for the selected project next to `StaleNote`)
  - Modify `frontend/src/features/my-tasks/load.ts` (`MyTasks.pullFailures: { project: string; path: string; error: string }[]`)
  - Modify `frontend/src/features/my-tasks/MyTasksPage.tsx:110-118` (render `PullNote`)
  - Test `frontend/src/features/projects/ProjectsPage.test.tsx`, `frontend/src/features/projects/api.test.ts`, `frontend/src/features/beads/BeadsPage.test.tsx`, `frontend/src/features/my-tasks/MyTasksPage.test.tsx`, `frontend/src/features/my-tasks/load.test.ts`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded UI over a fixed JSON shape, following `StaleNote` and the existing card blocks, with written scenarios.
- **Acceptance criteria**:
  - Every scenario of REQ-BEADS-018 has a passing test that names it, including "Older backend" (no `pull` key) and a malformed `pull` (read as null, no crash).
  - test, typecheck, lint and build pass.
- **Estimated complexity**: medium

Interfaces:
```ts
export type PullResult = { at: string; status: "ok" | "no_remote" | "error"; error: string | null };
export function pullOf(project: { pull?: unknown }): PullResult | null; // null unless a valid PullResult
export function PullLine({ pull, now }: { pull: PullResult; now: number }): JSX.Element; // "pulled <formatAge>", "no Dolt remote", or "pull failed: <error>" (text-destructive), title = formatTimes(at) or the ISO time
export function PullNote({ failures }: { failures: readonly { project: string; path: string; error: string }[] }): JSX.Element | null;
// "Pulling Beads of {project} failed: {error}. Run <code>bd dolt pull</code> in {path}."
```

Steps:
1. Tests (REQ-BEADS-018): `ProjectsPage.test.tsx` "Pulled" (at = now − 120 s shows "pulled 2 minutes ago"), "No remote", "Failed pull on the card" (error text, counts still shown), "Older backend" (no line); `api.test.ts` `pullOf` accepts the three statuses and returns null for missing, `null`, wrong status, non-string `at`; `BeadsPage.test.tsx` and `MyTasksPage.test.tsx` "Failed pull note" (one note naming A, error, `bd dolt pull`, path; none for B with `pull: null`; list still shown). Run `pnpm -C frontend test --run src/features/projects src/features/beads src/features/my-tasks` (fails).
2. Implement `api.ts`, `PullLine.tsx` (reuse `formatAge` and `formatTimes` from `features/quota/format.ts`), `ProjectCard.tsx`, `PullNote.tsx` (same `Alert` as `StaleNote`), `BeadsPage.tsx`, `load.ts`, `MyTasksPage.tsx`. Run the tests (pass).
3. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`; all pass. Commit: `git commit -m "feat(beads): project card shows the last pull and pages note a failed pull (gin-console-5ws)"`

### Track 3: QA cases
- **Dependencies**: none
- **Requirements**: REQ-BEADS-016, REQ-BEADS-017, REQ-BEADS-018, REQ-BEADS-003, REQ-BEADS-012, REQ-CONFIG-006
- **Files**:
  - Create `qa/cases/beads/TC-BEADS-*.api.md` for each new scenario of REQ-BEADS-016, REQ-BEADS-017 and the new scenarios of REQ-BEADS-003 ("Only pull") and REQ-BEADS-012 ("Refresh after a failed pull")
  - Create `qa/cases/config/TC-CONFIG-*.api.md` for REQ-CONFIG-006
  - Create `qa/cases/beads/TC-BEADS-*.e2e.md` for REQ-BEADS-018
  - Modify the existing cases of REQ-BEADS-003 and REQ-BEADS-012 whose text changes ("No bd process" adds `GET /api/projects/beads`; "Refresh" says the project was pulled first), and re-pin the others of those REQs with `gin-qa cases pin`
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** mechanical case writing from written scenarios with the gin-qa cases skill.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-5ws` prints `ok`, and `gin-qa cases check` shows no new finding.
  - Each case stands alone, has one action per step and concrete URLs or config text.
- **Estimated complexity**: low

Steps:
1. Run `gin-qa cases plan --change gin-console-5ws`, write each missing case per `qa/guidelines.md` and the `gin-qa:cases` skill, update and re-pin the stale ones.
2. Run `gin-qa cases check --change gin-console-5ws` (prints `ok`) and `gin-qa cases check`. Commit: `git commit -m "test(qa): cases for beads pull (gin-console-5ws)"`

### Track 4: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-BEADS-016, REQ-BEADS-017, REQ-BEADS-018, REQ-BEADS-012
- **Files**:
  - Modify `docs/changes/gin-console-5ws-beads-pull/05-tests.md` (TC-1 result)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** run a written check with Playwright and record the result.
- **Acceptance criteria**: TC-1 is recorded as pass, claude (Playwright on the deployed build of <commit>, n/n checks, screenshots in qa/evidence/<date>-5ws-tc1).
- **Estimated complexity**: low

Steps:
1. On the merged feature branch: `pnpm -C frontend build && uv --directory backend sync && systemctl --user restart gin-console`; `curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/projects` prints 200.
2. Playwright at 1440×900 and 390×844: Refresh, then gin-console's card shows "pulled …" and gin-harness's shows "no Dolt remote"; `GET /api/projects` agrees.
3. Temporary data, never touching a real remote: in `/tmp/5ws-tc1`, Beads databases `src` and `proj` share a `file://` remote (`bd init` in `src`, `bd dolt remote add origin file:///tmp/5ws-tc1/remote`, `bd dolt push`; `bd init --remote file:///tmp/5ws-tc1/remote` in `proj`, then `bd config set export.auto true` and `bd config set export.interval 1s` there), and `broken` has a remote pointing at a missing `file://` path.
4. A temporary console on port 8711 (`GIN_CONSOLE_CONFIG` listing `proj`, `broken` and gin-harness, `beads.pull_interval: 1m`): a bead created and pushed in `src` appears on the Beads page of `proj` after one Refresh; another pushed bead appears within two minutes without Refresh while the pull time moves; `broken`'s card shows "pull failed: …" and the Beads and My Tasks pages show its note; gin-harness shows "no Dolt remote". Stop the temporary console and delete `/tmp/5ws-tc1`.
5. Record TC-1 in `05-tests.md` and commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-5ws)"`

## Integration
- **Branch**: `feat/gin-console-5ws-beads-pull`
- **Merge strategy**: parallel-then-merge (tracks 1–3 in worktrees on `feat/gin-console-5ws-beads-pull-t<N>`, merged in order 1, 2, 3, then Track 4 on the merged branch)
