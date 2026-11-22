# Reports

## Purpose

## Requirements

### REQ-REPORTS-001: Report request
WHEN a client requests `GET /api/reports` with `project` (a configured project name or `all`), `days` (7, 30 or 90, default 30) and optionally `sprint`, the server SHALL read every bead of each selected project from its `bd export` snapshot (REQ-BEADS-012), SHALL select the beads closed in the last `days` days or, when `sprint` is given, the epics labelled `sprint:<sprint>` and their descendants whatever their close date, leaving out merge gates (REQ-BEADS-019) in both cases, SHALL return `totals` (`closed`, the number of selected closed beads, and the `rework_rate` of REQ-REPORTS-005), the Delivery section of REQ-REPORTS-004, the Quality section of REQ-REPORTS-005 and `errors` (REQ-REPORTS-007) together with `generated_at`, and SHALL read no `ai_usage` metadata, SHALL serve the same answer for the same `project`, `days` and `sprint` for 60 seconds without running `bd` again unless `POST /api/refresh` dropped it, SHALL respond 404 when `project` is neither `all` nor configured, and SHALL respond 422 when `days` is another value or `sprint` holds a character outside letters, digits, `.`, `_` and `-`.

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
- WHEN a client requests `project=nope`, `days=14` or `sprint=a b`
- THEN the responses are 404, 422 and 422, and no `bd` command ran

#### Scenario: no AI usage in the answer
- GIVEN project `alpha` with a closed task whose metadata still holds an `ai_usage` object
- WHEN a client requests `/api/reports?project=alpha`
- THEN the answer has no `usage` and no `coverage` key, and `totals` holds only `closed` and `rework_rate`

### REQ-REPORTS-004: Delivery flow section
The report SHALL hold:
- Beads closed per ISO week, by `issue_type`.
- The median and 85th percentile cycle time (`started_at` to `closed_at`) and lead time (`created_at` to `closed_at`), in days, per `issue_type`, per member, and over all selected closed beads together (`overall`). A time SHALL leave a bead out when a timestamp is missing or the close is before the start. Within a row, a time SHALL be absent when no bead has it.
- For each selected closed epic with `estimated_minutes`, or with `metadata.points` one of 1, 2, 3, 5, 8, 13 and 21: its estimate in working days (`estimated_minutes / 480`, or `null` without `estimated_minutes`), its `points` (or `null`), the weekdays from its `started_at` (else `created_at`) to its `closed_at`, both dates counted, and, for an epic with points, those weekdays per point (`days_per_point`, rounded to one decimal).

The report SHALL NOT hold in-progress beads; the Team report (REQ-REPORTS-010) holds them per milestone.

#### Scenario: percentiles
- GIVEN five closed tasks with cycle times of 1, 2, 3, 4 and 10 days
- WHEN the report is built
- THEN the task median is 3 days and the p85 lies between 4 and 10 days

#### Scenario: missing start
- GIVEN a closed task without `started_at`
- WHEN the report is built
- THEN it counts in throughput and lead time and not in cycle time

#### Scenario: estimate
- GIVEN an epic with `estimated_minutes` 2400 created on a Monday and closed on the Tuesday of the next week
- WHEN the report is built
- THEN it shows 5 estimated and 7 actual working days

#### Scenario: points
- GIVEN an epic without `estimated_minutes` whose metadata has `points: 5`, started on a Monday and closed on the Tuesday of the next week
- WHEN the report is built
- THEN its estimate row has `estimate_days: null`, `points: 5`, 7 actual working days and `days_per_point: 1.4`

#### Scenario: overall
- GIVEN a closed task with cycle time 1 day and a closed bug with cycle time 3 days
- WHEN the report is built
- THEN `overall` holds a cycle median of 2 days over 2 beads

#### Scenario: nothing closed
- GIVEN no closed bead in the period
- WHEN the report is built
- THEN `overall` has no cycle time and no lead time

#### Scenario: no work in progress
- GIVEN a bead in progress
- WHEN the report is built
- THEN `delivery` has neither `wip` nor `oldest`

### REQ-REPORTS-005: Quality section
The report SHALL hold `quality` with `members`, one row per member (the person, REQ-BEADS-023, of the bead's `assignee`, or `Unassigned`), and `epics`, one row per epic that is the nearest epic among a selected closed bead and its ancestors, keeping the 10 epics with the most rework, then the most closed beads, then by id. Each row SHALL hold `closed` (its selected closed beads), `reopens` and `bugs` (REQ-REPORTS-019) summed over them, and `rework_rate`: the share of them whose `rework` is above 0, or `null` when it has none; an epic row SHALL also hold the epic's `project`, `id` and `title`. `totals.rework_rate` SHALL be the same share over every selected closed bead. The section SHALL NOT use `ai_usage`.

#### Scenario: rework rate
- GIVEN `ann` closed 4 beads, one of them reopened once in the interaction log
- WHEN the report is built
- THEN `ann`'s row has `closed` 4, `reopens` 1 and a `rework_rate` of 0.25

#### Scenario: epic rows
- GIVEN epic `e-1` with closed tasks `t-1` (reopened once) and `t-2`, and epic `e-2` with closed tasks `t-3` and `t-4` and no rework
- WHEN the report is built
- THEN `epics` lists `e-1` (closed 2, reopens 1, rework rate 0.5) before `e-2` (closed 2, rework rate 0)

#### Scenario: old ai_usage ignored
- GIVEN a closed task whose metadata holds `ai_usage.quality.reopens` 5 and whose interaction log has no reopen
- WHEN the report is built
- THEN the task counts 0 reopens

### REQ-REPORTS-007: Failures
IF `bd` fails in the selected project as in REQ-BEADS-005, THEN the server SHALL respond 502 with an `error`; WHILE `project` is `all`, the server SHALL instead build the report from the projects that answered, list each failed project with its error under `errors`, and respond 502 only when every project failed; and the server SHALL NOT keep a failed answer in the cache.

#### Scenario: one project fails in all
- GIVEN projects `alpha` and `beta`, and `bd` exits non-zero in `beta`
- WHEN a client requests `/api/reports?project=all`
- THEN the response is 200 with `alpha`'s beads and `errors` holding `beta`

#### Scenario: single project fails
- GIVEN `bd` exits non-zero in `alpha`
- WHEN a client requests `/api/reports?project=alpha` twice
- THEN both responses are 502 and `bd` ran twice

#### Scenario: all members merged
- GIVEN `ann` closed a bead in `alpha` that was reopened once and a bead in `beta`
- WHEN a client requests `/api/reports?project=all`
- THEN one Quality member row `ann` holds 2 closed beads and 1 reopen

### REQ-REPORTS-008: Team report request
WHEN a client requests `GET /api/reports/team` with `project` (a configured project name) and optionally `milestone` (a bead id), the server SHALL read every bead of the project from its `bd export` snapshot (REQ-BEADS-012) without starting a process, and SHALL return:
- `generated_at`;
- `today`, the server's local date;
- `milestones`: each milestone bead (`issue_type` `milestone`) whose `metadata.start` and `metadata.end` are ISO dates, with `id`, `title`, `status`, `start`, `end` and `closed_on`;
- `undated`: the number of milestone beads left out because they lack those dates;
- `milestone`: the selected id, or `null` when `milestones` is empty;
- for the selected milestone, the sections of REQ-REPORTS-009 to REQ-REPORTS-011.

A milestone's `status` SHALL follow gin-workflow:
- `closed` when the bead is closed;
- else `active` when `metadata.kickoff` is on or before `today`;
- `scheduled` when the kickoff is after `today`;
- `planned` without a kickoff.

`closed_on` SHALL be the date of `closed_at`, or `null` while the milestone is open.

The server SHALL select `milestone` when it names a listed milestone, and otherwise the first match of:
1. the `active` milestone with the earliest `start`;
2. the open milestone whose `start` to `end` holds `today`;
3. the open milestone with the earliest `start` after `today`;
4. the closed milestone with the latest `end`.

The server SHALL serve the same answer for the same `project` and `milestone` for 60 seconds unless `POST /api/refresh` dropped it. It SHALL respond 404 when `project` is not configured, and 422 when `milestone` holds a character outside letters, digits, `.`, `_` and `-`.
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: default milestone
- GIVEN project `alpha` with closed milestone `m1`, active milestone `m2` and planned milestone `m3`
- WHEN a client requests `/api/reports/team?project=alpha`
- THEN `milestone` is `m2` and `milestones` holds `m1`, `m2` and `m3` with statuses `closed`, `active` and `planned`

#### Scenario: named milestone
- GIVEN the same project
- WHEN a client requests `/api/reports/team?project=alpha&milestone=m1`
- THEN `milestone` is `m1` and the sections describe `m1`

#### Scenario: unknown milestone
- GIVEN the same project
- WHEN a client requests `milestone=gone`
- THEN the response is 200 with `milestone` `m2`

#### Scenario: undated milestone
- GIVEN a milestone bead without `metadata.end`
- WHEN the team report is built
- THEN it is not in `milestones` and `undated` is 1

#### Scenario: no milestones
- GIVEN project `beta` without milestone beads
- WHEN a client requests `/api/reports/team?project=beta`
- THEN the response is 200 with `milestones` empty and `milestone` `null`

#### Scenario: no process and cache
- GIVEN the team report for `alpha` was answered 20 seconds ago
- WHEN a client requests it again
- THEN no `gin` or `bd` process starts and the same `generated_at` is returned

#### Scenario: bad input
- GIVEN no project `nope`
- WHEN a client requests `project=nope` and `project=alpha&milestone=a b`
- THEN the responses are 404 and 422

#### Scenario: unreadable snapshot
- GIVEN the snapshot of `alpha` cannot be read as in REQ-BEADS-005
- WHEN a client requests the team report twice
- THEN both responses are 502 with an `error` and the failure is not cached

### REQ-REPORTS-009: Team scope and bead rows
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
- `rework`: the bead's reopens plus bugs found later (REQ-REPORTS-019), 0 when it has none.

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
The response SHALL hold `team`, over the whole scope, and `members`, with one row per member of REQ-REPORTS-009 sorted by scope count (largest first) and then by name, with `Unassigned` last. Each holds:
- `scope`, `closed`, `in_progress` and `open` counts, one per bucket of REQ-REPORTS-009;
- `blocked`: scope beads that are not closed and blocked (REQ-BEADS-021), whatever their status;
- `unclaimed`: open beads without an assignee;
- `done`: closed ÷ scope, or `null` when the scope is empty;
- `throughput`: the beads closed in the last 5 working days up to `today`. For a closed milestone it is instead the closed beads ÷ the working days from `start` to `closed_on` × 5, rounded to one decimal;
- `cycle_median`: the median `cycle_days` of the closed beads, or `null`;
- `oldest_in_progress`: the largest `age_days`, or `null`;
- `on_time`: the share of closed beads with `late_days` 0, or `null` when none is closed;
- `rework_rate`: the share of closed beads whose `rework` (REQ-REPORTS-019) is above 0, or `null` when none is closed;
- `reopens` and `bugs` (REQ-REPORTS-019), summed over the closed beads.

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
- GIVEN `ann` closed 4 beads, one of them reopened once in the interaction log and another with one bug found later
- WHEN the team report is built
- THEN `ann`'s row has `rework_rate` 0.5, `reopens` 1 and `bugs` 1

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

### REQ-REPORTS-011: Closed per working day
The response SHALL hold `days`: one entry per working day from the milestone's `start` to the latest of `end`, `today` (open milestone) and `closed_on` (closed milestone), each with its `date` and the number of scope beads closed per member that day. A bead closed on a Saturday or Sunday SHALL count on the Friday before, and one closed before `start` SHALL count on the first day.

#### Scenario: weekend close
- GIVEN a scope bead of `ann` closed on Sunday 2026-11-08
- WHEN the team report is built
- THEN the entry for Friday 2026-11-06 counts 1 for `ann`

#### Scenario: range
- GIVEN an open milestone from 2026-11-02 to 2026-11-27 and `today` 2026-11-12
- WHEN the team report is built
- THEN `days` has 20 entries, from 2026-11-02 to 2026-11-27

### REQ-REPORTS-012: Team tab
WHILE a single project is selected, the Team tab of the Reports page SHALL request REQ-REPORTS-008 with the URL's `milestone`, and SHALL show:
- A Milestone select with the groups Active (`active`), Planned (`scheduled` and `planned`, by `start`) and Closed (latest `end` first), set to the answer's `milestone`.
- A Member select with "All members (<n>)" and each row of `members` as "<member> (<scope>)".
- A "Clear member" control while a member is selected.
- A link "Open Gantt" to the milestone page.
- The milestone line:
  - the title;
  - the milestone status of REQ-MILESTONE-UI-022 as its glyph and word (REQ-UI-064): Active, Scheduled or Planned, followed by ", late" with a warning mark when the milestone is late (REQ-MILESTONE-UI-023, its forecast `finish` taken from the Milestones list of REQ-UI-095), or "Closed, on time" or "Closed, <n> d late", where `<n>` is the working days from `end` to `closed_on`;
  - "<start> – <end>" (REQ-UI-131);
  - "working day <elapsed> of <working_days>, <days_left> left" while the period holds `today`, "starts in <n> working days" before `start`, or "finished <closed_on>" once closed.
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
- THEN its status reads "Active, late" with a warning mark

#### Scenario: no period choice
- GIVEN the Team tab is selected
- WHEN the panel is shown
- THEN no period buttons and no sprint field are shown

#### Scenario: long options on a phone
- GIVEN a milestone titled with 120 characters and a member `nguyen.thi.thanh.huong.payments-team@example-company.com.vn`
- WHEN the Team tab is shown at 390px
- THEN both selects fit inside the window and the page does not scroll sideways

### REQ-REPORTS-013: Team figures
The Team tab SHALL show a row of figures, in this order, from `team`, or from the selected member's row:
- Done: "<closed> of <scope>" and "<done> of scope" ("of assigned" for a member).
- In progress: the count and "oldest <n> d", in the warning color above 3 days, or "nothing started".
- Open: the count, and "<blocked> blocked, <unclaimed> unassigned" ("<blocked> blocked" for a member). This line is in the warning color when `blocked` is above 0.
- Pace or Throughput:
  - For the team, while `pace_needed` is not `null`: Pace, "<pace> done per day" and "needs <pace_needed> done per day to finish by <end>". Both are in the warning color when `pace_needed` is above `pace`.
  - Otherwise: Throughput, "<throughput> done per week".
- Median cycle: "<n> d" or "—".
- On time: the percentage, in the warning color below 100%. Under it: "<late_open> open after the end date" in the warning color when `late_open` is above 0, else "closed by <end>".
- Rework: the percentage or "—", and "<reopens> reopens, <bugs> bugs later".

Each figure SHALL carry a tooltip (REQ-UI-132) with the rule it counts by. Under the figures, "Scope by status" SHALL draw the scope as the strand of REQ-UI-138, its Ready being Open without blocked, with a legend giving each state's glyph, word and count.
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

### REQ-REPORTS-014: Closed per working day chart
WHILE the milestone has begun (its first entry of `days` is on or before `today`), the Team tab SHALL show `days` as a column chart:
- The columns are stacked by member, each member in a fixed color and Unassigned in the neutral color, with a legend.
- A Today marker is shown while the period holds `today`.
- An "End <end>" marker is shown when `days` goes past `end`.
- WHILE a member is selected, the other members' segments are drawn faded.
- Each column SHALL show, on hover and on focus, its date, the beads closed per member and the total.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-member.png`

#### Scenario: stacked day
- GIVEN `days` holds 2026-11-04 with `ann` 2 and `bao` 1
- WHEN the user focuses that column
- THEN it shows 4 Nov, `ann` 2, `bao` 1 and a total of 3

#### Scenario: not started
- GIVEN a planned milestone starting after `today`
- WHEN the Team tab is shown
- THEN no chart is shown

### REQ-REPORTS-015: Team KPI table
The Team tab SHALL show a table with one row per entry of `members`. The columns are:
- member;
- assigned (`scope`), closed and in progress;
- open, with "(<n> blocked)" when `blocked` is above 0;
- a done meter with closed and in-progress segments and the `done` percentage;
- per week (`throughput`);
- median cycle;
- oldest in progress, in the warning color above 3 days;
- on time;
- rework, "—" for Unassigned.

Pressing a row, or Enter or Space on a focused row, SHALL select that member. Doing so on the selected member's row SHALL select All members. The selected row SHALL be highlighted and marked `aria-selected`.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-member.png`

#### Scenario: filter from the table
- GIVEN the Team tab with All members
- WHEN the user presses `ann`'s row
- THEN the Member select shows `ann`, the URL holds `member=ann` and the figures and list show `ann`'s beads

#### Scenario: clear from the table
- GIVEN member `ann` is selected
- WHEN the user presses `ann`'s row again
- THEN All members is selected

### REQ-REPORTS-016: Team bead list
The Team tab SHALL show the scope beads of the selected member, or of every member, under the heading "Beads" ("Beads of <member>" when one is selected). A tab list holds Open, In progress, Closed and All, each with its count. The default is Open, or Closed for a closed milestone. The columns are:
- Open: Bead, Epic, Type, Assignee, Priority (`P<priority>`), a status as its glyph and word (REQ-UI-064), and Age (days since `created_at`). Sorted by priority, then oldest first.
- In progress: Bead, Epic, Type, Assignee, and "In progress for" (`age_days`, in the warning color above 3 days). Sorted longest first.
- Closed: Bead, Epic, Type, Assignee, Closed (the date), Cycle, On time as text ("On time", or "<late_days> d late" in the warning color), and Rework (the bead's `rework`, REQ-REPORTS-019). Sorted newest first.
- All: Bead, Epic, Type, Assignee, and a status as its glyph and word.

In every list:
- Bead shows the title linking to the bead page, with the id under it.
- Epic links to the epic's bead page.
- Pressing a column header sorts by that column, ascending first, and pressing it again reverses the order. The header is marked with `aria-sort`. Age sorts by its number of days, so descending puts the oldest bead first.
- The list shows 15 rows, then a "Show 15 more" control while more remain.
- An empty list says "No <status> beads in this milestone", adding " for <member>" when one is selected.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-closed.png`

#### Scenario: counts follow the member
- GIVEN `ann` has 4 open, 1 in-progress and 6 closed beads
- WHEN the user selects `ann`
- THEN the tabs read Open 4, In progress 1, Closed 6 and All 11

#### Scenario: closed row
- GIVEN a closed bead `a-3` with cycle 0.9 days, `late_days` 2 and `rework` 0
- WHEN the Closed list is shown
- THEN its row shows "0.9 d", "2 d late" and "0", and its title opens `/beads/alpha/a-3`

#### Scenario: show more
- GIVEN 43 closed beads
- WHEN the Closed list is shown and the user presses "Show 15 more"
- THEN 30 rows are shown

#### Scenario: sort
- GIVEN the Open list sorted by priority
- WHEN the user presses the Age header twice
- THEN the rows are sorted by age, oldest first, and the header has `aria-sort="descending"`

### REQ-REPORTS-017: Team tab states
The Team tab SHALL handle these states:
- WHILE "All projects" is selected, it SHALL show "Pick a project to see its team" and SHALL NOT request the team report.
- WHEN `milestones` is empty, it SHALL show "<project> has no milestones yet", one sentence on what a milestone is, and the command `gin milestone create` with a copy button.
- WHILE the team report loads, it SHALL show a loading state.
- IF the request fails, THEN it SHALL show the error with a Retry button.
- It SHALL NOT show a late answer for a project or milestone that is no longer selected.
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: all projects
- GIVEN "All projects" is selected
- WHEN the Team tab is shown
- THEN it says "Pick a project to see its team" and no request goes to `/api/reports/team`

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

## Diagrams
- [Team tab](diagrams/team-tab-activity.md)
- [Velocity tab](diagrams/velocity-tab-activity.md)
- [Rework](diagrams/rework-activity.md)

## Use Cases
- [Review the team in a milestone](use-cases/review-team-in-milestone.md)
- [Review velocity](use-cases/review-velocity.md)
- [Review rework](use-cases/review-rework.md)

### REQ-REPORTS-018: Velocity tab
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

### REQ-REPORTS-019: Rework from Beads
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
- WHEN a report of all projects is built
- THEN the response is 200, every bead of `alpha` has `reopens` 0, and `b-1` has `reopens` 1

#### Scenario: Read again only on change
- GIVEN the log of `alpha` was read for a report and has not changed since
- WHEN another report of `alpha` is built, and then a reopen line is appended and a report is built again
- THEN the second build does not read the log, and the third reads it and counts the new reopen
