# Docker

Epic: gin-console-42m
Date: 2026-10-13

## Why

The console runs today only as a systemd user service that needs uv, pnpm, and the host's CLIs. Operators who prefer containers, or who want a reproducible environment, need an image that carries every tool the console uses and a compose file that wires in the host state (project directories, Claude and Codex login directories) without widening network exposure.

## What Changes

- A multi-stage `Dockerfile`: a frontend build stage, then a runtime stage with Python 3.12, uv, git, `bd`, `gin-workflow` (cloned at a pinned ref), and the `claude` and `codex` CLIs, all version-pinned by build args.
- A `docker-compose.yml` that mounts the config, the project directories, `~/.claude`, and `~/.codex` at the same paths as on the host, and publishes only `127.0.0.1:8700`.
- A `GIN_CONSOLE_HOST` environment override for `server.host` (the only application change), so the shared host config works in the container.
- The container runs as the host user (uid 1002) with `HOME=/home/gin`, so the existing config and Claude session paths work unchanged.
- A smoke script that checks the running container, and a Docker section in `deploy/README.md`.

## User Stories

### US-1: Run the console from a container
As the console operator, I want to start the console with `docker compose up`, so that I do not have to install uv, pnpm, or the CLIs on the host.
REQ: REQ-DOCKER-001, REQ-DOCKER-002

Acceptance criteria:
- `docker compose build` produces an image that contains `uv`, `git`, `bd`, `gin-workflow`, `claude`, and `codex`.
- `docker compose up -d` serves `/api/health` and the Projects page on `127.0.0.1:8700`.

### US-2: Use my existing config and login state
As the console operator, I want the container to read my host config, projects, and Claude/Codex directories, so that it shows the same data as the systemd service.
REQ: REQ-DOCKER-003, REQ-DOCKER-004

Acceptance criteria:
- The same `~/.config/gin-console/config.yaml` works in both modes with no path remapping.
- A project listed in the config is visible inside the container, and `bd` runs against its `.beads` without a lock error.
- `~/.claude` and `~/.codex` are visible in the container and cannot be written to from it.

### US-3: Stay reachable only through Tailscale
As the console operator, I want the container to be no more exposed than the systemd service, so that it is never reachable from the public internet.
REQ: REQ-DOCKER-005, REQ-DOCKER-007

Acceptance criteria:
- The host publishes the console only on `127.0.0.1:8700`.
- `tailscale serve` on the host reaches the container the same way it reaches the systemd service.

### US-4: Build reproducibly
As the console operator, I want the tool versions pinned, so that a rebuild gives the same image.
REQ: REQ-DOCKER-006

Acceptance criteria:
- `bd`, `claude`, `codex`, and the `gin-workflow` ref are set by build args with defaults.
- A private `gin-workflow` repository builds with a BuildKit secret, and the secret is absent from the image layers.

## Capabilities Affected

- docker (new)

## Non-goals

- A Tailscale sidecar container (the host's `tailscale serve` stays).
- Running the console publicly.
- Publishing the image to a registry.
- Multi-architecture builds (the host is arm64).
- Running systemd and Docker modes at the same time (both use port 8700).

## Success Criteria

- `scripts/docker-smoke.sh` passes against a running compose stack.
- The systemd deployment keeps working unchanged.
