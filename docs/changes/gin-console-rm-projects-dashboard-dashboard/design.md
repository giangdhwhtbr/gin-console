# Design: Dashboard

Epic: gin-console-rm-projects-dashboard

## Architecture
- Backend: new `projects/collect.py` runs `gin-workflow state --format json`, `bd list --status open,in_progress --limit 0 --json`, `bd ready --limit 0 --json`, `bd blocked --json` with `cwd=project.path`, timeout 10 s, and shapes `workflow` and `beads`. `projects/router.py` merges them into each project entry. Config gets `server.scotty_base_url` (validated as http/https URL).
- Cache: dict per project name of `(timestamp, workflow, beads)`, TTL 5 s, one lock per project; projects collected in parallel with a thread pool (handlers are sync, `subprocess.run` blocks).
- Frontend: `ProjectsPage` renders one card per project (existing shadcn components, no new dependency); `api.ts` types extended.

## Data Flow
Browser polls `/api/projects` every 10 s (paused while hidden) -> router checks `exists` -> cache hit or collect -> JSON. Scotty links are built in the frontend as `<scotty_url>?bead=<id>`.

## Error Handling
Each block fails alone with `{"error": msg}` (missing binary, timeout, non-zero exit, invalid JSON). Missing path: no commands, both blocks `null`. Failed refresh keeps the last data with a retry banner. Project paths come only from config, never from the request.

## Testing
Backend: mock `subprocess.run`; shaping, cache hit/miss/expiry, overlap runs once, per-block errors, missing path, `scotty_url`, config validation. Frontend (vitest): fields rendered, gate chips, links present/absent, block errors, polling with fake timers, hidden tab, retry. One real-host check: the three projects on the live service.
