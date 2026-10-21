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
WHEN a client requests `GET /api/beads/{project}/{id}`, the server SHALL return the bead with the fields of REQ-BEADS-001 plus `description`, `dependencies` and `dependents` (each with `id`, `title`, `status` and `type`, where `type` is `blocks` or `parent-child`) and, for an epic, `children` (each with `id`, `title`, `status`, closed children included), and SHALL respond 404 when the project or the bead does not exist.

#### Scenario: Dependencies and dependents
- GIVEN a bead blocked by one bead and blocking another
- WHEN a client requests its detail
- THEN `dependencies` lists the first with type `blocks` and `dependents` lists the second

#### Scenario: Epic children
- GIVEN an epic with 3 children, one of them closed
- WHEN a client requests its detail
- THEN `children` lists all 3 with their statuses

#### Scenario: Unknown bead
- GIVEN a configured project without a bead `x-1`
- WHEN a client requests `GET /api/beads/<project>/x-1`
- THEN the response is 404

### REQ-BEADS-003: Safe, read-only commands
The server SHALL run only read-only `bd` commands with fixed arguments in the project directory, SHALL accept a bead `id` only when it matches `[A-Za-z0-9][A-Za-z0-9._-]*` and respond 404 otherwise, SHALL treat any `closed` value other than `1` as absent without failing the request, and SHALL never create, update, close or delete a bead.

#### Scenario: Option-like id
- GIVEN a request for the bead `--help` or `../x`
- WHEN the server handles it
- THEN the response is 404 and no `bd` command ran

#### Scenario: Odd closed value
- GIVEN a request with `closed=../x` or `closed=true`
- WHEN the server handles it
- THEN the response is 200 and closed beads are left out

### REQ-BEADS-004: Short-lived cache
The server SHALL reuse a successful list for 5 seconds per project and closed setting and a successful detail for 5 seconds per project and bead, SHALL run the command for one key at most once at a time when requests overlap, and SHALL NOT keep an error result.

#### Scenario: Reused
- GIVEN a list fetched 2 seconds ago
- WHEN the same list is requested
- THEN `bd` is not run again

#### Scenario: Expired
- GIVEN a list fetched 6 seconds ago
- WHEN the same list is requested
- THEN `bd` runs again

#### Scenario: Different key
- GIVEN a list fetched without closed beads
- WHEN the list with `closed=1` is requested
- THEN `bd` runs for it

#### Scenario: Overlapping requests
- GIVEN two identical requests arrive while `bd` runs
- WHEN both complete
- THEN `bd` ran once

#### Scenario: Errors are not kept
- GIVEN the last run failed
- WHEN the same request is made again
- THEN `bd` runs again

### REQ-BEADS-005: Failures
IF `bd` is not found, times out after 30 seconds, exits with a non-zero status, prints invalid JSON or JSON of an unexpected shape, THEN the server SHALL respond 502 with a JSON body whose `error` says which happened, and SHALL leave out of a list any bead whose fields have the wrong types instead of failing the list.

#### Scenario: bd missing
- GIVEN no `bd` command can be found
- WHEN a client requests a list
- THEN the response is 502 and `error` says the command was not found

#### Scenario: Timeout
- GIVEN `bd` runs longer than 30 seconds
- WHEN a client requests a list
- THEN the response is 502 and `error` says it timed out

#### Scenario: One malformed bead
- GIVEN `bd` prints 3 beads of which one has a numeric `title`
- WHEN a client requests the list
- THEN the 2 valid beads are returned

### REQ-BEADS-006: Clean strings
The server SHALL replace lone surrogate characters in every string it returns.

#### Scenario: Lone surrogate in a title
- GIVEN a bead whose title contains a lone surrogate escape
- WHEN a client requests the list and its detail
- THEN both responses are 200 with the character replaced

### REQ-BEADS-007: Readiness and closing time
WHEN a client requests the bead list, the server SHALL add to each bead `ready` (true when `bd ready` lists it), `blocked` (true when `bd blocked` lists it or its status is `blocked`) and `closed_at` (the time it was closed, absent for a bead that is not closed), SHALL ignore ids that `bd ready` or `bd blocked` list but `bd list` does not, SHALL use the same 5-second cache entry for all three commands, and IF `bd ready` or `bd blocked` fails or prints an unexpected shape, THEN SHALL respond 502 as in REQ-BEADS-005 instead of returning wrong flags.

#### Scenario: Flags
- GIVEN an open unblocked bead, an open bead with an unfinished blocker, an in-progress bead and a closed bead
- WHEN a client requests the list with `closed=1`
- THEN the first has `ready` true, the second `blocked` true, the third both false, and the fourth has `closed_at`

#### Scenario: Unknown id is ignored
- GIVEN `bd ready` lists an id that `bd list` does not
- WHEN a client requests the list
- THEN that id does not appear and the request succeeds

#### Scenario: Readiness command fails
- GIVEN `bd blocked` exits with a non-zero status
- WHEN a client requests the list
- THEN the response is 502 with an `error`, and the failure is not cached

#### Scenario: One cache entry
- GIVEN a list was returned less than 5 seconds ago
- WHEN a client requests the same list
- THEN none of the three commands runs again

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
- GIVEN `bd` returns one comment whose `text` is a number and one valid comment
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
- GIVEN `bd comments` exits with a non-zero status
- WHEN a client requests the comments
- THEN the response is 502 with an `error`, and the next request runs the command again

#### Scenario: Cache
- GIVEN the comments were returned less than 5 seconds ago
- WHEN a client requests them again
- THEN `bd` does not run again

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
