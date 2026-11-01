# Spec Delta: Quality signals

## ADDED

### REQ-BEADS-011: Bead reopens
WHEN a client requests `GET /api/beads/{project}/{id}/reopens`, the server SHALL return `{"reopens": N}`, where N counts, over the snapshots of `bd history <id> --json` from oldest to newest, each snapshot with status `closed` directly followed by one with another status, SHALL run `bd history` again for that bead only when its `updated_at` differs from the one of the last count, SHALL respond 404 when the project, the id or the bead does not exist, and SHALL respond 502 as in REQ-BEADS-005 when `bd` fails or answers in an unexpected shape, without keeping that error.

#### Scenario: reopened twice
- GIVEN a bead whose history, oldest first, has the statuses open, in_progress, closed, closed, open, closed, in_progress, closed
- WHEN a client requests its reopens
- THEN the response is `{"reopens": 2}`

#### Scenario: never reopened
- GIVEN a bead whose history has the statuses open, in_progress, closed, closed
- WHEN a client requests its reopens
- THEN the response is `{"reopens": 0}`

#### Scenario: unchanged bead
- GIVEN the reopens of a bead were counted and its `updated_at` has not changed since
- WHEN a client requests its reopens again, after more than 5 seconds
- THEN `bd history` does not run again and the same count is returned

#### Scenario: changed bead
- GIVEN the reopens of a bead were counted and its `updated_at` changed since
- WHEN a client requests its reopens
- THEN `bd history` runs again

#### Scenario: unknown bead or unsafe id
- GIVEN no bead `x-1`, no project `nope`, and the id `--help`
- WHEN a client requests `/api/beads/<project>/x-1/reopens`, `/api/beads/nope/x-1/reopens` or `/api/beads/<project>/--help/reopens`
- THEN the response is 404, and for `--help` no `bd` command ran

#### Scenario: bd history fails
- GIVEN `bd history` exits with a non-zero status
- WHEN a client requests the reopens
- THEN the response is 502 with an `error`, and the next request runs `bd history` again

### REQ-UI-086: Bugs and reopens on the bead page
The bead page and the List detail panel SHALL list under "Bugs found" the `bugs` of the bead (each with id, title and status, linking to that bead in the same project) and show nothing when there are none, SHALL request the reopens of REQ-BEADS-011 after the bead is shown and, when the count is above 0, add "Reopened 1 time" or "Reopened N times" to the line with the creation and update times, SHALL show nothing about reopens while they load or when the count is 0, IF the reopens request fails or its answer has an unexpected shape, THEN SHALL show "Reopens unavailable" with the error and a Retry button that repeats only that request while the rest of the page stays shown, and a late reopens answer for a bead that is no longer shown SHALL NOT be shown for the bead now shown.

#### Scenario: bugs found
- GIVEN a bead with an open bug and a closed bug that each have a `discovered-from` dependency on it
- WHEN the bead page is shown
- THEN "Bugs found" lists both with their id, title and status, each linking to `/beads/<project>/<its id>`

#### Scenario: no bugs
- GIVEN a bead whose `bugs` is empty
- WHEN the bead page is shown
- THEN there is no "Bugs found" section

#### Scenario: reopened
- GIVEN a bead whose reopens answer is `{"reopens": 2}`
- WHEN the bead page is shown
- THEN the line with the creation and update times includes "Reopened 2 times"

#### Scenario: not reopened or still loading
- GIVEN a bead whose reopens answer is `{"reopens": 0}`, or has not arrived yet
- WHEN the bead page is shown
- THEN the page shows no text about reopens and no 0

#### Scenario: reopens fail
- GIVEN the reopens request answers 502 with `bd history failed`
- WHEN the bead page is shown
- THEN the bead fields stay shown, "Reopens unavailable" shows `bd history failed` and Retry, and Retry requests the reopens again

#### Scenario: late answer
- GIVEN the reopens of bead `a-5` are still loading and the user opens bead `a-6`
- WHEN the answer for `a-5` arrives
- THEN the page of `a-6` does not show it

### REQ-UI-087: Quality signals in the bug color
The "Reopened 1 time" or "Reopened N times" text of REQ-UI-086 and the "Bugs found" heading SHALL be shown in the bug color (the `type-bug` theme token used by the bug type badge), in light and dark, while the " · " separator, the bug rows and the "Reopens unavailable" error keep the default text color.

#### Scenario: highlighted signals
- GIVEN a bead with one bug found whose reopens answer is `{"reopens": 1}`
- WHEN the bead page is shown
- THEN "Reopened 1 time" and the "Bugs found" heading use the `type-bug` color and the separator and bug rows do not

## MODIFIED

### REQ-BEADS-002: Bead detail
<!-- base: 0a5642e9fd15e3fdf421a4343f4bea1fb4e892d874cf79a23e0a3703e0a0fea7 -->
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

## REMOVED
