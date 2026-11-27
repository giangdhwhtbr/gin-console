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

#### Scenario: Retired projects endpoint
- GIVEN the server is running
- WHEN a client requests `GET /api/projects`
- THEN the response is 404, not `index.html`, and `GET /api/projects/beads` still answers 200

#### Scenario: Frontend not built
- GIVEN `frontend/dist/index.html` does not exist
- WHEN a client requests `/`
- THEN the response is 503 and names the build command

### REQ-SERVER-006: Beads summary per project
WHEN a client requests `GET /api/projects/beads`, the server SHALL include for each existing project a `beads` object with the counts `open`, `in_progress`, `blocked` and `ready`, and an `epics` list of the epics that are `in_progress` or that are `open` and ready, each with `id`, `title` and `status` and no `workflow` (the endpoint starts no process, REQ-SERVER-010), taken from the project's `bd export` snapshot (REQ-BEADS-012) with readiness worked out as in REQ-BEADS-007, where `blocked` counts the beads that are not closed and blocked whatever their status, `in_progress` counts the in-progress beads that are not blocked (REQ-BEADS-021), and `ready` never counts a bead of type `milestone`. The counts `open`, `in_progress`, `blocked` and `ready` SHALL leave out prep tasks (REQ-BEADS-002) and merge gates (REQ-BEADS-019). The `beads` object SHALL add `prep`, the number of prep tasks that are not closed.

#### Scenario: Counts and active epics
- GIVEN a project with 3 open, 1 in_progress and 2 ready issues, one in_progress epic and one ready open epic
- WHEN a client requests `GET /api/projects/beads`
- THEN `beads` has those counts and `epics` lists both epics

#### Scenario: No active epics
- GIVEN a project with no in_progress epic and no ready open epic
- WHEN a client requests `GET /api/projects/beads`
- THEN `beads.epics` is an empty list

#### Scenario: Milestone not counted as ready
- GIVEN a project with 2 ready issues and an open milestone without blockers
- WHEN a client requests `GET /api/projects/beads`
- THEN `beads.ready` is 2

#### Scenario: Merge gates not counted
- GIVEN a project with 2 open ready tasks and an open merge gate without blockers titled `external: .planning/plans/p.md#1`
- WHEN a client requests `GET /api/projects/beads`
- THEN `beads.open` is 2 and `beads.ready` is 2

#### Scenario: Prep tasks counted apart
- GIVEN a project whose only beads are the in_progress epic `e-1`, its open ready tracks `t-1` and `t-2`, its open prep task `p-1` labelled `prep` and `prep:mockup` without blockers, and its closed prep task `p-2` labelled `prep`
- WHEN a client requests `GET /api/projects/beads`
- THEN `beads.open` is 2, `beads.in_progress` is 1, `beads.ready` is 2, `beads.blocked` is 0 and `beads.prep` is 1

#### Scenario: Blocked whatever the status
- GIVEN a bead with status `blocked` and no blocker, an in-progress bead with an open blocker, and an in-progress bead without blockers
- WHEN a client requests `GET /api/projects/beads`
- THEN `beads.blocked` counts the first two and `beads.in_progress` is 1

#### Scenario: No workflow on epics
- GIVEN in_progress epic `e-1` and ready epic `e-2`
- WHEN a client requests `GET /api/projects/beads`
- THEN `e-1` has `id`, `title` and `status` `in_progress` and no `workflow`, `e-2` has `status` `open`, and no `gin state` ran

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

### REQ-SERVER-011: Compressed responses
WHEN a client that sends `Accept-Encoding` naming `gzip` requests any path, the server SHALL compress a response body of at least 1000 bytes with gzip and send `Content-Encoding: gzip`, and SHALL send a smaller body, or any body to a client that does not accept gzip, uncompressed.

#### Scenario: Large API answer
- GIVEN a project whose bead list serializes to more than 1000 bytes
- WHEN a client sends `GET /api/beads?project=<name>&closed=1` with `Accept-Encoding: gzip`
- THEN the response has `Content-Encoding: gzip` and decompresses to the same JSON as without gzip

#### Scenario: Small answer
- GIVEN the server is running
- WHEN a client sends `GET /api/health` with `Accept-Encoding: gzip`
- THEN the response has no `Content-Encoding` header

#### Scenario: Client without gzip
- GIVEN the same project
- WHEN a client sends `GET /api/beads?project=<name>&closed=1` with `Accept-Encoding: identity`
- THEN the response has no `Content-Encoding` header

### REQ-SERVER-012: Cross-site API requests
Type: non-functional
Category: security
WHEN a request to a path under `/api/` carries the header `Sec-Fetch-Site` with the value `cross-site` or `same-site`, the server SHALL answer 403 with `{"error": "cross-site request refused"}` and SHALL NOT run the endpoint, for every method, except a GET request under `/api/requirements/mockups/<project>/files/` (REQ-REQUIREMENTS-010). A request with `Sec-Fetch-Site` `same-origin` or `none`, or without the header, SHALL be handled as before.

#### Scenario: Image from another site
- GIVEN a page of another origin with `<img src="https://<console>/api/projects/beads">`
- WHEN the browser loads it
- THEN the answer is 403 and the endpoint does not run

#### Scenario: Refresh from another site
- GIVEN a page of another origin that posts to `/api/refresh` with `mode: "no-cors"`
- WHEN the request arrives with `Sec-Fetch-Site: cross-site`
- THEN the answer is 403 and no pull runs

#### Scenario: The console itself
- GIVEN the console page
- WHEN it requests `/api/projects/beads` with `Sec-Fetch-Site: same-origin`
- THEN the answer is 200

#### Scenario: Tools
- GIVEN curl or a test client that sends no `Sec-Fetch-Site`
- WHEN it requests `/api/projects/beads`
- THEN the answer is 200

#### Scenario: Mockup files
- GIVEN a confirmed mockup whose page loads its own `style.css`
- WHEN the request arrives with `Sec-Fetch-Site: cross-site`
- THEN the file is served; a POST to the same path is refused
