# Spec Delta: One set of definitions

## ADDED

### REQ-BEADS-021: One rule for blocked and in-progress counts
Type: business-rule
Every count of blocked beads in the console (the Projects page, REQ-SERVER-006; the Board and Focus columns, REQ-UI-031 and REQ-UI-033; the Team figures, REQ-REPORTS-010) SHALL count the beads whose `blocked` is true by REQ-BEADS-007, whatever their status, and every count of beads in progress SHALL leave those beads out, so that a bead is counted once. These counts SHALL leave out merge gates (REQ-BEADS-019) and milestones, and SHALL count prep tasks (REQ-BEADS-002) apart. The row of an epic on the Gantt (REQ-MILESTONE-UI-013) SHALL show the state Blocked WHEN that epic's `blocked` is true, whatever its status.

#### Scenario: Blocked whatever the status
- GIVEN open bead `a`, epic `e` blocked by `a` with the open child `e.1`, bead `b` with status `blocked` and no blocker, in-progress bead `c` blocked by `a`, and in-progress bead `d` without blockers
- WHEN the Projects page counts are built
- THEN `blocked` is 4 (`e`, `e.1`, `b` and `c`) and `in_progress` is 1 (`d`)

#### Scenario: Same number on Projects and in the Beads views
- GIVEN the same project
- WHEN the Projects page, the Board and the Focus view are shown
- THEN the Projects card reads "blocked 4", and the Blocked columns of the Board and of the Focus view each say 4

#### Scenario: Blocked epic on the Gantt
- GIVEN epic `e` with status `open` blocked by the open bead `a`, in a milestone shown on the Gantt
- WHEN the Gantt is shown
- THEN the row of `e` shows the state Blocked

### REQ-BEADS-022: Child counts
WHEN a client requests the bead list or a bead detail, the server SHALL add to each bead `child_counts`, an object with `total` and `closed`, the number of its direct children that are tracks (neither prep tasks, REQ-BEADS-002, nor merge gates, REQ-BEADS-019) and the number of those whose status is `closed`, and `prep_total` and `prep_closed`, the number of its direct children that are prep tasks and of those that are closed, counted over every bead of the export whatever `closed` the request has. A bead SHALL count as done when, and only when, its status is `closed`.

#### Scenario: Counts ignore the closed filter
- GIVEN epic `e-1` with tracks `t-1` and `t-2` (closed) and `t-3` (open), the closed prep task `p-1` labelled `prep`, and the merge gate `g-1` titled `external: .planning/plans/p.md#1`
- WHEN a client requests `GET /api/beads?project=<name>` without `closed=1`
- THEN `e-1` has `child_counts` `{total: 3, closed: 2, prep_total: 1, prep_closed: 1}` although `t-1`, `t-2` and `p-1` are not in the list

#### Scenario: Bead without children
- GIVEN a task without children
- WHEN a client requests its detail
- THEN its `child_counts` is `{total: 0, closed: 0, prep_total: 0, prep_closed: 0}`

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

### REQ-UI-130: Progress whatever the filters
Wherever the frontend shows how many of a bead's children are done (the List row, REQ-UI-044; the Graph node, REQ-UI-049; the bead page, REQ-UI-028; the epic Progress card, REQ-UI-120; the Gantt row, REQ-MILESTONE-UI-013), it SHALL take the numbers from the bead's `child_counts` (REQ-BEADS-022), so that "Show closed" and the other filters SHALL NOT change them.

#### Scenario: Show closed off
- GIVEN epic `e-1` with 5 tracks, 3 of them closed, and "Show closed" off
- WHEN the List view and then the Graph view of the project are shown
- THEN the row of `e-1` says "3/5 closed" and its node reads "3 of 5 done"

#### Scenario: Gantt row
- GIVEN the same epic in a milestone
- WHEN its Gantt row is shown
- THEN its second line reads "3 of 5 done"

### REQ-UI-131: One date format
Type: non-functional
Category: usability
The frontend SHALL write every date as "<d> <Mon>" when it falls in the current year and "<d> <Mon> <yyyy>" otherwise, and every date with a time as "<d> <Mon>, <HH:mm>" or "<d> <Mon> <yyyy>, <HH:mm>", with English month abbreviations and a 24-hour clock in the browser's time zone, never in the browser's locale format; SHALL show a calendar day without a time (such as a milestone's `start` or `end`) as that day in every time zone; SHALL write a range as "<start> – <end>" with the year written once, after the end, when both ends fall in the same year other than the current one, and after each end when their years differ; and SHALL use a time relative to now (such as "3 h ago") only to say how fresh the data is, with the full date and time as its tooltip (REQ-UI-132).

#### Scenario: Current and other years
- GIVEN today is 21 Nov 2026
- WHEN the dates 2026-11-05, 2025-12-01 and the time 2026-05-11T16:00 are shown
- THEN they read "5 Nov", "1 Dec 2025" and "11 May, 16:00"

#### Scenario: Ranges
- GIVEN today is 21 Nov 2026
- WHEN the ranges 2026-11-10 to 2026-12-01, 2025-11-03 to 2025-11-28 and 2026-12-14 to 2027-01-08 are shown
- THEN they read "10 Nov – 1 Dec", "3 Nov – 28 Nov 2025" and "14 Dec 2026 – 8 Jan 2027"

#### Scenario: Calendar day across time zones
- GIVEN a milestone with `end` 2026-12-01 and a browser in the time zone America/Los_Angeles
- WHEN its period is shown
- THEN its end reads "1 Dec"

### REQ-UI-132: Tooltips for marks and counts
WHEN the pointer rests on a state mark (REQ-UI-064), a size badge or points value, a Prep chip or count, a lane chip or lane count, a comment or dependency indicator (REQ-UI-066), or a count of blocked, done or in-progress beads, and WHEN keyboard focus reaches one of them that takes focus, the frontend SHALL show within 500 ms a tooltip with one sentence that says what it means, and for a count the rule it counts by and the scope it counts in, SHALL tie the tooltip to the element with `aria-describedby`, and SHALL close it on Escape, on blur and when the pointer leaves; the native `title` SHALL remain only for text cut short (REQ-UI-107).

#### Scenario: Blocked count
- GIVEN the Projects card of `example` with "blocked 4"
- WHEN the user moves the keyboard focus to it
- THEN a tooltip reads "Blocked: status blocked, or waiting on an open blocker of its own or of a parent. Prep tasks are counted apart." and Escape closes it

#### Scenario: Dependency indicator
- GIVEN a bead card with the dependency indicator 2
- WHEN the pointer rests on the indicator
- THEN a tooltip says what the 2 dependencies are, and the indicator has no `title`

### REQ-UI-133: Legend
The Beads page, the milestone page and the Reports page SHALL offer a "Legend" control in their header that, on a click, a tap, Enter or Space, opens a panel listing, each with its look and one sentence, the state marks, the size badge and points, Prep, lanes, the comment and dependency indicators, and what blocked, done and progress mean; the panel SHALL close on Escape, on a click outside it and on the control, SHALL return focus to the control, and SHALL fit inside a window 360px wide.

#### Scenario: Open and close
- GIVEN the Beads page
- WHEN the user activates "Legend" and then presses Escape
- THEN the panel lists the five state marks and the meaning of blocked, done and progress, and then closes with the focus back on "Legend"

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN the user taps "Legend" on the milestone page
- THEN the panel opens inside the window and the page does not scroll sideways

### REQ-UI-134: Plain labels in PM views
Type: non-functional
Category: usability
The Milestones list, the milestone page and the Reports page SHALL use these words: "Commitment met" for say/do, "Parallel lanes" for the number of lanes, "Not estimated" for unestimated, "days per point" for d/pt, "<n> of <m> done" for the closed tracks of an epic, "Prep <n> of <m> done" for its prep tasks, "Spec approved" and "Spec not approved yet" for the spec of an epic, "unassigned" for beads without an assignee, and "late" only as REQ-MILESTONE-UI-023 defines it; each of these SHALL carry a tooltip (REQ-UI-132) that says what it counts.

#### Scenario: Milestones list
- GIVEN milestone M1 with `velocity.say_do: 0.62` and `lanes: 2`
- WHEN the Milestones list is shown
- THEN its row reads "Commitment met 62%" under the column "Commitment met", and its lanes under the column "Parallel lanes"

#### Scenario: Gantt row
- GIVEN epic `ex-e3` with 5 of 11 tracks closed, 1 of 3 prep tasks closed and a confirmed spec
- WHEN its Gantt row is shown
- THEN its second line reads "5 of 11 done", "Prep 1 of 3 done" and "Spec approved"

### REQ-UI-135: The assignee, never the owner
Type: business-rule
Wherever the frontend shows whom a bead is assigned to (the List row, REQ-UI-044; the Board and Focus card, REQ-UI-065; the details panel and the bead page, REQ-UI-028; the Tracks table, REQ-UI-121; the Team bead list, REQ-REPORTS-016), it SHALL show the person (REQ-BEADS-023) of the bead's `assignee`, with the full `assignee` as its tooltip, or "Unassigned" in the muted color when the bead has none, and SHALL never show, group or filter by the `owner` in its place.

#### Scenario: No assignee
- GIVEN a bead with `owner` `lead@example.com` and no `assignee`
- WHEN its List row, Board card and bead page are shown
- THEN each shows "Unassigned" and none shows `lead@example.com` as its assignee

#### Scenario: Email assignee
- GIVEN a bead assigned to `ann@example.com`
- WHEN its List row is shown
- THEN it shows `ann` with the tooltip `ann@example.com`

### REQ-MILESTONE-UI-022: Status of a milestone bead
Wherever the frontend shows the state of a bead of type `milestone` (the header of its bead page and its node in the Graph view), it SHALL show its milestone status (Planned, Scheduled, Active or Closed) from `GET /api/beads/milestones` (REQ-BEADS-015) instead of its bead status; the Milestones list, the milestone page, the milestone card of a bead page and the Team tab SHALL draw a milestone status with the same icon and word. IF that request fails, THEN the bead page SHALL show the bead status as REQ-UI-064 describes.

#### Scenario: Bead page of a milestone
- GIVEN milestone `ex-m2` with status `open` whose kick-off was on 10 Nov 2026, shown on 21 Nov 2026
- WHEN its bead page is shown
- THEN its header shows "Active" with the active icon and not "Open" or "Ready"

#### Scenario: Graph node
- GIVEN the same milestone and the Graph view of the project with milestones shown
- WHEN the node of `ex-m2` is drawn
- THEN it reads "Active"

#### Scenario: Milestones unavailable
- GIVEN `GET /api/beads/milestones` answers 502
- WHEN the bead page of `ex-m2` is shown
- THEN its header shows its bead status

### REQ-MILESTONE-UI-023: Late milestone
Type: business-rule
A milestone SHALL be late WHEN it is not closed and today is after its `end`, WHEN it is not closed and its forecast `finish` (REQ-MILESTONE-UI-008) is after its `end`, or WHEN it is closed and the day it closed is after its `end`. The Milestones list (REQ-MILESTONE-UI-001), the milestone card of a bead page and of an epic Overview (REQ-UI-120), the Team tab (REQ-REPORTS-012) and the Team headline (REQ-UI-095) SHALL mark a milestone late by this rule only, and "behind pace" SHALL describe the pace of closing only, never lateness.

#### Scenario: Forecast after the end
- GIVEN active milestone `m1` ending on 1 Dec 2026 with a forecast `finish` of 16 Feb 2027, shown on 21 Nov 2026
- WHEN the Milestones list, the Team tab and the milestone card of one of its epics are shown
- THEN each marks `m1` late

#### Scenario: Past the end without a forecast
- GIVEN active milestone `m2` ending on 20 Nov 2026 with no forecast `finish`, shown on 21 Nov 2026
- WHEN the Team tab is shown
- THEN `m2` is marked late

#### Scenario: Closed on time and closed late
- GIVEN milestone `m3` ending on Friday 27 Nov 2026 and closed that day, and milestone `m4` with the same end closed on Tuesday 1 Dec 2026
- WHEN the Team tab is shown for each
- THEN `m3` reads "Closed · on time" and `m4` reads "Closed · 2 d late"

#### Scenario: Behind pace is not late
- GIVEN active milestone `m5` ending on 11 Dec 2026 with a forecast `finish` of 10 Dec 2026, `pace` 2.0 and `pace_needed` 3.4, shown on 21 Nov 2026
- WHEN the Team tab is shown
- THEN its headline says "behind pace" and nothing calls `m5` late

## MODIFIED

### REQ-SERVER-006: Beads summary per project
<!-- base: 8dcdf4d53132bb044e88c6021b7aa2cb0811e3d49c8c462dec8e67cb7150d25e -->
WHEN a client requests `GET /api/projects`, the server SHALL include for each existing project a `beads` object with the counts `open`, `in_progress`, `blocked` and `ready`, and an `epics` list of the epics that are `in_progress` or that are `open` and ready, each with `id`, `title`, `status` and, for an `in_progress` epic in `GET /api/projects` only (never in `GET /api/projects/beads`, which starts no process, REQ-SERVER-010), `workflow`: the `stage`, `gates`, `warnings` and `review_waivers` of `gin state --workflow-id <id> --format json`, or `{"error": <message>}` when that command fails, the commands for one project running at most four at a time, taken from the project's `bd export` snapshot (REQ-BEADS-012) with readiness worked out as in REQ-BEADS-007, where `blocked` counts the beads that are not closed and blocked whatever their status, `in_progress` counts the in-progress beads that are not blocked (REQ-BEADS-021), and `ready` never counts a bead of type `milestone`. The counts `open`, `in_progress`, `blocked` and `ready` SHALL leave out prep tasks (REQ-BEADS-002) and merge gates (REQ-BEADS-019). The `beads` object SHALL add `prep`, the number of prep tasks that are not closed.

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

#### Scenario: Blocked whatever the status
- GIVEN a bead with status `blocked` and no blocker, an in-progress bead with an open blocker, and an in-progress bead without blockers
- WHEN a client requests `GET /api/projects`
- THEN `beads.blocked` counts the first two and `beads.in_progress` is 1

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

### REQ-UI-028: Bead detail
<!-- base: 286b7a7bc0d4c4d82b14e6526df79270fff7a0d26e0aa1da9efbed7bd5ba762a -->
The bead page SHALL show the bead's id, title and type, a row of badges with its state as REQ-UI-064 describes (for example "In progress", never the raw `in_progress`; for a milestone, its milestone status as REQ-MILESTONE-UI-022 describes), its priority as a `P<n>` pill (REQ-UI-110) and its size as REQ-UI-110 describes, the reason of its points (`points_reason`) on its own line under that row, its labels, and its assignee (REQ-UI-135), creator (the person of `created_by`, else of `owner`, REQ-BEADS-023), creation and update times and comment count as label/value pairs (REQ-UI-110), each time written as REQ-UI-131 describes, its description rendered as GitHub-flavored Markdown (headings, emphasis, lists, task lists, inline code, code blocks, tables, block quotes and links), its dependencies and the beads it blocks (each with id, title and status, linking to that bead in the same project), and for an epic its children with a progress bar of closed tracks over all tracks, from its `child_counts` (REQ-UI-130), when it has a track. WHEN an epic has prep tasks (REQ-BEADS-002), the bead page SHALL show "Prep x/y" next to the progress bar, where x is its closed prep tasks and y all its prep tasks, and SHALL mark each prep task in the children list with a "Prep" chip. Raw HTML in the description SHALL be shown as text and SHALL NOT create elements, a link SHALL open in a new tab with `rel="noreferrer"`, and a link whose URL is not `http`, `https` or `mailto` SHALL be shown as text.
Source: `assets/2026-11-08/mockup/index.html#bead-detail`

#### Scenario: Markdown description
- GIVEN a bead whose description is `## Change` followed by `1. Format **dates**` and a fenced code block
- WHEN the page loads
- THEN the description shows a heading "Change", a numbered list item with "dates" in bold, and a code block

#### Scenario: Raw HTML stays text
- GIVEN a bead with a description containing `<script>x</script>` and `<img src=x onerror=alert(1)>`
- WHEN the page loads
- THEN both appear as text and no `script` or `img` element exists in the description

#### Scenario: Unsafe link
- GIVEN a bead with a description containing `[run](javascript:alert(1))` and `[docs](https://example.com)`
- WHEN the page loads
- THEN "run" is not a link, and "docs" links to `https://example.com` in a new tab

#### Scenario: Relations link inside the console
- GIVEN a bead with one dependency
- WHEN the page loads
- THEN the dependency shows its id, title and status and links to `/beads/<project>/<its id>`

#### Scenario: Epic progress
- GIVEN an epic with 4 children of which 3 are closed
- WHEN the page loads
- THEN the children are listed and a progress bar reads 3 of 4

#### Scenario: Epic with a prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the closed prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN the page of `e-1` loads
- THEN the progress bar reads 1 of 2, "Prep 1/1" is shown next to it, and the children list shows `t-1`, `t-2` and `p-1`, with a "Prep" chip on `p-1` only

#### Scenario: Badges and facts
- GIVEN in-progress P1 epic `e-3` with `points: 5`, `points_reason: "new endpoint and UI"`, owner `lead@example.com`, assignee `bao`, created by `lead`, created and updated at 2026-05-11 16:00:00 and 0 comments, shown in 2026
- WHEN its page loads
- THEN the badge row shows "In progress", "P1" and "5 pt", the line under it reads "new endpoint and UI", and the facts read Assignee "bao", Created by "lead", Created "11 May, 16:00", Updated "11 May, 16:00" and Comments "0", with no Owner fact, each label in the muted color and each value in the text color

#### Scenario: No assignee
- GIVEN a task with owner `lead@example.com` and no assignee
- WHEN its page loads
- THEN the facts read Assignee "Unassigned" and Created by "lead"

### REQ-UI-031: Board columns
<!-- base: e43ec8899b7d185e8dfe619e076f77b36812e227529ec9901c923d3ed7dcd8a3 -->
The Board view SHALL show the columns Backlog (status `deferred`), Ready (`ready`), In Progress (status `in_progress` or `hooked`), Blocked (`blocked`) and Done (status `closed`), SHALL put a bead in Done when it is closed, else in Blocked when it is blocked (REQ-BEADS-021), else in the first of Backlog, Ready and In Progress that fits, SHALL leave out of the Board any bead that fits none, SHALL show in each column header its number of beads that are not prep tasks, followed by "+ <n> prep" when it holds <n> prep tasks (REQ-BEADS-002), SHALL order a column by priority and then by last update, newest first, and SHALL show each bead as a card as REQ-UI-065 describes.

#### Scenario: Placement
- GIVEN a deferred bead, a ready bead, an in-progress bead, a blocked bead and a closed bead
- WHEN the Board is shown with closed beads
- THEN each is in its own column and each column says 1

#### Scenario: Blocked first
- GIVEN an in-progress bead with an open blocker and a deferred bead with an open blocker
- WHEN the Board is shown
- THEN both are in Blocked, and In Progress and Backlog do not hold them

#### Scenario: Prep tasks counted apart
- GIVEN two blocked tracks and one blocked prep task
- WHEN the Board is shown
- THEN Blocked holds three cards and its header says "2 + 1 prep"

#### Scenario: Pinned bead
- GIVEN a pinned bead that is not ready, blocked or closed
- WHEN the Board is shown
- THEN it is in no column and the List still shows it

#### Scenario: Card and link
- GIVEN a ready P1 bead assigned to alice
- WHEN the Board is shown
- THEN its card shows the id, title, type, `P1`, the state "Ready" and alice, and the title links to `/beads/<project>/<id>`

#### Scenario: Empty column
- GIVEN no bead is blocked
- WHEN the Board is shown
- THEN the Blocked column says "No beads"

### REQ-UI-033: Focus columns
<!-- base: 03b9c8eb1e5e4f2bc0f2779cd40ce6d300be1471768513acbe212b675d6fbba2 -->
The Focus view SHALL show the columns In flight (status `in_progress` or `hooked`), Blocked (`blocked`) and Next up (`ready` with priority P0 or P1), each with its count as REQ-UI-031 counts a column, SHALL put a bead in Blocked when it is blocked (REQ-BEADS-021), else in the first of In flight and Next up that fits, SHALL not cap In flight or Blocked, and SHALL order each by priority and then by last update, newest first.

#### Scenario: Columns
- GIVEN an in-progress bead, a blocked bead, a ready P1 bead and a ready P3 bead
- WHEN the Focus view is shown
- THEN In flight, Blocked and Next up each hold one bead and the P3 bead is in no column

#### Scenario: In progress and blocked
- GIVEN an in-progress bead that is also blocked
- WHEN the Focus view is shown
- THEN it is in Blocked only

### REQ-UI-034: Group by assignee
<!-- base: ab3633c206a5b0d4d7d94e6f7350073acda44814bc628dbd73641fef2e5acd49 -->
WHERE the user chooses Group by "Assignee" (kept in the URL as `group=assignee`), the Focus view SHALL show one row per person (REQ-BEADS-023) assigned a bead in the three columns, with those columns inside it, ordered by name, SHALL put beads without an assignee in a last row "Unassigned" (shown only when it has beads), SHALL never group by `owner`, and SHALL show the original columns again for "None".

#### Scenario: Rows
- GIVEN beads assigned to bob, to alice and to nobody
- WHEN the user groups by assignee
- THEN the rows are alice, bob and "Unassigned"

#### Scenario: One row per person
- GIVEN beads assigned to `ann` and to `ann@example.com`
- WHEN the user groups by assignee
- THEN one row `ann` holds both

#### Scenario: Back to none
- GIVEN the Focus view is grouped
- WHEN the user chooses "None"
- THEN the ungrouped columns return and the URL has no `group`

### REQ-UI-044: List rows
<!-- base: fa72c885e4afd0c31eee2f830a07a3bc491972e8cb88c2b5c40ad743d4742a3e -->
The List view SHALL show for each row an open/close control when it has children, its id in the monospace face shortened as REQ-UI-107 describes, its title as a link to `/beads/<project>/<id>` cut short with the full title as `title` and never narrower than 8rem while the row is at least 360px wide, its state as REQ-UI-064 describes, its type as REQ-UI-067 describes, `P<n>`, the indicators of REQ-UI-066, its assignee as REQ-UI-135 describes, up to three labels from 768px, and its last update as REQ-UI-131 describes, SHALL show for an epic with a track how many of its tracks are closed with a progress bar (REQ-UI-130), SHALL show for an epic with prep tasks (REQ-BEADS-002) "Prep x/y", where x is its closed prep tasks and y all its prep tasks, SHALL show a "Prep" chip on the row of a prep task, SHALL open only the root level at first unless branches were remembered (REQ-UI-074), SHALL open and close a branch when its control is used, SHALL offer "Expand all" and "Collapse all", SHALL show at most 2000 rows and say how many more are not shown, and SHALL draw a row on two lines under 768px.

#### Scenario: Row content
- GIVEN a blocked P1 bug assigned to alice with 2 comments
- WHEN the List view is shown
- THEN its row shows the id, the title link, "Blocked", the pill "bug", `P1`, a comment indicator 2 and alice

#### Scenario: Open a branch
- GIVEN the List view with a collapsed epic
- WHEN the user opens it
- THEN its children are shown, and closing it hides them again

#### Scenario: Expand all and collapse all
- GIVEN a hierarchy with several levels
- WHEN the user chooses "Expand all", then "Collapse all"
- THEN every branch opens, then only the roots are shown

#### Scenario: Epic progress
- GIVEN an epic with 5 children of which 3 are closed
- WHEN the List view is shown with "Show closed" on
- THEN the epic says "3/5 closed" with a progress bar

#### Scenario: Epic with a prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the open prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN the List view is shown with "Show closed" on and `e-1` open
- THEN `e-1` says "1/2 closed" with a progress bar and "Prep 0/1", and the row of `p-1` shows a "Prep" chip while the rows of `t-1` and `t-2` do not

#### Scenario: Plain text
- GIVEN a title containing `<script>x</script>`
- WHEN the List view is shown
- THEN it appears as text and no `script` element exists

#### Scenario: Two lines on a phone
- GIVEN a window 390px wide
- WHEN a row is shown
- THEN the title is on the first line and the state, type and indicators on the second

#### Scenario: Row limit
- GIVEN 2100 root beads
- WHEN the List view is shown
- THEN 2000 rows are shown and a line says "100 more not shown"

#### Scenario: Long id keeps the title
- GIVEN the epic `ex-payments-provider-migration-and-reconciliation-2026` with an open task and the title "Migrate every checkout payment to the new provider"
- WHEN the List view is shown at 1440px and at 390px with the epic open
- THEN each of the two rows shows its open/close control when it has children, its shortened id and at least the start of its title

#### Scenario: Owner is not the assignee
- GIVEN a bead with owner `lead@example.com` and no assignee
- WHEN the List view is shown from 1024px
- THEN its row shows "Unassigned" and not `lead@example.com`

### REQ-UI-065: Card anatomy
<!-- base: f724b828e8d437c3f56c974aadb67804a27cf48079e8c4dd28f06f779832f005 -->
A bead card of the Board and Focus views SHALL show on its first line the id in the monospace face shortened as REQ-UI-107 describes and `P<n>`, below it the title as a link to `/beads/<project>/<id>`, and on its last line the state mark of REQ-UI-064, the type badge of REQ-UI-067, the size badge of REQ-UI-110 when the bead has `points` or `estimate_minutes`, the indicators of REQ-UI-066 and the assignee as REQ-UI-135 describes, the title and the assignee wrapping inside the card (REQ-UI-107).

#### Scenario: Full card
- GIVEN a ready P1 task assigned to alice with 2 comments and 1 dependency
- WHEN its card is shown
- THEN it shows the id and `P1`, the title link, "Ready", the type "task", a comment indicator 2, a dependency indicator 1 and alice

#### Scenario: Bare card
- GIVEN a bead with an owner, no assignee, no comments and no dependencies
- WHEN its card is shown
- THEN the last line shows only the state, the type and "Unassigned" in the muted color

#### Scenario: Card with points
- GIVEN an in-progress epic with `points: 8`
- WHEN its Board card is shown
- THEN its last line shows the state, the type, the size badge "8 pt" and the assignee or "Unassigned"

### REQ-UI-082: Assignee filter
<!-- base: 2e8792842ebe8fc773057a16b12f521fc3ecdc1e322b909fcf47474b563c43d5 -->
The bead filter bar SHALL offer an "Assignee" multi-select filter listing "Me" (REQ-BEADS-024), then "Unassigned" (when any loaded bead has no assignee, whatever its owner), then every person (REQ-BEADS-023) assigned a loaded bead, sorted alphabetically, kept in the URL query as comma-separated `assignee` (`me`, `unassigned` or a person's name), and SHALL show only beads whose assignee is one of the selected people (or beads without an assignee when "Unassigned" is selected), never matching a bead by its `owner`; when no assignee is selected, beads of all assignees SHALL be displayed.

#### Scenario: Filter by multiple assignees
- GIVEN beads assigned to "alice@example.com", "bob@example.com", and "carol@example.com"
- WHEN the user selects the assignees `alice` and `bob`
- THEN only beads assigned to Alice or Bob remain visible and the URL query contains `assignee=alice,bob`

#### Scenario: Filter unassigned beads
- GIVEN beads assigned to "alice@example.com" and beads without an assignee, one of them with owner "lead@example.com"
- WHEN the user selects assignee "Unassigned"
- THEN only beads without an assignee remain visible, the one with an owner included, and the URL query contains `assignee=unassigned`

#### Scenario: Old link with an email
- GIVEN the URL query `assignee=alice%40example.com` and beads assigned to `alice` and to `alice@example.com`
- WHEN the Beads page loads
- THEN both beads remain visible and `alice` is selected

### REQ-UI-100: My Tasks list
<!-- base: 651177c002911510b02664aab05f0efc77116ce206839f82742476eb41dc1a54 -->
WHEN the My Tasks page opens, the frontend SHALL request `GET /api/projects/beads`, then `GET /api/beads?project=<name>` for each project whose directory exists, and SHALL list in one table the beads whose `assignee` is the same person (REQ-BEADS-023) as the signed-in email, leaving out beads matched only by `owner`. Each row SHALL show the project, the id, the title, the state, the type, `P<n>` and the updated time, and SHALL link to `/beads/<project>/<id>`. Rows SHALL be ordered by priority ascending, then by `updated_at` newest first, then by project and id. The page SHALL show how many beads it lists, and WHEN none matches, SHALL say "No tasks assigned to <email>". The Refresh control (REQ-UI-096) SHALL load the list again.

#### Scenario: Match by email or name
- GIVEN the signed-in email `giangdhwhtbr@gmail.com`, project A with open beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `alice`, and one unassigned open bead owned by `giangdhwhtbr@gmail.com`
- WHEN My Tasks opens
- THEN only the beads assigned to `giangdhwhtbr` and `GiangDHWHTBR@gmail.com` are listed, and the count is 2

#### Scenario: Same handle at another domain
- GIVEN the signed-in email `giangdhwhtbr@gmail.com` and an open bead assigned to `giangdhwhtbr@other.example`
- WHEN My Tasks opens
- THEN that bead is listed

#### Scenario: Across projects in order
- GIVEN project A has a P2 bead assigned to me updated today and project B has a P1 bead assigned to me updated last week
- WHEN My Tasks opens
- THEN the B bead is first, each row shows its project, and clicking the A bead opens `/beads/A/<id>`

#### Scenario: Nothing assigned
- GIVEN no bead in any project is assigned to `giangdhwhtbr@gmail.com` or `giangdhwhtbr`
- WHEN My Tasks opens
- THEN the page says "No tasks assigned to giangdhwhtbr@gmail.com"

#### Scenario: Missing project directory
- GIVEN project C is configured but its directory does not exist
- WHEN My Tasks opens
- THEN no beads request is sent for C

#### Scenario: Not the full projects list
- GIVEN two projects
- WHEN My Tasks opens
- THEN no request goes to `/api/projects`

### REQ-UI-095: Report tabs
<!-- base: be92ba05e90ccbffb8e0a060f4400f39efd95f08b8ac8928bfd27545221b2429 -->
WHILE the report sections are not listed in the sidebar (REQ-UI-129), the Reports page SHALL show the tabs Team, Delivery, Velocity, AI usage, Quality and Data coverage, in that order, as a WAI-ARIA tab list in which Left and Right move between tabs. Under each tab name it SHALL show a headline:
- Team, from the team report of the selected milestone:
  - "Finished on time", or "Finished <n> d late" with a warning icon, for a closed milestone;
  - "Starts <start>" before its start;
  - "<closed> of <scope> done · late" with a warning icon when the milestone is late (REQ-MILESTONE-UI-023);
  - otherwise "<closed> of <scope> done · on pace", or "· behind pace" with a warning icon when `pace_needed` is above `pace`;
  - "No milestones" when the project has none;
  - no headline while "All projects" is selected.
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- Velocity: "<x> days per point" from the selected project's `days_per_point` (REQ-REPORTS-018), with "assumed" when it is assumed, once the Milestones list has loaded; no headline while "All projects" is selected or when `days_per_point` is `null`.
- AI usage: "<tokens> tokens, <cost>", with "no price" in place of `<cost>` when `totals.cost` is absent.
- Quality: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.
- Data coverage: "<n> gaps" ("1 gap" when `<n>` is 1), with a warning icon when `<n>` is above 0. `<n>` is the sum of five counts: beads not collected, beads with unreadable usage, models without a price, beads with incomplete logs (`coverage.sources`), and projects under `errors`.

The page SHALL request the team report and the Milestones list (REQ-MILESTONE-UI-008, for the forecast `finish` of REQ-MILESTONE-UI-023 and for the Velocity tab) whenever a single project is selected, whatever the tab, and SHALL request the Milestones list at most once per project and refresh. WHILE the Milestones list is loading or after it failed, the Team headline SHALL apply REQ-MILESTONE-UI-023 without the forecast. It SHALL show no headline for a tab while its report loads or after it failed to load. It SHALL keep the selected tab in the URL query `tab` (`team`, `delivery`, `velocity`, `usage`, `quality` or `coverage`), SHALL select Team when `tab` is missing or holds another value, and SHALL keep the project, period, sprint, milestone and member when the tab changes. WHILE the window is narrower than the tab list, the tab list SHALL scroll sideways instead of widening the page and SHALL fade its edge on each side that has hidden tabs.
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
- WHEN the user picks the AI usage tab
- THEN the URL becomes `/reports?project=alpha&days=90&tab=usage` without a reload and no new report is requested

#### Scenario: velocity tab
- GIVEN the Reports page for `alpha` on the Delivery tab, whose milestones list has `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`
- WHEN the user picks the Velocity tab
- THEN the URL has `tab=velocity`, `GET /api/milestones?project=alpha` has been requested once, and the Velocity headline reads "1.4 days per point"

#### Scenario: headlines
- GIVEN a report with 41 closed beads, 12,400,000 tokens, cost 38.2, rework rate 0.09, 3 beads not collected, 1 unreadable bead and 1 unpriced model
- WHEN the page is shown
- THEN the headlines read "41 beads closed", "12.4M tokens, $38.20", "9% rework" and "5 gaps", and the Data coverage headline has a warning icon

#### Scenario: no gaps
- GIVEN a report with no coverage gaps and no failed project
- WHEN the page is shown
- THEN the Data coverage headline reads "0 gaps" without a warning icon

#### Scenario: team headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed, `pace` 3.6 and `pace_needed` 3.4, whose forecast `finish` is before its `end`
- WHEN the page is shown on the Delivery tab
- THEN the Team headline reads "27 of 64 done · on pace" without a warning icon

#### Scenario: late milestone headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed whose forecast `finish` is after its `end`
- WHEN the page is shown
- THEN the Team headline reads "27 of 64 done · late" with a warning icon

#### Scenario: keyboard
- GIVEN the Delivery tab is selected and has focus
- WHEN the user presses Right
- THEN the Velocity tab is selected and has focus

#### Scenario: Hidden tabs are hinted
- GIVEN the Reports page at a window 768px wide where Data coverage does not fit
- WHEN the page is shown
- THEN the right edge of the tab list fades, and scrolling it to the end removes the right fade and shows a left one

### REQ-UI-120: Epic overview cards
<!-- base: 39a3c2e0c92bd92b24b5aa9dd9a58991c7ce335881674b67cb5dadace39cf514 -->
The Overview tab of an epic page SHALL show three cards side by side from 1024px and one under another below:
- Progress: "<closed> of <total> tracks closed · <percent>%" from the epic's `child_counts` (REQ-UI-130), over its children that are neither prep tasks (REQ-BEADS-002) nor merge gates (REQ-BEADS-019) whatever "Show closed" says, a bar split by state (Done, In progress, Ready, Blocked, Deferred, each by REQ-UI-064) with a legend giving each state's word and count, then as label/value facts "Points" ("<done> of <total> pt done" over the tracks with `points`, or "No points"), "Bugs" (the open beads of the epic's `bugs`, "0 open" when none) and "Prep" ("<closed>/<total>" of its prep tasks, or "none");
- Workflow: the stages discuss, plan, orchestrate, execute and ship with the epic's current stage marked and the earlier ones ticked, then "Gates" ("<satisfied> of <n> satisfied"), "Warnings" and "Waivers" (each a count with the items on hover and focus, or "none"), from `GET /api/beads/{project}/{id}/workflow` (REQ-BEADS-020); "No workflow" when the answer has no stage, and the error when it fails, the rest of the page unaffected;
- Milestone: the epic's milestone id and title linking to the milestone page, its status (REQ-MILESTONE-UI-022), its window "<start> – <end>" (REQ-UI-131), the working days (Monday to Friday) from today to `end`, both counted, while it is active, and its forecast finish with a warning mark when the milestone is late (REQ-MILESTONE-UI-023) (from `GET /api/milestones?project=`, REQ-MILESTONE-UI-008); "No milestone" when the epic's `milestone` is `null`.
Source: `assets/2026-11-21/epic-page/mockup/index.html`

#### Scenario: Progress by state
- GIVEN epic `ex-e12` with 8 tracks (4 closed, 1 in progress, 2 ready, 1 blocked) and a merge gate child
- WHEN its Overview is shown
- THEN Progress reads "4 of 8 tracks closed · 50%" and its legend reads Done 4, In progress 1, Ready 2, Blocked 1

#### Scenario: Progress with closed beads hidden
- GIVEN the same epic and "Show closed" off on the Beads page it was opened from
- WHEN its Overview is shown
- THEN Progress still reads "4 of 8 tracks closed · 50%"

#### Scenario: Points
- GIVEN tracks with points 3 (closed), 5 (in progress) and 3 (closed), and tracks without points
- WHEN the Overview is shown
- THEN Points reads "6 of 11 pt done"

#### Scenario: Workflow stage
- GIVEN `gin state --workflow-id ex-e12` reports stage `execute`, 4 of 6 gates satisfied, no warnings and no waivers
- WHEN the Overview is shown
- THEN discuss, plan and orchestrate are ticked, execute is marked, ship is plain, and Gates reads "4 of 6 satisfied"

#### Scenario: Workflow unavailable
- GIVEN the workflow request answers 502 with an error
- WHEN the Overview is shown
- THEN the Workflow card shows the error and the Progress and Milestone cards are shown

#### Scenario: Milestone forecast late
- GIVEN milestone `ex-m2` active from 10 Nov to 1 Dec 2026 with a forecast finish of 16 Feb 2027
- WHEN the Overview of `ex-e12` is shown on 20 Nov 2026
- THEN the Milestone card shows "ex-m2 Checkout v2", "10 Nov – 1 Dec", "8 working days" left and the finish "16 Feb 2027" with a warning mark

### REQ-UI-121: Epic lanes summary and tracks table
<!-- base: dc1ca926c60ca3732c819c84d1e768eaa093438e1a653846cce7d5f6b1584f5c -->
Under the cards, the Overview tab SHALL show, while the epic has lanes (REQ-UI-111), a section "Lanes" with one row per lane in the row order of the Lanes view: the lane colour of REQ-UI-118 as a swatch and pale background, the lane name, its state (REQ-UI-112) as an icon and words, the holder and lease, what it waits for ("waits for <lane> #<N> (merge pending)" or "(merged)" for each merge gate of its first open track), and "<closed>/<total> closed", with a link "Open the Lanes tab". It SHALL then show a section "Tracks" with a table of the epic's children that are not merge gates, with the columns Id (linking to the bead page), Title (cut with an ellipsis and `title`), State (REQ-UI-064), Lane (the lane chip of REQ-UI-115 with its colour swatch, or "No lane"), Assignee (REQ-UI-135, "Unassigned" when none), Points ("–" when none) and Blocked by (the open blockers' ids, a merge gate written "<lane> #<N> · merge pending"), first ordered by Id; WHEN the user activates a column header other than Blocked by, the table SHALL sort by that column, ascending then descending, with `aria-sort` on that header. Below 1024px the table SHALL keep Id, Title and State and let the rest scroll sideways within the table.
Source: `assets/2026-11-21/epic-page/mockup/index.html`

#### Scenario: Lanes summary
- GIVEN epic `ex-e12` with lanes be, fe, infra and qa
- WHEN its Overview is shown
- THEN the Lanes section lists be, fe, infra and qa with their states, and qa reads "waits for be #2 (merge pending), fe #3 (merged)" and "0/1 closed"

#### Scenario: No lanes section
- GIVEN epic `ex-e3` without lanes
- WHEN its Overview is shown
- THEN there is no Lanes section and the Tracks table has no colour swatch

#### Scenario: Tracks table
- GIVEN epic `ex-e12` with 8 tracks and a merge gate child
- WHEN its Overview is shown
- THEN the Tracks table has 8 rows ordered by id, no row reads "Waits for", and the row of `ex-e12.4` reads Blocked, "qa", "Unassigned" and "be #2 · merge pending"

#### Scenario: Sort by a column
- GIVEN the Tracks table of `ex-e12`
- WHEN the user activates the State header twice
- THEN the rows are ordered by state ascending and then descending, and the header has `aria-sort` "descending"

### REQ-REPORTS-009: Team scope and bead rows
<!-- base: 11754631756a42af68b360f4eb1efaa3faef704d4bd9e85c65dc09d1453bd902 -->
The scope of a milestone SHALL be every bead that is not a milestone, whose chain of parents (itself included) holds an epic whose parent is the milestone, that is not a prep task (REQ-BEADS-002) or a merge gate (REQ-BEADS-019), and that is either not an epic or an epic that has no track, a track being a child that is neither a prep task nor a merge gate.

Each scope bead SHALL fall in one bucket:
- `closed` for status `closed`;
- `in_progress` for status `in_progress` when the bead is not blocked (REQ-BEADS-007, REQ-BEADS-021);
- `open` for any other bead.

Its member SHALL be the person (REQ-BEADS-023) of its `assignee`, or `Unassigned` when it has none.

The response SHALL hold `beads`, one row per scope bead, with:
- `id`, `title`, `issue_type`, `status`, `bucket`, `blocked`, `assignee`, `priority` and `created_at`;
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
- GIVEN scope beads with status `blocked` and no assignee, `deferred` assigned to `ann`, `in_progress` assigned to `bao`, and `in_progress` assigned to `bao@example.com` with an open blocker
- WHEN the team report is built
- THEN their buckets are `open`, `open`, `in_progress` and `open`, their members are `Unassigned`, `ann`, `bao` and `bao`, and the first and the last have `blocked` true

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

### REQ-REPORTS-010: Team and member KPIs
<!-- base: fef59b89424862feffbb97fb24242fbf7741d9cc1e8bf4076fdd855b85e3fabc -->
The response SHALL hold `team`, over the whole scope, and `members`, with one row per member of REQ-REPORTS-009 sorted by scope count (largest first) and then by name, with `Unassigned` last. Each holds:
- `scope`, `closed`, `in_progress` and `open` counts, one per bucket of REQ-REPORTS-009;
- `blocked`: scope beads that are not closed and blocked (REQ-BEADS-021), whatever their status;
- `unclaimed`: open beads without an assignee;
- `done`: closed ÷ scope, or `null` when the scope is empty;
- `throughput`: the beads closed in the last 5 working days up to `today`. For a closed milestone it is instead the closed beads ÷ the working days from `start` to `closed_on` × 5, rounded to one decimal;
- `cycle_median`: the median `cycle_days` of the closed beads, or `null`;
- `oldest_in_progress`: the largest `age_days`, or `null`;
- `on_time`: the share of closed beads with `late_days` 0, or `null` when none is closed;
- `rework_rate`: the share of closed beads with readable `ai_usage` whose `rework` is above 0, or `null` when there are none;
- `reopens` and `bugs`, summed over the closed beads.

`team` SHALL also hold:
- `working_days`: the working days from `start` to `end`;
- `elapsed`: the working days from `start` to the earlier of `today` and `end`, or 0 before `start`;
- `days_left`: the working days after `today` up to `end`, or all working days before `start`;
- `pace`: `throughput` ÷ 5;
- `pace_needed`: (open + in progress) ÷ `days_left`. It is `null` when the milestone is closed or `days_left` is 0;
- `late_open`: open + in progress beads when `today` is after `end` and the milestone is open, else 0.

#### Scenario: pace
- GIVEN an open milestone from 2026-11-02 to 2026-11-27, `today` 2026-11-12, 64 scope beads with 27 closed of which 18 closed from 2026-11-06 to 2026-11-12
- WHEN the team report is built
- THEN `team.throughput` is 18, `pace` 3.6, `days_left` 11, `pace_needed` 37 ÷ 11 and `elapsed` 9

#### Scenario: closed milestone
- GIVEN a milestone from 2026-10-05 to 2026-10-30 closed on 2026-11-03 with 58 closed beads, 7 of them closed after 2026-10-30
- WHEN the team report is built
- THEN `team.throughput` is 13.2, `pace_needed` is `null` and `on_time` is 51 ÷ 58

#### Scenario: rework rate
- GIVEN `ann` closed 4 beads with `ai_usage`, one with 1 reopen, and 1 bead without `ai_usage`
- WHEN the team report is built
- THEN `ann`'s row has `rework_rate` 0.25 and `reopens` 1

#### Scenario: member order
- GIVEN `ann` with 3 scope beads, `bao` with 5 and 6 without an assignee
- WHEN the team report is built
- THEN `members` is `bao`, `ann`, `Unassigned`

#### Scenario: blocked whatever the status
- GIVEN scope beads with status `blocked`, an open bead with an open blocker, an in-progress bead with an open blocker and an in-progress bead without blockers
- WHEN the team report is built
- THEN `team.blocked` is 3, `team.in_progress` is 1 and `team.open` is 3

#### Scenario: past end
- GIVEN an open milestone that ended yesterday with 4 beads still open or in progress
- WHEN the team report is built
- THEN `team.late_open` is 4 and `pace_needed` is `null`

### REQ-REPORTS-012: Team tab
<!-- base: 702fde2da98058ca011ca71af4eabbc3e5422b1a72752f07383cee350781edbe -->
WHILE a single project is selected, the Team tab of the Reports page SHALL request REQ-REPORTS-008 with the URL's `milestone`, and SHALL show:
- A Milestone select with the groups Active (`active`), Planned (`scheduled` and `planned`, by `start`) and Closed (latest `end` first), set to the answer's `milestone`.
- A Member select with "All members (<n>)" and each row of `members` as "<member> · <scope>".
- A "Clear member" control while a member is selected.
- A link "Open Gantt" to the milestone page.
- The milestone line:
  - the title;
  - a status chip with the milestone status of REQ-MILESTONE-UI-022: Active, Scheduled or Planned, followed by " · late" with a warning mark when the milestone is late (REQ-MILESTONE-UI-023, its forecast `finish` taken from the Milestones list of REQ-UI-095), or "Closed · on time" or "Closed · <n> d late", where `<n>` is the working days from `end` to `closed_on`;
  - "<start> – <end>" (REQ-UI-131);
  - "working day <elapsed> of <working_days> · <days_left> left" while the period holds `today`, "starts in <n> working days" before `start`, or "finished <closed_on>" once closed.
- WHEN `undated` is above 0, the note "<undated> milestones without start and end dates are not listed".

Its selects SHALL be no wider than the panel, a long option cut short. It SHALL keep the milestone, member and bead status in the URL query (`milestone`, `member`, `status`). It SHALL put the answer's `milestone` in the URL when it differs. It SHALL select All members when `member` is not one of `members`. A change of milestone SHALL clear the member and status. The tab SHALL NOT show the period or sprint choice, and SHALL keep `days` and `sprint` in the URL for the other tabs.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-active.png`

#### Scenario: shared link
- GIVEN the URL `/reports?project=alpha&tab=team&milestone=m1&member=ann&status=closed`
- WHEN the page loads
- THEN milestone `m1`, member `ann` and the Closed list are shown

#### Scenario: default milestone in the URL
- GIVEN the URL `/reports?project=alpha&tab=team`
- WHEN the answer's `milestone` is `m2`
- THEN the URL becomes `/reports?project=alpha&days=30&tab=team&milestone=m2` without a reload

#### Scenario: change milestone
- GIVEN the Team tab for `m2` with member `ann` and the Closed list
- WHEN the user picks `m1`
- THEN the team report for `m1` is requested, All members is selected and the default list of REQ-REPORTS-016 is shown

#### Scenario: late active milestone
- GIVEN active milestone `m2` whose forecast `finish` in the Milestones list is after its `end`
- WHEN the Team tab is shown
- THEN its status chip reads "Active · late" with a warning mark

#### Scenario: no period choice
- GIVEN the Team tab is selected
- WHEN the panel is shown
- THEN no period buttons and no sprint field are shown

#### Scenario: long options on a phone
- GIVEN a milestone titled with 120 characters and a member `nguyen.thi.thanh.huong.payments-team@example-company.com.vn`
- WHEN the Team tab is shown at 390px
- THEN both selects fit inside the window and the page does not scroll sideways

### REQ-REPORTS-013: Team figures
<!-- base: a2b9b5cf33dcba56776f9071ae01d80bdb06823121492657d948d6794f2d52e5 -->
The Team tab SHALL show a row of figures, in this order, from `team`, or from the selected member's row:
- Done: "<closed> / <scope>" and "<done> of scope" ("of assigned" for a member).
- In progress: the count and "oldest <n> d", in the warning color above 3 days, or "nothing started".
- Open: the count, and "<blocked> blocked · <unclaimed> unassigned" ("<blocked> blocked" for a member). This line is in the warning color when `blocked` is above 0.
- Pace or Throughput:
  - For the team, while `pace_needed` is not `null`: Pace, "<pace> done per day" and "needs <pace_needed> done per day to finish by <end>". Both are in the warning color when `pace_needed` is above `pace`.
  - Otherwise: Throughput, "<throughput> done per week".
- Median cycle: "<n> d" or "—".
- On time: the percentage, in the warning color below 100%. Under it: "<late_open> open after the end date" in the warning color when `late_open` is above 0, else "closed by <end>".
- Rework: the percentage or "—", and "<reopens> reopens · <bugs> bugs later".

Each figure SHALL carry a tooltip (REQ-UI-132) with the rule it counts by. Under the figures, a "Scope by status" bar SHALL show segments for Closed, In progress, Open (without blocked) and Blocked, sized by count, with a legend giving each count.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-active.png`

#### Scenario: behind pace
- GIVEN `team.pace` 2.0 and `pace_needed` 3.4
- WHEN the Team tab is shown
- THEN the Pace figure reads "2.0 done per day" and "needs 3.4 done per day to finish by 27 Nov", in the warning color

#### Scenario: member figures
- GIVEN member `ann` with scope 11, closed 6 and 1 blocked bead
- WHEN the user selects `ann`
- THEN the figures read "6 / 11", "55% of assigned", "1 blocked", and Throughput instead of Pace

#### Scenario: closed milestone
- GIVEN a closed milestone with `throughput` 13.2 and `on_time` 0.88
- WHEN the Team tab is shown
- THEN the figures show Throughput "13.2 done per week" and On time "88%" in the warning color

#### Scenario: open after the end date
- GIVEN an open milestone that ended yesterday with `late_open` 4
- WHEN the Team tab is shown
- THEN On time reads "4 open after the end date" in the warning color

### REQ-REPORTS-018: Velocity tab
<!-- base: d6b9d1061bf7af36de8bc0bc0f41d00e7a05851938e198cebfde2d72af33db85 -->
WHEN the Velocity tab is selected, the frontend SHALL request `GET /api/milestones?project=<p>` (REQ-MILESTONE-UI-008) for the selected project, unless REQ-UI-095 has already loaded it, or for every configured project when "All projects" is selected, and SHALL show for each project (under the project's name when all are selected):
- a row of figures: the project's `days_per_point.value` to one decimal as "<x> days per point", with "assumed" when `days_per_point.assumed` is true and "—" when `days_per_point` is `null` or missing; and the commitment met (say/do, whole percent) and accuracy (two decimals) of the milestone with the latest `start` among those whose `velocity.say_do` is not `null`, or "—";
- for the milestones whose `velocity` has a `committed_points` that is not `null` or a `completed_points` above 0, oldest `start` first:
  - a column chart of `committed_points` and `completed_points` per milestone;
  - a line chart of `days_per_point` and `planned_days_per_point` per milestone, leaving out `null` points;
  - a table with committed, completed and added points, commitment met, days per point, planned days per point and accuracy, "—" for `null`;
- "No kicked-off milestones with points yet" when no milestone qualifies;
- the error and cause of a project whose request failed (REQ-MILESTONE-UI-005), with the other projects still shown.
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

#### Scenario: All projects with one failing
- GIVEN projects `alpha` with velocity and `beta` whose `GET /api/milestones?project=beta` answers 502 with `cause: "outdated"`
- WHEN the user opens `/reports?project=all&tab=velocity`
- THEN `alpha` shows its figures, charts and table, and `beta` shows the outdated error

### REQ-MILESTONE-UI-001: Milestones list
<!-- base: ecd0d02b6f2c14e8f9f8931bbf084906c2c26b4c1e8c9451310e6966d2318daf -->
gin-console SHALL show a Milestones entry in the sidebar that opens a per-project list of milestones with title, status (REQ-MILESTONE-UI-022), start and end (and kickoff when set), parallel lanes, forecast finish, epic progress, commitment met, and warning count, from `gin milestone list --all --json`, under the column headers Status, Milestone, Period, Parallel lanes, Commitment met, Epics and Warnings. Parallel lanes SHALL read "<n> lanes" ("1 lane" when `<n>` is 1), or "–" when the entry has no `lanes`. The forecast finish SHALL read "Finishes <date>" (REQ-UI-131) when the entry's `finish` is set, in the warning color when the milestone is late (REQ-MILESTONE-UI-023). Commitment met SHALL read "Commitment met <n>%" with the entry's `velocity.say_do` as a whole percent, or "–" when the entry has no `velocity` or its `say_do` is `null`. gin-console SHALL show a list entry's `error` in place of its progress and warnings, SHALL show "No dates" in place of the period of an entry whose `start` or `end` is `null`, SHALL cut a long title short with the full title as `title`, and SHALL NOT show the `unassigned_epics` count, which REQ-MILESTONE-UI-010 replaces with a list.
Source: `assets/2026-11-08/mockup/index.html#milestones`

#### Scenario: list
- GIVEN project P whose gin-workflow reports milestones M1 (active) and M2 (planned)
- WHEN the user opens Milestones for P
- THEN both milestones are listed with their status, period, lanes, progress, and warning count

#### Scenario: lanes and finish
- GIVEN project P whose `milestone list` reports M1 with `lanes: 2`, `end: 2026-11-12`, `finish: 2026-11-23`, and M2 with `lanes: 1`, `end: 2026-12-04`, `finish: 2026-12-01`
- WHEN the user opens Milestones for P
- THEN M1 shows "2 lanes" and "Finishes 23 Nov" in the warning color, and M2 shows "1 lane" and "Finishes 1 Dec" without it

#### Scenario: commitment met
- GIVEN project P whose `milestone list` reports M1 with `velocity.say_do: 0.62`, M2 with `velocity.say_do: null`, and M3 without `velocity`
- WHEN the user opens Milestones for P
- THEN M1 shows "Commitment met 62%", and M2 and M3 show "–" for commitment met

#### Scenario: older gin-workflow
- GIVEN project P whose `milestone list` entries have no `lanes` key
- WHEN the user opens Milestones for P
- THEN each row shows "–" for lanes and the rest of the row as before

#### Scenario: unassigned count not shown
- GIVEN project P whose `milestone list` reports `unassigned_epics: 4`
- WHEN the user opens Milestones for P
- THEN the page does not show a sentence counting roadmap epics outside milestones

#### Scenario: schedule error
- GIVEN project P whose `milestone list` reports M2 with `error` "dependency cycle: A -> B -> A"
- WHEN the user opens Milestones for P
- THEN M2 shows that error in place of its progress and warning count, and M1 is shown normally

#### Scenario: milestone without dates
- GIVEN project P whose `milestone list` reports M1 (active) and M4 with `start: null`, `end: null` and `error` "M4 has no start/end metadata"
- WHEN the user opens Milestones for P
- THEN M1 is shown normally, and M4 shows "No dates" and that error

### REQ-MILESTONE-UI-016: Project forecast card
<!-- base: 8231be507689fbd14f3d7093d834285a7dccf820d1e74d112ffdfa0f0883203f -->
WHEN the Milestones list of a project has a non-null `forecast`, gin-console SHALL show a forecast card above the milestone list with:
- the forecast `finish` ("Finishes <date>") as its most prominent text, or "No estimate: no open epic is estimated" when `finish` is null;
- the `deadline` and how `finish` compares with it:
  - "<n> working days past the deadline" in the warning color when `overflow_days` is above 0;
  - "on the deadline" when `finish` equals `deadline`;
  - "<n> working days spare" otherwise. `<n>` counts the days Monday to Friday after `finish` up to and including `deadline`, the same count as gin-workflow `workdays_after`.
  - The comparison is left out when `finish` is null.
- "No deadline" when `deadline` is null, with the roadmap line `- Deadline: YYYY-MM-DD` to add;
- as label/value pairs (REQ-UI-110): Parallel lanes "<n> lanes" (`lanes`), Open epics "<n> open epics" (`open_epics`), and Not estimated "<n> not estimated" (`unestimated`), with a warning mark when `unestimated` is above 0;
- the pair Days per point "<x>" from the list's `days_per_point` to one decimal, followed by "(assumed)" when `assumed` is true, left out when `days_per_point` is `null` or missing;
- the forecast `error`, when set, in the destructive color, with the other figures still shown.
Source: `assets/2026-11-08/mockup/index.html#milestones`
The page SHALL NOT show the card when `forecast` is null or missing.

#### Scenario: on time with a deadline
- GIVEN project P whose `milestone list` reports forecast `finish: 2026-12-23`, `deadline: 2026-12-31`, `overflow_days: 0`, `lanes: 2`, `open_epics: 5`, `unestimated: 0`
- WHEN the user opens Milestones for P
- THEN the card reads "Finishes 23 Dec", "6 working days spare", "2 lanes", "5 open epics", and "0 not estimated" without a warning mark

#### Scenario: past the deadline
- GIVEN project P whose forecast has `finish: 2027-01-07`, `deadline: 2026-12-31`, `overflow_days: 5`
- WHEN the user opens Milestones for P
- THEN the card reads "5 working days past the deadline" in the warning color

#### Scenario: no deadline
- GIVEN project P whose forecast has `deadline: null` and `finish: 2026-11-20`
- WHEN the user opens Milestones for P
- THEN the card reads "Finishes 20 Nov" and "No deadline", and shows `- Deadline: YYYY-MM-DD` as the line to add to the roadmap

#### Scenario: every epic unestimated
- GIVEN project P whose forecast has `finish: null`, `open_epics: 2`, `unestimated: 2`
- WHEN the user opens Milestones for P
- THEN the card reads "No estimate: no open epic is estimated" and "2 not estimated" with a warning mark, and shows no deadline comparison

#### Scenario: days per point
- GIVEN project P whose list has a forecast and `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`, and project Q whose list has a forecast and `days_per_point: {value: 1.0, measured_epics: 0, assumed: true}`
- WHEN the user opens Milestones for P and then for Q
- THEN P's card shows the pair Days per point "1.4" and Q's shows Days per point "1.0 (assumed)"

#### Scenario: forecast error
- GIVEN project P whose forecast has `error: "Deadline: soon is not a date (YYYY-MM-DD)"`, `deadline: null`, `finish: 2026-11-20`
- WHEN the user opens Milestones for P
- THEN the card shows that error in the destructive color and still reads "Finishes 20 Nov"

### REQ-MILESTONE-UI-021: Velocity on the milestone page
<!-- base: 0b96b90c127f0664d4cab4314d9b40c09ef5e3758bd2416294d2e4dc2039df6f -->
WHEN the shown milestone's `show` output has a `velocity`, the milestone page header SHALL show it as label/value pairs (REQ-UI-110): Committed "<c> pt", Completed "<d> pt", Added "<a> pt" and Commitment met "<s>%" (`say_do` as a whole percent, "–" when `null`), or Kick-off "Not kicked off" and Completed "<d> pt" when `committed_points` is `null`, and, when `velocity.days_per_point` is not `null`, Days per point "<x> (planned <y>, accuracy <z>)" with `<x>` and `<y>` to one decimal and `<z>` to two decimals, leaving out "planned" or "accuracy" when it is `null`; it SHALL show none of this when `velocity` is `null` or missing, and nothing per member.

#### Scenario: Kicked off
- GIVEN milestone `m1` whose `show` output has `velocity` `{committed_points: 13, completed_points: 8, added_points: 3, say_do: 0.62, days_per_point: 1.4, planned_days_per_point: 1.2, accuracy: 0.86}`
- WHEN the user opens `m1`
- THEN the header shows the pairs Committed "13 pt", Completed "8 pt", Added "3 pt", Commitment met "62%" and Days per point "1.4 (planned 1.2, accuracy 0.86)"

#### Scenario: Not kicked off
- GIVEN milestone `m2` whose `velocity` has `committed_points: null`, `completed_points: 0`, `say_do: null` and `days_per_point: null`
- WHEN the user opens `m2`
- THEN the header shows the pairs Kick-off "Not kicked off" and Completed "0 pt", and no Days per point pair

#### Scenario: Older gin-workflow
- GIVEN milestone `m1` whose `show` output has no `velocity` key
- WHEN the user opens `m1`
- THEN the header shows no velocity and the rest of the header is unchanged

## REMOVED
