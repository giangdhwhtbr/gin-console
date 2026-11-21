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
- Tests: FastAPI's `TestClient` runs the lifespan only inside `with TestClient(app)`; `BeadsSettings.model_construct(pull_interval=0.05)` gets past the one-minute minimum. Every test that posts `/api/refresh` injects `run_bd` (`backend/tests/fake_bd.py`). PyYAML reads an unquoted `pull: no` as `false`.
- The gin pre-commit hook runs frontend lint and `tsc` even for backend-only commits, so a fresh worktree needs `pnpm -C frontend install --frozen-lockfile` before its first commit.

**References**
- `backend/src/gin_console/{beads/pull.py,config.py,app.py,projects/models.py}`, `frontend/src/features/projects/PullLine.tsx` (ages from `frontend/src/lib/format.ts` since gin-console-rm-retire-sessions-quota), `frontend/src/features/beads/PullNote.tsx`, `docs/adr/0003-console-pulls-beads.md`
- Change: `docs/changes/archive/2026-11-19-gin-console-5ws-beads-pull/`; evidence `qa/evidence/2026-11-19-5ws-tc1/`
- Beads: gin-console-5ws (tracks .1–.4); related [project-card-health](project-card-health.md), [e2e-parallel-runs-and-ellipsis](e2e-parallel-runs-and-ellipsis.md)

**Scope**
Anything that runs `bd` from the console, background jobs in the server, and the Beads freshness shown on the card and pages.
