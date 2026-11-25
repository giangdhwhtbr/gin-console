# Beads

## Purpose

## Requirements

### REQ-BEADS-001: Bead list
WHEN a client requests `GET /api/beads?project=<name>`, the server SHALL return the beads of that configured project, each with `id`, `title`, `status`, `priority`, `issue_type`, `labels`, `owner`, `assignee`, `parent`, `created_at`, `updated_at`, `dependency_count`, `dependent_count`, `comment_count`, `milestone` (the id of the nearest bead of type `milestone` among the bead and its ancestors, found over every bead of the export whether closed or not, or `null`), `kind` (for an epic, `technical` or `parity` from its `kind:` label, else `capability`; `null` for any other type), `capabilities` (the names on the `Capabilities:` line of the bead's description, split by commas, without a trailing `(new)`, together with the lower-cased `<CAP>` of each `req:REQ-<CAP>-<NNN>` label of the bead and, for an epic, of its children, sorted and without duplicates) `complexity` (`low`, `medium` or `high` from a `Complexity:` line of the bead's description, or `null`), `estimate_minutes` (the bead's `estimated_minutes` when above 0, or `null`), `points` (the bead's `metadata.points` when it is one of the whole numbers 1, 2, 3, 5, 8, 13 and 21, or `null`) and `points_reason` (the bead's `metadata.points_reason` when it is a string and `points` is set, or `null`), and without the description, SHALL leave out closed beads unless the request has `closed=1`, and SHALL respond 404 when the project is not configured or its directory does not exist.

#### Scenario: Open beads by default
- GIVEN a project with 3 open, 1 in-progress and 4 closed beads
- WHEN a client requests `GET /api/beads?project=<name>`
- THEN 4 beads are returned and none is closed

#### Scenario: Closed beads on request
- GIVEN the same project
- WHEN a client requests `GET /api/beads?project=<name>&closed=1`
- THEN all 8 beads are returned

#### Scenario: Unknown project
- GIVEN no project named `nope`
- WHEN a client requests `GET /api/beads?project=nope`
- THEN the response is 404

#### Scenario: Missing directory
- GIVEN a configured project whose directory does not exist
- WHEN a client requests its beads
- THEN the response is 404

#### Scenario: Milestone of a bead
- GIVEN milestone `m2`, its closed epic `e1`, and an open task `e1.1` under `e1`
- WHEN a client requests `GET /api/beads?project=<name>`
- THEN `e1.1` has `milestone` `m2`, `m2` has `milestone` `m2`, and a bead under no milestone has `milestone` `null`

#### Scenario: Kind, capabilities and estimate
- GIVEN epic `e-1` labelled `kind:technical` with the description lines `Capabilities: beads, ui (new)` and `Complexity: medium (two views)` and `estimated_minutes: 960`, and its track `t-1` labelled `req:REQ-MILESTONE-UI-019`
- WHEN a client requests `GET /api/beads?project=p`
- THEN `e-1` has `kind: "technical"`, `capabilities: ["beads", "milestone-ui", "ui"]`, `complexity: "medium"` and `estimate_minutes: 960`, and `t-1` has `kind: null` and `capabilities: ["milestone-ui"]`

#### Scenario: Defaults
- GIVEN epic `e-2` without a `kind:` label, a `Capabilities:` line or `req:` labels
- WHEN a client requests the beads
- THEN `e-2` has `kind: "capability"`, `capabilities: []`, `complexity: null` and `estimate_minutes: null`

#### Scenario: Story points
- GIVEN epic `e-1` whose metadata has `points: 5` and `points_reason: "new endpoint and UI"`, epic `e-2` whose metadata has `points: 4`, and epic `e-3` whose metadata has `points: "5"`
- WHEN a client requests the list
- THEN `e-1` has `points: 5` and that `points_reason`, and `e-2` and `e-3` have `points: null` and `points_reason: null`

### REQ-BEADS-002: Bead detail
WHEN a client requests `GET /api/beads/{project}/{id}`, the server SHALL return the bead with the fields of REQ-BEADS-001 plus `description`, `dependencies` and `dependents` (each with `id`, `title`, `status` and `type`, where `type` is `blocks` or `parent-child`), `bugs` (each bead of type `bug` that has a `discovered-from` dependency on this bead, open or closed, with `id`, `title`, `status` and `type` `discovered-from`) and, for an epic, `children` (each with `id`, `title`, `status` and `prep`, closed children included), and SHALL respond 404 when the project or the bead does not exist. A bead SHALL be a prep task when its `labels` hold `prep` and no label starts with `track:` or `req:`. The children of an epic that are not prep tasks are its tracks. The `prep` field of a child SHALL be true for a prep task and false for a track.

#### Scenario: Dependencies and dependents
- GIVEN a bead blocked by one bead and blocking another
- WHEN a client requests its detail
- THEN `dependencies` lists the first with type `blocks` and `dependents` lists the second

#### Scenario: Epic children
- GIVEN an epic with 3 children, one of them closed
- WHEN a client requests its detail
- THEN `children` lists all 3 with their statuses

#### Scenario: Bugs found
- GIVEN a bead with an open bug, a closed bug and an epic that each have a `discovered-from` dependency on it
- WHEN a client requests its detail
- THEN `bugs` lists the two bugs with type `discovered-from` and not the epic, and neither appears in `dependents` or `children`

#### Scenario: Unknown bead
- GIVEN a configured project without a bead `x-1`
- WHEN a client requests `GET /api/beads/<project>/x-1`
- THEN the response is 404

#### Scenario: Prep child
- GIVEN epic `e-1` with tracks `t-1` and `t-2`, prep task `p-1` labelled `prep` and `prep:mockup`, and child `t-3` labelled `prep` and `track:api`
- WHEN a client requests the detail of `e-1`
- THEN `children` lists `t-1`, `t-2`, `t-3` and `p-1`, with `prep` true for `p-1` only

### REQ-BEADS-003: Safe, read-only commands
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

### REQ-BEADS-004: One export per project
The server SHALL answer the bead list, the bead detail, the comments, the project's `beads` summary and the reports of a project from one read of that project's `.beads/issues.jsonl` (REQ-BEADS-012), SHALL read the file of one project at most once at a time when requests overlap, and SHALL NOT keep an error result.

#### Scenario: Every view from one read
- GIVEN a project whose snapshot is current
- WHEN a client requests its list, its list with `closed=1`, a bead detail and that bead's comments
- THEN the file was read once

#### Scenario: Overlapping requests
- GIVEN two requests for the same project arrive while its file is read
- WHEN both complete
- THEN the file was read once

#### Scenario: Errors are not kept
- GIVEN the last read of the file failed
- WHEN the same request is made again
- THEN the file is read again

### REQ-BEADS-005: Failures
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

### REQ-BEADS-006: Clean strings
The server SHALL replace lone surrogate characters in every string it returns.

#### Scenario: Lone surrogate in a title
- GIVEN a bead whose title contains a lone surrogate escape
- WHEN a client requests the list and its detail
- THEN both responses are 200 with the character replaced

### REQ-BEADS-007: Readiness and closing time
WHEN a client requests the bead list or a bead detail, the server SHALL add to each bead `ready`, `blocked` and `closed_at` (the time it was closed, absent for a bead that is not closed), working out readiness from the export as `bd ready` and `bd blocked` do: a bead that is not closed is blocked WHEN it has a `blocks` or `blocked-by` dependency on a bead of the same export that is not closed, or WHEN an ancestor along its `parent-child` dependencies is blocked so; `blocked` is also true for a bead whose status is `blocked`; `ready` is true for an open bead that is not blocked, whose type is not `milestone` and that is not a merge gate (REQ-BEADS-019). A dependency on a bead the export does not hold (an `external:` reference or a deleted bead) SHALL block nothing.

#### Scenario: Flags
- GIVEN an open unblocked bead, an open bead with an in-progress blocker, an in-progress bead and a closed bead
- WHEN a client requests the list with `closed=1`
- THEN the first has `ready` true, the second `blocked` true, the third both false, and the fourth has `closed_at`

#### Scenario: Closed blocker
- GIVEN an open bead whose only blocker is closed
- WHEN a client requests the list
- THEN the bead has `ready` true and `blocked` false

#### Scenario: Blocked ancestor
- GIVEN an epic blocked by an open bead, its child and its grandchild, all open
- WHEN a client requests the list
- THEN the epic, the child and the grandchild have `blocked` true and `ready` false

#### Scenario: Milestone is never ready
- GIVEN an open milestone without blockers
- WHEN a client requests the list
- THEN the milestone has `ready` false

#### Scenario: Merge gate is never ready
- GIVEN an open bead titled `external: .planning/plans/p.md#2` without blockers
- WHEN a client requests the list
- THEN the bead has `ready` false and `blocked` false

#### Scenario: External blocker
- GIVEN an open bead whose only blocker is `external:gin-workflow:cap`
- WHEN a client requests the list
- THEN the bead has `ready` true

### REQ-BEADS-008: Bead comments
WHEN a client requests `GET /api/beads/{project}/{id}/comments`, the server SHALL return the comments of that bead oldest first, each with `id`, `author`, `text`, `created_at` and `truncated`, SHALL cut a text longer than 20000 characters to 20000 and mark it `truncated`, SHALL leave out a comment whose fields have the wrong types, SHALL respond 404 when the project, the id or the bead does not exist, and SHALL respond 502 as in REQ-BEADS-005 when `bd` fails or answers in an unexpected shape.

#### Scenario: Comments in order
- GIVEN a bead with two comments written at different times
- WHEN a client requests its comments
- THEN both are returned oldest first with author, time and text, and `truncated` is false

#### Scenario: Long comment
- GIVEN a comment of 25000 characters
- WHEN a client requests the comments
- THEN its text has 20000 characters and `truncated` is true

#### Scenario: No comments
- GIVEN a bead without comments
- WHEN a client requests its comments
- THEN the response is an empty list

#### Scenario: Malformed comment
- GIVEN `bd export` holds one comment whose `text` is a number and one valid comment
- WHEN a client requests the comments
- THEN only the valid comment is returned

#### Scenario: Unknown bead or project
- GIVEN no bead `x-1` and no project `nope`
- WHEN a client requests `/api/beads/<project>/x-1/comments` or `/api/beads/nope/x-1/comments`
- THEN the response is 404

#### Scenario: Unsafe id
- GIVEN a request for the comments of `--help` or `../x`
- WHEN the server handles it
- THEN the response is 404 and no `bd` command ran

#### Scenario: bd fails
- GIVEN `bd export` exits with a non-zero status
- WHEN a client requests the comments
- THEN the response is 502 with an `error`, and the next request runs the command again

### REQ-BEADS-009: Author and text fields
The server SHALL return `created_by` (null when `bd` has none) with every bead of the list and of the detail, and SHALL return with the bead detail the plain-text fields `design`, `notes`, `acceptance_criteria` and `close_reason`, each null when `bd` has none or it is empty.

#### Scenario: Fields present
- GIVEN a bead created by `gin` with a design, notes, acceptance criteria and a close reason
- WHEN a client requests its detail
- THEN `created_by` is `gin` and the four texts are returned

#### Scenario: Fields absent
- GIVEN a bead without notes and with an empty design
- WHEN a client requests its detail
- THEN `notes` and `design` are null

#### Scenario: List rows
- GIVEN a bead created by `gin`
- WHEN a client requests the list
- THEN its row has `created_by` `gin`

### REQ-BEADS-010: Blocking dependencies
The server SHALL return with every bead of the list `blocked_by`, the ids of the beads that block it, taken from the dependencies `bd export` prints for it whose type is `blocks` or `blocked-by`, SHALL leave out dependencies of any other type, SHALL leave out a dependency whose fields have the wrong types without dropping the bead, and SHALL return an empty list for a bead without such dependencies.

#### Scenario: Blocking ids
- GIVEN a bead with a `blocks` dependency on `a-1` and a `blocked-by` dependency on `a-2`
- WHEN a client requests the list
- THEN its `blocked_by` is `a-1` and `a-2`

#### Scenario: Other types ignored
- GIVEN a bead with `parent-child`, `related` and `discovered-from` dependencies
- WHEN a client requests the list
- THEN its `blocked_by` is empty

#### Scenario: Malformed dependency
- GIVEN a bead with one dependency whose `depends_on_id` is a number and one valid `blocks` dependency
- WHEN a client requests the list
- THEN the bead is returned and its `blocked_by` holds only the valid one

#### Scenario: No dependencies
- GIVEN a bead without dependencies
- WHEN a client requests the list
- THEN its `blocked_by` is empty

### REQ-BEADS-012: Export snapshot and refresh
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

## Diagrams
- [Export read](diagrams/export-read-activity.md)
- [Bead list transfer](diagrams/bead-list-transfer-activity.md)
- [Milestone filter](diagrams/milestone-filter-activity.md)
- [Kind and capabilities](diagrams/kind-capabilities-activity.md)
- [Beads pull](diagrams/beads-pull-activity.md)
- [Scheduled pull](diagrams/scheduled-pull-activity.md)
- [Pull status](diagrams/pull-status-state.md)
- [Lane fields](diagrams/lane-fields-activity.md)
- [Workflow of an epic](diagrams/epic-workflow-activity.md)
- [Bead counts](diagrams/bead-counts-activity.md)
- [Bead state as shown](diagrams/bead-state.md)
- [Me filter](diagrams/me-filter-activity.md)
- [Next command](diagrams/next-command-activity.md)

## Use Cases
- [Refresh pulls Beads](use-cases/refresh-pulls-beads.md)
- [Scheduled Beads pull](use-cases/scheduled-beads-pull.md)
- [Filter my beads](use-cases/filter-my-beads.md)

### REQ-BEADS-013: Stale export
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

### REQ-BEADS-014: Bead list revalidation
WHEN the server answers `GET /api/beads` with 200, it SHALL send `ETag: W/"<tag>"`, where `<tag>` is derived from the response body so that two equal bodies have the same tag and two different bodies have different tags, together with `Cache-Control: no-cache`; WHEN the request's `If-None-Match` names that tag, the server SHALL answer 304 with the same `ETag` and no body; and it SHALL send no `ETag` with a 404 or 502 answer.

#### Scenario: Same list
- GIVEN a project whose beads did not change between two requests
- WHEN a client requests `GET /api/beads?project=<name>` twice
- THEN both answers are 200 with the same `ETag` and `Cache-Control: no-cache`

#### Scenario: Not modified
- GIVEN a client holds the `ETag` of the current bead list
- WHEN it requests the list again with `If-None-Match` set to that `ETag`
- THEN the answer is 304 with that `ETag` and an empty body

#### Scenario: Changed list
- GIVEN a client holds the `ETag` of a bead list, and a bead's title changes in the export
- WHEN it requests the list with `If-None-Match` set to that `ETag`
- THEN the answer is 200 with the new list and a different `ETag`

#### Scenario: Show closed
- GIVEN a project with closed beads
- WHEN a client requests the list without and with `closed=1`
- THEN the two `ETag` values differ

#### Scenario: Failure
- GIVEN the project's export cannot be read as in REQ-BEADS-005
- WHEN a client requests its beads with any `If-None-Match`
- THEN the answer is 502 with an `error` and no `ETag`

### REQ-BEADS-015: Project milestones
WHEN a client requests `GET /api/beads/milestones?project=<name>`, the server SHALL read the project's beads from its `bd export` snapshot (REQ-BEADS-012) without starting a process, and SHALL return `milestones`: every bead of type `milestone`, each with `id`, `title`, `status`, `start` and `end` (ISO dates from `metadata.start` and `metadata.end`, or `null` when missing or not a valid date), and `current`: the id of the current milestone, or `null`. A milestone's `status` SHALL be `closed` when the bead is closed, else `active` when `metadata.kickoff` is a date on or before today, `scheduled` when it is after today, and `planned` without a valid kickoff. The current milestone SHALL be the first match, among milestones with both dates, of: the `active` milestone with the earliest `start`; the open milestone whose `start` to `end` holds today; the open milestone with the earliest `start` after today (ties by `id`). The server SHALL respond 404 when the project is not configured or its directory does not exist, and 502 with an `error` as in REQ-BEADS-005.

#### Scenario: Current milestone
- GIVEN project `alpha` with closed milestone `m1`, active milestone `m2` and planned milestone `m3`
- WHEN a client requests `GET /api/beads/milestones?project=alpha`
- THEN `milestones` holds `m1`, `m2` and `m3` with statuses `closed`, `active` and `planned`, and `current` is `m2`

#### Scenario: Period holds today
- GIVEN project `alpha` whose only open milestone `m4` has no kickoff and runs from before today to after today
- WHEN a client requests its milestones
- THEN `current` is `m4`

#### Scenario: No open milestone
- GIVEN project `alpha` whose milestones are all closed
- WHEN a client requests its milestones
- THEN `current` is `null`

#### Scenario: Undated milestone
- GIVEN a milestone bead `m5` without `metadata.end`
- WHEN a client requests its project's milestones
- THEN `m5` is listed with `end` `null` and is not `current`

#### Scenario: Bad input
- GIVEN no project `nope`
- WHEN a client requests `GET /api/beads/milestones?project=nope`
- THEN the response is 404

### REQ-BEADS-016: Pull Beads from the Dolt remote
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
WHERE the `pull` of a project in `GET /api/projects/beads` has `status` `error`, the Beads page and the My Tasks page SHALL show, above their list and while that project is the current project (REQ-UI-124), the note "Pulling Beads of <project> failed: <error>. Run `bd dolt pull` in <path>." once, and SHALL show no such note for another project or for a project whose `pull` is `null`, missing, or not `error`.

#### Scenario: Failed pull note
- GIVEN projects A whose `pull.status` is `error` and B whose `pull` is `null`
- WHEN My Tasks opens with A as the current project, and then the Beads page opens with A selected
- THEN each page shows one note naming A, its error, `bd dolt pull` and A's path, none names B, and the lists are shown below it

#### Scenario: Older backend
- GIVEN projects without a `pull` key
- WHEN the Beads and My Tasks pages load
- THEN no pull note is shown

### REQ-BEADS-019: Lane fields and merge gates
WHEN a client requests the bead list or a bead detail, the server SHALL add to each bead `lane`, `track`, `claim` and `waits_for`, read from the export without running a command:
- `lane`: the name on the first description line `Lane: <name>` (the name may be in backticks), else the name of the first label `lane:<name>`, a name being lower-case letters, digits and `-` starting with a letter or digit; `null` when there is none;
- `track`: `{"plan": <path>, "number": <N>}` from the first description line `Plan: <path>, Track <N>` (the path may be in backticks), else `{"plan": null, "number": <N>}` from the first label `track:<N>`; `null` when there is neither;
- `claim`: `{"holder": <text>, "expires_at": <UTC time>}` from `metadata.claim`, given as an object or as a JSON string, when `holder` is a non-empty string and `expires_at` a time written `YYYY-MM-DDTHH:MM:SSZ`; `null` otherwise;
- `waits_for`: `{"plan": <path>, "number": <N>, "track_id": <id>, "lane": <name>}` when the title is `external: <path>#<N>`, `null` otherwise; `track_id` and `lane` name the track the gate waits for, `null` when it is not found: among the children of the gate's parent, or, for a gate without a parent, of the parent of the first bead (by id) it blocks, the child that is not a merge gate whose `track` has that plan and number, else the only such child whose `track` has that number.
A bead whose `waits_for` is not `null` is a merge gate: the placeholder that gin-workflow's team mode makes block a track that needs another lane's merged pull request, closed when that pull request merges. Each relation of a bead detail (its dependencies, dependents and children) SHALL carry the `waits_for` of the related bead.

#### Scenario: Track of a lane
- GIVEN a bead with the description lines `Plan: .planning/plans/2026-11-20-shop.md, Track 2` and `Lane: be`, the labels `lane:be` and `track:2`, and `metadata.claim` `{"holder": "ann@x.io", "expires_at": "2026-11-20T16:00:00Z"}`
- WHEN a client requests the bead list
- THEN the bead has `lane` `be`, `track` `{"plan": ".planning/plans/2026-11-20-shop.md", "number": 2}` and `claim` `{"holder": "ann@x.io", "expires_at": "2026-11-20T16:00:00Z"}`

#### Scenario: Labels only
- GIVEN a bead without `Plan:` or `Lane:` lines, labelled `lane:fe` and `track:3`
- WHEN a client requests the bead list
- THEN the bead has `lane` `fe` and `track` `{"plan": null, "number": 3}`

#### Scenario: Claim as a JSON string
- GIVEN a bead whose `metadata.claim` is the string `{"holder": "bao@x.io", "expires_at": "2026-11-21T09:00:00Z"}`, and a bead whose `metadata.claim` is the string `soon`
- WHEN a client requests the bead list
- THEN the first has `claim` `{"holder": "bao@x.io", "expires_at": "2026-11-21T09:00:00Z"}` and the second has `claim` `null`

#### Scenario: Not a lane name
- GIVEN a bead with the description line `Lane: Back End` and no `lane:` label
- WHEN a client requests the bead list
- THEN the bead has `lane` `null`

#### Scenario: Merge gate
- GIVEN epic `e-1` with track `e-1.2` in lane `be` described `Plan: .planning/plans/2026-11-20-shop.md, Track 2`, track `e-1.4`, and a bead without a parent titled `external: .planning/plans/2026-11-20-shop.md#2` that blocks `e-1.4`
- WHEN a client requests the bead list
- THEN the gate has `waits_for` `{"plan": ".planning/plans/2026-11-20-shop.md", "number": 2, "track_id": "e-1.2", "lane": "be"}`, and every other bead has `waits_for` `null`

#### Scenario: Track not found
- GIVEN a gate titled `external: .planning/plans/other.md#7` whose parent is `e-1`, and no child of `e-1` with track 7
- WHEN a client requests the bead list
- THEN the gate has `waits_for` `{"plan": ".planning/plans/other.md", "number": 7, "track_id": null, "lane": null}`

#### Scenario: Gate in the relations
- GIVEN track `e-1.4` blocked by that first gate
- WHEN a client requests the detail of `e-1.4`
- THEN its dependency on the gate carries the gate's `waits_for`

### REQ-BEADS-020: Workflow of an epic
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

### REQ-BEADS-022: Child counts
WHEN a client requests the bead list or a bead detail, the server SHALL add to each bead `child_counts`, an object with `total` and `closed`, the number of its direct children that are tracks (neither prep tasks, REQ-BEADS-002, nor merge gates, REQ-BEADS-019) and the number of those whose status is `closed`, `in_progress`, `blocked`, `ready` and `deferred`, the number of those tracks that are not closed in each state the Board gives them (REQ-UI-031, REQ-BEADS-021), and `prep_total` and `prep_closed`, the number of its direct children that are prep tasks and of those that are closed, counted over every bead of the export whatever `closed` the request has. A bead SHALL count as done when, and only when, its status is `closed`.

#### Scenario: Counts ignore the closed filter
- GIVEN epic `e-1` with tracks `t-1` and `t-2` (closed) and `t-3` (open), the closed prep task `p-1` labelled `prep`, and the merge gate `g-1` titled `external: .planning/plans/p.md#1`
- WHEN a client requests `GET /api/beads?project=<name>` without `closed=1`
- THEN `e-1` has `child_counts` `{total: 3, closed: 2, in_progress: 0, blocked: 0, ready: 1, deferred: 0, prep_total: 1, prep_closed: 1}` although `t-1`, `t-2` and `p-1` are not in the list

#### Scenario: Bead without children
- GIVEN a task without children
- WHEN a client requests its detail
- THEN its `child_counts` is `{total: 0, closed: 0, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0}`

#### Scenario: Counts by state
- GIVEN epic `e-2` with the tracks `t-1` (closed), `t-2` (in progress), `t-3` (in progress and blocked by the open bead `x`), `t-4` (open and ready) and `t-5` (deferred)
- WHEN a client requests `GET /api/beads?project=<name>`
- THEN `e-2` has `child_counts` `{total: 5, closed: 1, in_progress: 1, blocked: 1, ready: 1, deferred: 1, prep_total: 0, prep_closed: 0}`

### REQ-BEADS-023: One person for an email and its handle
Type: business-rule
The console SHALL take two assignee values for the same person WHEN they are equal once each is trimmed, lower-cased and cut before its first `@`, SHALL name that person by that cut value (its handle), and SHALL apply this rule in the Assignee filter (REQ-UI-082), Group by assignee (REQ-UI-034), the assignee shown on beads (REQ-UI-135), My Tasks (REQ-UI-100) and the members of the Team report (REQ-REPORTS-009).

#### Scenario: Email and handle
- GIVEN beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `ann@example.com`
- WHEN the Assignee filter lists its options
- THEN it lists the people `ann` and `giangdhwhtbr` once each

#### Scenario: Same handle at two domains
- GIVEN beads assigned to `ann@a.example` and `ann@b.example`
- WHEN the team report is built
- THEN both count for the one member `ann`

### REQ-BEADS-024: Me in the Assignee filter
The Assignee filter of the Beads page and of the Beads tab of a milestone page SHALL offer "Me" as its first option, kept in the URL as `me` within `assignee`, which SHALL match the beads whose assignee is the same person (REQ-BEADS-023) as the email the browser holds for the console (REQ-UI-097).

#### Scenario: Me by handle or email
- GIVEN the browser holds the email `giangdhwhtbr@gmail.com`, and beads assigned to `giangdhwhtbr`, to `giangdhwhtbr@gmail.com` and to `ann`
- WHEN the user selects "Me" in the Assignee filter
- THEN the first two beads remain, and the URL query holds `assignee=me`

#### Scenario: Shared link means the viewer
- GIVEN the link `/beads?project=example&assignee=me` opened in a browser that holds the email `ann@example.com`
- WHEN the Beads page loads
- THEN it shows the beads assigned to `ann` or `ann@example.com`, with "Me" selected
