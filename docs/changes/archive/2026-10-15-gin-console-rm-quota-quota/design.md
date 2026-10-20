# Design: Quota

Epic: gin-console-rm-quota

## Architecture
- Principle: do not recompute what the CLIs already report. Both numbers come from the interface each tool provides; the console only runs it, parses it and caches it.
- Backend: new `quota/` context next to `projects/` and `sessions/`. `source.py` is the only module that knows the two formats and returns the console's own pydantic models. `router.py` exposes `GET /api/quota[?refresh=1]` through `build_router(run_claude, run_codex, clock)`; `app.py` gets those as parameters so tests can fake them (defaults: real subprocess runners and `time`). No config key: each command is found on `PATH`, `claude` also at `~/.local/bin/claude`.
- Claude: `claude -p /usage --no-session-persistence` in a temporary neutral directory, stdin closed, 30 s timeout. `/usage` is a local command (no model call, no quota spent, about 4 s), so no model flag. The CLI has no structured form of it (no `usage` subcommand; `--output-format json` only wraps the same text), so the parser accepts lines `Current <label>: <N>% used · resets <date> (UTC)` and reports anything else as an error with the raw text.
- Codex: `codex app-server` over stdio JSON-RPC (the protocol Codex itself publishes): `initialize`, `initialized`, `account/rateLimits/read`; read the `rateLimits` object (`planType`, `primary`/`secondary` with `usedPercent`, `windowDurationMins`, `resetsAt`), `ordinaryUsageAllowed`, `rateLimitReachedType` and `rateLimitResetCredits.availableCount`. Live from the server (about 1 s). The process is always terminated, including on timeout.
- Why not the session files: the newest rate-limit event on the host dates from 2026-10-07 and says plan "plus" at 100 %/16 %; the live answer is plan "free" with a 30-day window at 0 %. Scanning files would have shown wrong numbers.
- Caching: each side is cached for 5 minutes on success only; `refresh=1` bypasses the cache unless that side ran under 30 s ago; one run at a time per side (a lock).
- Frontend: `features/quota/` with `api.ts` (types, guard, fetch with optional refresh), a shared `useQuota` (one request for the strip and the page, polled every 60 s with `useVisibleInterval`; the server cache keeps the commands rare), `QuotaStrip`, `QuotaPage`, `ClaudeCard`, `CodexCard`, and a status helper implementing the thresholds. The strip is rendered by `ProjectsPage`. Routing reuses the history API helpers.

## Data Flow
Request -> per side: cache hit or run the command (one at a time) -> parse -> JSON. Claude's date is converted to ISO UTC (year from now, rolled forward when the date is more than 12 h in the past); Codex epochs become ISO UTC. The browser polls every 60 s while visible; "Refresh" sends `refresh=1` and disables itself until the response arrives.

## Error Handling
Each side is computed in its own try block; a failure becomes `{error}` for that side (command not found, timeout, non-zero exit, RPC error, unexpected shape), and unparseable Claude output carries `raw` (cut to 4 000 characters) so nothing is guessed. Strings are cleaned of lone surrogates. The commands are fixed and take nothing from the request. The UI shows per-side errors in place, a global Alert with Retry for request failures or unexpected shapes, and keeps the last data when a refresh fails.

## Known limits
- `/usage` prints text for people and may change between Claude Code versions; a changed format shows as an error with the raw text.
- It needs a subscription login. The Codex app server needs a logged-in Codex.
- In the Docker image `~/.claude` and `~/.codex` are mounted read-only, so either CLI may be unable to refresh its login token or write its own state there.
- The Codex app server is marked experimental in the CLI; the protocol may change.
- The Codex reset credits are only shown; claiming one (`account/rateLimitResetCredit/consume`) is out of scope.

## Testing
Backend: a fake `run_claude` (canned outputs for session/week, extra week lines, minutes in the time, year rollover, no-match, non-zero exit, timeout, not found, fallback location) and a fake `run_codex` or a small fake `codex` script speaking the JSON-RPC lines (one window, two windows, limit reached, error answer, no answer, bad shape, process always ended), an injected clock, cache reuse/expiry/forced refresh/too-soon refresh/error-not-kept/overlap, lone surrogate in `raw`, fixed arguments. Frontend (vitest): guard, status thresholds, cards, strip and page states, polling and hidden tab, Refresh button, navigation, strip failing without breaking the Projects page. One real-host check: the page matches `claude /usage` and the live Codex answer.
