# Docker

## Purpose

## Requirements

### REQ-DOCKER-001: Image contains the required tools
The Dockerfile SHALL build an image that provides `uv`, `git`, `bd`, `gin-workflow`, `claude`, and `codex` on the `PATH`, the backend installed from `uv.lock`, and the built frontend.

#### Scenario: Tools present
- GIVEN the image was built with default build args
- WHEN `uv --version`, `git --version`, `bd --version`, `gin-workflow --version`, `claude --version`, and `codex --version` run in the container
- THEN each exits 0

#### Scenario: Frontend bundled
- GIVEN the image was built
- WHEN the container starts with a valid config
- THEN `GET /` returns the built frontend

### REQ-DOCKER-002: Compose starts the console
WHEN `docker compose up -d` runs with a valid config, the console SHALL serve `GET /api/health` with status 200 on `127.0.0.1:8700` of the host.

#### Scenario: Healthy start
- GIVEN a valid `~/.config/gin-console/config.yaml`
- WHEN `docker compose up -d` completes
- THEN `curl http://127.0.0.1:8700/api/health` returns 200

#### Scenario: Invalid config
- GIVEN an invalid config file
- WHEN the container starts
- THEN it exits with a non-zero status and `docker compose logs` shows the config error

### REQ-DOCKER-003: Host paths are preserved
The container SHALL run as the host user with `HOME=/home/gin`, and the compose file SHALL mount the config file, each project directory, `~/.claude`, and `~/.codex` at the same absolute paths they have on the host.

#### Scenario: Shared config
- GIVEN the config lists `/home/gin/qwikfone`
- WHEN the container starts
- THEN `/home/gin/qwikfone` exists inside the container and the Projects page lists it without a "missing" badge

#### Scenario: Same config in both modes
- GIVEN the systemd service uses `~/.config/gin-console/config.yaml`
- WHEN the container starts from the same file
- THEN both show the same project list

### REQ-DOCKER-004: Mount permissions
The compose file SHALL mount project directories read-write and `~/.claude` and `~/.codex` read-only.

#### Scenario: Beads works
- GIVEN a project with a `.beads` directory is mounted
- WHEN `bd list` runs in the container against that project
- THEN it succeeds without a lock error

#### Scenario: Login directories are read-only
- GIVEN `~/.claude` is mounted
- WHEN a process in the container tries to create a file under `~/.claude`
- THEN the write fails with a read-only filesystem error

### REQ-DOCKER-005: Loopback-only exposure
The compose file SHALL publish the console port only on `127.0.0.1`, and the container SHALL bind `0.0.0.0` only together with `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1`.

#### Scenario: Not reachable from other interfaces
- GIVEN the stack is running
- WHEN a request goes to the host's non-loopback address on port 8700
- THEN the connection is refused

#### Scenario: Reachable through tailscale serve
- GIVEN `tailscale serve --https=8443` points at `http://127.0.0.1:8700`
- WHEN a tailnet device opens the `:8443` URL
- THEN it shows the Projects page

### REQ-DOCKER-006: Pinned and secret-safe build
The Dockerfile SHALL set the versions of `bd`, `claude`, `codex`, and the `gin-workflow` git ref through build args with defaults, and SHALL accept git credentials only through BuildKit secrets.

#### Scenario: Pinned versions
- GIVEN no build args are overridden
- WHEN the image is built twice
- THEN both builds install the same tool versions

#### Scenario: No secret in layers
- GIVEN the image was built with a git secret
- WHEN `docker history` and the image filesystem are inspected
- THEN the secret value is not present

### REQ-DOCKER-007: Host override
WHERE `GIN_CONSOLE_HOST` is set, the console SHALL use its value as `server.host` instead of the value in the config file, and SHALL apply the same non-loopback bind guard to it.

#### Scenario: Override applies
- GIVEN the config sets `server.host: 127.0.0.1` and `GIN_CONSOLE_HOST=0.0.0.0` and `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1`
- WHEN the console starts
- THEN it binds `0.0.0.0`

#### Scenario: Guard still applies
- GIVEN `GIN_CONSOLE_HOST=0.0.0.0` and `GIN_CONSOLE_ALLOW_NON_LOOPBACK` is unset
- WHEN the console starts
- THEN it exits with a non-zero status and a message that names the refused host
