# Sessions and Quota retired

**Context**
The UX review of 2026-11-21 found no way to reach the Sessions and Quota pages, and the PM retired both (roadmap v2, epic gin-console-rm-retire-sessions-quota). The console no longer reads `~/.claude` or `~/.codex` and no longer starts `claude` or `codex`.

**Decision/Solution**
- The `sessions` and `quota` contexts, pages, routes and tests are gone; `/api/sessions*` and `/api/quota` fall into the `/api/{rest:path}` 404 route, and `/sessions`, `/sessions/<p>/<id>` and `/quota` render the router fallback (`NotFoundPage` since gin-console-rm-nav-shell) with no nav link marked (REQ-UI-057).
- Helpers other features used now live in shared places: `clean` in `backend/src/gin_console/text.py` (the `Text` type of bead models), `utc_now` in `backend/src/gin_console/clock.py` (default clock of `create_app`), `formatAge` and `formatTimes` in `frontend/src/lib/format.ts` (the pull line), `ProgressBar` in `frontend/src/components/ProgressBar.tsx` (bead page children).
- `create_app` has no `claude_home`, `run_claude` or `run_codex` parameter.
- Docker: the image no longer installs `claude` or `codex`, compose no longer mounts the login directories, and `scripts/docker-smoke.sh` checks they are absent. `.dockerignore` keeps `.claude` and `.codex` to keep a checkout's local agent settings out of the build context.

**Consequences**
- AI cost in Reports was unaffected at the time; epic gin-console-5c4 (2026-11-22) later removed every `ai_usage` reading from Reports (see `reports-without-ai-usage.md`).
- `docker compose build` fails with the compose default `GIN_WORKFLOW_REF=v1.4.2`, a tag older than the `gin` executable; build with the current gin tag (`GIN_WORKFLOW_REF=v3.5.0` on 2026-11-23) until the compose default is fixed; [retired-projects-page](retired-projects-page.md) has the full Docker run.
- The runtime image still starts from `node:22-bookworm-slim` though Node is no longer needed at run time.

**References**
- Change: `docs/changes/archive/*-gin-console-rm-retire-sessions-quota-retire/`; evidence `qa/evidence/2026-11-21-retire-tc1/`
- Beads: gin-console-rm-retire-sessions-quota (tracks .1–.7); related [beads-pull](beads-pull.md)

**Scope**
Anything that looks for session logs or CLI quota in the console, the shared helpers above, and the Docker image contents.
