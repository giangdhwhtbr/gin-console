# Single process, modules per bounded context

Date: 2026-10-12
Status: proposed

## Context

gin-console is a read-only, single-user console reached through Tailscale. Its data comes from files and CLIs whose formats are not under our control (`gin-workflow`, `bd`, Claude `.jsonl`, Codex session files). Later roadmap epics add projects, sessions, quota, and Beads views independently.

## Decision

- Run one process: FastAPI serves `/api/*` and the built React frontend on `127.0.0.1:8700`, exposed by `tailscale serve`. No separate static server or reverse proxy.
- Organize backend and frontend by bounded context, one per roadmap epic (`projects`, `sessions`, `quota`, `beads`): backend `gin_console/<context>/{models,source,router}.py`, frontend `src/features/<context>/`.
- Wrap each external data source in one `source.py` that returns the console's own pydantic models, tested with fixtures.
- Do not adopt full DDD (aggregates, repositories, domain events): there are no write paths or invariants to protect. Extract shared interfaces only when a second implementation exists.

## Consequences

- One systemd unit and one serve rule to operate.
- Frontend changes require `pnpm -C frontend build` and a service restart.
- A source format change touches one `source.py` and its fixtures.
- New epics add a context folder without editing other contexts.
