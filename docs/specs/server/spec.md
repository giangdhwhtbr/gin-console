# Server

## Purpose

## Requirements

### REQ-SERVER-001: Loopback-only bind
IF `server.host` is not a loopback address and `GIN_CONSOLE_ALLOW_NON_LOOPBACK` is not `1`, THEN the console SHALL refuse to start and explain that it must run behind `tailscale serve`.

#### Scenario: Loopback host
- GIVEN `server.host` is `127.0.0.1` or `::1`
- WHEN the console starts
- THEN it starts listening

#### Scenario: Non-loopback host refused
- GIVEN `server.host` is `0.0.0.0` and the override is unset
- WHEN the console starts
- THEN it exits non-zero without listening

#### Scenario: Explicit override
- GIVEN `server.host` is `0.0.0.0` and `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1`
- WHEN the console starts
- THEN it starts listening

### REQ-SERVER-002: Health endpoint
WHEN a client requests `GET /api/health`, the server SHALL respond 200 with `status` and `version`.

#### Scenario: Health check
- GIVEN the server is running
- WHEN a client requests `GET /api/health`
- THEN the response is 200 with `{"status": "ok", "version": "<app version>"}`

### REQ-SERVER-003: Projects endpoint
WHEN a client requests `GET /api/projects`, the server SHALL return the configured projects in config order, each with `name`, `path`, `scotty_id`, and `exists` reflecting whether `path` is a directory at request time.

#### Scenario: Existing and missing paths
- GIVEN two configured projects, one whose path is a directory and one whose path does not exist
- WHEN a client requests `GET /api/projects`
- THEN the response lists both with `exists` true and false respectively

#### Scenario: Path appears later
- GIVEN a configured project whose path did not exist at startup
- WHEN the directory is created and a client requests `GET /api/projects`
- THEN that project has `exists` true

### REQ-SERVER-004: Frontend serving
The server SHALL serve the built frontend from `frontend/dist` for non-API paths, falling back to `index.html`; unknown `/api/*` paths SHALL return 404, and IF `frontend/dist` has no `index.html`, THEN non-API paths SHALL return 503 with instructions to run `pnpm -C frontend build`.

#### Scenario: Client-side route
- GIVEN `frontend/dist/index.html` exists
- WHEN a client requests `/projects`
- THEN the response is `index.html`

#### Scenario: Unknown API path
- GIVEN the server is running
- WHEN a client requests `/api/unknown`
- THEN the response is 404, not `index.html`

#### Scenario: Frontend not built
- GIVEN `frontend/dist/index.html` does not exist
- WHEN a client requests `/`
- THEN the response is 503 and names the build command
