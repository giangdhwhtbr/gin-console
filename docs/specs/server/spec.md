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
WHEN a client requests `GET /api/projects`, the server SHALL return the configured projects in config order, each with `name`, `path`, `exists` reflecting whether `path` is a directory at request time, `workflow` and `beads`.

#### Scenario: Existing and missing paths
- GIVEN two configured projects, one whose path is a directory and one whose path does not exist
- WHEN a client requests `GET /api/projects`
- THEN the response lists both with `exists` true and false respectively

#### Scenario: Path appears later
- GIVEN a configured project whose path did not exist at startup
- WHEN the directory is created and a client requests `GET /api/projects`
- THEN that project has `exists` true

#### Scenario: No Scotty fields
- GIVEN any configured project
- WHEN a client requests `GET /api/projects`
- THEN its entry has no `scotty_id` and no `scotty_url`

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

### REQ-SERVER-005: Workflow state per project
WHEN a client requests `GET /api/projects`, the server SHALL include for each existing project a `workflow` object with `stage`, `layout` and `gates` (gate name to state), taken from `gin state --format json` run read-only in the project directory.

#### Scenario: Workflow state present
- GIVEN a project whose `gin state --format json` reports stage `discuss` and five gates
- WHEN a client requests `GET /api/projects`
- THEN that project's `workflow` has `stage` `discuss` and the five gates with their states

### REQ-SERVER-006: Beads summary per project
WHEN a client requests `GET /api/projects`, the server SHALL include for each existing project a `beads` object with the counts `open`, `in_progress`, `blocked` and `ready`, and an `epics` list of the epics that are `in_progress` or that are `open` and ready, each with `id` and `title`, taken from the project's `bd export` snapshot (REQ-BEADS-012) with readiness worked out as in REQ-BEADS-007, where `blocked` counts the beads that are not closed and blocked, and `ready` never counts a bead of type `milestone`.

#### Scenario: Counts and active epics
- GIVEN a project with 3 open, 1 in_progress and 2 ready issues, one in_progress epic and one ready open epic
- WHEN a client requests `GET /api/projects`
- THEN `beads` has those counts and `epics` lists both epics

#### Scenario: No active epics
- GIVEN a project with no in_progress epic and no ready open epic
- WHEN a client requests `GET /api/projects`
- THEN `beads.epics` is an empty list

#### Scenario: Milestone not counted as ready
- GIVEN a project with 2 ready issues and an open milestone without blockers
- WHEN a client requests `GET /api/projects`
- THEN `beads.ready` is 2

### REQ-SERVER-007: Per-block errors
IF a `gin` or `bd` command for a project is missing, times out, exits non-zero, or prints invalid JSON, THEN the server SHALL set that block (`workflow` or `beads`) to an object whose only content is an `error` message, and SHALL leave the other block and the other projects unaffected; for a project whose `exists` is false the server SHALL run no command and return both blocks as `null`.

#### Scenario: One block fails
- GIVEN `bd` fails for a project while `gin state` succeeds
- WHEN a client requests `GET /api/projects`
- THEN that project's `beads` is `{"error": "<message>"}` and its `workflow` has data

#### Scenario: Missing project path
- GIVEN a configured project whose path does not exist
- WHEN a client requests `GET /api/projects`
- THEN its `workflow` and `beads` are `null` and no command was run for it

### REQ-SERVER-008: Short-lived cache
The server SHALL reuse a project's collected `workflow` and `beads` data for 5 seconds, SHALL drop it on `POST /api/refresh` (REQ-BEADS-012), and SHALL run the commands for one project at most once at a time when requests overlap.

#### Scenario: Cache hit
- GIVEN a project's data was collected 2 seconds ago
- WHEN a client requests `GET /api/projects`
- THEN no command is run for that project

#### Scenario: Cache expired
- GIVEN a project's data was collected 6 seconds ago
- WHEN a client requests `GET /api/projects`
- THEN the commands run again

#### Scenario: Overlapping requests
- GIVEN two requests arrive while the commands for a project are running
- WHEN both complete
- THEN the commands ran once for that project

### REQ-SERVER-009: Windows script execution and environment
WHERE the server runs on Windows, the server SHALL sanitize `PATH` in `_child_env` by stripping `Scripts` under `VIRTUAL_ENV` rather than `bin`, and SHALL invoke `gin` through the `gin.cmd` (or `.bat`/`.exe`) found on `PATH`, else via `bash` (locating `bash.exe` via `PATH` or the standard Git for Windows installation path).

#### Scenario: Child environment on Windows
- GIVEN `sys.platform` is `"win32"` and `VIRTUAL_ENV` is set in the environment
- WHEN `_child_env()` is called
- THEN the sanitized `PATH` does not contain the virtualenv's `Scripts` directory

#### Scenario: gin dispatch on Windows
- GIVEN `sys.platform` is `"win32"` and a command starts with `"gin"`
- WHEN the command is prepared for subprocess execution
- THEN it is executed through the `gin.cmd` shim on `PATH`, or via `bash` when no shim exists, with the arguments preserved

## Diagrams
- [Project beads](diagrams/project-beads-activity.md)

### REQ-SERVER-010: Project beads without workflow
WHEN a client requests `GET /api/projects/beads`, the server SHALL return the configured projects in config order, each with `name`, `path`, `exists` reflecting whether `path` is a directory at request time, and `beads`: for an existing project the summary of REQ-SERVER-006 with `stale` (REQ-BEADS-013), or an object whose only content is an `error` message when its beads cannot be read (REQ-BEADS-005); for a missing project `null`. It SHALL NOT include `workflow` and SHALL NOT start any process.

#### Scenario: Summary per project
- GIVEN an existing project with 3 open, 1 in_progress and 2 ready beads, and a project whose directory does not exist
- WHEN a client requests `GET /api/projects/beads`
- THEN both are returned in config order, the first with `exists: true` and those counts and `stale: false`, the second with `exists: false` and `beads: null`, and neither has `workflow`

#### Scenario: No process
- GIVEN two existing projects with `.beads/issues.jsonl`
- WHEN a client requests `GET /api/projects/beads`
- THEN the response is 200 and no `gin` or `bd` process was started

#### Scenario: Unreadable beads
- GIVEN an existing project without `.beads/issues.jsonl`
- WHEN a client requests `GET /api/projects/beads`
- THEN that project's `beads` is `{"error": "<the REQ-BEADS-005 message>"}` and the other projects have their summaries

#### Scenario: No projects
- GIVEN a config with no projects
- WHEN a client requests `GET /api/projects/beads`
- THEN the response is `[]`
