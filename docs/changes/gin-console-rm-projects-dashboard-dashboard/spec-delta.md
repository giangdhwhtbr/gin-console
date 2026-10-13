# Spec Delta: Dashboard

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin-workflow specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin-workflow specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...". -->

## ADDED

### REQ-CONFIG-004: Scotty base URL
WHERE `server.scotty_base_url` is set, the config SHALL accept it as an absolute `http` or `https` URL, and IF it is set to anything else, THEN the console SHALL exit with a non-zero status naming the field.

#### Scenario: Valid base URL
- GIVEN `server.scotty_base_url` is `https://host.example.ts.net`
- WHEN the console starts
- THEN it loads the config

#### Scenario: Invalid base URL
- GIVEN `server.scotty_base_url` is `host.example.ts.net` (no scheme)
- WHEN the console starts
- THEN it exits non-zero and the message names `scotty_base_url`

### REQ-SERVER-005: Workflow state per project
WHEN a client requests `GET /api/projects`, the server SHALL include for each existing project a `workflow` object with `stage`, `layout` and `gates` (gate name to state), taken from `gin-workflow state --format json` run read-only in the project directory.

#### Scenario: Workflow state present
- GIVEN a project whose `gin-workflow state --format json` reports stage `discuss` and five gates
- WHEN a client requests `GET /api/projects`
- THEN that project's `workflow` has `stage` `discuss` and the five gates with their states

### REQ-SERVER-006: Beads summary per project
WHEN a client requests `GET /api/projects`, the server SHALL include for each existing project a `beads` object with the counts `open`, `in_progress`, `blocked` and `ready`, and an `epics` list of the epics that are `in_progress` or that are `open` and ready, each with `id` and `title`, taken from read-only `bd` commands run in the project directory.

#### Scenario: Counts and active epics
- GIVEN a project with 3 open, 1 in_progress and 2 ready issues, one in_progress epic and one ready open epic
- WHEN a client requests `GET /api/projects`
- THEN `beads` has those counts and `epics` lists both epics

#### Scenario: No active epics
- GIVEN a project with no in_progress epic and no ready open epic
- WHEN a client requests `GET /api/projects`
- THEN `beads.epics` is an empty list

### REQ-SERVER-007: Per-block errors
IF a `gin-workflow` or `bd` command for a project is missing, times out, exits non-zero, or prints invalid JSON, THEN the server SHALL set that block (`workflow` or `beads`) to an object whose only content is an `error` message, and SHALL leave the other block and the other projects unaffected; for a project whose `exists` is false the server SHALL run no command and return both blocks as `null`.

#### Scenario: One block fails
- GIVEN `bd` fails for a project while `gin-workflow state` succeeds
- WHEN a client requests `GET /api/projects`
- THEN that project's `beads` is `{"error": "<message>"}` and its `workflow` has data

#### Scenario: Missing project path
- GIVEN a configured project whose path does not exist
- WHEN a client requests `GET /api/projects`
- THEN its `workflow` and `beads` are `null` and no command was run for it

### REQ-SERVER-008: Short-lived cache
The server SHALL reuse a project's collected `workflow` and `beads` data for 5 seconds, and SHALL run the commands for one project at most once at a time when requests overlap.

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

### REQ-UI-003: Workflow state display
The Projects page SHALL show, for each project with `workflow` data, the `stage` and one chip per gate whose text names the gate and its state.

#### Scenario: Stage and gates
- GIVEN a project with stage `plan` and gate `requirement_confirmed` met
- WHEN the Projects page loads
- THEN the project's card shows `plan` and a chip naming `requirement_confirmed` as met

### REQ-UI-004: Beads summary display
The Projects page SHALL show, for each project with `beads` data, the counts open, in progress, blocked and ready, and the active epics as `id` and `title`, or a "no active epics" note when the list is empty.

#### Scenario: Counts and epics
- GIVEN a project with the counts 3, 1, 0, 2 and one active epic
- WHEN the Projects page loads
- THEN the card shows all four counts and the epic id and title

### REQ-UI-005: Scotty deep links
WHERE a project has a `scotty_url`, the Projects page SHALL link the project name to it and each active epic to `<scotty_url>?bead=<id>`, in a new tab with `rel="noopener noreferrer"`, and SHALL render no link for a project without one.

#### Scenario: Link present
- GIVEN a project with `scotty_url` `https://h/p/scotty` and epic `scotty-1`
- WHEN the Projects page loads
- THEN the epic links to `https://h/p/scotty?bead=scotty-1`

#### Scenario: No Scotty id
- GIVEN a project with `scotty_url` null
- WHEN the Projects page loads
- THEN the name and epics are plain text

### REQ-UI-006: Automatic refresh
WHILE the page is visible, the Projects page SHALL reload `/api/projects` every 10 seconds without replacing the list by a loading state, and WHILE the page is hidden it SHALL not poll and SHALL reload when it becomes visible; IF a refresh fails, THEN it SHALL keep the last data and show the error with a retry button.

#### Scenario: Silent refresh
- GIVEN the list is shown and 10 seconds pass
- WHEN the page reloads the data
- THEN the list stays on screen and shows the new values

#### Scenario: Hidden tab
- GIVEN the tab becomes hidden
- WHEN 10 seconds pass
- THEN no request is made, and one request is made when the tab becomes visible

#### Scenario: Refresh failure
- GIVEN the list is shown and the next refresh fails
- WHEN the failure is received
- THEN the old list stays visible with an error message and a retry button

### REQ-UI-007: Per-block error display
IF a project's `workflow` or `beads` is an object with `error`, THEN the Projects page SHALL show that message in place of that block and SHALL still show the other block.

#### Scenario: Beads error
- GIVEN a project whose `beads` is `{"error": "bd not found"}` and whose `workflow` has data
- WHEN the Projects page loads
- THEN the card shows `bd not found` and the workflow stage

## MODIFIED

### REQ-SERVER-003: Projects endpoint
<!-- base: fe2a892558febb8b8ad3acdc9de35f83d18c6fe091d263024778e530b6943c1e -->
WHEN a client requests `GET /api/projects`, the server SHALL return the configured projects in config order, each with `name`, `path`, `scotty_id`, `scotty_url` (`<server.scotty_base_url>/p/<scotty_id>`, or `null` when either is unset), `exists` reflecting whether `path` is a directory at request time, `workflow` and `beads`.

#### Scenario: Existing and missing paths
- GIVEN two configured projects, one whose path is a directory and one whose path does not exist
- WHEN a client requests `GET /api/projects`
- THEN the response lists both with `exists` true and false respectively

#### Scenario: Path appears later
- GIVEN a configured project whose path did not exist at startup
- WHEN the directory is created and a client requests `GET /api/projects`
- THEN that project has `exists` true

#### Scenario: Scotty URL
- GIVEN `server.scotty_base_url` is `https://h` and a project has `scotty_id` `scotty`
- WHEN a client requests `GET /api/projects`
- THEN that project's `scotty_url` is `https://h/p/scotty`

#### Scenario: No Scotty URL
- GIVEN a project without `scotty_id`, or no `server.scotty_base_url`
- WHEN a client requests `GET /api/projects`
- THEN that project's `scotty_url` is `null`

## REMOVED
