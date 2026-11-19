# Design: Beads pull

Epic: gin-console-5ws

## Architecture

- **Config (`backend/src/gin_console/config.py`)**
  - `BeadsSettings` (new, `extra="forbid"`): `pull_interval: float = 0` in seconds, parsed from `0`, `<n>s`, `<n>m` or `<n>h`; any other value, or one under 60 seconds and not 0, fails validation with the field name.
  - `Settings` gains `beads: BeadsSettings` (default factory). `ProjectEntry` gains `pull: bool = True` (strict boolean).
  - `config.example.yaml` shows `beads: {pull_interval: 5m}` commented and `pull: false` on one project.
- **Pull service (`backend/src/gin_console/beads/pull.py`, new)**
  - `PullResult` model: `at: datetime`, `status: Literal["ok", "no_remote", "error"]`, `error: str | None`.
  - `BdRunner` Protocol `__call__(cwd: Path, timeout: float) -> PullOutcome` (exit code and output), with the default `run_bd_pull` built on `projects/collect.py` `_run(["bd", "dolt", "pull"], cwd, timeout=30)`. It is injected into `create_app` as `run_bd`, like `run_gw`, so tests pass a fake and never start `bd`.
  - `PullService(projects, run_bd, clock)`:
    - `pull_all()` selects the projects with `pull` true whose path is a directory, runs them through a `ThreadPoolExecutor(max_workers=4)`, and returns when all have ended.
    - A per-project `threading.Lock` plus an in-flight `Future` map: a pull that finds one running for its project waits on that future and takes its result.
    - Classification: exit 0 is `ok`; a non-zero exit whose output contains "no remote" is `no_remote`; anything else is `error` with the last non-empty output line. `CollectError` from a timeout or a missing command gives "bd dolt pull timed out" or "bd not found".
    - `result(name) -> PullResult | None` reads the kept results under a lock.
- **Scheduler (`beads/pull.py`, `PullScheduler`)**
  - A daemon thread started from a FastAPI lifespan in `create_app` only when `beads.pull_interval > 0` and `schedule=True` (a `create_app` parameter, default true; tests pass false or drive `run_once()` with a fake clock).
  - Loop: wait `pull_interval` on a stop `Event`, `pull_all()`, run the `on_refresh` clears, log each `error` result with the project name; stops on shutdown.
- **Refresh (`app.py`)**: `POST /api/refresh` calls `pull.pull_all()` and then the existing `on_refresh` clears, and responds 204.
- **API models**: `Project` (`projects/models.py`) and `ProjectBeads` gain `pull: PullResult | None = None`, filled from `PullService.result(name)` in `projects/router.py` and the project-beads route. Neither route starts a process.
- **Frontend**
  - `features/projects/api.ts`: `PullResult` type and a lenient reader; a missing, `null` or malformed `pull` reads as `null`.
  - `ProjectCard.tsx`: a `PullLine` under the beads block: "pulled " plus `formatAge(at, now)` from `features/quota/format.ts` (full time as `title`), "no Dolt remote", or "pull failed: <error>" in `text-destructive`.
  - `features/beads/PullNote.tsx` (new), next to `StaleNote.tsx`: the Alert "Pulling Beads of <project> failed: <error>. Run `bd dolt pull` in <path>.", rendered by `BeadsPage.tsx` for the selected project and by `MyTasksPage.tsx` once per failed project, from the `GET /api/projects/beads` data they already load.
  - `RefreshButton.tsx` is unchanged: it stays busy until the POST ends, which now includes the pulls.
- **Docs**: ADR `docs/adr/0003-console-pulls-beads.md`; README ("never runs bd", the pull settings, SSH key requirement for the service, Docker limitation) and AGENTS.md ("Read-only" now names the one exception).

## Data Flow

See `docs/specs/beads/diagrams/beads-pull-activity.md` (Refresh), `docs/specs/beads/diagrams/scheduled-pull-activity.md` (scheduled pull), `docs/specs/config/diagrams/pull-settings-activity.md` (settings at startup) and `docs/specs/beads/diagrams/pull-status-state.md` (a project's pull result). Use cases: `docs/specs/beads/use-cases/refresh-pulls-beads.md`, `docs/specs/beads/use-cases/scheduled-beads-pull.md`.

## Error Handling

- **Pull exits non-zero**: `no_remote` or `error` as classified above. The result is kept until the next pull of that project, so a merge conflict stays visible until a later pull succeeds.
- **Timeout (30 s) or `bd` missing**: `error` with "bd dolt pull timed out" or "bd not found"; the process is killed by `subprocess.run`'s timeout.
- **One project fails**: the others are unaffected; Refresh still drops the caches and responds 204.
- **Scheduled pull fails**: logged with the project name and error; the loop continues at the next interval. An unexpected exception in a run is logged and does not stop the thread.
- **Invalid config**: startup stops with the field name (REQ-CONFIG-003, REQ-CONFIG-006).
- **Export skipped after a pull**: not handled here; REQ-BEADS-013 reports the snapshot as stale.
- **Docker**: no SSH client or key in the image, so SSH remotes give `error` with ssh's message.

## Testing

- **pytest** (`backend/tests/test_pull.py`, `test_config.py`, `test_app.py`, `test_beads_api.py`), a fake `run_bd` recording calls and concurrency:
  - Each REQ-BEADS-016 scenario: per-project calls, at most four at once, `pull: false` and missing paths skipped, `no_remote`, merge conflict, timeout, one pull at a time per project.
  - REQ-BEADS-012: refresh pulls before it clears and still answers 204 after a failure. REQ-BEADS-003: reading routes start no process (existing "No bd process" tests keep refusing `subprocess.run`), refresh starts only `bd dolt pull`.
  - REQ-BEADS-017: `PullScheduler` with a fake clock and event: runs after each interval, clears caches, logs failures (`caplog`), never starts without the setting.
  - REQ-CONFIG-006: interval parsing, minimum, `0`, `pull` boolean, defaults.
- **vitest**: `ProjectsPage.test.tsx` (REQ-BEADS-018 card lines), `PullNote` on `BeadsPage` and `MyTasksPage`, `api.test.ts` (missing or malformed `pull`).
- **TC-1** (manual by Playwright, on the deployed console): Refresh pulls gin-console and shows "pulled … ago"; gin-harness shows "no Dolt remote"; with `beads.pull_interval: 1m` on a temporary console, the pull time moves without a Refresh.

## Open Technical Questions
