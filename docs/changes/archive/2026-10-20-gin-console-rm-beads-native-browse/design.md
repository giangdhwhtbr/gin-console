# Design: Browse beads

Epic: gin-console-rm-beads-native

## Architecture
- Backend: new `beads/` context next to `projects/`, `sessions/` and `quota/`. `source.py` is the only module that knows the `bd` JSON shapes and returns the console's own pydantic models. It reuses the command runner of `projects/collect.py` (made public as `run_json`; it already handles missing binary, timeout, non-zero exit, invalid JSON and `OSError`) and the child environment. `service.py` holds a small keyed cache (5 s, one run per key, errors not kept) in the style of `quota/service.py`. `router.py` exposes the two endpoints through `build_router(settings, runner, clock)`; `app.py` gets `runner` and `clock` parameters so tests can fake `bd`.
- Commands (all read-only, fixed arguments, `cwd` = the project directory): list `bd list --limit 0 --json` (add `--all` for closed), detail `bd show <id> --json` plus `bd list --parent <id> --all --limit 0 --json` for an epic's children. The id is validated by regex before it can reach an argument list.
- Frontend: `features/beads/` with `api.ts` (types, guards, fetchers), `BeadsPage` (project select, search, filters, table, "Show closed"), `BeadDetailPage`, a `useBeadsQuery` helper that keeps filters in the URL, and small components (`StatusBadge`, `ProgressBar` reused from `features/quota`). Routing reuses the history API helpers. Dashboard: the epic links in `ProjectCard.tsx` point to the internal route.
- Why `bd` and not Dolt or `issues.jsonl`: `bd` is the one interface that survives schema changes (bd 1.3.1 could not read the schema of the existing project databases); `issues.jsonl` is a passive export that can be stale.

## Data Flow
Browser polls `GET /api/beads?project=&closed=` every 10 s while visible -> cache hit or `bd list` -> JSON; search and filters run in the browser on the loaded list and live in the URL. Opening a bead calls the detail endpoint (cache 5 s). `closed=1` is part of the cache key and of the URL.

## Error Handling
`bd` problems become a 502 with `{error}` (not found, timeout, non-zero exit, invalid JSON, unexpected shape); a malformed bead is skipped, not fatal. Unknown project, missing directory, invalid or unknown bead id are 404. Strings are cleaned of lone surrogates. The UI shows list errors with Retry while keeping the last data, a "Bead not found" page for 404, and an error (never a blank page) for unexpected shapes. Descriptions, titles and labels are rendered as React text only.

## Testing
Backend: a fake `bd` runner (canned JSON for list, show, children), an injected clock; list defaults and `closed=1`, unknown project, missing directory, detail with dependencies, dependents and children, unknown bead, id validation (`--help`, `../x`, encoded slashes), odd `closed` values, cache reuse/expiry/key/overlap/errors-not-kept, each failure kind, one malformed bead, lone surrogate. Frontend (vitest): guards, URL <-> filters, each filter and their combination, search, "Show closed", sort, count, empty states, refresh and hidden tab, detail with relations and epic progress, 404, errors and Retry, plain-text description, navigation, internal epic links on the project card. One real-host check: the list and detail match `bd list` and `bd show` for qwikfone.
