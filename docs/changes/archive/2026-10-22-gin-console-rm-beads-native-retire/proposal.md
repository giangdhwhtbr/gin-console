# Retire Scotty

Epic: gin-console-rm-beads-native
Date: 2026-10-22

## Why
The console now does what Scotty did for Beads: browse and search (A), Board and Focus (B), comments and authors (C) and the dependency tree (D). Scotty is no longer running, yet the console still carries its project id, base URL and an outbound link per project. This is change E, the last of five under the epic; retiring Scotty is what the epic set out to do.

## What Changes
- The config loses `server.scotty_base_url` and the project field `scotty_id`; a config that still has either stops the console with a message naming the key.
- `GET /api/projects` no longer returns `scotty_id` and `scotty_url`.
- On the Projects page the project name no longer leaves the console: it opens that project's Beads page.
- The deployment no longer assumes Scotty is served beside the console; the example config and the deploy notes lose the Scotty references.

## User Stories
### US-1: A project opens in the console
As the console owner, I want a project's name on the Projects page to open its beads inside the console, so that I never land on a tool that is gone.
REQ: REQ-UI-005, REQ-SERVER-003

Acceptance criteria:
- The project name links to `/beads?project=<name>` in the same tab; `/api/projects` carries no Scotty field.

### US-2: No Scotty settings left
As the console owner, I want the config to have no Scotty settings, and a stale one to be reported clearly, so that the config describes only what the console uses.
REQ: REQ-CONFIG-002, REQ-CONFIG-004, REQ-CONFIG-005

Acceptance criteria:
- A valid config has no Scotty key; a config with `scotty_id` or `server.scotty_base_url` exits non-zero naming that key.

### US-3: Deployment without Scotty
As the console owner, I want the deployment contract to stand on its own, so that nothing in it depends on Scotty.
REQ: REQ-DEPLOY-002

Acceptance criteria:
- The console is reachable on port 8443 through `tailscale serve`; the contract mentions no Scotty route.

## Capabilities Affected
- `config`: MODIFIED REQ-CONFIG-002; REMOVED REQ-CONFIG-004; ADDED REQ-CONFIG-005.
- `server`: MODIFIED REQ-SERVER-003.
- `ui`: MODIFIED REQ-UI-005.
- `deploy`: MODIFIED REQ-DEPLOY-002.

## Non-goals
Deleting `~/scotty` or any Scotty service, changing the `scotty` project entry (a repo with beads, it stays a normal project), editing the owner's real config or the Tailscale rules (the owner does both; the one-time commands are given in the chat, not in the repo), closing the epic, rewriting the roadmap's history.

## Success Criteria
All scenarios have tests; with the real config edited by the owner, the console starts, `/api/projects` has no Scotty field and the project names on the Projects page open `/beads?project=<name>`; the real config left as it is makes the console exit naming `scotty_id`. Nothing under `backend/src`, `frontend/src`, `config.example.yaml`, `deploy/` or the living specs mentions Scotty except the project entry named `scotty` and its path.
