# Spec Delta: Lanes view

## ADDED

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

### REQ-UI-111: Lanes view
The Beads views SHALL offer the view Lanes (`view=lanes`) WHILE the scope, resolved as for the Graph view (REQ-UI-106), is a bead with at least one loaded child that is not a merge gate and whose `lane` is not `null` (REQ-BEADS-019); closed children count only while closed beads are loaded ("Show closed", a sprint or a closed milestone, or the Lanes view itself). The view SHALL draw one row per lane of the scope's children that are not merge gates, then a row "No lane" for those children without a `lane` when there is any, the lane rows ordered by the column of their first card, then by name. Each row SHALL show its header (REQ-UI-112) in a column that stays visible while the cards scroll sideways, 168px wide under 1024px windows and 240px from 1024px, and its beads as cards with the content of a Graph node (REQ-UI-049) on columns shared by every row: a card's column SHALL be after the columns of the cards it depends on (its blockers among the drawn cards and, through a merge gate, the card of the track that gate waits for) and after the column of the previous card of its row, the cards of a row ordered by their dependency order, then by track number, then by id. The view SHALL load closed beads whatever "Show closed" says, SHALL draw a card only when its bead matches the search and the filters, SHALL leave out a row with no card, and SHALL say "No beads match these filters" when it draws no card. WHEN a card is selected or opened, the view SHALL behave as the Graph view does with a node (REQ-UI-106). IF `view=lanes` while the scope has no child with a lane, THEN the view SHALL say "Lanes show for an epic whose tracks have lanes" with a link to the Graph view.

#### Scenario: Offered for an epic with lanes
- GIVEN the example project with epic `ex-e12`, whose tracks have lanes, and epic `ex-e3`, whose tracks have none
- WHEN the user opens the Beads views with `scope=ex-e12`, then with `scope=ex-e3`, then without a scope
- THEN the Lanes tab is offered for `ex-e12` only

#### Scenario: Rows and columns
- GIVEN epic `ex-e12` with lanes `be` (tracks 1 and 2, track 2 blocked by track 1), `fe` (track 3), `qa` (track 4, blocked by merge gates waiting for tracks 2 and 3), `infra` (tracks 5 and 6) and two children without a lane
- WHEN the user opens its Lanes view
- THEN the rows are `be`, `fe`, `infra`, `qa` and "No lane", track 2 is in a later column than track 1, and track 4 is in a later column than tracks 2 and 3

#### Scenario: Closed tracks without Show closed
- GIVEN "Show closed" is off and track 1 of `ex-e12` is closed
- WHEN the user opens the Lanes view of `ex-e12`
- THEN the card of track 1 is drawn

#### Scenario: Filters
- GIVEN the assignee filter selects `bao`, who holds only lane `fe`
- WHEN the user opens the Lanes view of `ex-e12`
- THEN only the row `fe` is drawn, with its header

#### Scenario: Scope without lanes
- GIVEN the URL has `view=lanes&scope=ex-e3`
- WHEN the page loads
- THEN the view says "Lanes show for an epic whose tracks have lanes" with a link to the Graph view

### REQ-UI-112: Lane header and state
Each lane row's header SHALL show the lane name in a heavier weight, then as label/value facts (REQ-UI-110):
- State: the lane's state as an icon and its words;
- Held by: the distinct assignees of the lane's tracks that are not closed, or "Unclaimed" when none has one; left out when every track is closed;
- Lease: "until <date>" from the latest `claim.expires_at` among the lane's tracks that are not closed when it is later than now, "expired <date>" when it is not, left out when none of them has a `claim`;
- Tracks: "<closed>/<total> closed" over all the lane's tracks whatever the search and filters.
The state SHALL be the first of these that holds:
1. "All tracks closed": every track is closed;
2. "Running": a track is `in_progress`, or a track that is not closed has a `claim` whose `expires_at` is later than now;
3. "Waiting for <lanes>": the lane's first card that is not closed is blocked by merge gates that are not closed, `<lanes>` being their `waits_for.lane` values, joined by ", ", or "another lane" for a gate whose `waits_for.lane` is `null`;
4. "Blocked": that card is blocked (REQ-BEADS-007);
5. "Not started": no track is closed;
6. "Idle": otherwise.
The header of the row "No lane" SHALL show its name and Tracks only.

#### Scenario: Running lane with a lease
- GIVEN lane `be` with track 1 closed and track 2 `in_progress`, both assigned to `ann`, track 2 with a `claim` expiring tomorrow at 16:00
- WHEN the Lanes view is shown
- THEN the `be` header shows State "Running", Held by `ann`, Lease "until <tomorrow> 16:00" and Tracks "1/2 closed"

#### Scenario: Waiting for another lane
- GIVEN lane `qa` whose only track, open and unassigned, is blocked by an open merge gate waiting for track 2 of lane `be` and a closed merge gate waiting for track 3 of lane `fe`
- WHEN the Lanes view is shown
- THEN the `qa` header shows State "Waiting for be", Held by "Unclaimed" and Tracks "0/1 closed"

#### Scenario: Idle lane with an expired lease
- GIVEN lane `infra` with track 5 closed and track 6 open, assigned to `chi` with a `claim` that expired yesterday
- WHEN the Lanes view is shown
- THEN the `infra` header shows State "Idle", Held by `chi` and Lease "expired <yesterday date and time>"

#### Scenario: All tracks closed
- GIVEN lane `fe` whose only track is closed
- WHEN the Lanes view is shown
- THEN the `fe` header shows State "All tracks closed" and Tracks "1/1 closed", and no Held by or Lease

#### Scenario: Not started and blocked
- GIVEN lane `x` with two open unassigned tracks without blockers, and lane `y` whose first open track is blocked by an open bead that is not a merge gate
- WHEN the Lanes view is shown
- THEN `x` shows State "Not started" and `y` shows State "Blocked"

### REQ-UI-113: Arrows and merge markers between cards
The Lanes view SHALL draw an arrow from each drawn card to each drawn card it blocks, and from the card of the track a merge gate waits for to each drawn card that gate blocks, as a line of horizontal and vertical segments that runs only in the gaps between columns and between rows and never across a card or a header. On each arrow through a merge gate it SHALL draw, in a gap between rows, a marker with an icon and the word "Waiting" while the gate is not closed or "Merged" when it is closed, markers in one gap moved apart so that none overlaps another or an arrow's turn. IF the track a merge gate waits for is not drawn, THEN the view SHALL draw no arrow for it and SHALL draw the marker in the gap between rows above the waiting card, from its left edge, with the words "Waiting for track <N>" or "Merged track <N>".

#### Scenario: Waiting and merged
- GIVEN epic `ex-e12`, where track 4 of lane `qa` is blocked by an open merge gate waiting for track 2 and a closed one waiting for track 3
- WHEN the Lanes view is shown
- THEN an arrow runs from track 2 to track 4 with the marker "Waiting", an arrow runs from track 3 to track 4 with the marker "Merged", and no arrow segment or marker crosses a card or a header

#### Scenario: Arrow inside a lane
- GIVEN track 2 of lane `be` blocked by track 1
- WHEN the Lanes view is shown
- THEN an arrow runs from track 1 to track 2 without a marker

#### Scenario: Track not drawn
- GIVEN a merge gate titled `external: .planning/plans/other.md#7` that blocks track 4 and matches no child of the scope
- WHEN the Lanes view is shown
- THEN no arrow is drawn for it and the marker "Waiting for track 7" is drawn above the card of track 4

### REQ-UI-114: Lanes keyboard and screen readers
In the Lanes view, WHEN a card has focus, the keys Arrow Left and Arrow Right SHALL move the focus and the selection to the previous or next card of its row, and Arrow Up and Arrow Down to the card of the row above or below whose column is nearest, the earlier column on a tie, and SHALL do nothing at an edge; Escape, Enter and double-click SHALL behave as in the Graph view (REQ-UI-052, REQ-UI-106). The view SHALL hold a list that only screen readers read, naming each lane with its state, holder, lease and tracks, then each arrow through a merge gate as "<lane> #<N> waits for <lane> #<M>: merge pending" or "…: merged".

#### Scenario: Moving between rows
- GIVEN the focus on track 2 of lane `be`
- WHEN the user presses Arrow Down
- THEN the focus and the selection move to track 3, the only card of lane `fe`, the row below, and the details panel shows it

#### Scenario: Screen reader list
- GIVEN the Lanes view of `ex-e12`
- WHEN a screen reader reads the view
- THEN it reads "be: Running, held by ann, lease until …, 1/2 closed" and "qa #4 waits for be #2: merge pending"

### REQ-UI-115: Lane chip
WHERE a bead's `lane` is not `null` (REQ-BEADS-019), its List row, its Board and Focus cards, its Graph node, its Gantt child row (REQ-MILESTONE-UI-015), its bead page and its details panel SHALL show a lane chip: an icon and the lane name, cut with an ellipsis and with the title "Lane <name>"; the cards of the Lanes view, whose row names the lane, SHALL NOT. The label chips of a bead SHALL NOT show its `lane:<name>` label when it has a `lane`, nor its `track:<N>` label when it has a `track`. The facts of a bead page (REQ-UI-110) SHALL add Lane (the name), Track ("#<N>", followed by the plan's file name when `track.plan` is known) and Lease ("until <date>" or "expired <date>" as in REQ-UI-112) when the bead has them.

#### Scenario: Chip in every view
- GIVEN track 2 of `ex-e12` in lane `be`, labelled `lane:be` and `track:2`
- WHEN its List row, Board card, Graph node, Gantt child row and bead page are shown
- THEN each shows the chip "be" with the title "Lane be", and no label chip reads `lane:be` or `track:2`

#### Scenario: Facts
- GIVEN track 2 with `track` `{"plan": ".planning/plans/2026-11-20-shop.md", "number": 2}` and a `claim` expiring tomorrow at 16:00
- WHEN its bead page is shown
- THEN the facts include Lane "be", Track "#2 2026-11-20-shop.md" and Lease "until <tomorrow> 16:00"

#### Scenario: Bead without a lane
- GIVEN a bead whose `lane` is `null`
- WHEN its List row is shown
- THEN it has no lane chip

### REQ-UI-116: Merge gates in the views
The List, Board, Focus and My Tasks views SHALL NOT show merge gates (REQ-BEADS-019), and no count of children or tracks that the frontend shows ("n of m done" of a Graph node, the child counts of a List row and of a bead page) SHALL count them. The Graph view SHALL draw a merge gate as a node with a dashed border and a merge icon that reads, in place of its title, "Waits for <lane> #<N> to merge" (`<lane>` its `waits_for.lane`, else "track" without the `#`) and, in place of its state, "Waiting" while it is not closed or "Merged" when it is closed. The bead page of a merge gate SHALL show the same words as its title and state, keep its own title as a fact "Placeholder", and add the fact "Waits for" with the plan path and the track number. In the Dependencies of a bead page (REQ-UI-028), a merge gate SHALL read "Waits for <lane> #<N> · merge pending" or "Waits for <lane> #<N> · merged", with `<lane> #<N>` written as on its Graph node.

#### Scenario: Not on the Board
- GIVEN an open merge gate without blockers and an open task without blockers
- WHEN the user opens the Board, List and Focus views
- THEN the task is shown and the merge gate is not

#### Scenario: Not counted as a child
- GIVEN epic `ex-e12` with 8 tracks and a merge gate whose parent is `ex-e12`
- WHEN its Graph node is shown in the project scope
- THEN it reads "n of 8 done"

#### Scenario: Merge gate node
- GIVEN an open merge gate waiting for track 2 of lane `be`, in the Graph view of `ex-e12`
- WHEN the view is shown
- THEN the gate is a dashed node with a merge icon reading "Waits for be #2 to merge" and "Waiting"

#### Scenario: Dependencies of a track
- GIVEN track 4 blocked by an open merge gate waiting for track 2 of lane `be` and a closed one waiting for track 3 of lane `fe`
- WHEN the bead page of track 4 is shown
- THEN its Dependencies read "Waits for be #2 · merge pending" and "Waits for fe #3 · merged"

## MODIFIED

### REQ-BEADS-007: Readiness and closing time
<!-- base: 2632a17c94f82a491fe45535b64d7f8ced2fe3f42609f650edc5b3889dceeb15 -->
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

### REQ-SERVER-006: Beads summary per project
<!-- base: a9789995f669d145b95e06742e37ea8a2756a513cda34bb6b892b63df1156fc3 -->
WHEN a client requests `GET /api/projects`, the server SHALL include for each existing project a `beads` object with the counts `open`, `in_progress`, `blocked` and `ready`, and an `epics` list of the epics that are `in_progress` or that are `open` and ready, each with `id`, `title`, `status` and, for an `in_progress` epic in `GET /api/projects` only (never in `GET /api/projects/beads`, which starts no process, REQ-SERVER-010), `workflow`: the `stage`, `gates`, `warnings` and `review_waivers` of `gin state --workflow-id <id> --format json`, or `{"error": <message>}` when that command fails, the commands for one project running at most four at a time, taken from the project's `bd export` snapshot (REQ-BEADS-012) with readiness worked out as in REQ-BEADS-007, where `blocked` counts the beads that are not closed and blocked, and `ready` never counts a bead of type `milestone`. The counts `open`, `in_progress`, `blocked` and `ready` SHALL leave out prep tasks (REQ-BEADS-002) and merge gates (REQ-BEADS-019). The `beads` object SHALL add `prep`, the number of prep tasks that are not closed.

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

#### Scenario: Merge gates not counted
- GIVEN a project with 2 open ready tasks and an open merge gate without blockers titled `external: .planning/plans/p.md#1`
- WHEN a client requests `GET /api/projects`
- THEN `beads.open` is 2 and `beads.ready` is 2

#### Scenario: Prep tasks counted apart
- GIVEN a project whose only beads are the in_progress epic `e-1`, its open ready tracks `t-1` and `t-2`, its open prep task `p-1` labelled `prep` and `prep:mockup` without blockers, and its closed prep task `p-2` labelled `prep`
- WHEN a client requests `GET /api/projects`
- THEN `beads.open` is 2, `beads.in_progress` is 1, `beads.ready` is 2, `beads.blocked` is 0 and `beads.prep` is 1

#### Scenario: Stage of an epic in progress
- GIVEN in_progress epic `e-1` whose `gin state --workflow-id e-1` reports stage `execute`, and ready epic `e-2`
- WHEN a client requests `GET /api/projects`
- THEN `e-1` has `status` `in_progress` and `workflow.stage` `execute`, `e-2` has `status` `open` and no `workflow`, and no `gin state` ran for `e-2`

#### Scenario: One epic fails
- GIVEN in_progress epics `e-1` and `e-3`, and `gin state --workflow-id e-3` exiting non-zero
- WHEN a client requests `GET /api/projects`
- THEN `e-1` has its `workflow`, `e-3` has `workflow` `{"error": …}`, and the rest of the project is unchanged

#### Scenario: Project beads endpoint unchanged
- GIVEN the same in_progress epic `e-1`
- WHEN a client requests `GET /api/projects/beads`
- THEN `e-1` has `id`, `title` and `status` and no `workflow`, and no `gin state` ran

### REQ-REPORTS-001: Report request
<!-- base: 0f7cf16447c737aae1e04fbe77acab7dbdd250d142e33f40f74aaed14f95a32f -->
WHEN a client requests `GET /api/reports` with `project` (a configured project name or `all`), `days` (7, 30 or 90, default 30) and optionally `sprint`, the server SHALL read every bead of each selected project from its `bd export` snapshot (REQ-BEADS-012), SHALL select the beads closed in the last `days` days or, when `sprint` is given, the epics labelled `sprint:<sprint>` and their descendants whatever their close date, leaving out merge gates (REQ-BEADS-019) in both cases, SHALL return the sections of REQ-REPORTS-003 to REQ-REPORTS-006 together with `generated_at`, SHALL serve the same answer for the same `project`, `days` and `sprint` for 60 seconds without running `bd` again unless `POST /api/refresh` dropped it, SHALL respond 404 when `project` is neither `all` nor configured, and SHALL respond 422 when `days` is another value or `sprint` holds a character outside letters, digits, `.`, `_` and `-`.

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
- THEN the report counts the task and not the merge gate, and the merge gate is not listed without `ai_usage`

#### Scenario: cached
- GIVEN a report for `alpha` and 30 days was answered 20 seconds ago
- WHEN a client requests it again
- THEN `bd` does not run and the same `generated_at` is returned

#### Scenario: bad input
- GIVEN no project `nope`
- WHEN a client requests `project=nope`, `days=14` or `sprint=a b`
- THEN the responses are 404, 422 and 422, and no `bd` command ran

### REQ-REPORTS-009: Team scope and bead rows
<!-- base: 2f903707011109b7f25c7792bece98ba9d86070cf0c4372e34e2c29d66a6bf3d -->
The scope of a milestone SHALL be every bead that is not a milestone, whose chain of parents (itself included) holds an epic whose parent is the milestone, that is not a prep task (REQ-BEADS-002) or a merge gate (REQ-BEADS-019), and that is either not an epic or an epic that has no track, a track being a child that is neither a prep task nor a merge gate.

Each scope bead SHALL fall in one bucket:
- `closed` for status `closed`;
- `in_progress` for status `in_progress`;
- `open` for any other status.

Its member SHALL be its `assignee`, or `Unassigned` when it has none.

The response SHALL hold `beads`, one row per scope bead, with:
- `id`, `title`, `issue_type`, `status`, `bucket`, `assignee`, `priority` and `created_at`;
- `epic`: the `id` and `title` of the nearest epic among the bead and its chain of parents;
- `started_at` and `closed_at`;
- `cycle_days`, as the cycle time of REQ-REPORTS-004, or `null`;
- `age_days`: for an in-progress bead, the days since `started_at` (else `updated_at`); otherwise `null`;
- `late_days`: for a closed bead, the working days (Monday to Friday) after the milestone's `end` up to the date of `closed_at`, 0 when it closed on or before `end`; otherwise `null`;
- `rework`: the bead's own reopens plus bugs found later (REQ-REPORTS-002), or `null` when it has no readable `ai_usage`.

#### Scenario: nested beads
- GIVEN milestone `m2` with epic `e1`, whose child `e1.1` has child `e1.1.1`, and epic `e9` under milestone `m3` with child `e9.1`
- WHEN the team report for `m2` is built
- THEN `beads` holds `e1.1` and `e1.1.1` with epic `e1`, and neither `e1` nor `e9.1`

#### Scenario: epic not yet split into tasks
- GIVEN milestone `m2` with epics `e2`, `e3` and `e4` without child beads, all assigned to `ann`, and epic `e5` whose only child, a closed task, is assigned to `ann`
- WHEN the team report for `m2` is built
- THEN `beads` holds `e2`, `e3`, `e4` and the task, each of `e2`, `e3` and `e4` with itself as its epic, `e5` is not in `beads`, and `ann`'s row has scope 4 and closed 1

#### Scenario: nested epic without children
- GIVEN milestone `m2` with epic `e1` whose only child is epic `e1.1` without child beads
- WHEN the team report for `m2` is built
- THEN `beads` holds `e1.1` with itself as its epic, and not `e1`

#### Scenario: buckets and members
- GIVEN scope beads with status `blocked` and no assignee, `deferred` assigned to `ann`, and `in_progress` assigned to `bao`
- WHEN the team report is built
- THEN their buckets are `open`, `open` and `in_progress`, and their members are `Unassigned`, `ann` and `bao`

#### Scenario: late close
- GIVEN milestone `m2` ending on Friday 2026-11-27 and a scope bead closed on Tuesday 2026-12-01
- WHEN the team report is built
- THEN its `late_days` is 2

#### Scenario: prep tasks left out
- GIVEN milestone `m2` with epic `e-1` whose tracks are `t-1` and `t-2`, and whose prep task is `p-1` labelled `prep` and `prep:mockup`, and epic `e-2` whose only child is prep task `p-2` labelled `prep`
- WHEN the team report for `m2` is built
- THEN `beads` holds `t-1`, `t-2` and `e-2`, with `e-2` as its own epic, and neither `e-1`, `p-1` nor `p-2`

#### Scenario: merge gates left out
- GIVEN milestone `m2` with epic `e-1` whose children are track `t-1` and merge gate `g-1` titled `external: .planning/plans/p.md#1`, and epic `e-2` whose only child is merge gate `g-2`
- WHEN the team report for `m2` is built
- THEN `beads` holds `t-1` and `e-2`, with `e-2` as its own epic, and neither `e-1`, `g-1` nor `g-2`

### REQ-MILESTONE-UI-015: Child beads on the Gantt
<!-- base: 665bc3ff3cda1a544bdf60fc51a4f7d46436d1b98f0c240c24d5c6cd8373cf67 -->
The Gantt SHALL load the project's beads, open and closed, and for each epic with beads whose `parent` is that epic and that are not merge gates (REQ-BEADS-019) SHALL show an expand button in its row, with "N/M closed" (closed tracks over all tracks) when it has a track and "Prep x/y" (closed prep tasks over all prep tasks, REQ-BEADS-002) when it has a prep task, a track being a child that is neither a prep task nor a merge gate; WHEN the user expands an epic, the Gantt SHALL show under it one row per child that is not a merge gate, prep tasks included, ordered by id, with the child's status icon, its id (linking to its bead page), its title, a "Prep" chip for a prep task, its lane chip (REQ-UI-115), and "closed <date>" from `closed_at` for a closed child or its status otherwise, and SHALL shade the parent epic's period in those rows without drawing bars for them. Epics SHALL start collapsed, and expanding or collapsing one SHALL leave the others as they are. IF the beads cannot be loaded, THEN the Gantt SHALL be drawn without expand buttons or counts.

#### Scenario: expand
- GIVEN epic `gin-workflow-rm-cost-control` with four closed children, closed on 2026-11-01
- WHEN the user expands it
- THEN four rows `.1` to `.4` are shown under it, each with "closed 1 Nov", and the epic row shows "4/4 closed"

#### Scenario: no children
- GIVEN epic A with no bead whose `parent` is A
- WHEN the Gantt is shown
- THEN A has no expand button and no closed count

#### Scenario: open child
- GIVEN epic B with child `B.2` in status `in_progress`
- WHEN the user expands B
- THEN the row of `B.2` reads "In progress" and has no closing date

#### Scenario: beads unavailable
- GIVEN the request for the project's beads fails
- WHEN the user opens the Gantt tab
- THEN the epics, bars and arrows are drawn and no epic has an expand button

#### Scenario: prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the closed prep task `p-1` labelled `prep` and `prep:mockup`, and epic `e-2` whose only child is the open prep task `p-2` labelled `prep`
- WHEN the user expands `e-1` and `e-2`
- THEN `e-1` shows "1/2 closed" and "Prep 1/1" with rows `p-1`, `t-1` and `t-2`, `e-2` shows "Prep 0/1" and no closed count with the row `p-2`, and only `p-1` and `p-2` have a "Prep" chip

#### Scenario: merge gate and lane
- GIVEN epic `e-1` with track `t-1` in lane `be` (open) and merge gate `g-1` (open) whose parent is `e-1`
- WHEN the user expands `e-1`
- THEN `e-1` shows "0/1 closed", the only row is `t-1` with the lane chip "be", and `g-1` has no row

### REQ-UI-030: Views
<!-- base: 44faaaadb14b0b3496c013cc096173d101e817a72e1febf2da51ce2155296d49 -->
The Beads page, and the Beads tab of a milestone page (REQ-MILESTONE-UI-018), SHALL offer the views List, Board, Focus and Graph (REQ-UI-106), and Lanes (REQ-UI-111) while the scope has lanes, kept in the URL as `view` (`list` when absent or unknown), SHALL load the beads once for all the views with the project, search, filters and "Show closed" of the list applying to each of them, except that the Lanes view loads closed beads whatever "Show closed" says, and SHALL refresh them as in REQ-UI-027 without reloading the data when the view changes, other than to load the closed beads when the Lanes view opens while "Show closed" is off.

#### Scenario: Switch keeps filters
- GIVEN the List view with the filter status "open" and the search "fix"
- WHEN the user chooses Board
- THEN the URL has `view=board`, the filters are unchanged and no new request is made

#### Scenario: Restored from the URL
- GIVEN the URL has `?project=a&view=focus`
- WHEN the page loads
- THEN the Focus view is shown for project `a`

#### Scenario: Lanes tab
- GIVEN the Graph view with `scope=ex-e12`, an epic whose tracks have lanes, and "Show closed" off
- WHEN the user chooses Lanes
- THEN the URL has `view=lanes`, the filters are unchanged and the closed beads are loaded

#### Scenario: Unknown view
- GIVEN the URL has `view=kanban`
- WHEN the page loads
- THEN the List view is shown

#### Scenario: Old Tree link
- GIVEN the URL has `?project=a&view=tree`
- WHEN the page loads
- THEN the List view is shown and there is no Tree tab

#### Scenario: Old Graph link
- GIVEN the URL has `?project=a&view=graph&epic=e-1`
- WHEN the page loads
- THEN the Graph view is shown and `epic` is ignored

### REQ-UI-110: Readable text and facts
<!-- base: 796f0bc7e21301c800379a162cfcc59b0883ceec8c5416e3b5a8fcf1abb0d12f -->
On every page, at every window width from 360px and in the light and the dark theme, the frontend SHALL NOT draw the text of one element over the text of another, or over a chart bar, line or arrow that the text does not belong to; SHALL end every text it cuts short with an ellipsis and give the full text as `title` (REQ-UI-107); SHALL give text a contrast with its background of at least 4.5:1, or 3:1 for text of at least 18.66px bold or 24px; SHALL show a set of facts about one thing (such as owner, assignee, dates and counts) as label/value pairs, each label in the muted color and each value in the text color and a heavier weight, never as one run of text of one style; SHALL show a priority as a `P<n>` pill, in the destructive color for P0 and the warning color for P1; and SHALL show a size as a badge that reads "<p> pt" for a bead with `points`, else "<n>d" from `estimate_minutes`.

#### Scenario: No overlapping text
- GIVEN the example project
- WHEN the Projects, Beads (List, Board, Focus, Graph, and Lanes of the epic `ex-e12`), bead, My Tasks, Milestones, milestone (Gantt at each zoom, Beads, Retro) and Reports (each tab) pages are shown at 390, 1024, 1440 and 1920px in both themes
- THEN no text overlaps other text or a bar, line or arrow it does not belong to, and no text spills out of its box without an ellipsis

#### Scenario: Facts as label and value
- GIVEN the bead page of an epic, the velocity line of a kicked-off milestone and the header of a lane
- WHEN they are shown
- THEN each fact shows its label in the muted color and its value in the text color with a heavier weight

#### Scenario: Priority pill
- GIVEN beads at P0, P1 and P2
- WHEN their List rows are shown
- THEN `P0` is a pill in the destructive color, `P1` in the warning color, and `P2` in the neutral color

#### Scenario: Contrast
- GIVEN the Reports Team and Velocity tabs in the light and the dark theme
- WHEN they are shown
- THEN every milestone id and label has a contrast of at least 4.5:1 with its background

## REMOVED
