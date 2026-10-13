# Foundation

Epic: gin-console-rm-foundation
Date: 2026-10-12

## Why

gin-console needs a runnable base before any monitoring screen can exist: a FastAPI + React app that knows which projects to show and is reachable only from the tailnet. Every later roadmap epic (projects-dashboard, claude-sessions, quota, beads-native) plugs into it.

## What Changes

- New `backend/` (uv, FastAPI, Python 3.12) and `frontend/` (Vite, React, TypeScript, Tailwind, shadcn/ui, pnpm).
- YAML config at `~/.config/gin-console/config.yaml` (override with `GIN_CONSOLE_CONFIG`) listing the projects to show.
- One process on `127.0.0.1:8700` serving `/api/*` and the built frontend, with a loopback-only bind guard.
- A Projects page listing configured projects, flagging missing paths.
- systemd user unit, and `tailscale serve` on `:8443`; the redundant `/bd` serve path is removed.
- Lint, typecheck, test, and build commands wired into `verify.checks` and git hooks.

## User Stories

### US-1: Configure which projects appear
As the console operator, I want to declare my projects in one config file, so that only those projects appear in the console.
REQ: REQ-CONFIG-001, REQ-CONFIG-002, REQ-SERVER-003, REQ-UI-001

Acceptance criteria:
- A project listed in the config appears on the Projects page with its name and path.
- A project not listed in the config does not appear.
- A listed project whose path does not exist appears with a "missing" badge.

### US-2: Reach the console only from my tailnet
As the console operator, I want the console reachable only through Tailscale, so that it is never exposed to the public internet.
REQ: REQ-SERVER-001, REQ-DEPLOY-002

Acceptance criteria:
- The server refuses to start on a non-loopback host unless explicitly allowed.
- The console opens at `https://<host>.ts.net:8443` from another tailnet device.
- Scotty remains reachable at `/` of the tailnet host.

### US-3: Keep the console running
As the console operator, I want the console to run as a service, so that it survives crashes and reboots without manual restarts.
REQ: REQ-SERVER-002, REQ-DEPLOY-001

Acceptance criteria:
- After a reboot, `systemctl --user status gin-console` reports active.
- `GET /api/health` returns 200 while the service runs.

### US-4: Get clear feedback when something is wrong
As the console operator, I want clear errors for bad config, a missing frontend build, or a failed API call, so that I can fix the cause quickly.
REQ: REQ-CONFIG-003, REQ-SERVER-004, REQ-UI-002

Acceptance criteria:
- A missing or invalid config stops startup with a message naming the file or the failing field.
- Opening the console before the frontend is built shows how to build it.
- A failed API call shows an error with a retry button on the Projects page.

## Capabilities Affected

- config (new)
- server (new)
- ui (new)
- deploy (new)

## Non-goals

- Authentication (Tailscale is the only access control).
- Any data collector: gin-workflow state, Beads, sessions, quota (later epics).
- Config hot reload (restart the service instead).
- End-to-end tests.

## Success Criteria

- All REQs in `spec-delta.md` have passing automated tests, except REQ-DEPLOY-001 and REQ-DEPLOY-002 which are verified by the manual cases in `tests.md`.
- `verify.checks` lint, typecheck, test, and build pass and run in git hooks.
- The Projects page is reachable from another tailnet device at `:8443`.
