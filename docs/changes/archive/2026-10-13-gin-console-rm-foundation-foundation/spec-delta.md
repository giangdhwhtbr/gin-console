# Spec Delta: Foundation

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin-workflow specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin-workflow specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...". -->

## ADDED

### REQ-CONFIG-001: Config file location
WHEN the console starts, the console SHALL read its config from the path in `GIN_CONSOLE_CONFIG` if set, otherwise from `~/.config/gin-console/config.yaml`.

#### Scenario: Default location
- GIVEN `GIN_CONSOLE_CONFIG` is unset and `~/.config/gin-console/config.yaml` exists
- WHEN the console starts
- THEN it loads the projects from that file

#### Scenario: Environment override
- GIVEN `GIN_CONSOLE_CONFIG` points to another valid config file
- WHEN the console starts
- THEN it loads the projects from that file and ignores the default location

### REQ-CONFIG-002: Project entries
The config SHALL define `server.host`, `server.port`, and a `projects` list whose entries have a unique `name`, an absolute `path`, and an optional `scotty_id`.

#### Scenario: Valid projects
- GIVEN a config with two projects that have distinct names and absolute paths
- WHEN the console starts
- THEN both projects are loaded in config order

#### Scenario: Server defaults
- GIVEN a config without a `server` section
- WHEN the console starts
- THEN it binds to `127.0.0.1:8700`

### REQ-CONFIG-003: Invalid config stops startup
IF the config file is missing, is not valid YAML, or violates the schema (duplicate `name`, relative `path`, unknown type), THEN the console SHALL exit with a non-zero status and a message naming the file path or the failing field.

#### Scenario: Missing file
- GIVEN no file exists at the resolved config path
- WHEN the console starts
- THEN it exits non-zero and the message names the path it tried and suggests copying `config.example.yaml`

#### Scenario: Duplicate project name
- GIVEN a config with two projects named `qwikfone`
- WHEN the console starts
- THEN it exits non-zero and the message names the duplicate `name`

#### Scenario: Relative path
- GIVEN a project whose `path` is `qwikfone`
- WHEN the console starts
- THEN it exits non-zero and the message names that project's `path` field

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

### REQ-UI-001: Projects page
WHEN the Projects page loads, the frontend SHALL list every project from `/api/projects` with its name and path, and SHALL mark each project whose `exists` is false with a "missing" badge.

#### Scenario: List with a missing project
- GIVEN `/api/projects` returns one existing and one missing project
- WHEN the Projects page loads
- THEN both rows show name and path, and only the missing one shows a "missing" badge

#### Scenario: No projects
- GIVEN `/api/projects` returns an empty list
- WHEN the Projects page loads
- THEN the page says no projects are configured and names the config file

### REQ-UI-002: API error with retry
IF the request to `/api/projects` fails, THEN the Projects page SHALL show an error message and a retry button that repeats the request.

#### Scenario: Failure then retry
- GIVEN the first request to `/api/projects` fails and the second succeeds
- WHEN the user clicks retry
- THEN the error disappears and the project list is shown

### REQ-DEPLOY-001: systemd user service
The repository SHALL provide a systemd user unit that runs the console, restarts it on failure, and stops retrying after repeated start failures.

#### Scenario: Survives reboot
- GIVEN the unit is enabled with `systemctl --user enable --now gin-console` and lingering is enabled
- WHEN the host reboots
- THEN `systemctl --user status gin-console` reports active

#### Scenario: Persistent config error
- GIVEN the config file is invalid
- WHEN the service starts
- THEN systemd stops restarting it after the start limit and `journalctl --user -u gin-console` shows the config error

### REQ-DEPLOY-002: Tailscale serve on a dedicated port
The deployment SHALL expose the console through `tailscale serve` on HTTPS port 8443 proxying to `http://127.0.0.1:8700`, and SHALL remove the redundant `/bd` path while keeping Scotty at `/`.

#### Scenario: Reachable from the tailnet
- GIVEN the service is running and the serve rule is applied
- WHEN another tailnet device opens `https://<host>.ts.net:8443`
- THEN the Projects page loads

#### Scenario: Serve cleanup
- GIVEN the serve rules are applied
- WHEN the operator runs `tailscale serve status`
- THEN it lists `/` proxying to Scotty and `:8443` proxying to the console, and no `/bd` path

## MODIFIED

## REMOVED
