# Spec Delta: Beads pull

## ADDED

### REQ-BEADS-016: Pull Beads from the Dolt remote
WHEN the server pulls (on `POST /api/refresh`, REQ-BEADS-012, or on schedule, REQ-BEADS-017), it SHALL run `bd dolt pull` in the directory of each configured project that exists and does not set `pull: false` (REQ-CONFIG-006), at most four projects at a time and for at most 30 seconds each, SHALL NOT run two pulls of one project at the same time (a pull that finds one running for its project waits for it and takes its result), and SHALL keep for each project the result of its last pull: `at` (the time the pull ended, ISO 8601), `status` `ok` when the command exits 0, `no_remote` when it exits non-zero saying the project has no remote, or `error` otherwise, and `error` (the last non-empty line of the command's output, "bd dolt pull timed out" after 30 seconds, or "bd not found") or `null`. `GET /api/projects` and `GET /api/projects/beads` SHALL include for each project `pull`: that result, or `null` when the project has not been pulled since the server started or sets `pull: false`. A failed pull SHALL NOT fail the request that caused it.

#### Scenario: Pull each project
- GIVEN projects A and B with Dolt remotes and `bd dolt pull` exiting 0 in both
- WHEN the server pulls
- THEN `bd dolt pull` ran once in A's directory and once in B's, and both have `pull.status` `ok` with `at` set and `error` `null`

#### Scenario: Four at a time
- GIVEN six projects whose pulls each take a moment
- WHEN the server pulls
- THEN no more than four `bd dolt pull` processes ran at the same time and all six were pulled

#### Scenario: Opted out or missing
- GIVEN project A with `pull: false` and project B whose directory does not exist
- WHEN the server pulls
- THEN no `bd` process ran for A or B, and both have `pull` `null`

#### Scenario: No remote
- GIVEN project A whose `bd dolt pull` exits 1 with "Error: fetch from origin/main: Error 1105: no remote"
- WHEN the server pulls
- THEN A has `pull.status` `no_remote`

#### Scenario: Merge conflict
- GIVEN project A whose `bd dolt pull` exits 1 with "Error: merge origin/main: Error 1105: Merge conflict detected, @autocommit transaction rolled back." and project B whose pull exits 0
- WHEN the server pulls
- THEN A has `pull.status` `error` and `pull.error` that line, and B has `pull.status` `ok`

#### Scenario: Timeout
- GIVEN project A whose `bd dolt pull` runs longer than 30 seconds
- WHEN the server pulls
- THEN the command is stopped and A has `pull.status` `error` and `pull.error` "bd dolt pull timed out"

#### Scenario: One pull at a time per project
- GIVEN a pull of project A that is running
- WHEN the server pulls again
- THEN the second pull waits for the first and takes its result, and only one `bd dolt pull` ran in A

### REQ-BEADS-017: Scheduled pull
WHERE the config sets `beads.pull_interval` (REQ-CONFIG-006), the server SHALL pull as in REQ-BEADS-016 once that interval after it starts and again that interval after each scheduled pull ends, SHALL then drop every snapshot and cached answer as `POST /api/refresh` does, and SHALL log each project whose pull failed with its name and error; WHERE the setting is absent or `0`, the server SHALL NOT pull on its own.

#### Scenario: Every interval
- GIVEN `beads.pull_interval: 5m` and a clock at the server's start time
- WHEN the clock passes 5 minutes, and then 5 minutes after that pull ended
- THEN the server pulled twice, and after each pull the next list request reads `.beads/issues.jsonl` again

#### Scenario: Off by default
- GIVEN a config without `beads`
- WHEN the server runs for an hour without a refresh
- THEN no `bd` process was started

#### Scenario: Failed scheduled pull logged
- GIVEN `beads.pull_interval: 5m` and project A whose pull exits 1 with a merge conflict
- WHEN the scheduled pull runs
- THEN the server log names A and the error, and A has `pull.status` `error`

### REQ-BEADS-018: Pull status display
The Projects page SHALL show on each project card whose `pull` is not `null`: "pulled " and the age of `pull.at` written as the Quota page writes ages (REQ-UI-018, for example "pulled 2 minutes ago" or "pulled just now") when `pull.status` is `ok`, "no Dolt remote" when it is `no_remote`, and "pull failed: <error>" marked as an error when it is `error`, with the full `at` time as its `title`; and WHERE the `pull` of a project in `GET /api/projects/beads` has `status` `error`, the Beads page with that project selected and the My Tasks page SHALL show, above their list, the note "Pulling Beads of <project> failed: <error>. Run `bd dolt pull` in <path>." once per such project, and SHALL show no such note for a project whose `pull` is `null`, missing, or not `error`.

#### Scenario: Pulled
- GIVEN project A with `pull` `{"status": "ok", "at": <2 minutes ago>, "error": null}`
- WHEN the Projects page loads
- THEN A's card shows "pulled 2 minutes ago"

#### Scenario: No remote
- GIVEN project B with `pull.status` `no_remote`
- WHEN the Projects page loads
- THEN B's card shows "no Dolt remote" and no error

#### Scenario: Failed pull on the card
- GIVEN project A with `pull` `{"status": "error", "error": "Merge conflict detected", …}`
- WHEN the Projects page loads
- THEN A's card shows "pull failed: Merge conflict detected" as an error and its beads counts as before

#### Scenario: Failed pull note
- GIVEN projects A whose `pull.status` is `error` and B whose `pull` is `null`
- WHEN My Tasks opens, and then the Beads page opens with A selected
- THEN each page shows one note naming A, its error, `bd dolt pull` and A's path, none names B, and the lists are shown below it

#### Scenario: Older backend
- GIVEN projects without a `pull` key
- WHEN the Projects, Beads and My Tasks pages load
- THEN no pull line and no pull note is shown

### REQ-CONFIG-006: Pull settings
The config SHALL accept an optional top-level `beads` section whose `pull_interval` is `0` or a duration of whole seconds, minutes or hours written as `<n>s`, `<n>m` or `<n>h`, of at least one minute, and an optional `pull` boolean (default `true`) on each project entry; IF `pull_interval` does not parse, is under one minute and not `0`, or `pull` is not a boolean, THEN the console SHALL exit with a non-zero status and a message naming the field (REQ-CONFIG-003).

#### Scenario: Interval and opt-out
- GIVEN a config with `beads: {pull_interval: 5m}` and a project with `pull: false`
- WHEN the console starts
- THEN the pull interval is 300 seconds and that project is left out of pulls

#### Scenario: Defaults
- GIVEN a config without `beads` and projects without `pull`
- WHEN the console starts
- THEN there is no scheduled pull and every project is pulled on refresh

#### Scenario: Too short
- GIVEN a config with `beads: {pull_interval: 30s}`
- WHEN the console starts
- THEN it exits non-zero and the message names `beads.pull_interval`

## MODIFIED

### REQ-BEADS-003: Safe, read-only commands
<!-- base: a779b303f4b1f20baa6de93926894995267b24844f5ccdce41e075b80420dc2b -->
The server SHALL NOT run any `bd` command other than `bd dolt pull` in a project directory when it pulls (REQ-BEADS-016), SHALL otherwise only read files under the project's `.beads` directory, SHALL accept a bead `id` only when it matches `[A-Za-z0-9][A-Za-z0-9._-]*` and respond 404 otherwise, SHALL treat any `closed` value other than `1` as absent without failing the request, and SHALL never itself create, update, close or delete a bead or write a file under `.beads`.

#### Scenario: Option-like id
- GIVEN a request for the bead `--help` or `../x`
- WHEN the server handles it
- THEN the response is 404 and no file outside `.beads/issues.jsonl` was read

#### Scenario: Odd closed value
- GIVEN a request with `closed=../x` or `closed=true`
- WHEN the server handles it
- THEN the response is 200 and closed beads are left out

#### Scenario: No bd process
- GIVEN a project with `.beads/issues.jsonl`
- WHEN a client requests its list, a bead, its comments, `GET /api/projects`, `GET /api/projects/beads` and a report
- THEN no `bd` process was started

#### Scenario: Only pull
- GIVEN two projects with Dolt remotes
- WHEN a client sends `POST /api/refresh`
- THEN the only `bd` commands started were one `bd dolt pull` in each project's directory

### REQ-BEADS-012: Export snapshot and refresh
<!-- base: fa3e787168a4165006bb191c55392c22a6b85e8806a89e6a7d841e592572afde -->
The server SHALL keep, per project, the beads that `.beads/issues.jsonl` holds (with their labels, dependencies and comments) and SHALL take a bead's `parent` from its `parent-child` dependency. It SHALL read the file again WHEN its modification time or size differs from when the snapshot was taken, and SHALL NOT read it again while both are unchanged. WHEN a client sends `POST /api/refresh`, the server SHALL pull the projects (REQ-BEADS-016) and wait for those pulls to end, then drop every snapshot and every cached answer (projects, milestones, reports) and respond 204, whether or not a pull failed, so that the next request reads its sources again.

#### Scenario: Unchanged file
- GIVEN a snapshot taken from a file of 2000 bytes modified at `t1`
- WHEN a client requests the list and the file still has that size and time
- THEN the file is not read again

#### Scenario: Changed file
- GIVEN a snapshot taken from a file modified at `t1`
- WHEN bd writes the file again, it is now modified at `t2`, and a client requests the list
- THEN the file is read again and the list shows the change

#### Scenario: Refresh
- GIVEN a project whose snapshot is current and a report cached less than 60 seconds ago
- WHEN a client sends `POST /api/refresh` and then requests the list and the report
- THEN the project was pulled before the response, the response to the refresh is 204, and the file is read again and the report is built again

#### Scenario: Refresh after a failed pull
- GIVEN a project whose `bd dolt pull` exits 1
- WHEN a client sends `POST /api/refresh`
- THEN the response is 204, the caches are dropped, and the project's `pull.status` is `error`

## REMOVED
