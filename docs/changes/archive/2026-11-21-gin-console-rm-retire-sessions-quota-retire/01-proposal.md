# Retire Sessions and Quota

Epic: gin-console-rm-retire-sessions-quota
Kind: technical
Date: 2026-11-21

## Why

The UX review of 2026-11-21 found that the Sessions and Quota pages have no entry in the navigation: no team lead, PM, member or newcomer could reach them, and the newcomer walkthrough found raw `<command-name>` markup in session titles. The PM decided the same day to retire both pages rather than add them back (roadmap v2, epic gin-console-rm-retire-sessions-quota). Their code, tests, Docker tools and docs are still maintained, and four helpers other features depend on live inside the quota context.

User decisions 2026-11-21:
- Retire Sessions and Quota completely: pages, routes, backend contexts, tests, specs and docs.
- Approach A: also remove the `claude` and `codex` CLIs and the `~/.claude` and `~/.codex` mounts from the Docker image and the deploy docs, since nothing else in the console uses them.

## What Changes

- **Shared helpers move first:** `clean` (text cleaning for every bead field) to `gin_console/text.py`, `utc_now` (the default clock of `create_app`) to `gin_console/clock.py`, `formatAge` and `formatTimes` (the Projects pull line) to `frontend/src/lib/format.ts`, and `ProgressBar` (the bead page) to `frontend/src/components/ProgressBar.tsx`.
- **Backend:** the `sessions` and `quota` contexts are deleted; `create_app` drops its `claude_home`, `run_claude` and `run_codex` parameters; `GET /api/sessions`, `GET /api/sessions/{project}/{id}/messages` and `GET /api/quota` answer 404.
- **Frontend:** `features/sessions` and the rest of `features/quota` are deleted; `/sessions`, `/sessions/<project>/<id>` and `/quota` render what any unknown address renders (the Projects page today, the not-found page after epic gin-console-rm-nav-shell).
- **Docker and deploy:** the image no longer installs `claude` and `codex`, compose no longer mounts `~/.claude` and `~/.codex`, and the smoke test, systemd `PATH` note and deploy README follow.
- **Docs:** README, AGENTS.md and `docs/specs/README.md` drop both features; the living specs `docs/specs/sessions` and `docs/specs/quota` are removed.

## User Stories

None: a technical epic.

## Capabilities Affected

- `sessions`: REMOVED REQ-SESSIONS-001 to REQ-SESSIONS-009; the capability folder is deleted.
- `quota`: REMOVED REQ-QUOTA-001 to REQ-QUOTA-008; the capability folder is deleted.
- `ui`: REMOVED REQ-UI-008 to REQ-UI-021; MODIFIED REQ-UI-057 (no clause for `/sessions`).
- `beads`: MODIFIED REQ-BEADS-018 (states its age format instead of pointing at the Quota page).
- `docker`: MODIFIED REQ-DOCKER-001, REQ-DOCKER-003, REQ-DOCKER-004, REQ-DOCKER-006 (no `claude`, `codex` or login-directory mounts).
- `config`: no change; the config never had Sessions or Quota keys.
- Assets: none.

## Assumptions

- The roadmap's "config keys ignored with a warning" is not needed: `Settings` has no Sessions or Quota keys, so no config file in use carries one.
- ADR 0001 keeps its text; it records a past decision and names sessions and quota only as examples of contexts.
- Agent cost in Reports stays: it reads the beads' `ai_usage`, not session files.
- No gin-qa case or e2e spec covers Sessions or Quota, so `qa/` needs no change.

## Non-goals

- A replacement for session logs or quota in the console.
- The not-found page (epic gin-console-rm-nav-shell).

## Success Criteria

- No file under `backend/src`, `frontend/src`, `Dockerfile`, `docker-compose.yml`, `scripts/` or `deploy/` refers to the sessions or quota features, `claude`, `codex`, `taskkill` or `OpenProcess`.
- Backend and frontend checks and the full test suite pass.
- On the Tailscale build: the Projects page shows "pulled … ago", a bead page shows its children progress bar, Beads and Reports load, `/sessions` and `/quota` show the Projects page, and the browser logs no error.
