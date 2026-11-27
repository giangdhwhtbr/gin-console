# Beads pull on refresh and on schedule

**Context**
Epic gin-console-5ws (2026-11-19) made "Refresh data" run `bd dolt pull` in every configured project and added `beads.pull_interval` for a scheduled pull, so the console shows beads pushed from other machines. It is the console's first write path and its first long-lived thread (ADR 0003).

**Decision/Solution**
- `backend/src/gin_console/beads/pull.py`: `PullService` owns one `ThreadPoolExecutor(max_workers=4)` for the whole server. Under one guard lock it keeps a running `Future` per project; a second pull of a running project returns that future. The worker stores its result and removes the running entry under the guard itself (no done-callbacks, so no lock re-entry). Any runner exception becomes an `error` result, so Refresh never answers 500.
- `PullScheduler` is a daemon thread started from a FastAPI lifespan only when `pull_interval > 0`; it waits on an `Event` capped at `threading.TIMEOUT_MAX`, pulls, logs failed projects, then runs the same `on_refresh` clears as Refresh.
- Measured with bd 1.0.5: with `export.auto: true` and `export.interval: 1s`, `bd dolt pull` rewrites `.beads/issues.jsonl` itself, so the console never runs `bd export`. A bead edited on both sides fails every pull with "Merge conflict detected" and leaves local data unchanged until resolved by hand. No remote prints "no remote" (exit 1). `bd init --remote <url>` clones a database from a remote; a cloned database starts with `export.auto false` and `export.interval 60s`.
- `PullResult` lives in `projects/models.py`: `projects.models` must not import `beads.pull`, which imports `projects.collect`, which imports `projects.models`.
- The systemd service reaches `git+ssh` remotes with `~/.ssh/id_ed25519` (no passphrase, no agent); the Docker image has no SSH, so pulls there fail visibly.

**Consequences**
- Refresh waits for the pulls: about 10 s for the three projects with GitHub remotes.
- With `pull_interval` 0 (the default) a restarted server has no pull result yet, so the Projects cards show no "pulled …" line until Refresh data or a scheduled pull runs. A deployed check of REQ-BEADS-018 clicks Refresh data first (gin-console-rm-retire-sessions-quota TC-1).
- Shutdown waits for a scheduled pull in progress (no join timeout).
- Since gin-console-rm-shared-attachments (ADR 0006), each pull job then runs `git fetch` of the shared attachment store, and `GET /api/projects/beads` adds `attachments_fetch`; see [shared-attachments](shared-attachments.md).
- Tests: FastAPI's `TestClient` runs the lifespan only inside `with TestClient(app)`; `BeadsSettings.model_construct(pull_interval=0.05)` gets past the one-minute minimum. Every test that posts `/api/refresh` injects `run_bd` (`backend/tests/fake_bd.py`) and `run_git` (`backend/tests/fake_git.py`); `backend/tests/conftest.py` fails a test that starts git, and two requirements refresh tests that ran the real `bd dolt pull` were fixed on 2026-11-27. PyYAML reads an unquoted `pull: no` as `false`.
- The gin pre-commit hook runs frontend lint and `tsc` even for backend-only commits, so a fresh worktree needs `pnpm -C frontend install --frozen-lockfile` before its first commit.
- bd 1.3.4 refuses writes on a remote-backed database still on an older schema (v49 to v66, 17 migrations) and only reads; the one designated migrator runs `bd migrate --force` then `bd dolt push`, and every other clone runs `bd bootstrap`. The gin-console database was migrated this way on 2026-11-24 (epic gin-console-rm-wbs-export); gin-workflow was already on 1.3.4 and gin-harness was not yet migrated.

**References**
- `backend/src/gin_console/{beads/pull.py,config.py,app.py,projects/models.py}`, `frontend/src/features/projects/PullLine.tsx` (ages from `frontend/src/lib/format.ts` since gin-console-rm-retire-sessions-quota), `frontend/src/features/beads/PullNote.tsx`, `docs/adr/0003-console-pulls-beads.md`
- Change: `docs/changes/archive/2026-11-19-gin-console-5ws-beads-pull/`; evidence `qa/evidence/2026-11-19-5ws-tc1/`
- Beads: gin-console-5ws (tracks .1–.4); related [project-card-health](project-card-health.md), [e2e-parallel-runs-and-ellipsis](e2e-parallel-runs-and-ellipsis.md)

**Scope**
Anything that runs `bd` from the console, background jobs in the server, and the Beads freshness shown on the card and pages.
