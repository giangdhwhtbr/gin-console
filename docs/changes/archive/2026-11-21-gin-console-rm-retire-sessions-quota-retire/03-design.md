# Design: Retire Sessions and Quota

Epic: gin-console-rm-retire-sessions-quota

## Architecture

The console keeps its single-process layout (ADR 0001) with three bounded contexts left: `projects`, `beads` (with milestones and reports), and no agent context. The deletion runs in four steps so every step leaves a working build.

1. **Move the shared helpers out of `quota`.**
   - `backend/src/gin_console/quota/source.py` `clean` moves to `backend/src/gin_console/text.py`. `beads/models.py:6` imports it from there for its `Text` type. Its test moves from `backend/tests/test_quota_source.py` to `backend/tests/test_text.py`.
   - `backend/src/gin_console/quota/service.py` `utc_now` moves to `backend/src/gin_console/clock.py`. `app.py` imports it as the default `clock` of `create_app`.
   - `frontend/src/features/quota/format.ts` `formatAge` and `formatTimes` move to `frontend/src/lib/format.ts`, with their tests in `format.test.ts`. `PullLine.tsx` imports from there. `formatWindow` is used only by the quota cards and goes with them.
   - `frontend/src/features/quota/ProgressBar.tsx` moves to `frontend/src/components/ProgressBar.tsx`. `BeadBody.tsx` imports from there.
2. **Delete the backend contexts.**
   - Delete `backend/src/gin_console/quota/` and `backend/src/gin_console/sessions/`, with their routers, sources (the only `taskkill` and `OpenProcess` code) and models.
   - `create_app` drops `claude_home`, `run_claude`, `run_codex` and `DEFAULT_CLAUDE_HOME`, and no longer includes the two routers.
   - Tests: delete `test_quota_api.py`, `test_quota_service.py`, `test_quota_source.py`, `test_sessions_list.py`, `test_sessions_messages.py` and `claude_home.py`. Remove the `claude_home=` argument from the 12 `create_app` calls in 11 other test files.
3. **Delete the frontend features.**
   - Delete `frontend/src/features/sessions/` (8 files) and the 11 files left in `frontend/src/features/quota/`.
   - `App.tsx` loses `logRoute`, the Sessions, session log and Quota branches and their imports.
   - Tests: `App.test.tsx` and `ProjectsPage.test.tsx` drop their Sessions and Quota cases (REQ-UI-008, 012, 015, 016), and `App.test.tsx` gains one case that a retired address shows the Projects page. `Layout.test.tsx` stays as it is: its `/sessions` and `/quota` cases already check that a retired address marks no nav link (REQ-UI-057).
4. **Docker, deploy and docs.**
   - Docker: `Dockerfile` drops the `CLAUDE_VERSION` and `CODEX_VERSION` args and their `npm install`. `docker-compose.yml` drops the two read-only mounts. `.dockerignore` keeps `.claude` and `.codex`, because they keep a checkout's local agent settings out of the build context. `scripts/docker-smoke.sh` checks `uv`, `git`, `bd` and `gin`, plus that `claude`, `codex`, `~/.claude` and `~/.codex` are absent.
   - Deploy: `deploy/gin-console.service` and `deploy/README.md` name only `bd` and `gin` in the `PATH` note, and drop the Quota page message and the mounts.
   - Docs: `README.md` drops the Quota and Session Inspector features, the CLI install steps for `claude` and `codex`, and the Windows note on `taskkill` and `OpenProcess`. `AGENTS.md` drops the product description words, the `sessions` and `quota` contexts, the Claude `.jsonl`, Codex and quota sources, and the Windows note. `docs/specs/README.md` drops the two capability links. `specs archive` at ship removes the living `docs/specs/sessions` and `docs/specs/quota` folders, or ship deletes them if archive leaves empty specs.

## Data Flow

No new flow. Every remaining endpoint keeps its contract. `/api/sessions*` and `/api/quota` stop existing, so FastAPI answers 404. The console no longer reads `~/.claude` or `~/.codex` and no longer starts `claude` or `codex` processes.

## Error Handling

- An old bookmark to `/sessions`, `/sessions/<project>/<id>` or `/quota` renders the fallback of `App.tsx`, which is the Projects page today. No nav link is marked.
- `Settings` keeps `extra="forbid"`. No config ever had Sessions or Quota keys, so no file in use breaks.
- A Docker host that still has the old compose override with the two mounts keeps working: the mounts are harmless and unused.

## Testing

- Unit and API tests, by REQ:
  - REQ-BEADS-018: the `PullLine` age tests move with `formatAge` and cover "just now", minutes, hours and days.
  - REQ-UI-057: the `Layout` test above.
  - `clean`: its test in `test_text.py`.
- Full checks: `uv run --directory backend pytest`, `ruff check .` and `mypy`; `pnpm -C frontend test --run`, `typecheck`, `lint` and `build`.
- A source sweep (`grep -rnE "sessions|quota|claude|codex|taskkill|OpenProcess"` over `backend/src`, `frontend/src`, `Dockerfile`, `docker-compose.yml`, `scripts`, `deploy`) returns only intended hits, such as `sessionStorage`.
- Docker: `scripts/docker-smoke.sh` runs when Docker is available on the build host; if not, the epic says so.
- TC-1 in 05-tests.md: Playwright on the Tailscale build.

## Open Technical Questions
