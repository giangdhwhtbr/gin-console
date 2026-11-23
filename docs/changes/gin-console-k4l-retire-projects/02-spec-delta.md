# Spec Delta: Retire the Projects page and page project filters

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     A requirement taken from a confirmed input adds "Source:" after its statement, with backticked paths
     relative to the living spec.md, such as `assets/<YYYY-MM-DD>/mockup/index.html#<screen-id>`.
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...".
     A requirement may add, right under its heading, `Type: functional | non-functional | business-rule`
     (default functional). A non-functional one adds `Category:` (performance, security, reliability,
     usability, compatibility, maintainability, portability, constraint) and either a scenario or `Measure:`
     with a measurable target; it needs no activity diagram. A business rule keeps a scenario; use cases
     cite it on `Requirements:`. -->

## ADDED

## MODIFIED

### REQ-SERVER-004: Frontend serving
<!-- base: c7ca6d07e05396f1887e8c2c37d38ac526a3d79f63f5efce95397640c64aed91 -->
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
<!-- base: ea632040456d264598ebdba68a69aee62e7d23c2137896fb259941124ee760fc -->
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

### REQ-BEADS-003: Safe, read-only commands
<!-- base: f92fbf6c7ff69949340b7fcddc1e8b18ce1007d980b6fdb7f3f29b623665ba72 -->
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
- WHEN a client requests its list, a bead, its comments, `GET /api/projects/beads` and a report
- THEN no `bd` process was started

#### Scenario: Only pull
- GIVEN two projects with Dolt remotes
- WHEN a client sends `POST /api/refresh`
- THEN the only `bd` commands started were one `bd dolt pull` in each project's directory

### REQ-BEADS-005: Failures
<!-- base: b68c592cd518efb11a44da8c0df8c6fbf757281a3c2919fd4a2e449e71a3fc62 -->
IF a project's `.beads/issues.jsonl` does not exist, THEN the server SHALL respond 502 with an `error` that names the file and says to run `bd config set export.auto true` and `bd config set export.interval 1s` in the project, then any bd write or `bd export -o .beads/issues.jsonl`; IF the file cannot be read or a non-empty line is not a JSON object, THEN the server SHALL respond 502 with an `error` that says which; and the server SHALL leave out of a list any bead whose fields have the wrong types instead of failing the list. The `beads` block of `GET /api/projects/beads` SHALL carry the same message as its `error` (REQ-SERVER-010).

#### Scenario: Missing file
- GIVEN a project whose `.beads` has no `issues.jsonl`
- WHEN a client requests its list
- THEN the response is 502 and `error` names `.beads/issues.jsonl` and `bd config set export.auto true`

#### Scenario: Malformed line
- GIVEN a file whose second line is `[1, 2]`
- WHEN a client requests the list
- THEN the response is 502 and `error` says a line is not a JSON object

#### Scenario: One malformed bead
- GIVEN a file with 3 beads of which one has a numeric `title`
- WHEN a client requests the list
- THEN the 2 valid beads are returned

#### Scenario: Projects block
- GIVEN a project whose `.beads` has no `issues.jsonl`
- WHEN a client requests `GET /api/projects/beads`
- THEN that project's `beads` is `{"error": "<the same message>"}`

### REQ-BEADS-012: Export snapshot and refresh
<!-- base: 1a1b7a6856ff7466da59ac4cbcc8ed44fe155c1b2d79bee668e6e642d800edbb -->
The server SHALL keep, per project, the beads that `.beads/issues.jsonl` holds (with their labels, dependencies and comments) and SHALL take a bead's `parent` from its `parent-child` dependency. It SHALL read the file again WHEN its modification time or size differs from when the snapshot was taken, and SHALL NOT read it again while both are unchanged. WHEN a client sends `POST /api/refresh`, the server SHALL pull the projects (REQ-BEADS-016) and wait for those pulls to end, then drop every snapshot and every cached answer (milestones, reports) and respond 204, whether or not a pull failed, so that the next request reads its sources again.

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

### REQ-BEADS-013: Stale export
<!-- base: a896831ff45833299b9f47ce3b29fe258ddd836266e35aa29e98e106098427af -->
The server SHALL record, each time it reads a project's `.beads/issues.jsonl`, the content of the project's embedded Dolt manifests (`.beads/embeddeddolt/*/.dolt/noms/manifest`), and SHALL report the project's export as stale WHILE that content differs from the recorded content and the file has not changed since; WHERE a project has no such manifest, its export SHALL never be stale. `GET /api/projects/beads` SHALL include `stale` (a boolean) in the `beads` object of each project whose beads were read.

#### Scenario: Fresh export
- GIVEN the file was read when the manifest held `root-1`, and the manifest still holds `root-1`
- WHEN a client requests `GET /api/projects/beads`
- THEN that project's `beads.stale` is `false`

#### Scenario: Export catches up
- GIVEN a project whose export is stale
- WHEN the file is written again and a client requests `GET /api/projects/beads` at once
- THEN the file is read again and `beads.stale` is `false`

#### Scenario: No manifest
- GIVEN a project without an embedded Dolt manifest
- WHEN a client requests `GET /api/projects/beads`
- THEN its `beads.stale` is `false`

#### Scenario: Project beads without reuse
- GIVEN the file was read when the manifest held `root-1`
- WHEN a bead is written, the manifest now holds `root-2`, the file is unchanged, and a client requests `GET /api/projects/beads` at once
- THEN that project's `beads.stale` is `true`

### REQ-BEADS-016: Pull Beads from the Dolt remote
<!-- base: 64da543ed1646129c079af7a6a5706754783c8ed8d98efc4760e5b73d47163d2 -->
WHEN the server pulls (on `POST /api/refresh`, REQ-BEADS-012, or on schedule, REQ-BEADS-017), it SHALL run `bd dolt pull` in the directory of each configured project that exists and does not set `pull: false` (REQ-CONFIG-006), at most four projects at a time and for at most 30 seconds each, SHALL NOT run two pulls of one project at the same time (a pull that finds one running for its project waits for it and takes its result), and SHALL keep for each project the result of its last pull: `at` (the time the pull ended, ISO 8601), `status` `ok` when the command exits 0, `no_remote` when it exits non-zero saying the project has no remote, or `error` otherwise, and `error` (the last non-empty line of the command's output, "bd dolt pull timed out" after 30 seconds, or "bd not found") or `null`. `GET /api/projects/beads` SHALL include for each project `pull`: that result, or `null` when the project has not been pulled since the server started or sets `pull: false`. A failed pull SHALL NOT fail the request that caused it.

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

### REQ-BEADS-018: Pull status display
<!-- base: 3ceab845a8b7c4c1998a40fe5782c9c4390f1506107d6003cb41e911a7f10ee5 -->
WHERE the `pull` of a project in `GET /api/projects/beads` has `status` `error`, the Beads page and the My Tasks page SHALL show, above their list and while that project is the current project (REQ-UI-124), the note "Pulling Beads of <project> failed: <error>. Run `bd dolt pull` in <path>." once, and SHALL show no such note for another project or for a project whose `pull` is `null`, missing, or not `error`.

#### Scenario: Failed pull note
- GIVEN projects A whose `pull.status` is `error` and B whose `pull` is `null`
- WHEN My Tasks opens with A as the current project, and then the Beads page opens with A selected
- THEN each page shows one note naming A, its error, `bd dolt pull` and A's path, none names B, and the lists are shown below it

#### Scenario: Older backend
- GIVEN projects without a `pull` key
- WHEN the Beads and My Tasks pages load
- THEN no pull note is shown

### REQ-BEADS-020: Workflow of an epic
<!-- base: fa4017818d1ea74384cb49bd7bbb54f01edf801876a3039d729496a77f0a47b1 -->
WHEN a client requests `GET /api/beads/{project}/{id}/workflow`, the server SHALL run `gin state --workflow-id <id> --format json` in the project's directory, and SHALL answer the `stage`, `gates`, `warnings` and `review_waivers` it reports; IF the command fails or its output cannot be read, THEN the server SHALL answer 502 with `{"error": <message>}`; the server SHALL answer 404 when the project is not configured or the bead is not in its export, and SHALL serve the same answer for the same project and id for 60 seconds unless `POST /api/refresh` dropped it.

#### Scenario: Stage of an epic
- GIVEN epic `e-1` whose `gin state --workflow-id e-1` reports stage `execute`, gates `{"plan_approved": "satisfied", "shipped": "unmet"}`, one warning and no waiver
- WHEN a client requests `GET /api/beads/p/e-1/workflow`
- THEN the answer is 200 with that stage, those gates, the warning and an empty `review_waivers`

#### Scenario: Command fails
- GIVEN `gin state --workflow-id e-1` exits non-zero with "unknown workflow"
- WHEN a client requests the workflow of `e-1`
- THEN the answer is 502 with an `error` naming the failure, and it is not cached

#### Scenario: Unknown bead
- GIVEN no bead `nope` in project `p`
- WHEN a client requests `GET /api/beads/p/nope/workflow`
- THEN the answer is 404 and no command ran

### REQ-BEADS-021: One rule for blocked and in-progress counts
<!-- base: 6fc8f7d7dc3a08df02d2d2762dc31f1416042bc85856c9e3735216e7c907201d -->
Type: business-rule
Every count of blocked beads in the console (the `blocked` counts of `GET /api/projects/beads`, REQ-SERVER-006; the Board and Focus columns, REQ-UI-031 and REQ-UI-033; the Team figures, REQ-REPORTS-010) SHALL count the beads whose `blocked` is true by REQ-BEADS-007, whatever their status, and every count of beads in progress SHALL leave those beads out, so that a bead is counted once. These counts SHALL leave out merge gates (REQ-BEADS-019) and milestones, and SHALL count prep tasks (REQ-BEADS-002) apart. The row of an epic on the Gantt (REQ-MILESTONE-UI-013) SHALL show the state Blocked WHEN that epic's `blocked` is true, whatever its status.

#### Scenario: Blocked whatever the status
- GIVEN open bead `a`, epic `e` blocked by `a` with the open child `e.1`, bead `b` with status `blocked` and no blocker, in-progress bead `c` blocked by `a`, and in-progress bead `d` without blockers
- WHEN a client requests `GET /api/projects/beads`
- THEN `blocked` is 4 (`e`, `e.1`, `b` and `c`) and `in_progress` is 1 (`d`)

#### Scenario: Same number in the summary and in the Beads views
- GIVEN the same project
- WHEN `GET /api/projects/beads` is requested and the Board and the Focus view are shown
- THEN `beads.blocked` is 4, and the Blocked columns of the Board and of the Focus view each say 4

#### Scenario: Blocked epic on the Gantt
- GIVEN epic `e` with status `open` blocked by the open bead `a`, in a milestone shown on the Gantt
- WHEN the Gantt is shown
- THEN the row of `e` shows the state Blocked

### REQ-REPORTS-001: Report request
<!-- base: bfa65820548a480ae00f3cf15394f144f52b0abe653029f2a114d753dbdec9c4 -->
WHEN a client requests `GET /api/reports` with `project` (a configured project name), `days` (7, 30 or 90, default 30) and optionally `sprint`, the server SHALL read every bead of the project from its `bd export` snapshot (REQ-BEADS-012), SHALL select the beads closed in the last `days` days or, when `sprint` is given, the epics labelled `sprint:<sprint>` and their descendants whatever their close date, leaving out merge gates (REQ-BEADS-019) in both cases, SHALL return `totals` (`closed`, the number of selected closed beads, and the `rework_rate` of REQ-REPORTS-005), the Delivery section of REQ-REPORTS-004 and the Quality section of REQ-REPORTS-005 together with `generated_at`, and SHALL read no `ai_usage` metadata, SHALL serve the same answer for the same `project`, `days` and `sprint` for 60 seconds without running `bd` again unless `POST /api/refresh` dropped it, SHALL respond 404 when `project` is not configured, `all` included, and SHALL respond 422 when `days` is another value or `sprint` holds a character outside letters, digits, `.`, `_` and `-`.

#### Scenario: default period
- GIVEN project `alpha` with beads closed 3, 20 and 40 days ago
- WHEN a client requests `/api/reports?project=alpha`
- THEN the report counts the beads closed 3 and 20 days ago and not the one closed 40 days ago

#### Scenario: sprint
- GIVEN epic `a-1` labelled `sprint:s7` with a child closed 50 days ago, and epic `a-2` without the label
- WHEN a client requests `/api/reports?project=alpha&sprint=s7`
- THEN the report counts `a-1` and its child and nothing of `a-2`

#### Scenario: merge gates left out
- GIVEN project `alpha` with a task and a merge gate titled `external: .planning/plans/p.md#2`, both closed 3 days ago
- WHEN a client requests `/api/reports?project=alpha`
- THEN the report counts the task and not the merge gate, and no section lists the merge gate

#### Scenario: cached
- GIVEN a report for `alpha` and 30 days was answered 20 seconds ago
- WHEN a client requests it again
- THEN `bd` does not run and the same `generated_at` is returned

#### Scenario: bad input
- GIVEN no project `nope`
- WHEN a client requests `project=nope`, `project=all`, `days=14` or `sprint=a b`
- THEN the responses are 404, 404, 422 and 422, and no `bd` command ran

#### Scenario: no AI usage in the answer
- GIVEN project `alpha` with a closed task whose metadata still holds an `ai_usage` object
- WHEN a client requests `/api/reports?project=alpha`
- THEN the answer has no `usage` and no `coverage` key, and `totals` holds only `closed` and `rework_rate`

### REQ-REPORTS-007: Failures
<!-- base: f51b674f1a9ef86b2b8ed18b1d94a6c4290deeedfb6d24a3bb2539b9f5ac9b12 -->
IF `bd` fails in the project as in REQ-BEADS-005, THEN the server SHALL respond 502 with an `error`, and SHALL NOT keep a failed answer in the cache.

#### Scenario: single project fails
- GIVEN `bd` exits non-zero in `alpha`
- WHEN a client requests `/api/reports?project=alpha` twice
- THEN both responses are 502 and `bd` ran twice

### REQ-REPORTS-017: Team tab states
<!-- base: 54eed1f9e30cf392389a9d1da824d31f5e224763f72532a58d6c375b4aa9b4e2 -->
The Team tab SHALL handle these states:
- WHEN `milestones` is empty, it SHALL show "<project> has no milestones yet", one sentence on what a milestone is, and the command `gin milestone create` with a copy button.
- WHILE the team report loads, it SHALL show a loading state.
- IF the request fails, THEN it SHALL show the error with a Retry button.
- It SHALL NOT show a late answer for a project or milestone that is no longer selected.
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: no milestones
- GIVEN the team report of `beta` has no milestones
- WHEN the Team tab is shown
- THEN it says "beta has no milestones yet" and offers to copy `gin milestone create`

#### Scenario: failure
- GIVEN `/api/reports/team` answers 502
- WHEN the user presses Retry and the next answer is 200
- THEN the Team tab shows the report

#### Scenario: late answer
- GIVEN the team report for `m2` is loading and the user picks `m1`
- WHEN the answer for `m2` arrives
- THEN the page does not show it

### REQ-REPORTS-018: Velocity tab
<!-- base: 2d3d5d2ab0fdddf9f6ec46601610559c7f739a5f064fffb6376079ff9df5bf48 -->
WHEN the Velocity tab is selected, the frontend SHALL request `GET /api/milestones?project=<p>` (REQ-MILESTONE-UI-008) for the selected project, unless REQ-UI-095 has already loaded it, and SHALL show:
- a row of figures: the project's `days_per_point.value` to one decimal as "<x> days per point", with "assumed" when `days_per_point.assumed` is true and "—" when `days_per_point` is `null` or missing; and the commitment met (say/do, whole percent) and accuracy (two decimals) of the milestone with the latest `start` among those whose `velocity.say_do` is not `null`, or "—";
- for the milestones whose `velocity` has a `committed_points` that is not `null` or a `completed_points` above 0, oldest `start` first:
  - a column chart of `committed_points` and `completed_points` per milestone;
  - a line chart of `days_per_point` and `planned_days_per_point` per milestone, leaving out `null` points;
  - a table with committed, completed and added points, commitment met, days per point, planned days per point and accuracy, "—" for `null`;
- "No kicked-off milestones with points yet" when no milestone qualifies;
- the error and cause of the request when it failed (REQ-MILESTONE-UI-005).
The tab SHALL hold no period or sprint choice, SHALL show nothing per member, and the Reports backend SHALL NOT run `gin` for it.

#### Scenario: Milestones with velocity
- GIVEN project `alpha` whose milestones list has `days_per_point` `{value: 1.4, measured_epics: 6, assumed: false}`, closed `m1` (start 1 Oct) with `velocity` `{committed_points: 10, completed_points: 8, added_points: 0, say_do: 0.8, days_per_point: 1.5, planned_days_per_point: 1.2, accuracy: 0.8}`, active `m2` (start 3 Nov) with `{committed_points: 13, completed_points: 5, added_points: 2, say_do: 0.38, days_per_point: 1.3, planned_days_per_point: 1.4, accuracy: 1.08}`, and planned `m3` with `{committed_points: null, completed_points: 0, …}`
- WHEN the user opens `/reports?project=alpha&tab=velocity`
- THEN the figures read "1.4 days per point", "38%" and "1.08", the charts and the table hold `m1` then `m2`, and `m3` is not shown

#### Scenario: Assumed days per point
- GIVEN project `alpha` whose `days_per_point` is `{value: 1.0, measured_epics: 0, assumed: true}`
- WHEN the Velocity tab is shown
- THEN the figure reads "1.0 days per point" with "assumed"

#### Scenario: Nothing kicked off yet
- GIVEN project `alpha` whose milestones all have `committed_points: null` and `completed_points: 0`, or no `velocity` key
- WHEN the Velocity tab is shown
- THEN it shows "No kicked-off milestones with points yet" and no chart

#### Scenario: Milestones request fails
- GIVEN project `alpha` whose `GET /api/milestones?project=alpha` answers 502 with `cause: "outdated"`
- WHEN the user opens `/reports?project=alpha&tab=velocity`
- THEN the tab shows the outdated error and no figures

### REQ-REPORTS-019: Rework from Beads
<!-- base: 3228f7ddb5d11c09051da5b988867d3efff4bd974c658354fafcd17607eb9bb9 -->
Type: business-rule
The server SHALL count, for each bead of a report (REQ-REPORTS-001, REQ-REPORTS-008), `reopens`: the lines of its project's `.beads/interactions.jsonl` whose `kind` is `field_change`, whose `issue_id` is the bead, and whose `extra` has `field` `status`, `old_value` `closed` and a `new_value` other than `closed`; and `bugs`: the beads of type `bug`, open or closed, that have a `discovered-from` dependency on it (as REQ-UI-086 lists them). Its `rework` SHALL be `reopens` + `bugs`. A missing log, a line that is not JSON and a line of another shape SHALL count nothing and SHALL NOT fail the report, and the server SHALL read a project's log again only when its size or modification time changed.

#### Scenario: Reopens counted
- GIVEN the log of `alpha` holds, for bead `a-1`, status changes `in_progress`→`closed`, `closed`→`open`, `open`→`closed` and `closed`→`in_progress`
- WHEN a report of `alpha` is built
- THEN `a-1` has `reopens` 2

#### Scenario: Bugs found later
- GIVEN bead `a-1`, a closed bug `a-9` and an open bug `a-10` with `discovered-from` dependencies on `a-1`, and a task `a-11` with one too
- WHEN a report of `alpha` is built
- THEN `a-1` has `bugs` 2 and, with no reopen, `rework` 2

#### Scenario: Missing or broken log
- GIVEN project `alpha` without `.beads/interactions.jsonl`, and project `beta` whose log holds a line that is not JSON, a line without `extra`, and one reopen of `b-1`
- WHEN a report of `alpha` and a report of `beta` are built
- THEN both responses are 200, every bead of `alpha` has `reopens` 0, and `b-1` has `reopens` 1

#### Scenario: Read again only on change
- GIVEN the log of `alpha` was read for a report and has not changed since
- WHEN another report of `alpha` is built, and then a reopen line is appended and a report is built again
- THEN the second build does not read the log, and the third reads it and counts the new reopen

### REQ-UI-022: Beads navigation
<!-- base: 10135b251d58b3b7ed4117ec2248932e20710a55e3b8c5ac7c00ab891cac7dd3 -->
The "Main" navigation SHALL contain a "Beads" link, and the frontend SHALL show the bead list at `/beads` and a bead at `/beads/<project>/<id>` without a full reload, following the browser back and forward buttons, and a route segment that cannot be decoded SHALL show the page of REQ-UI-125.

#### Scenario: Open the list
- GIVEN the My Tasks page is shown
- WHEN the user clicks "Beads"
- THEN the URL is `/beads` and the bead list is shown without a reload

#### Scenario: Back button
- GIVEN the user opened a bead from the list
- WHEN the user presses back
- THEN the list is shown with the same filters

#### Scenario: Undecodable segment
- GIVEN the URL `/beads/%E0%A4%A/a-1`
- WHEN the page loads
- THEN the page shows "Page not found"

### REQ-UI-055: Main navigation
<!-- base: 52e3c936e41788848014fc17bbc4c550bdc31c8a384e9b920da39b4b535fdc46 -->
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Beads, My Tasks, Milestones and Reports, in that order, going to `/beads`, `/my-tasks`, `/milestones` and `/reports` with `?project=<current project>` (REQ-UI-124), and no link to `/`.

#### Scenario: Four links
- GIVEN any page is shown and the current project is `a`
- WHEN the page loads
- THEN the "Main" navigation holds the links Beads, My Tasks, Milestones and Reports, one each, going to `/beads?project=a`, `/my-tasks?project=a`, `/milestones?project=a` and `/reports?project=a`, and no link goes to `/`

### REQ-UI-057: Current destination
<!-- base: 92e2ae1cd51de7e2eb002263e01ac5be3408bf0679679c38533e917109a9d4bc -->
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight: Beads on `/beads`, My Tasks on `/my-tasks`, Milestones on `/milestones` and `/milestones/<project>/<id>`, Reports on `/reports`. On a bead page it SHALL mark the link of the page the user opened the bead from in this browser tab (REQ-UI-073: My Tasks, Milestones or Reports), and Beads when the bead was opened from the Beads page, another bead page, or by its address. It SHALL mark no link on the page of REQ-UI-125 and SHALL mark no other link.

#### Scenario: Bead page by address
- GIVEN the URL `/beads/alpha/a-1` opened in a new tab
- WHEN the page loads
- THEN only the Beads link has `aria-current="page"`

#### Scenario: Bead page from My Tasks
- GIVEN the user opened `a-1` from the My Tasks page
- WHEN the bead page is shown
- THEN only the My Tasks link has `aria-current="page"`

#### Scenario: Milestone page
- GIVEN the URL `/milestones/alpha/m-1`
- WHEN the page loads
- THEN only the Milestones link has `aria-current="page"`

#### Scenario: Reports page
- GIVEN the URL `/reports?project=alpha`
- WHEN the page loads
- THEN only the Reports link has `aria-current="page"`

#### Scenario: Address of a retired page
- GIVEN the URL `/sessions/alpha/s-1`
- WHEN the page loads
- THEN the page of REQ-UI-125 is shown and no link has `aria-current="page"`

#### Scenario: Change page
- GIVEN the My Tasks page is shown
- WHEN the user clicks "Reports"
- THEN only the Reports link has `aria-current="page"`

### REQ-UI-061: No sideways page scroll
<!-- base: e7b7fab194ed713ccdfb30b7f53d135ccd7e8275715c67e034a5e964f0f383fe -->
WHILE the window is 360px wide or wider, no page of the frontend SHALL scroll horizontally, and content wider than the window, such as a table, the Board, the Tree or a code block, SHALL scroll inside its own box.

#### Scenario: Wide table
- GIVEN a window 360px wide and the bead list in table form
- WHEN the page is shown
- THEN the page itself does not scroll sideways and the table scrolls inside its box

#### Scenario: Long project name
- GIVEN a project with a name of 60 characters
- WHEN any page is shown at 360px
- THEN the project switcher cuts the name short and the page does not scroll sideways

### REQ-UI-063: Page title
<!-- base: 0282add4c6a428485e5b755db7539814c4ee837e17f66a873931ce6a139625ab -->
The frontend SHALL set the document title to the name of what the page shows, then the project when the page shows one project, then `gin-console`, joined by ` · `: `Beads · <project> · gin-console`, `My Tasks · <project> · gin-console`, `Milestones · <project> · gin-console`, `<milestone title> · <project> · gin-console` on a milestone page, `Reports · <section> · <project> · gin-console`, `<bead title> · <project> · gin-console` on a bead page, and `Page not found · gin-console` (REQ-UI-125). WHILE a name is loading, and on the login page, the title SHALL be `gin-console`.

#### Scenario: Bead page
- GIVEN the bead `a-1` titled "Team checkout" in project `example`
- WHEN its page has loaded
- THEN the document title is `Team checkout · example · gin-console`

#### Scenario: Reports section
- GIVEN `/reports?project=example&tab=quality`
- WHEN the page loads
- THEN the document title is `Reports · Quality · example · gin-console`

#### Scenario: My Tasks
- GIVEN `/my-tasks?project=example`
- WHEN the page loads
- THEN the document title is `My Tasks · example · gin-console`

#### Scenario: Loading
- GIVEN a milestone page whose milestone is still loading
- WHEN the page is shown
- THEN the document title is `gin-console`

### REQ-UI-072: Breadcrumb
<!-- base: b8e02f9d2aae9f86f78c5a40e4d0d5a2ab518e3d48bb89295136e55588076972 -->
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of: one link to the remembered place (REQ-UI-073) named for it, which is "Beads" followed by the name of its view and, when a search, a status, priority, label, type, assignee or sprint filter or "Show closed" is active, ", N filters" where N counts them, the title of the milestone with the same view and filter count for the Beads tab of a milestone page, the title of the milestone for its other tabs, or "My Tasks" or "Reports"; then the title of the bead's parent as a link to its page when it has one; then the title of the bead marked `aria-current="page"`. Each title SHALL be cut short to one line with the full title and the id as its `title`. Under 640px the breadcrumb SHALL show only the first link.

#### Scenario: Place and filters
- GIVEN the Beads page was last at `?project=a&view=board&status=open&q=fix`
- WHEN the bead page of `a-1` titled "Fix login" is shown
- THEN the breadcrumb reads "Beads › Board, 2 filters" then "Fix login", and the first link goes to `/beads?project=a&view=board&status=open&q=fix`

#### Scenario: Parent
- GIVEN the bead `a-2` has the parent `a-1` titled "Checkout"
- WHEN the bead page of `a-2` is shown
- THEN the breadcrumb has a link "Checkout" to `/beads/a/a-1` before the title of `a-2`

#### Scenario: No remembered place
- GIVEN no page was remembered in this tab
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads" then the title of `a-1`, and "Beads" goes to `/beads?project=a`

#### Scenario: Details panel
- GIVEN a bead shown in the details panel of the List view
- WHEN the panel is shown
- THEN it has no breadcrumb and keeps its "Open page" link

#### Scenario: From a milestone page
- GIVEN the Beads tab of milestone `m2` titled "Checkout v2" of project `a` was last at `?tab=beads&view=board&status=open`
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Checkout v2 › Board, 1 filter" then the title of `a-1`, and the first link goes to `/milestones/a/m2?tab=beads&view=board&status=open`

#### Scenario: From My Tasks
- GIVEN the My Tasks page was last at `/my-tasks?project=a`
- WHEN the user opens `a-1` from it
- THEN the breadcrumb reads "My Tasks" then the title of `a-1`, and "My Tasks" goes to `/my-tasks?project=a`

### REQ-UI-073: Remembered place
<!-- base: 99c2938a43b265a798ddf64884878d7c6a7c2fa4156527de100158dd3b158e79 -->
The Beads page, the My Tasks page, the Reports page and the milestone page (any tab) SHALL remember their path and URL query for the current browser tab, the one shown last replacing the others, SHALL use it for the first link of the breadcrumb (REQ-UI-072) and the marked navigation link (REQ-UI-057) when it is of the bead's project and `/beads?project=<project>` otherwise, SHALL NOT change it when the user goes from bead to bead, and IF the browser refuses to store it, THEN SHALL keep it for the visit without an error.

#### Scenario: Back to the Board with its filters
- GIVEN the Board with the filter status "open" is shown
- WHEN the user opens a card and then uses the first link of the breadcrumb
- THEN the Board is shown with the filter status "open"

#### Scenario: From bead to bead
- GIVEN the user came from the Board with filters and opens a related bead from the bead page
- WHEN the related bead is shown and the first link of the breadcrumb is used
- THEN the Board with the same filters is shown

#### Scenario: Other project
- GIVEN the remembered place is the Beads page of project `a`
- WHEN the bead page of a bead of project `b` is shown
- THEN the first link goes to `/beads?project=b`

#### Scenario: Reload
- GIVEN the Beads page was last at `view=focus` in this tab
- WHEN the bead page is reloaded
- THEN its breadcrumb still returns to the Focus view

#### Scenario: Storage refused
- GIVEN the browser throws when the place is stored
- WHEN the user opens a bead and uses the breadcrumb
- THEN the remembered place of this visit is used and no error is shown

#### Scenario: Milestone page last
- GIVEN the user opened the Beads page and then the Beads tab of milestone `m2` with the Graph view
- WHEN the user opens a node's bead page and uses the first link of the breadcrumb
- THEN the Graph view of the Beads tab of `m2` is shown

#### Scenario: My Tasks of another project
- GIVEN My Tasks was last at `/my-tasks?project=a`
- WHEN the bead page of a bead of project `b` is opened by its address
- THEN the first link reads "Beads" and goes to `/beads?project=b`

### REQ-UI-088: Reports page
<!-- base: 086b0a471525ebbda16011bdab5a837280d28d5c80e7eb2740111c3a3c503a0d -->
The frontend SHALL show the Reports page at `/reports`, loaded as its own chunk. The page SHALL show the report of the current project (REQ-UI-124), SHALL hold no project choice of its own (the switcher of REQ-UI-123 changes the project), and WHEN the URL has `project=all` (the retired choice "All projects"), SHALL replace it with the current project without adding a history entry. The panels of the Delivery and Quality tabs (REQ-UI-095) SHALL hold a period choice (7, 30 or 90 days, default 30) and a sprint field, which apply to those two tabs. The Team tab has its own choices (REQ-REPORTS-012). The page SHALL keep the choices in the URL query, so that a reload, the back button and a shared link show the same report. Each tab SHALL open with its own row of figures (REQ-UI-090, REQ-UI-091, REQ-REPORTS-013, REQ-REPORTS-018). The page SHALL show no tokens, cost, budget or `gin usage` command.

#### Scenario: shared link
- GIVEN the URL `/reports?project=alpha&days=7&tab=delivery`
- WHEN the page loads
- THEN 7 days is selected and the report for `alpha` and 7 days is requested

#### Scenario: Old link for all projects
- GIVEN the current project is `alpha` and the URL `/reports?project=all&days=7&tab=delivery`
- WHEN the page loads
- THEN the URL becomes `/reports?project=alpha&days=7&tab=delivery`, 7 days is selected, and only the report for `alpha` is requested

#### Scenario: change period
- GIVEN the Reports page for `alpha`, 30 days and the Delivery tab
- WHEN the user picks 90 days
- THEN the URL becomes `/reports?project=alpha&days=90&tab=delivery` without a reload and the report is requested again

#### Scenario: period kept across tabs
- GIVEN the Reports page for `alpha` with 7 days picked on the Delivery tab
- WHEN the user picks the Team tab and then the Quality tab
- THEN 7 days is selected in the Quality panel

### REQ-UI-093: Report states
<!-- base: d350c545e75ef6f12d53cadb8b69c9e4150b59778b0213212323c052858a98c7 -->
The Reports page SHALL show a loading state while the report loads, SHALL show "No data in this period" in a section that has no rows instead of an empty chart, IF the report request fails, THEN SHALL show the error with a Retry button, and SHALL NOT show a late answer for filters that are no longer selected.

#### Scenario: late answer
- GIVEN the report for 30 days is loading and the user picks 7 days
- WHEN the answer for 30 days arrives
- THEN the page does not show it

#### Scenario: failure
- GIVEN the report request answers 502 with an `error`
- WHEN the page is shown
- THEN the page shows the error with a Retry button

### REQ-UI-095: Report tabs
<!-- base: 1912887f41e07e78422829ff2d11d43b4a5b86491155c7b409c89fde8aef6372 -->
WHILE the report sections are not listed in the sidebar (REQ-UI-129), the Reports page SHALL show the tabs Team, Delivery, Velocity and Quality, in that order, as a WAI-ARIA tab list in which Left and Right move between tabs. Under each tab name it SHALL show a headline:
- Team, from the team report of the selected milestone:
  - "Finished on time", or "Finished <n> d late" with a warning icon, for a closed milestone;
  - "Starts <start>" before its start;
  - "<closed> of <scope> done, late" with a warning icon when the milestone is late (REQ-MILESTONE-UI-023);
  - otherwise "<closed> of <scope> done, on pace", or ", behind pace" with a warning icon when `pace_needed` is above `pace`;
  - "No milestones" when the project has none.
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- Velocity: "<x> days per point" from the selected project's `days_per_point` (REQ-REPORTS-018), with "assumed" when it is assumed, once the Milestones list has loaded; no headline when `days_per_point` is `null`.
- Quality: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.

The page SHALL request the team report and the Milestones list (REQ-MILESTONE-UI-008, for the forecast `finish` of REQ-MILESTONE-UI-023 and for the Velocity tab) whatever the tab, and SHALL request the Milestones list at most once per project and refresh. WHILE the Milestones list is loading or after it failed, the Team headline SHALL apply REQ-MILESTONE-UI-023 without the forecast. It SHALL show no headline for a tab while its report loads or after it failed to load. It SHALL keep the selected tab in the URL query `tab` (`team`, `delivery`, `velocity` or `quality`), SHALL select Team when `tab` is missing or holds another value, including the retired `usage` and `coverage`, and SHALL keep the project, period, sprint, milestone and member when the tab changes. WHILE the window is narrower than the tab list, the tab list SHALL scroll sideways instead of widening the page and SHALL fade its edge on each side that has hidden tabs.
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: shared link
- GIVEN the URL `/reports?project=alpha&days=7&tab=quality`
- WHEN the page loads
- THEN the Quality tab is selected and its panel shows the report for `alpha` and 7 days

#### Scenario: unknown tab
- GIVEN the URL `/reports?project=alpha&tab=nope`
- WHEN the page loads
- THEN the Team tab is selected

#### Scenario: change tab
- GIVEN the Reports page for `alpha`, 90 days and the Delivery tab
- WHEN the user picks the Quality tab
- THEN the URL becomes `/reports?project=alpha&days=90&tab=quality` without a reload and no new report is requested

#### Scenario: velocity tab
- GIVEN the Reports page for `alpha` on the Delivery tab, whose milestones list has `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`
- WHEN the user picks the Velocity tab
- THEN the URL has `tab=velocity`, `GET /api/milestones?project=alpha` has been requested once, and the Velocity headline reads "1.4 days per point"

#### Scenario: headlines
- GIVEN a report with 41 closed beads and rework rate 0.09
- WHEN the page is shown
- THEN the headlines read "41 beads closed" and "9% rework", and no tab is named AI usage or Data coverage

#### Scenario: retired tab in a link
- GIVEN the URL `/reports?project=alpha&tab=coverage`
- WHEN the page loads
- THEN the Team tab is selected

#### Scenario: team headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed, `pace` 3.6 and `pace_needed` 3.4, whose forecast `finish` is before its `end`
- WHEN the page is shown on the Delivery tab
- THEN the Team headline reads "27 of 64 done, on pace" without a warning icon

#### Scenario: late milestone headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed whose forecast `finish` is after its `end`
- WHEN the page is shown
- THEN the Team headline reads "27 of 64 done, late" with a warning icon

#### Scenario: keyboard
- GIVEN the Delivery tab is selected and has focus
- WHEN the user presses Right
- THEN the Velocity tab is selected and has focus

#### Scenario: Hidden tabs are hinted
- GIVEN the Reports page at a window 360px wide where Quality does not fit
- WHEN the page is shown
- THEN the right edge of the tab list fades, and scrolling it to the end removes the right fade and shows a left one

### REQ-UI-096: Refresh
<!-- base: 950b79a80f4c4d5df45f4db3f4a44c3a062b9aafb4b574ce9e8b2ea341a4d39e -->
The frontend SHALL show on every page a "Refresh data" control, in the top bar below 768px and with the theme control at the top of the navigation column from 768px, and WHEN the user activates it, SHALL send `POST /api/refresh` (REQ-BEADS-012) and then load the current page's data again without a full reload and without changing the URL, showing the control as busy and disabled until the request ends; IF the request fails, THEN the page SHALL still load its data again and show its own error.

#### Scenario: Refresh the page
- GIVEN the Beads page is shown
- WHEN the user activates "Refresh data"
- THEN `POST /api/refresh` is sent, then the beads are requested again, and the URL is unchanged

#### Scenario: Placement
- GIVEN a window 1280px wide
- WHEN any page is shown
- THEN "Refresh data" is at the top of the navigation column, above the navigation links, next to the theme control

### REQ-UI-099: My Tasks navigation
<!-- base: b227c9222b63b72e4b6603328801ebbf9efc3186f81320a0c2cfb2db4eaaa388 -->
The "Main" navigation SHALL contain a "My Tasks" link after "Beads", and the frontend SHALL show the My Tasks page at `/my-tasks` without a full reload, marking the link as current there, and SHALL replace the address `/` with `/my-tasks?project=<current project>` (REQ-UI-124), or with `/my-tasks` while no project is configured, without adding a history entry.

#### Scenario: Open My Tasks
- GIVEN the Beads page of project `a` is shown
- WHEN the user clicks "My Tasks"
- THEN the URL is `/my-tasks?project=a`, the My Tasks page is shown without a reload and "My Tasks" is the current link

#### Scenario: Home address
- GIVEN the current project is `a`
- WHEN the user opens `/`
- THEN the URL becomes `/my-tasks?project=a`, the My Tasks page of `a` is shown, and the browser Back button does not return to `/`

#### Scenario: Home address without projects
- GIVEN no project is configured
- WHEN the user opens `/`
- THEN the URL becomes `/my-tasks` and the page says no projects are configured

### REQ-UI-100: My Tasks list
<!-- base: 906b78b7a70f6231deb96fea4e87d7d0251b725d7c1b31272f3c338e9807545d -->
WHEN the My Tasks page opens, the frontend SHALL request `GET /api/projects/beads`, then `GET /api/beads?project=<name>` for the current project (REQ-UI-124) only, and SHALL list in one table the beads of that project whose `assignee` is the same person (REQ-BEADS-023) as the signed-in email, leaving out beads matched only by `owner`. Each row SHALL show the id, the title, the state, the type, `P<n>` and the updated time, and SHALL link to `/beads/<project>/<id>`. Rows SHALL be ordered by priority ascending, then by `updated_at` newest first, then by id. The page SHALL show how many beads it lists, and WHEN none matches, SHALL say "No tasks assigned to <email>" and offer a link "Open the Beads page" to `/beads?project=<current project>`, and WHEN no project exists, SHALL say that no projects are configured. The Refresh control (REQ-UI-096) SHALL load the list again.

#### Scenario: Match by email or name
- GIVEN the signed-in email `giangdhwhtbr@gmail.com`, project A with open beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `alice`, and one unassigned open bead owned by `giangdhwhtbr@gmail.com`
- WHEN My Tasks opens
- THEN only the beads assigned to `giangdhwhtbr` and `GiangDHWHTBR@gmail.com` are listed, and the count is 2

#### Scenario: Same handle at another domain
- GIVEN the signed-in email `giangdhwhtbr@gmail.com` and an open bead assigned to `giangdhwhtbr@other.example`
- WHEN My Tasks opens
- THEN that bead is listed

#### Scenario: Order
- GIVEN the current project is A, which has a P2 bead assigned to me updated today and a P1 bead assigned to me updated last week
- WHEN My Tasks opens
- THEN the P1 bead is first, no row has a project column, and clicking the P2 bead opens `/beads/A/<id>`

#### Scenario: Other projects left out
- GIVEN projects A and B, the current project is A, and a bead assigned to me in each
- WHEN My Tasks opens
- THEN only the bead of A is listed and no beads request goes to B

#### Scenario: Nothing assigned
- GIVEN the current project is `a` and none of its beads is assigned to `giangdhwhtbr@gmail.com` or `giangdhwhtbr`
- WHEN My Tasks opens
- THEN the page says "No tasks assigned to giangdhwhtbr@gmail.com" and a link "Open the Beads page" goes to `/beads?project=a`

#### Scenario: Missing project directory
- GIVEN project C is configured but its directory does not exist
- WHEN My Tasks opens
- THEN no beads request is sent for C

#### Scenario: No projects
- GIVEN `GET /api/projects/beads` returns an empty list
- WHEN My Tasks opens
- THEN the page says no projects are configured

#### Scenario: Not the full projects list
- GIVEN two projects
- WHEN My Tasks opens
- THEN no request goes to `/api/projects`

### REQ-UI-101: My Tasks closed beads
<!-- base: f68e7ec6a35049ccc222521957626ce9ee900182f33a0821268564aee436ae8d -->
The My Tasks page SHALL leave closed beads out by default, and SHALL offer a "Show closed" control kept in the URL as `closed=1` that requests the beads with `closed=1` and lists the matching closed beads too.

#### Scenario: Closed hidden
- GIVEN 3 open and 2 closed beads assigned to me
- WHEN My Tasks opens at `/my-tasks`
- THEN 3 beads are listed and every beads request lacks `closed=1`

#### Scenario: Show closed
- GIVEN the same beads in project A
- WHEN the user turns on "Show closed"
- THEN the URL is `/my-tasks?project=A&closed=1`, the beads are requested with `closed=1` and 5 beads are listed

### REQ-UI-102: My Tasks failures
<!-- base: caa19354190c2d31415982d2f38d1b170e17eb5a95a45afaa1ced7c2fe9f7c57 -->
IF `GET /api/projects/beads` fails, THEN the My Tasks page SHALL show that the projects could not be loaded; IF the beads request of the project fails, THEN the page SHALL show an error naming that project and its message; WHILE requests are pending, the page SHALL say it is loading.

#### Scenario: Beads request fails
- GIVEN the current project is A and its beads request responds 500
- WHEN My Tasks opens
- THEN an error names A and its message

#### Scenario: Projects fail
- GIVEN `GET /api/projects/beads` responds 500
- WHEN My Tasks opens
- THEN the page says the projects could not be loaded and lists nothing

### REQ-UI-103: Stale beads note
<!-- base: 5ebe1b9b70f79ab1ca8875d35800ea7c81f37021a69490b9ca573dee62b0873b -->
WHERE the `beads` object of a project in `GET /api/projects/beads` has `stale: true`, the Beads page and the My Tasks page SHALL show, above their list and while that project is the current project (REQ-UI-124), the note "Beads of <project> may be out of date. Run `bd export -o .beads/issues.jsonl` in <project>." once, and SHALL show no note for another project or for a project whose `stale` is `false` or missing.

#### Scenario: Beads page
- GIVEN project A has `beads.stale: true`
- WHEN the Beads page opens with A selected
- THEN the note names A and the command, and the list is shown below it

#### Scenario: My Tasks
- GIVEN projects A and B with `beads.stale: true` and A is the current project
- WHEN My Tasks opens
- THEN one note names A, none names B, and the tasks of A are listed

#### Scenario: Not stale
- GIVEN project A whose `beads` has no `stale` key, or `stale: false`
- WHEN the Beads page opens with A selected
- THEN no note is shown

### REQ-UI-105: My Tasks milestone filter
<!-- base: 23e316899ae0f898842854aa2b4813ca15f4599d9c0ebd7da3ea0c813c41b84e -->
The My Tasks page SHALL list only the beads of the current project (REQ-UI-124), kept in the URL as `project`, SHALL NOT show a project select of its own (the switcher of REQ-UI-123 changes the project), and SHALL offer a "Milestone" select, always enabled, kept in the URL as `milestone`. The page SHALL request `GET /api/beads/milestones?project=<name>` and SHALL offer the choices of REQ-UI-104, selecting `current` (or "All" when `current` is `null`) WHILE the URL has no `milestone`; the milestone choice SHALL filter the beads as in REQ-UI-104, and a closed milestone SHALL list its closed beads without "Show closed". A change of project SHALL clear `milestone`.

#### Scenario: Current project
- GIVEN the current project is A
- WHEN My Tasks opens at `/my-tasks`
- THEN the URL becomes `/my-tasks?project=A`, there is no Project select, and the Milestone select is enabled

#### Scenario: Project with a current milestone
- GIVEN project A whose current milestone is `m2`, with my tasks under `m2` and `m3`
- WHEN My Tasks opens at `/my-tasks?project=A`
- THEN the Milestone select shows `m2`, and only my tasks under `m2` are listed

#### Scenario: Change project clears the milestone
- GIVEN My Tasks at `/my-tasks?project=A&milestone=m3`
- WHEN the user chooses project B in the switcher
- THEN the URL is `/my-tasks?project=B` and B's current milestone is selected

### REQ-UI-110: Readable text and facts
<!-- base: adc616666eb377231390a3d2b36d5badbf4deadf27d1e5eed450d8796474a847 -->
On every page, at every window width from 360px and in the light and the dark theme, the frontend SHALL NOT draw the text of one element over the text of another, or over a chart bar, line or arrow that the text does not belong to; SHALL end every text it cuts short with an ellipsis and give the full text as `title` (REQ-UI-107); SHALL give text a contrast with its background of at least 4.5:1, or 3:1 for text of at least 18.66px bold or 24px; SHALL show a set of facts about one thing (such as owner, assignee, dates and counts) as label/value pairs, each label in the muted color and each value in the text color and a heavier weight, never as one run of text of one style; SHALL show a priority as the text `P<n>`, bold in the text color for P0 and P1 and in the muted color otherwise (REQ-UI-140); and SHALL show a size as text that reads "<p> pt" for a bead with `points`, else "<n>d" from `estimate_minutes`.

#### Scenario: No overlapping text
- GIVEN the example project
- WHEN the Beads (List, Board, Focus, Graph, and Lanes of the epic `ex-e12`), bead, My Tasks, Milestones, milestone (Gantt at each zoom, Beads, Retro) and Reports (each tab) pages are shown at 390, 1024, 1440 and 1920px in both themes
- THEN no text overlaps other text or a bar, line or arrow it does not belong to, and no text spills out of its box without an ellipsis

#### Scenario: Facts as label and value
- GIVEN the bead page of an epic, the velocity line of a kicked-off milestone and the header of a lane
- WHEN they are shown
- THEN each fact shows its label in the muted color and its value in the text color with a heavier weight

#### Scenario: Priority
- GIVEN beads at P0, P1 and P2
- WHEN their List rows are shown
- THEN `P0` and `P1` are bold in the text color, `P2` is in the muted color, and none of them is a pill

#### Scenario: Contrast
- GIVEN the Reports Team and Velocity tabs in the light and the dark theme
- WHEN they are shown
- THEN every milestone id and label has a contrast of at least 4.5:1 with its background

### REQ-UI-123: Project switcher
<!-- base: 96cd57cc82dd341400ee07fe1e57d4da5d6d0484456d91c4c8595e092f6b6d56 -->
The frontend SHALL show a project switcher labelled "Project" that names the current project (REQ-UI-124): at the top of the sidebar from 1024px while the sidebar is expanded, as a button holding the first letter of the project in the icon rail (from 768px up to 1023px, or while the sidebar is collapsed), and in the top bar below 768px. Opening it SHALL list every configured project whose directory exists, from `GET /api/projects/beads`, with the favorite first, each with a star button labelled "Make <name> the favorite" or, on the favorite, "Remove <name> as favorite", marked with `aria-pressed`. WHEN the user chooses a project, the frontend SHALL make it the current project and SHALL then:
- on the Beads, My Tasks, Milestones or Reports page, stay on that page with `project` replaced, keeping `view`, `closed`, `tab`, `days` and `q`, and dropping `milestone`, `select`, `scope`, `member`, `status`, `sprint` and the other filters;
- on a bead page, open the Beads page of the chosen project; on a milestone page, open the Milestones page of the chosen project.

#### Scenario: Choose on the Beads page
- GIVEN the Beads page at `/beads?project=a&view=board&milestone=m1&status=open`
- WHEN the user chooses project `b` in the switcher
- THEN the URL becomes `/beads?project=b&view=board` and the Board of `b` is shown

#### Scenario: Choose on My Tasks
- GIVEN the My Tasks page at `/my-tasks?project=a&closed=1&milestone=m1`
- WHEN the user chooses project `b` in the switcher
- THEN the URL becomes `/my-tasks?project=b&closed=1` and the tasks of `b` are shown

#### Scenario: Choose on a bead page
- GIVEN the bead page `/beads/a/a-1`
- WHEN the user chooses project `b`
- THEN the Beads page of `b` is shown

#### Scenario: Favorite first
- GIVEN projects `a`, `b` and `c`, and `c` is the favorite
- WHEN the user opens the switcher
- THEN `c` is listed first with its star pressed, then `a` and `b`

#### Scenario: Icon rail
- GIVEN a window 820px wide and the current project `qwikfone`
- WHEN any page is shown
- THEN the rail holds a button "Project: qwikfone" showing "q"

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN any page is shown
- THEN the switcher is in the top bar

### REQ-UI-124: Current project
<!-- base: 86ecfe10671dfd63ec62cf25c025905583e2fc8fce7be9b91d41fbac2e4ee83a -->
The frontend SHALL take the current project, in this order: from the `project` query of the URL when it names a configured project whose directory exists; else the project last chosen in this browser tab; else the favorite project; else the first configured project. It SHALL remember as last chosen, for the browser tab, the project the Beads, My Tasks, Milestones, Reports, bead or milestone page shows and a project chosen in the switcher, and SHALL remember the favorite across tabs and visits. The Main navigation links Beads, My Tasks, Milestones and Reports SHALL carry `?project=<current project>`. WHEN the Beads, My Tasks, Milestones or Reports page opens without `project`, it SHALL show the current project and write it into the URL without adding a history entry. A remembered or favorite project that is no longer configured SHALL be skipped. IF the browser refuses to store a choice, THEN the choice SHALL last for the visit without an error.

#### Scenario: Links carry the project
- GIVEN the current project is `b`
- WHEN any page is shown
- THEN the Beads link goes to `/beads?project=b`, Milestones to `/milestones?project=b`, My Tasks to `/my-tasks?project=b`, and Reports to `/reports?project=b`

#### Scenario: Last chosen beats the favorite
- GIVEN the favorite is `a` and the user chose `b` earlier in this tab
- WHEN the user opens `/milestones`
- THEN the Milestones page of `b` is shown and the URL becomes `/milestones?project=b`

#### Scenario: Favorite in a new tab
- GIVEN the favorite is `c`
- WHEN the user opens `/beads` in a new browser tab
- THEN the Beads page of `c` is shown

#### Scenario: Removed project
- GIVEN the favorite `old` is no longer configured and nothing was chosen in this tab
- WHEN the user opens `/beads`
- THEN the first configured project is shown

#### Scenario: My Tasks of the current project
- GIVEN the current project is `b`
- WHEN the user opens `/my-tasks`
- THEN the My Tasks page of `b` is shown and the URL becomes `/my-tasks?project=b`

#### Scenario: Storage refused
- GIVEN the browser throws when a choice is stored
- WHEN the user chooses project `b` and opens Milestones
- THEN the Milestones page of `b` is shown and no error is shown

### REQ-UI-125: Page not found
<!-- base: dacca938fc7cbb55b0e76cd1e99bd348ebac7fc32816472ce1429ad13bfc7b22 -->
WHEN the path matches no page of the console, including the retired `/sessions`, `/sessions/<project>/<id>` and `/quota`, the frontend SHALL show the heading "Page not found", the path, and links to the Beads page of the current project and to My Tasks, SHALL set the document title to `Page not found · gin-console`, and SHALL mark no link of the Main navigation.

#### Scenario: Unknown path
- GIVEN the current project is `a`
- WHEN the user opens `/nope`
- THEN the page shows "Page not found", `/nope`, a link to `/beads?project=a` and a link to `/my-tasks?project=a`

#### Scenario: Retired address
- GIVEN any configured projects
- WHEN the user opens `/sessions/alpha/s-1`
- THEN the page shows "Page not found" and no navigation link has `aria-current="page"`

### REQ-UI-126: Unknown project
<!-- base: 554192cfe0d49fa5bb3b4dbe8812a168ff4960e031db79274d797b85de383a13 -->
WHEN the URL names a project that is not configured, in the `project` query of the Beads, My Tasks, Milestones or Reports page or in the path of a bead or milestone page, the frontend SHALL show "No project <name> is configured" with one link per configured project to the same page for that project, instead of another project's data, and SHALL NOT remember the name as the current project. The Reports value `all` is not a project name.

#### Scenario: Beads query
- GIVEN projects `a` and `b`
- WHEN the user opens `/beads?project=zzz`
- THEN the page says "No project zzz is configured" with links to `/beads?project=a` and `/beads?project=b`, and shows no beads

#### Scenario: My Tasks query
- GIVEN projects `a` and `b`
- WHEN the user opens `/my-tasks?project=zzz`
- THEN the page says "No project zzz is configured" with links to `/my-tasks?project=a` and `/my-tasks?project=b`, and lists no tasks

#### Scenario: Bead path
- GIVEN projects `a` and `b`
- WHEN the user opens `/beads/zzz/z-1`
- THEN the page says "No project zzz is configured" and the current project is unchanged

### REQ-UI-127: Back to your place
<!-- base: 8e22a671e72c2364368a4109c21f7ad8c7d1cceb2d9babb7081c135cc8a2b411 -->
WHEN the user comes back with the browser Back or Forward button to the Beads, My Tasks, Milestones, milestone or Reports page, the frontend SHALL scroll the page to where it was when the user left it, once the page shows its data, and WHEN the user left it by opening a bead, SHALL move the keyboard focus to that bead's row, card or node and mark it as last opened for 2 seconds, without motion WHILE the user asks for reduced motion. A page opened by a link or by its address SHALL start at the top. IF the browser refuses to store the position, THEN the page SHALL start at the top without an error.

#### Scenario: Back to a long list
- GIVEN the List view of the Beads page scrolled 1,200px down
- WHEN the user opens a bead from it and then uses the browser Back button
- THEN the List view shows at 1,200px down

#### Scenario: Last opened card
- GIVEN the Board of the Beads page
- WHEN the user opens the card `a-7` and comes back with the browser Back button
- THEN the card `a-7` has the keyboard focus and is marked as last opened

#### Scenario: Link starts at the top
- GIVEN the Beads page was left scrolled down
- WHEN the user opens it again from the navigation
- THEN it starts at the top

#### Scenario: Storage refused
- GIVEN the browser throws when the position is stored
- WHEN the user comes back with the browser Back button
- THEN the page starts at the top and no error is shown

### REQ-UI-132: Tooltips for marks and counts
<!-- base: 75ded0c707f04cc216f183c60f64f8c0f20627d3b17375f761da960d1d0d7cf5 -->
WHEN the pointer rests on a state mark (REQ-UI-064), a size or points value, the word Prep or a Prep count, a lane or lane count, a strand (REQ-UI-138), a Gantt verdict (REQ-MILESTONE-UI-024), a comment or dependency indicator (REQ-UI-066), or a count of blocked, done or in-progress beads, and WHEN keyboard focus reaches one of them that takes focus, the frontend SHALL show within 500 ms a tooltip with one sentence that says what it means, and for a count the rule it counts by and the scope it counts in, SHALL tie the tooltip to the element with `aria-describedby`, and SHALL close it on Escape, on blur and when the pointer leaves; the native `title` SHALL remain only for text cut short (REQ-UI-107).

#### Scenario: Blocked count
- GIVEN the Board of `example` whose Blocked column holds 4 beads
- WHEN the pointer rests on the count of that column
- THEN a tooltip reads "Blocked: status blocked, or waiting on an open blocker of its own or of a parent. Prep tasks are counted apart. Counted in this column." and Escape closes it

#### Scenario: Dependency indicator
- GIVEN a bead card with the dependency indicator 2
- WHEN the pointer rests on the indicator
- THEN a tooltip says what the 2 dependencies are, and the indicator has no `title`

### REQ-UI-139: Plain text style
<!-- base: 4e59801c495714fc32ccbfd46b96e5331c9a0de79924340c8cf499cf5cecb7c7 -->
The frontend SHALL NOT set a label, heading or value in capitals by style (`text-transform: uppercase`), an initial in an avatar being written in capitals by the code; SHALL NOT join facts in the text of a page with a middle dot " · ", but SHALL use a comma, separate elements with space between them, or words, the document title of REQ-UI-063 being the only exception; SHALL NOT underline a link that names a place or a thing (a sidebar item, a breadcrumb item, a tab, the title or id of a row, card, node or table cell), at rest or on hover, and SHALL mark it on hover with the identity colour (REQ-UI-141); and SHALL underline a link inside a sentence (Markdown text, a notice, an empty state) with a thin line in the identity colour at half strength.
Source: `assets/2026-11-22/beads-light.png`, `assets/2026-11-22/index.html#beads`

#### Scenario: No capitals by style
- GIVEN the filter sheet of the Beads page at 390px
- WHEN it is opened
- THEN its section labels read "Status", "Priority" and "Labels", each in sentence case

#### Scenario: No middle dots
- GIVEN the Beads, bead, My Tasks, Milestones, milestone and Reports pages of the `example` project
- WHEN they are shown
- THEN no text on them contains " · ", and the browser tab of the Beads page still reads "Beads · example · gin-console"

#### Scenario: Navigation links
- GIVEN the bead page of `ex-e12` opened from the Beads List
- WHEN the pointer rests on the breadcrumb link "Beads"
- THEN the link is not underlined and its text takes the identity colour

#### Scenario: Link in a sentence
- GIVEN a bead whose description contains `[docs](https://example.com)`
- WHEN its page loads
- THEN "docs" is underlined with a thin line in the identity colour

### REQ-UI-140: Data as text
<!-- base: 7e27d5df7baeae16fae974a8f9a2e134650e0fd4a26396ee855056618cc950c1 -->
Pills and chips SHALL be used only for controls (a filter chip, a toggle, a segmented control); on a List or Tree row, a Board or Focus card, a Graph node, a Gantt row, a table row and the line of facts of the bead page, the frontend SHALL show data as text without a border or a tint: the priority as `P<n>`, bold in the text colour for P0 and P1 and in the muted colour otherwise; the type as REQ-UI-067 describes; the kind, size, labels, capabilities and Prep, and a status or an "On time" figure, as plain words in the muted colour, or in the warning colour where a requirement gives them that colour; the comment and dependency indicators as an icon and a number; and a lane as a dot followed by its name (REQ-UI-115).
Source: `assets/2026-11-22/beads-light.png`, `assets/2026-11-22/index.html#beads`

#### Scenario: List row without chips
- GIVEN a blocked P1 bug `b-1` assigned to alice with the labels `area:backend` and `ui`, the lane `be` and 2 comments
- WHEN the List view is shown at 1440px
- THEN the row shows "bug" in the bug colour, "P1" bold, "area:backend", "ui", a muted dot and "be", and a comment icon with 2, and none of them has a border or a background

#### Scenario: Board card without chips
- GIVEN an in-progress P2 epic with `points: 8` and the kind `technical`
- WHEN its Board card is shown
- THEN it shows "P2" in the muted colour, "Technical" and "8 pt" as text, and no pill

#### Scenario: Table row
- GIVEN a blocked bead assigned to me
- WHEN the My Tasks page is shown
- THEN its row shows its state "Blocked" as text, without a border or a tint

#### Scenario: Controls keep their pills
- GIVEN the Beads page with the status filter "Open"
- WHEN it is shown
- THEN the Status filter control shows its count "1" in a tinted pill

### REQ-DEPLOY-002: Tailscale serve on a dedicated port
<!-- base: 216225b83d9eb759540758daf2e8e650776b23d2750547b01fde4ee3224f2d09 -->
The deployment SHALL expose the console through `tailscale serve` on HTTPS port 8443 proxying to `http://127.0.0.1:8700`, and SHALL NOT depend on any other web application being served beside it.

#### Scenario: Reachable from the tailnet
- GIVEN the service is running and the serve rule is applied
- WHEN another tailnet device opens `https://<host>.ts.net:8443`
- THEN the My Tasks page of the current project loads

#### Scenario: Serve rule listed
- GIVEN the serve rule is applied
- WHEN the operator runs `tailscale serve status`
- THEN it lists `:8443` proxying to the console

### REQ-DOCKER-003: Host paths are preserved
<!-- base: b80d25eb0465886e1c53dd25ed87882bbad570e96c737fd5fc541397689d4b95 -->
The container SHALL run as the host user with `HOME=/home/gin`, and the compose file SHALL mount the config file and each project directory at the same absolute paths they have on the host.

#### Scenario: Shared config
- GIVEN the config lists `/home/gin/qwikfone`
- WHEN the container starts
- THEN `/home/gin/qwikfone` exists inside the container and the project switcher lists it

#### Scenario: Same config in both modes
- GIVEN the systemd service uses `~/.config/gin-console/config.yaml`
- WHEN the container starts from the same file
- THEN both show the same project list

### REQ-DOCKER-005: Loopback-only exposure
<!-- base: 0f60b8dcac1e65ecf01a8c6cea74a16e24622dd78b5c08bd576a2e4122551653 -->
The compose file SHALL publish the console port only on `127.0.0.1`, and the container SHALL bind `0.0.0.0` only together with `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1`.

#### Scenario: Not reachable from other interfaces
- GIVEN the stack is running
- WHEN a request goes to the host's non-loopback address on port 8700
- THEN the connection is refused

#### Scenario: Reachable through tailscale serve
- GIVEN `tailscale serve --https=8443` points at `http://127.0.0.1:8700`
- WHEN a tailnet device opens the `:8443` URL
- THEN it shows the My Tasks page of the current project

## REMOVED

### REQ-SERVER-003: Projects endpoint
<!-- base: 4d3219a0ac33c3aed084a89f89eeb15dbb70a1a211a8bf17799b853e5756d104 -->
Reason: `GET /api/projects` is removed with the Projects page (user decision 2026-11-23, epic gin-console-k4l); `GET /api/projects/beads` (REQ-SERVER-010) gives the project list.

### REQ-SERVER-005: Workflow state per project
<!-- base: 6625fe31b53d5b30aa91a2269b685803d856191a9ea38ebc5e47267ce244fd13 -->
Reason: The `workflow` block of `GET /api/projects` is removed with the endpoint; no page reads the project workflow any more.

### REQ-SERVER-007: Per-block errors
<!-- base: 4b49f956efaf6fe3edf5026e8b56c3a5bfe55d7744fe8600f047a3ecd5c79712 -->
Reason: Both blocks and their per-block errors were part of `GET /api/projects`; REQ-SERVER-010 keeps the `beads` error of `GET /api/projects/beads`.

### REQ-SERVER-008: Short-lived cache
<!-- base: 4615926d7c5662cb69b8ac8114222f83c1a2d777ca8e9259ce8b383efef57589 -->
Reason: The 5-second reuse and its lock belonged to `GET /api/projects` and its `gin state` commands, which are removed; `GET /api/projects/beads` starts no process.

### REQ-UI-001: Projects page
<!-- base: a7d598bb07c94273fbec21f852a136612fbe6ad6f13bbbc691832d1ffe862ddc -->
Reason: The Projects page is retired (user decision 2026-11-23, epic gin-console-k4l): the project switcher (REQ-UI-123) replaces it.

### REQ-UI-002: API error with retry
<!-- base: 69d4a7aacd7dce7ae996ca4a6411d2ace1f4b0c775b8e469f3e1dc6baaec1f30 -->
Reason: The Projects page is retired (user decision 2026-11-23, epic gin-console-k4l): the project switcher (REQ-UI-123) replaces it.

### REQ-UI-003: Workflow state display
<!-- base: 112b8612f73d14c2d46e638aa6afd018ff9ff47e25bf9122f60e22dfa7fbba94 -->
Reason: The Projects page is retired (user decision 2026-11-23, epic gin-console-k4l): the project switcher (REQ-UI-123) replaces it.

### REQ-UI-004: Beads summary display
<!-- base: 7ccf60499c1d03a11af35f034856434fc197083ce553b4d21e8bd7c272575015 -->
Reason: The Projects page is retired (user decision 2026-11-23, epic gin-console-k4l): the project switcher (REQ-UI-123) replaces it.

### REQ-UI-005: Project links
<!-- base: e05e0da4101255a1c28b7ec9083a46972fb867f67b4797ba681eda840bac7291 -->
Reason: The Projects page is retired (user decision 2026-11-23, epic gin-console-k4l): the project switcher (REQ-UI-123) replaces it.

### REQ-UI-006: Automatic refresh
<!-- base: e77bbf638e2b90c2b15fd8d53c3565fa5ec42ba399301da49209408e765a1ad8 -->
Reason: The Projects page is retired (user decision 2026-11-23, epic gin-console-k4l): the project switcher (REQ-UI-123) replaces it.

### REQ-UI-007: Per-block error display
<!-- base: d30fcd458f8b3bf20bcacb6cca9dc13258d831d9586c09188bb8340fb643f2ad -->
Reason: The Projects page is retired (user decision 2026-11-23, epic gin-console-k4l): the project switcher (REQ-UI-123) replaces it.
