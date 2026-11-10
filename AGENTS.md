# Agent Instructions

gin-console is a read-only web console (FastAPI + React) for gin-workflow projects, Beads, agent sessions, and AI CLI quota. User docs: `README.md`; decisions: `docs/adr/`; roadmap: `docs/roadmap.md`; specs: `docs/specs/`.

## Commands

```bash
uv --directory backend sync && pnpm -C frontend install
uv run --directory backend -m gin_console                  # API + built UI on 127.0.0.1:8700
uv run --directory backend -m uvicorn gin_console.app:create_app --factory --reload --port 8700
pnpm -C frontend dev                                       # Vite on :5173, proxies /api to :8700
uv run --directory backend pytest                          # backend tests
uv run --directory backend pytest tests/test_collect.py -k <name>
uv run --directory backend ruff check . && uv run --directory backend mypy   # mypy is strict
pnpm -C frontend test --run                                # vitest; without --run it watches
pnpm -C frontend test --run src/app/route.test.ts
pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build
```

Config: `~/.config/gin-console/config.yaml` (override with `GIN_CONSOLE_CONFIG`); see `config.example.yaml`.

## Architecture

See `docs/adr/0001-single-process-modular-contexts.md`.

- One process: `create_app` in `backend/src/gin_console/app.py` serves `/api/*` and the built `frontend/dist` with SPA fallback. A UI change shows in the served app only after `pnpm -C frontend build` and a restart.
- One bounded context per roadmap epic (`projects`, `sessions`, `quota`, `beads`): backend `gin_console/<context>/{models,source,router}.py` (plus `service.py` where needed), frontend `src/features/<context>/`. A new context adds a folder without editing the others.
- Each external source (`gin` CLI from gin-workflow, `bd`, Claude `.jsonl`, Codex session files, CLI quota output) is wrapped in one `source.py` returning the console's pydantic models, tested with fixtures and fakes (`backend/tests/fake_bd.py`, `fakes.py`, `claude_home.py`). External commands are injected into `create_app`, so tests never run real CLIs.
- Read-only: never mutate projects, Beads, or sessions; show a command or deep link instead.
- Linux, macOS, and native Windows: `projects/collect.py` runs `gin` through its `gin.cmd` shim (or Git Bash) on Windows, quota uses `taskkill`, session liveness uses `OpenProcess`. Keep those paths working.
- Frontend: React 19, Tailwind 4, shadcn/base-ui; `@/` is `frontend/src`.

## Task tracking

This project uses **bd (beads)**. The session hooks inject `bd prime`; run it yourself when context is missing.

- Use `bd` for all task tracking and `bd remember` for durable memory; no markdown TODO lists or memory files.
- Do not commit, push, or `bd dolt push` unless asked. At handoff, report changed files, validation, and suggested next commands.
- Cross-repo epics with gin-workflow live in `../gin-harness` (see its `AGENTS.md`).

Use non-interactive flags (`cp -f`, `mv -f`, `rm -f`, `ssh -o BatchMode=yes`); shell aliases may add `-i`.
