# Beads

## Purpose

## Requirements

### REQ-BEADS-001: Bead list
WHEN a client requests `GET /api/beads?project=<name>`, the server SHALL return the beads of that configured project, each with `id`, `title`, `status`, `priority`, `issue_type`, `labels`, `owner`, `assignee`, `parent`, `created_at`, `updated_at`, `dependency_count`, `dependent_count` and `comment_count` and without the description, SHALL leave out closed beads unless the request has `closed=1`, and SHALL respond 404 when the project is not configured or its directory does not exist.

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

### REQ-BEADS-002: Bead detail
WHEN a client requests `GET /api/beads/{project}/{id}`, the server SHALL return the bead with the fields of REQ-BEADS-001 plus `description`, `dependencies` and `dependents` (each with `id`, `title`, `status` and `type`, where `type` is `blocks` or `parent-child`), `bugs` (each bead of type `bug` that has a `discovered-from` dependency on this bead, open or closed, with `id`, `title`, `status` and `type` `discovered-from`) and, for an epic, `children` (each with `id`, `title`, `status`, closed children included), and SHALL respond 404 when the project or the bead does not exist.

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

### REQ-BEADS-003: Safe, read-only commands
The server SHALL NOT run any `bd` command, SHALL only read files under the project's `.beads` directory, SHALL accept a bead `id` only when it matches `[A-Za-z0-9][A-Za-z0-9._-]*` and respond 404 otherwise, SHALL treat any `closed` value other than `1` as absent without failing the request, and SHALL never create, update, close or delete a bead or write a file under `.beads`.

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
- WHEN a client requests its list, a bead, its comments, `GET /api/projects` and a report
- THEN no `bd` process was started

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
IF a project's `.beads/issues.jsonl` does not exist, THEN the server SHALL respond 502 with an `error` that names the file and says to run `bd config set export.auto true` and `bd config set export.interval 1s` in the project, then any bd write or `bd export -o .beads/issues.jsonl`; IF the file cannot be read or a non-empty line is not a JSON object, THEN the server SHALL respond 502 with an `error` that says which; and the server SHALL leave out of a list any bead whose fields have the wrong types instead of failing the list. The `beads` block of `GET /api/projects` SHALL carry the same message as its `error` (REQ-SERVER-007).

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
- WHEN a client requests `GET /api/projects`
- THEN that project's `beads` is `{"error": "<the same message>"}` and its `workflow` has data

### REQ-BEADS-006: Clean strings
The server SHALL replace lone surrogate characters in every string it returns.

#### Scenario: Lone surrogate in a title
- GIVEN a bead whose title contains a lone surrogate escape
- WHEN a client requests the list and its detail
- THEN both responses are 200 with the character replaced

### REQ-BEADS-007: Readiness and closing time
WHEN a client requests the bead list or a bead detail, the server SHALL add to each bead `ready`, `blocked` and `closed_at` (the time it was closed, absent for a bead that is not closed), working out readiness from the export as `bd ready` and `bd blocked` do: a bead that is not closed is blocked WHEN it has a `blocks` or `blocked-by` dependency on a bead of the same export that is not closed, or WHEN an ancestor along its `parent-child` dependencies is blocked so; `blocked` is also true for a bead whose status is `blocked`; `ready` is true for an open bead that is not blocked and whose type is not `milestone`. A dependency on a bead the export does not hold (an `external:` reference or a deleted bead) SHALL block nothing.

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
The server SHALL keep, per project, the beads that `.beads/issues.jsonl` holds (with their labels, dependencies and comments) and SHALL take a bead's `parent` from its `parent-child` dependency. It SHALL read the file again WHEN its modification time or size differs from when the snapshot was taken, and SHALL NOT read it again while both are unchanged. WHEN a client sends `POST /api/refresh`, the server SHALL drop every snapshot and every cached answer (projects, milestones, reports) and respond 204, so that the next request reads its sources again.

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
- THEN the response to the refresh is 204, and the file is read again and the report is built again

## Diagrams
- [Export read](diagrams/export-read-activity.md)
- [Bead list transfer](diagrams/bead-list-transfer-activity.md)

### REQ-BEADS-013: Stale export
The server SHALL record, each time it reads a project's `.beads/issues.jsonl`, the content of the project's embedded Dolt manifests (`.beads/embeddeddolt/*/.dolt/noms/manifest`), and SHALL report the project's export as stale WHILE that content differs from the recorded content and the file has not changed since; WHERE a project has no such manifest, its export SHALL never be stale. `GET /api/projects` and `GET /api/projects/beads` SHALL include `stale` (a boolean) in the `beads` object of each project whose beads were read.

#### Scenario: Fresh export
- GIVEN the file was read when the manifest held `root-1`, and the manifest still holds `root-1`
- WHEN a client requests `GET /api/projects`
- THEN that project's `beads.stale` is `false`

#### Scenario: Write not exported
- GIVEN the file was read when the manifest held `root-1`
- WHEN a bead is written, the manifest now holds `root-2`, the file is unchanged, and a client requests `GET /api/projects` after its 5-second reuse (REQ-SERVER-008)
- THEN that project's `beads.stale` is `true` and its counts are those of the file

#### Scenario: Export catches up
- GIVEN a project whose export is stale
- WHEN the file is written again and a client requests `GET /api/projects` after its 5-second reuse
- THEN the file is read again and `beads.stale` is `false`

#### Scenario: No manifest
- GIVEN a project without an embedded Dolt manifest
- WHEN a client requests `GET /api/projects`
- THEN its `beads.stale` is `false`

#### Scenario: Project beads without reuse
- GIVEN the file was read when the manifest held `root-1`
- WHEN a bead is written, the manifest now holds `root-2`, the file is unchanged, and a client requests `GET /api/projects/beads` at once
- THEN that project's `beads.stale` is `true`
