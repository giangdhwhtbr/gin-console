# Reports

## Purpose

## Requirements

### REQ-REPORTS-001: Report request
WHEN a client requests `GET /api/reports` with `project` (a configured project name) and either `days` (7, 30 or 90, default 30) or `milestone` (a bead id), the server SHALL read every bead of the project from its `bd export` snapshot (REQ-BEADS-012), SHALL select the beads closed in the last `days` days or, when `milestone` is given, the closed beads of the milestone's scope (REQ-REPORTS-009) whatever their close date, leaving out merge gates (REQ-BEADS-019) in both cases, SHALL return `totals` (`closed`, the number of selected closed beads, and the `rework_rate` of REQ-REPORTS-005), the Delivery section of REQ-REPORTS-004 and the Quality section of REQ-REPORTS-005 together with `generated_at`, `days` and `milestone`, and SHALL read no `ai_usage` metadata, SHALL serve the same answer for the same `project` and scope for 60 seconds without running `bd` again unless `POST /api/refresh` dropped it, SHALL respond 404 when `project` is not configured, `all` included, or when `milestone` is not a listed milestone of REQ-REPORTS-008, and SHALL respond 422 when `days` is another value, when `milestone` holds a character outside letters, digits, `.`, `_` and `-`, or when both are given.

#### Scenario: default period
- GIVEN project `alpha` with beads closed 3, 20 and 40 days ago
- WHEN a client requests `/api/reports?project=alpha`
- THEN the report counts the beads closed 3 and 20 days ago and not the one closed 40 days ago

#### Scenario: milestone
- GIVEN milestone `m2` with epic `e-1` whose track closed 50 days ago, and epic `e-9` of milestone `m3` with a track closed 3 days ago
- WHEN a client requests `/api/reports?project=alpha&milestone=m2`
- THEN the report counts the track of `e-1` and nothing of `e-9`, and `milestone` is `m2`

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
- WHEN a client requests `project=nope`, `project=all`, `days=14`, `milestone=a b`, `milestone=gone` and `milestone=m2&days=7`
- THEN the responses are 404, 404, 422, 422, 404 and 422, and no `bd` command ran for the 422s

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
IF `bd` fails in the project as in REQ-BEADS-005, THEN the server SHALL respond 502 with an `error`, and SHALL NOT keep a failed answer in the cache.

#### Scenario: single project fails
- GIVEN `bd` exits non-zero in `alpha`
- WHEN a client requests `/api/reports?project=alpha` twice
- THEN both responses are 502 and `bd` ran twice

### REQ-REPORTS-008: Team report request
WHEN a client requests `GET /api/reports/team` with `project` (a configured project name) and optionally either `milestone` (a bead id) or `days` (7, 30 or 90), the server SHALL read every bead of the project from its `bd export` snapshot (REQ-BEADS-012) without starting a process, and SHALL return:
- `generated_at`;
- `today`, the server's local date;
- `milestones`: each milestone bead (`issue_type` `milestone`) whose `metadata.start` and `metadata.end` are ISO dates, with `id`, `title`, `status`, `start`, `end` and `closed_on`;
- `undated`: the number of milestone beads left out because they lack those dates;
- `milestone`: the selected id, or `null` when `milestones` is empty or `days` is given;
- `period_days`: the period, or `null` (`days` stays the working-day rows of REQ-REPORTS-011);
- for the selected milestone or the period, the sections of REQ-REPORTS-009 to REQ-REPORTS-011;
- `trend` and `unassigned` (REQ-REPORTS-035).

A milestone's `status` SHALL follow gin-workflow:
- `closed` when the bead is closed;
- else `active` when `metadata.kickoff` is on or before `today`;
- `scheduled` when the kickoff is after `today`;
- `planned` without a kickoff.

`closed_on` SHALL be the date of `closed_at`, or `null` while the milestone is open.

Without `days`, the server SHALL select `milestone` when it names a listed milestone, and otherwise the first match of:
1. the `active` milestone with the earliest `start`;
2. the open milestone whose `start` to `end` holds `today`;
3. the open milestone with the earliest `start` after `today`;
4. the closed milestone with the latest `end`.

The server SHALL serve the same answer for the same `project` and scope for 60 seconds unless `POST /api/refresh` dropped it. It SHALL respond 404 when `project` is not configured, and 422 when `milestone` holds a character outside letters, digits, `.`, `_` and `-`, when `days` is another value, or when both are given.
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

#### Scenario: period
- GIVEN the same project
- WHEN a client requests `/api/reports/team?project=alpha&days=30`
- THEN `milestone` is `null`, `period_days` is 30, `milestones` still holds `m1`, `m2` and `m3`, and the sections describe the last 30 days

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
- WHEN a client requests `project=nope`, `project=alpha&milestone=a b`, `project=alpha&days=14` and `project=alpha&milestone=m1&days=7`
- THEN the responses are 404, 422, 422 and 422

#### Scenario: unreadable snapshot
- GIVEN the snapshot of `alpha` cannot be read as in REQ-BEADS-005
- WHEN a client requests the team report twice
- THEN both responses are 502 with an `error` and the failure is not cached

### REQ-REPORTS-009: Team scope and bead rows
The scope of a milestone SHALL be every bead that is not a milestone, whose chain of parents (itself included) holds an epic whose parent is the milestone, that is not a prep task (REQ-BEADS-002) or a merge gate (REQ-BEADS-019), and that is either not an epic or an epic that has no track, a track being a child that is neither a prep task nor a merge gate. The scope of a period of `days` days SHALL be every bead that is not a milestone, a prep task or a merge gate, that is either not an epic or an epic that has no track, and that either was closed in the last `days` days or has status `in_progress`.

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
- `late_days`: for a closed bead of a milestone, the working days (Monday to Friday) after the milestone's `end` up to the date of `closed_at`, 0 when it closed on or before `end`; otherwise, and for a period, `null`;
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

#### Scenario: period scope
- GIVEN a task closed 10 days ago, a task closed 40 days ago, an in-progress task, an open task and a milestone bead
- WHEN the team report for 30 days is built
- THEN `beads` holds the task closed 10 days ago and the in-progress task, and the closed one has `late_days` `null`

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
- `on_time`: the share of closed beads with `late_days` 0, or `null` when none is closed or the scope is a period;
- `rework_rate`: the share of closed beads whose `rework` (REQ-REPORTS-019) is above 0, or `null` when none is closed;
- `reopens` and `bugs` (REQ-REPORTS-019), summed over the closed beads;
- `points_delivered` and `accuracy` (REQ-REPORTS-034).

`team` SHALL also hold, for a milestone, and `null` for a period, except `late_open`, which is 0 for a period:
- `working_days`: the working days from `start` to `end`;
- `elapsed`: the working days from `start` to the earlier of `today` and `end`, or 0 before `start`;
- `days_left`: the working days after `today` up to `end`, or all working days before `start`;
- `pace`: `throughput` ÷ 5 (also for a period);
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

#### Scenario: period
- GIVEN the team report for 30 days with 12 closed beads, 4 of them in the last 5 working days
- WHEN it is built
- THEN `team.throughput` is 4, `pace` 0.8, `on_time`, `working_days`, `elapsed`, `days_left` and `pace_needed` are `null`, and `late_open` is 0

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
The Team section of the Reports page (`/reports/team`) SHALL request REQ-REPORTS-008 with the scope of REQ-REPORTS-033, and SHALL show:
- A Member select with "All members (<n>)" and each row of `members` as "<member> (<scope>)".
- A "Clear member" control while a member is selected.
- For a milestone, a link "Open Gantt" to the milestone page.
- The scope line:
  - for a milestone, the title; the milestone status of REQ-MILESTONE-UI-022 as its glyph and word (REQ-UI-064): Active, Scheduled or Planned, followed by ", late" with a warning mark when the milestone is late (REQ-MILESTONE-UI-023, its forecast `finish` taken from the Milestones list of REQ-UI-095), or "Closed, on time" or "Closed, <n> d late", where `<n>` is the working days from `end` to `closed_on`; "<start> – <end>" (REQ-UI-131); and "working day <elapsed> of <working_days>, <days_left> left" while the period holds `today`, "starts in <n> working days" before `start`, or "finished <closed_on>" once closed;
  - for a period, "Last <days> days, <today − days> – <today>".
- WHEN `undated` is above 0, the note "<undated> milestones without start and end dates are not listed".

Its Member select SHALL be no wider than the panel, a long option cut short. It SHALL keep the member and bead status in the URL query (`member`, `status`). It SHALL select All members when `member` is not one of `members`.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-active.png`

#### Scenario: shared link
- GIVEN the URL `/reports/team?project=alpha&milestone=m1&member=ann&status=closed`
- WHEN the page loads
- THEN milestone `m1`, member `ann` and the Closed list are shown

#### Scenario: late active milestone
- GIVEN active milestone `m2` whose forecast `finish` in the Milestones list is after its `end`
- WHEN the Team section is shown
- THEN its status reads "Active, late" with a warning mark

#### Scenario: period
- GIVEN `/reports/team?project=alpha&days=30` on 23 Nov
- WHEN the Team section is shown
- THEN the scope line reads "Last 30 days, 24 Oct – 23 Nov" and no "Open Gantt" link is shown

#### Scenario: long options on a phone
- GIVEN a milestone titled with 120 characters and a member `nguyen.thi.thanh.huong.payments-team@example-company.com.vn`
- WHEN the Team section is shown at 390px
- THEN the scope select and the Member select fit inside the window and the page does not scroll sideways

### REQ-REPORTS-013: Team figures
The Team section SHALL show a row of figures, in this order, from `team`, or from the selected member's row:
- Done: "<closed> of <scope>" and "<done> of scope" ("of assigned" for a member).
- Points delivered: "<points_delivered> points".
- In progress: the count and "oldest <n> d", in the warning color above 3 days, or "nothing started".
- Open: the count, and "<blocked> blocked, <unclaimed> unassigned" ("<blocked> blocked" for a member). This line is in the warning color when `blocked` is above 0.
- Pace or Throughput:
  - For the team, while `pace_needed` is not `null`: Pace, "<pace> done per day" and "needs <pace_needed> done per day to finish by <end>". Both are in the warning color when `pace_needed` is above `pace`.
  - Otherwise: Throughput, "<throughput> done per week".
- Median cycle: "<n> d" or "—".
- On time: the percentage, in the warning color below 100%, or "—" when it is `null`. Under it: "<late_open> open after the end date" in the warning color when `late_open` is above 0, else "closed by <end>" for a milestone.
- Estimate accuracy: the value to two decimals with "faster than planned" above 1, "as planned" at 1 and "slower than planned" in the warning color below 1, or "—" with "needs a kickoff and a closed epic with points" when it is `null`.
- Rework: the percentage or "—", and "<reopens> reopens, <bugs> bugs later".

Each figure SHALL carry a tooltip (REQ-UI-132) with the rule it counts by. Under the figures, "Scope by status" SHALL draw the scope as the strand of REQ-UI-138, its Ready being Open without blocked, with a legend giving each state's glyph, word and count.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-active.png`

#### Scenario: behind pace
- GIVEN a team report with `pace` 3.6 and `pace_needed` 4.1 for a milestone ending 27 Nov
- WHEN the Team section is shown
- THEN Pace reads "3.6 done per day" and "needs 4.1 done per day to finish by 27 Nov", both in the warning color

#### Scenario: member figures
- GIVEN member `ann` with scope 11, closed 6 and 1 blocked bead
- WHEN the user selects `ann`
- THEN the figures read "6 / 11", "55% of assigned", "1 blocked", and Throughput instead of Pace

#### Scenario: closed milestone
- GIVEN a closed milestone with `throughput` 13.2 and `on_time` 0.88
- WHEN the Team section is shown
- THEN the figures show Throughput "13.2 done per week" and On time "88%" in the warning color

#### Scenario: open after the end date
- GIVEN an open milestone that ended yesterday with `late_open` 4
- WHEN the Team section is shown
- THEN On time reads "4 open after the end date" in the warning color

#### Scenario: points and accuracy
- GIVEN a team report with `team.points_delivered` 13 and `team.accuracy` 1.08
- WHEN the Team section is shown
- THEN Points delivered reads "13 points" and Estimate accuracy reads "1.08" and "faster than planned"

#### Scenario: period
- GIVEN the team report for 30 days
- WHEN the Team section is shown
- THEN it shows Throughput, On time "—" and Estimate accuracy "—"

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
The Team section SHALL show a table with one row per entry of `members`, in their order. The columns are:
- member;
- assigned (`scope`), closed and in progress;
- open, with "(<n> blocked)" when `blocked` is above 0;
- a done meter with closed and in-progress segments and the `done` percentage;
- points (`points_delivered`);
- per week (`throughput`);
- median cycle;
- oldest in progress, in the warning color above 3 days;
- on time;
- accuracy, "—" when it is `null`;
- rework, "—" for Unassigned.

Pressing a row, or Enter or Space on a focused row, SHALL select that member. Doing so on the selected member's row SHALL select All members. The selected row SHALL be highlighted and marked `aria-selected`.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-member.png`

#### Scenario: filter from the table
- GIVEN the Team section with All members
- WHEN the user presses `ann`'s row
- THEN the Member select shows `ann`, the URL holds `member=ann` and the figures and list show `ann`'s beads

#### Scenario: clear from the table
- GIVEN member `ann` is selected
- WHEN the user presses `ann`'s row again
- THEN All members is selected

#### Scenario: points and accuracy columns
- GIVEN `ann` with `points_delivered` 6 and `accuracy` 0.9, and `bao` with `points_delivered` 2 and `accuracy` `null`
- WHEN the table is shown
- THEN `ann`'s row reads 6 and 0.90, `bao`'s reads 2 and "—", and the rows keep the order of `members`

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
The Team section SHALL handle these states:
- WHILE the team report loads, it SHALL show a loading state.
- IF the request fails, THEN it SHALL show the error with a Retry button.
- It SHALL NOT show a late answer for a project or scope that is no longer selected.
- WHEN `milestones` is empty, it SHALL show the period that REQ-REPORTS-033 selects.
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: no milestones
- GIVEN the team report of `beta` has no milestones
- WHEN the Team section is shown
- THEN it shows the last 30 days

#### Scenario: failure
- GIVEN `/api/reports/team` answers 502
- WHEN the user presses Retry and the next answer is 200
- THEN the Team section shows the report

#### Scenario: late answer
- GIVEN the team report for `m2` is loading and the user picks `m1`
- WHEN the answer for `m2` arrives
- THEN the page does not show it

## Diagrams
- [Team tab](diagrams/team-tab-activity.md)
- [Velocity tab](diagrams/velocity-tab-activity.md)
- [Rework](diagrams/rework-activity.md)
- [Status section](diagrams/status-section-activity.md)
- [Status verdict](diagrams/status-verdict-state.md)
- [Bugs section](diagrams/bugs-section-activity.md)

## Use Cases
- [Review the team in a milestone](use-cases/review-team-in-milestone.md)
- [Review velocity](use-cases/review-velocity.md)
- [Review rework](use-cases/review-rework.md)
- [Review the status of a milestone](use-cases/review-milestone-status.md)
- [See where bugs come from](use-cases/see-where-bugs-come-from.md)

### REQ-REPORTS-018: Velocity tab
WHEN the Velocity section (`/reports/velocity`) is shown, the frontend SHALL request `GET /api/milestones?project=<p>` (REQ-MILESTONE-UI-008) for the selected project, unless REQ-UI-095 has already loaded it, and SHALL show:
- a row of figures: the project's `days_per_point.value` to one decimal as "<x> days per point", with "assumed" when `days_per_point.assumed` is true and "—" when `days_per_point` is `null` or missing; and the commitment met (say/do, whole percent) and accuracy (two decimals) of the milestone with the latest `start` among those whose `velocity.say_do` is not `null`, or "—";
- for the milestones whose `velocity` has a `committed_points` that is not `null` or a `completed_points` above 0, oldest `start` first:
  - a column chart of `committed_points` and `completed_points` per milestone;
  - a line chart of `days_per_point` and `planned_days_per_point` per milestone, leaving out `null` points;
  - a table with committed, completed and added points, commitment met, days per point, planned days per point and accuracy, "—" for `null`;
  - the milestone of the scope (REQ-REPORTS-033), when it is one of them, marked in both charts and highlighted in the table with `aria-current="true"`;
- "No kicked-off milestones with points yet" when no milestone qualifies;
- the error and cause of the request when it failed (REQ-MILESTONE-UI-005).
The section SHALL hold no choice besides the scope of REQ-REPORTS-033, SHALL show nothing per member, and the Reports backend SHALL NOT run `gin` for it.

#### Scenario: Milestones with velocity
- GIVEN project `alpha` whose milestones list has `days_per_point` `{value: 1.4, measured_epics: 6, assumed: false}`, closed `m1` (start 1 Oct) with `velocity` `{committed_points: 10, completed_points: 8, added_points: 0, say_do: 0.8, days_per_point: 1.5, planned_days_per_point: 1.2, accuracy: 0.8}`, active `m2` (start 3 Nov) with `{committed_points: 13, completed_points: 5, added_points: 2, say_do: 0.38, days_per_point: 1.3, planned_days_per_point: 1.4, accuracy: 1.08}`, and planned `m3` with `{committed_points: null, completed_points: 0, …}`
- WHEN the user opens `/reports/velocity?project=alpha&milestone=m2`
- THEN the figures read "1.4 days per point", "38%" and "1.08", the charts and the table hold `m1` then `m2`, `m2` is marked, and `m3` is not shown

#### Scenario: Period scope
- GIVEN the same project
- WHEN the user opens `/reports/velocity?project=alpha&days=30`
- THEN the charts and the table hold `m1` then `m2` and no milestone is marked

#### Scenario: Assumed days per point
- GIVEN project `alpha` whose `days_per_point` is `{value: 1.0, measured_epics: 0, assumed: true}`
- WHEN the Velocity section is shown
- THEN the figure reads "1.0 days per point" with "assumed"

#### Scenario: Nothing kicked off yet
- GIVEN project `alpha` whose milestones all have `committed_points: null` and `completed_points: 0`, or no `velocity` key
- WHEN the Velocity section is shown
- THEN it shows "No kicked-off milestones with points yet" and no chart

#### Scenario: Milestones request fails
- GIVEN project `alpha` whose `GET /api/milestones?project=alpha` answers 502 with `cause: "outdated"`
- WHEN the user opens `/reports/velocity?project=alpha`
- THEN the section shows the outdated error and no figures

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
- WHEN a report of `alpha` and a report of `beta` are built
- THEN both responses are 200, every bead of `alpha` has `reopens` 0, and `b-1` has `reopens` 1

#### Scenario: Read again only on change
- GIVEN the log of `alpha` was read for a report and has not changed since
- WHEN another report of `alpha` is built, and then a reopen line is appended and a report is built again
- THEN the second build does not read the log, and the third reads it and counts the new reopen

### REQ-REPORTS-020: Status report request
WHEN a client requests `GET /api/reports/status` with `project` (a configured project name) and either `milestone` (a bead id) or `days` (7, 30 or 90), the server SHALL read every bead of the project from its `bd export` snapshot (REQ-BEADS-012) and the reopens of REQ-REPORTS-019 without starting a process, and SHALL return `generated_at`, `today`, `milestones`, `undated` and `milestone` as REQ-REPORTS-008 lists and selects them (the default milestone when neither `milestone` nor `days` is given), `days` (the period, or `null`), and:
- for a milestone: `period` with `kickoff` (the date of the milestone's `metadata.kickoff`, or `null`) and the `working_days`, `elapsed` and `days_left` of REQ-REPORTS-010; `kpis` (REQ-REPORTS-023); `burnup` (REQ-REPORTS-022); `changes` (REQ-REPORTS-024); `risks` (REQ-REPORTS-025); and `epics` (REQ-REPORTS-026);
- for a period: `milestone` `null`, `period` `null`, the `kpis` of a period of REQ-REPORTS-023, and `burnup`, `changes`, `risks` and `epics` empty.

The server SHALL serve the same answer for the same `project` and scope for 60 seconds unless `POST /api/refresh` dropped it. It SHALL respond 404 when `project` is not configured, 422 when `days` is another value, when `milestone` holds a character outside letters, digits, `.`, `_` and `-`, or when both are given, and IF the snapshot cannot be read as in REQ-BEADS-005, THEN SHALL respond 502 with an `error` and SHALL NOT keep the failure in the cache.
Source: `../ui/assets/2026-11-22/index.html#reports`, `../ui/assets/2026-11-22/reports-light.png`

#### Scenario: Default milestone
- GIVEN project `alpha` with closed milestone `m1`, active milestone `m2` and planned milestone `m3`
- WHEN a client requests `/api/reports/status?project=alpha`
- THEN `milestone` is `m2`, `days` is `null`, and `kpis`, `burnup`, `changes`, `risks` and `epics` describe `m2`

#### Scenario: Period
- GIVEN project `alpha` with 5 non-milestone beads closed in the last 30 days, one of them reopened once
- WHEN a client requests `/api/reports/status?project=alpha&days=30`
- THEN `milestone` and `period` are `null`, `kpis.beads.done` is 5, `kpis.rework.rate` is 0.2, and `burnup`, `changes`, `risks` and `epics` are empty

#### Scenario: No process and cache
- GIVEN the status report for `alpha` and `m2` was answered 20 seconds ago
- WHEN a client requests it again
- THEN no `gin` or `bd` process starts and the same `generated_at` is returned

#### Scenario: Bad input
- GIVEN no project `nope`
- WHEN a client requests `project=nope`, `project=alpha&days=14`, `project=alpha&milestone=a b` and `project=alpha&milestone=m2&days=7`
- THEN the responses are 404, 422, 422 and 422

#### Scenario: Unreadable snapshot
- GIVEN the snapshot of `alpha` cannot be read as in REQ-BEADS-005
- WHEN a client requests the status report twice
- THEN both responses are 502 with an `error` and the failure is not cached

### REQ-REPORTS-021: Milestone history of an epic
Type: business-rule
The server SHALL decide, for an epic and a day, from the local date of each entry's `at`:
- **Membership:** the epic belongs to the milestone named by `to` of the last entry of its `metadata.milestone_moves` dated on or before the day. WHEN no entry is dated on or before the day, it belongs, from the date of its `created_at`, to the `from` of its first entry, or to no milestone when that `from` is `null`. WHEN it has no entry, it belongs to its current parent milestone from the date of its `created_at`.
- **Points:** the epic's points are `to` of the last entry of its `metadata.points_history` dated on or before the day. WHEN it has entries but none dated on or before the day, it has no points. WHEN it has no entry, it has its current `metadata.points` from the date of its `created_at`.

A history that is not a list of objects with an ISO `at`, or an entry of another shape, SHALL count as no entry and SHALL NOT fail the report. Points that are not one of 1, 2, 3, 5, 8, 13 and 21 SHALL count as no points.

#### Scenario: Moved in after kickoff
- GIVEN epic `e-4` created on 2 Nov under no milestone, with `milestone_moves` `[{from: null, to: m2, at: 2026-11-18T09:00:00Z}]`
- WHEN its membership on 17 Nov and on 18 Nov is decided
- THEN it belongs to no milestone on 17 Nov and to `m2` on 18 Nov

#### Scenario: Moved out
- GIVEN epic `e-5` with `milestone_moves` `[{from: m2, to: m3, at: 2026-11-20T10:00:00Z}]`, created on 1 Nov
- WHEN its membership on 19 Nov and on 20 Nov is decided
- THEN it belongs to `m2` on 19 Nov and to `m3` on 20 Nov

#### Scenario: Re-estimated
- GIVEN epic `e-2` with `points_history` `[{from: null, to: 5, at: 2026-11-10T08:00:00Z}, {from: 5, to: 8, at: 2026-11-16T08:00:00Z}]`
- WHEN its points on 9, 12 and 16 Nov are decided
- THEN they are none, 5 and 8

#### Scenario: No history
- GIVEN epic `e-6` under `m2`, created on 3 Nov with `metadata.points` 3 and no `milestone_moves` or `points_history`
- WHEN its membership and points on 4 Nov are decided
- THEN it belongs to `m2` with 3 points

#### Scenario: Broken history
- GIVEN epic `e-7` under `m2` with `metadata.points` 5, whose `points_history` is the text `oops` and whose `milestone_moves` holds an entry without `at`
- WHEN the status report is built
- THEN the response is 200 and `e-7` belongs to `m2` with 5 points since its `created_at`

### REQ-REPORTS-022: Burn-up
Type: business-rule
For a milestone, the status report SHALL hold `burnup`: one entry per working day (Monday to Friday) from its first day, the date of `kickoff` or else its `start`, up to `today`, or up to `closed_on` for a closed milestone, each with:
- `day`;
- `scope_points`: the points (REQ-REPORTS-021) on that day of the epics that belong to the milestone on that day;
- `done_points`: for the same epics, the sum of points × done share, where the done share is 1 when the epic's `closed_at` is on or before the day, else its tracks closed on or before the day ÷ its tracks created on or before the day, and 0 when it has no track then.

A track SHALL be a child of the epic that is neither a prep task (REQ-BEADS-002) nor a merge gate (REQ-BEADS-019). Both values SHALL be rounded to one decimal. `burnup` SHALL be empty while `today` is before the first day.

#### Scenario: Splitting does not move the scope
- GIVEN epic `e-1` of `m2` with 8 points, split on 12 Nov into 4 tracks
- WHEN the burn-up is built
- THEN `scope_points` is the same on 11 and 12 Nov

#### Scenario: Half the tracks closed
- GIVEN epic `e-1` of 8 points with 4 tracks, 2 of them closed by 13 Nov
- WHEN the burn-up is built
- THEN `e-1` adds 4 to `done_points` on 13 Nov, and 8 once `e-1` is closed

#### Scenario: Re-estimate raises the scope
- GIVEN epic `e-2` of `m2` re-estimated from 5 to 8 points on 16 Nov
- WHEN the burn-up is built
- THEN `scope_points` rises by 3 from 16 Nov

#### Scenario: Closed milestone
- GIVEN milestone `m1` kicked off on Monday 5 Oct and closed on Tuesday 3 Nov
- WHEN its burn-up is built on 23 Nov
- THEN its last entry is 3 Nov

#### Scenario: Before the first day
- GIVEN milestone `m3` starting on 18 Dec without a kickoff, on 23 Nov
- WHEN its burn-up is built
- THEN `burnup` is empty

### REQ-REPORTS-023: Status KPIs
Type: business-rule
For a milestone, the status report SHALL hold `kpis`, where the week-ago day is `today` minus 7 days and the scope is that of REQ-REPORTS-009:
- `beads`: `done` and `scope`, the closed scope beads and all scope beads; `done_week_ago` and `scope_week_ago`, the scope beads closed on or before the week-ago day and those created on or before it;
- `points`: `done` and `scope` from the last burn-up entry, `at_kickoff` from the first, and `done_week_ago` from the last entry on or before the week-ago day;
- `pace`: the `pace` and `pace_needed` of REQ-REPORTS-010, and `pace_week_ago`, the scope beads closed in the 5 working days up to the week-ago day ÷ 5;
- `blocked`: `count`, the scope beads that are not closed and are blocked (REQ-BEADS-021), and `oldest_days`, the longest wait among them, or `null`;
- `rework`: `rate`, the `rework_rate` of REQ-REPORTS-010, and `rate_week_ago`, the share of the scope beads closed on or before the week-ago day whose reopens logged on or before it plus bugs created on or before it (REQ-REPORTS-019) are above 0, or `null` when none was closed then.

A blocked bead's wait SHALL be the working days after the date of the earliest `created_at` of its `blocks` dependencies on open beads, or of its nearest blocked ancestor's when it has none, else after the date of its `updated_at`, up to `today`. Each value named `*_week_ago` SHALL be `null` WHEN the week-ago day is before the milestone's first day (REQ-REPORTS-022).

For a period, `kpis` SHALL hold `beads.done`, the beads REQ-REPORTS-001 selects for that period; `rework.rate`, its `totals.rework_rate`; `blocked.count`, the project's non-milestone beads that are not closed and are blocked, leaving out prep tasks and merge gates; and `null` for every other value.

#### Scenario: Change since last week
- GIVEN milestone `m2` kicked off on 2 Nov, on 23 Nov, with 35 scope beads of which 13 are closed, 7 of them closed by 16 Nov, and 32 scope beads created by 16 Nov
- WHEN the status report is built
- THEN `kpis.beads` is `{done: 13, scope: 35, done_week_ago: 7, scope_week_ago: 32}`

#### Scenario: Points since kickoff
- GIVEN a burn-up whose first entry has `scope_points` 24 and whose last has `scope_points` 27 and `done_points` 9.5
- WHEN the status report is built
- THEN `kpis.points` has `done` 9.5, `scope` 27 and `at_kickoff` 24

#### Scenario: Oldest wait
- GIVEN scope bead `t-3` blocked by open bead `t-9` through a dependency created 4 working days ago, and scope bead `t-4` with status `blocked` and no blocker, updated 2 working days ago
- WHEN the status report is built
- THEN `kpis.blocked` is `{count: 2, oldest_days: 4}`

#### Scenario: Rework a week ago
- GIVEN 10 scope beads closed by the week-ago day, one reopened before it and one reopened after it
- WHEN the status report is built
- THEN `kpis.rework.rate_week_ago` is 0.1

#### Scenario: Kicked off this week
- GIVEN milestone `m4` kicked off 3 days ago
- WHEN the status report is built
- THEN every value named `*_week_ago` is `null`

### REQ-REPORTS-024: Changes since kickoff
For a milestone, the status report SHALL hold `changes` with `scope_from` and `scope_to`, the `scope_points` of the first and the last burn-up entry, and `items`, newest `day` first and then by `id`, for the days after the milestone's first day (REQ-REPORTS-022), each with `day`, `kind`, `id` and `title`:
- `epic_added`, with `points` on that day: an epic that belongs to the milestone on that day and did not on the day before (REQ-REPORTS-021), an epic created under it included;
- `epic_removed`, with `points` on the day before: an epic that belonged to the milestone the day before and does not on that day;
- `estimated`, with `to`: an entry of the `points_history` of an epic that belongs to the milestone on that day, whose `from` is `null`;
- `re_estimated`, with `from` and `to`: such an entry whose `from` is a number other than `to`;
- `bug_added`, with `epic` (`id` and `title` of its nearest epic) and `person` (REQ-BEADS-023, or `Unassigned`): a scope bead of type `bug` created on that day.

A track created after the first day SHALL NOT be an item. `items` SHALL be empty while `today` is on or before the first day.
Source: `../ui/assets/2026-11-22/index.html#reports`

#### Scenario: Scope changes listed
- GIVEN milestone `m2` kicked off on 11 Nov, epic `e-4` moved in on 18 Nov with 3 points, epic `e-2` re-estimated from 5 to 8 on 16 Nov, and bug `b-1` created on 18 Nov under track `t-7` of `e-2`, assigned to `chi`
- WHEN the status report is built
- THEN `items` holds `b-1` (`bug_added`, epic `e-2`, person `chi`) and `e-4` (`epic_added`, 3 points), both on 18 Nov, then `e-2` (`re_estimated`, 5 to 8) on 16 Nov

#### Scenario: Split is not a change
- GIVEN epic `e-1` of `m2` split into 4 tracks on 12 Nov, after the kickoff
- WHEN the status report is built
- THEN no item names `e-1` or its tracks

#### Scenario: Moved out
- GIVEN epic `e-5` of 5 points moved from `m2` to `m3` on 20 Nov
- WHEN the status report of `m2` is built
- THEN `items` holds `e-5` as `epic_removed` with 5 points on 20 Nov

### REQ-REPORTS-025: Status risks
For a milestone, the status report SHALL hold `risks` with:
- `blocked`: the first 5 blocked scope beads (REQ-REPORTS-023), longest wait first and then by `id`, each with `id`, `title`, `days` (its wait) and `blocker`: the first by `id` of the open beads it waits on through a `blocks` dependency, else of those its nearest blocked ancestor waits on, with `id`, `title`, `person` (REQ-BEADS-023 of its `assignee`, or `Unassigned`) and `blocked` (whether the blocker is blocked too, REQ-BEADS-021), or `null` when the bead is blocked by its status only;
- `blocked_more`: the number of blocked scope beads left out;
- `unestimated`: the open epics that belong to the milestone today without points (REQ-REPORTS-021), by `id`, with `id` and `title`.
Source: `../ui/assets/2026-11-22/index.html#reports`

#### Scenario: Blocked chain
- GIVEN scope bead `t-3` "End-to-end checkout QA" waiting 4 days on open bead `t-8` "Mobile layout", assigned to `bao@example.com`, which itself waits on `t-9`
- WHEN the status report is built
- THEN `risks.blocked` holds `t-3` with `days` 4 and blocker `t-8`, person `bao`, `blocked` true

#### Scenario: Blocked by status only
- GIVEN scope bead `t-4` with status `blocked` and no open blocker
- WHEN the status report is built
- THEN its row has `blocker` `null`

#### Scenario: More than five
- GIVEN 7 blocked scope beads
- WHEN the status report is built
- THEN `risks.blocked` holds the 5 that waited longest and `blocked_more` is 2

#### Scenario: Unestimated epics
- GIVEN open epics `e-5` and `e-7` of `m2` without points, and closed epic `e-3` without points
- WHEN the status report is built
- THEN `risks.unestimated` holds `e-5` and `e-7`

### REQ-REPORTS-026: Status epic rows
For a milestone, the status report SHALL hold `epics`: one row per epic that belongs to the milestone today (REQ-REPORTS-021), by `id`, with `id`, `title`, `status`, `points` (or `null`), `person` (REQ-BEADS-023 of its `assignee`, or `Unassigned`), `closed_on` (the date of `closed_at`, or `null` while open) and the `child_counts` of REQ-BEADS-022.

#### Scenario: Epic rows
- GIVEN milestone `m2` with open epic `e-1` of 8 points assigned to `lead@example.com`, with 4 tracks of which 2 are closed, and closed epic `e-3` without an assignee, closed on 20 Nov
- WHEN the status report is built
- THEN `epics` holds `e-1` (8 points, person `lead`, `child_counts.closed` 2 of `total` 4) and `e-3` (person `Unassigned`, `closed_on` 20 Nov)

### REQ-REPORTS-027: Status verdict
Type: business-rule
The frontend SHALL give a milestone's status report the first verdict that applies:
1. "Finished on time", or "Finished <n> d late" with `<n>` the working days from `end` to `closed_on`, for a closed milestone;
2. "Not started" while `today` is before `start`;
3. "Late" when the milestone is late by REQ-MILESTONE-UI-023, with the forecast `finish` of the Milestones list (REQ-MILESTONE-UI-008) once it has loaded;
4. "At risk" when beads are open (`kpis.beads.scope` minus `kpis.beads.done` above 0) and the pace finish is after `end` or `kpis.pace.pace` is 0, or when `kpis.blocked.count` is above 0, or when `risks.unestimated` is not empty;
5. "On track" otherwise.

The pace finish SHALL be `today` plus the open beads ÷ `kpis.pace.pace`, rounded up, in working days. The verdict SHALL carry a sentence:
- open beads and a pace above 0: "At today's pace the <open> open beads close around <pace finish>, <n> working days after the end.", with "before the end" or "on the end date" when it is not after it;
- open beads and a pace of 0: "No bead closed in the last 5 working days; <open> beads are open.";
- no open bead and an open milestone: "All <scope> beads are done.";
- then, once the forecast `finish` is known, " The epic estimates finish on <finish>.", and "; <k> epics are not split into tasks yet." in place of the final period when `<k>`, the open epic rows without a track, is above 0;
- for "Not started": "Starts on <start>, with <points> points planned.";
- for a closed milestone: "Closed on <closed_on>." followed by "<n> working days after the end." when it closed late.
Source: `../ui/assets/2026-11-22/index.html#reports`

#### Scenario: Late by the forecast
- GIVEN active milestone `m2` ending 2 Dec, on 23 Nov, with no blocked bead, whose forecast `finish` is 17 Feb 2027
- WHEN the verdict is made
- THEN it reads "Late"

#### Scenario: At risk with both dates
- GIVEN active milestone `m2` ending on Wednesday 2 Dec, on Monday 23 Nov, with 20 open beads, `pace` 2.0, one blocked bead, and a forecast `finish` of 30 Nov, with 4 open epics without tracks
- WHEN the verdict is made
- THEN it reads "At risk" and "At today's pace the 20 open beads close around 7 Dec, 3 working days after the end. The epic estimates finish on 30 Nov; 4 epics are not split into tasks yet."

#### Scenario: On track
- GIVEN active milestone `m2` ending 11 Dec, on 23 Nov, with 10 open beads, `pace` 2.0, no blocked bead, no unestimated epic and a forecast `finish` of 4 Dec
- WHEN the verdict is made
- THEN it reads "On track" and the sentence says the beads close around 30 Nov, 9 working days before the end

#### Scenario: Nothing closed lately
- GIVEN active milestone `m2`, not late, with 12 open beads and `pace` 0
- WHEN the verdict is made
- THEN it reads "At risk" and "No bead closed in the last 5 working days; 12 beads are open."

#### Scenario: Not started and finished
- GIVEN planned milestone `m3` starting 18 Dec with 13 points, and milestone `m1` ending Friday 30 Oct, closed on Tuesday 3 Nov
- WHEN their verdicts are made on 23 Nov
- THEN `m3` reads "Not started" and "Starts on 18 Dec, with 13 points planned.", and `m1` reads "Finished 2 d late" and "Closed on 3 Nov, 2 working days after the end."

#### Scenario: Forecast not loaded
- GIVEN active milestone `m2` ending 2 Dec, on 23 Nov, whose Milestones list request failed, with no blocked bead
- WHEN the verdict is made
- THEN it follows REQ-MILESTONE-UI-023 without the forecast and the sentence has no epic-estimate part

### REQ-REPORTS-028: Status section
WHEN `/reports/status` is shown for a milestone, the frontend SHALL request REQ-REPORTS-020 with that milestone and the milestone's detail (REQ-MILESTONE-UI-008), SHALL use the Milestones list that the page has loaded (REQ-UI-095), and SHALL show, in order:
- the milestone's title as the page heading, and "Milestone report, <start> – <end>." (REQ-UI-131) followed by "Working day <elapsed> of <working_days>.", "Starts in <n> working days." before `start`, or "Finished <closed_on>." once closed;
- the scope choice of REQ-REPORTS-033;
- the verdict panel: the verdict of REQ-REPORTS-027 after its state glyph (REQ-UI-064), the knot for "Late" and "Finished <n> d late", a dashed ring for "At risk", a full bead for "On track" and "Finished on time", a hollow ring for "Not started", in the warning colour for "At risk", "Late" and "Finished <n> d late" and on a warning wash for "At risk" and "Late", followed by its sentence;
- five figures, each with a tooltip (REQ-UI-132) giving its rule and scope:
  - Beads done: "<done> of <scope>", and "+<done − done_week_ago> this week";
  - Points done: "<done> of <scope>", and "+<scope − at_kickoff> added after kickoff" in the warning colour when it is above 0, else "scope unchanged since kickoff";
  - Pace: "<pace> a day", and "needs <pace_needed> to end on <end>" in the warning colour when `pace_needed` is above `pace`, or "<pace_week_ago> a day last week" when `pace_needed` is `null`;
  - Blocked: the count, and "oldest waiting <oldest_days> days", or "nothing blocked";
  - Rework: the rate, and "up from <rate_week_ago> last week" in the warning colour, "down from <rate_week_ago> last week", or "same as last week";

  leaving out a change line whose week-ago value is `null`;
- the burn-up of REQ-REPORTS-029, with the panels of REQ-REPORTS-030 beside it from the `lg` width and under it below;
- the epic table of REQ-REPORTS-031.

The figures SHALL sit 5 in a row from the `lg` width, 2 in a row below it and 1 in a row below 640px.
Source: `../ui/assets/2026-11-22/index.html#reports`, `../ui/assets/2026-11-22/reports-light.png`

#### Scenario: Active milestone
- GIVEN the status report of active milestone "Checkout v2" from 11 Nov to 2 Dec on working day 8 of 16, with verdict "At risk"
- WHEN `/reports/status?project=example&milestone=m2` is shown
- THEN the heading reads "Checkout v2", the line reads "Milestone report, 11 Nov – 2 Dec. Working day 8 of 16.", and the verdict panel shows the dashed ring and "At risk" in the warning colour on a warning wash

#### Scenario: Figures with their change
- GIVEN `kpis` with beads `{done: 13, scope: 35, done_week_ago: 7}`, points `{done: 0, scope: 27, at_kickoff: 24}`, pace `{pace: 2.0, pace_needed: 2.8}`, blocked `{count: 2, oldest_days: 4}` and rework `{rate: 0.31, rate_week_ago: 0.18}`, for a milestone ending 2 Dec
- WHEN the Status section is shown
- THEN the figures read "13 of 35" and "+6 this week", "0 of 27" and "+3 added after kickoff", "2.0 a day" and "needs 2.8 to end on 2 Dec", "2" and "oldest waiting 4 days", and "31%" and "up from 18% last week", the second, third and fifth change lines in the warning colour

#### Scenario: No change line before a week
- GIVEN `kpis` whose `*_week_ago` values are `null`
- WHEN the Status section is shown
- THEN no figure shows "this week" or "last week"

### REQ-REPORTS-029: Burn-up chart
The Status section SHALL draw `burnup` as a line chart titled "Burn-up" with the sentence "Points done against scope. The scope line steps up when work is added after kickoff." and:
- a Scope line from `scope_points` and a Done line from `done_points` over the working days;
- a dashed "Needed pace" line from 0 on the first day to the last `scope_points` on `end`;
- a dotted "Forecast" line from the last `done_points` on `today` to the last `scope_points` on the pace finish of REQ-REPORTS-027, left out when the pace finish is not known;
- a "Today" line in the identity colour, an "End <end>" line, and the days after `end` on a warning wash;
- a day axis from the first day to the latest of `end`, `today` and the pace finish, and a points axis from 0;
- a legend naming the four lines, and, on hover and on focus of a day, its date, scope and done points.

The chart SHALL carry the accessible name "Burn-up: <done> of <scope> points done; scope <scope_from> → <scope_to> points since kickoff".
Source: `../ui/assets/2026-11-22/index.html#reports`, `../ui/assets/2026-11-22/reports-light.png`

#### Scenario: Lines and markers
- GIVEN a burn-up of `m2` from 11 Nov to 23 Nov ending at 27 scope and 9.5 done points, `end` 2 Dec, and a pace finish of 7 Dec
- WHEN the chart is shown
- THEN it draws Scope, Done, Needed pace up to 27 on 2 Dec and Forecast up to 27 on 7 Dec, a Today line on 23 Nov, an End 2 Dec line, and a warning wash from 3 Dec to 7 Dec

#### Scenario: Day details
- GIVEN the chart of `m2`
- WHEN the user moves the pointer over 18 Nov, where the scope is 27 and the done points are 6
- THEN it shows "18 Nov", "Scope 27 points" and "Done 6 points"

### REQ-REPORTS-030: Changes and risks panels
The Status section SHALL show two panels:
- "Changed since kickoff", with "Scope <scope_from> → <scope_to> points" under its title and one line per item of `changes.items`, the first 8 and a "Show all <n>" button when there are more:
  - `epic_added`: "<title> added with <points> points", or "<title> added, not estimated";
  - `epic_removed`: "<title> moved out with <points> points";
  - `estimated`: "<title> estimated at <to> points";
  - `re_estimated`: "<title> re-estimated from <from> to <to> points";
  - `bug_added`: "Bug: <title>", with "Added <day> under <epic title>, <person>" under it;

  each other line with its `day` under it, and "No changes since kickoff" when `items` is empty;
- "Risks", with "What could move the finish date" under its title and, in this order:
  - one line per row of `risks.blocked`: "<title> waits on <blocker title>", with "<blocker title> is blocked too, <person>, <days> days" or "<person>, <days> days" under it, or "<title> is blocked" with "<days> days" when `blocker` is `null`, after the knot glyph;
  - "<blocked_more> more blocked beads" when `blocked_more` is above 0;
  - "<n> epics have no estimate", with the first 3 titles and "<m> more" under it, when `risks.unestimated` is not empty;
  - "<n> of <m> epics: spec not approved yet", with the first 3 titles under it, where `<n>` counts the open epics whose `spec_confirmed` is `false` in the milestone's detail and `<m>` the open epics of the detail, once the detail has loaded and `<n>` is above 0;
  - "No risks found" when there is none.

Every bead and epic title SHALL link to its bead page.
Source: `../ui/assets/2026-11-22/index.html#reports`, `../ui/assets/2026-11-22/reports-light.png`

#### Scenario: Changes
- GIVEN `changes` with `scope_from` 24, `scope_to` 27 and the items, newest first: `bug_added` "total shows NaN for empty cart" on 18 Nov under epic "Payment page", person `chi`; `epic_added` "Gift cards" with 3 points on 18 Nov; and `re_estimated` "Payment page" from 5 to 8 on 16 Nov
- WHEN the Status section is shown
- THEN the panel reads "Scope 24 → 27 points", then "Bug: total shows NaN for empty cart" with "Added 18 Nov under Payment page, chi", "Gift cards added with 3 points", and "Payment page re-estimated from 5 to 8 points" with "16 Nov"

#### Scenario: Risks
- GIVEN `risks.blocked` with the row of REQ-REPORTS-025 "Blocked chain", `risks.unestimated` with 4 epics, and a detail where 8 of 8 open epics have `spec_confirmed` `false`
- WHEN the Status section is shown
- THEN Risks reads "End-to-end checkout QA waits on Mobile layout" with "Mobile layout is blocked too, bao, 4 days", "4 epics have no estimate" with 3 titles and "1 more", and "8 of 8 epics: spec not approved yet"

#### Scenario: Nothing to show
- GIVEN empty `changes.items`, empty `risks` and a detail in which every open epic has `spec_confirmed` `true`
- WHEN the Status section is shown
- THEN the panels read "No changes since kickoff" and "No risks found"

### REQ-REPORTS-031: Status epic table
The Status section SHALL show a table titled "Epics" with one row per entry of `epics` and the columns:
- Epic: the title, linking to the epic's bead page, cut short to one line with the full title as its `title`;
- Verdict: for a closed epic, the full glyph and "Done"; for an open epic, the verdict of its row in the milestone's detail (REQ-MILESTONE-UI-024) with its tooltip, or nothing when it has no warning;
- Progress: the strand of REQ-UI-138 from `child_counts`, or "Not split yet" when the epic has no track;
- Planned: "<planned_start> – <planned_end>" (REQ-UI-131) of its row in the detail;
- Forecast: `closed_on` for a closed epic; else the `planned_end` of its entry in the Milestones list's `forecast.epics` (REQ-MILESTONE-UI-008), followed by "?" when its `estimate_source` is `assumed`;
- Owner: `person`.

A value the detail or the Milestones list does not give SHALL read "—". The rows SHALL be ordered by `planned_start`, then by `id`, with the epics missing from the detail last. Below the `md` width the table SHALL scroll sideways inside its panel, and the page SHALL NOT.
Source: `../ui/assets/2026-11-22/index.html#reports`, `../ui/assets/2026-11-22/reports-light.png`

#### Scenario: Open and closed epics
- GIVEN epic `e-1` "Team checkout", open, planned 11 Nov to 20 Nov in the detail with the warning `late`, at 25 Nov in `forecast.epics`, person `lead`, and epic `e-3`, closed on 20 Nov
- WHEN the table is shown
- THEN `e-1` reads "Team checkout", the knot and its late verdict, its strand, "11 Nov – 20 Nov", "25 Nov" and "lead", and `e-3` reads "Done" and "20 Nov" as its forecast

#### Scenario: Not split and assumed
- GIVEN open epic `e-5` without tracks, without an assignee, whose `forecast.epics` entry ends 1 Jan 2027 with `estimate_source` `assumed`
- WHEN the table is shown
- THEN its row reads "Not split yet", "1 Jan 2027?" and "Unassigned"

#### Scenario: Detail failed
- GIVEN the milestone's detail answered 502
- WHEN the table is shown
- THEN every open epic reads "—" for Verdict, Planned and Forecast, and rows are ordered by `id`

### REQ-REPORTS-032: Status states
The Status section SHALL:
- show a loading state while the status report loads, the error with a Retry button IF it fails (REQ-UI-093), and no late answer for a scope that is no longer selected;
- WHILE the milestone's detail or the Milestones list is loading or after it failed, show the rest of the section, with the verdict and the table as REQ-REPORTS-027 and REQ-REPORTS-031 say, and without the spec line of REQ-REPORTS-030;
- WHEN `burnup` is empty, show "Starts <start>" in place of the burn-up;
- WHEN `epics` is empty, show "No epics in this milestone yet" in place of the burn-up and the table;
- for a period, show the figures Beads done ("<done> closed"), Rework and Blocked without change lines, and "Pick a milestone to see the verdict, burn-up and epics";
- WHEN `milestones` is empty, show instead "<project> has no milestones yet", one sentence on what a milestone is, and the command `gin milestone create` with a copy button.

#### Scenario: Period
- GIVEN `/reports/status?project=alpha&days=30` with 5 beads closed, a rework rate of 0.2 and 1 blocked bead
- WHEN the Status section is shown
- THEN it shows "5 closed", "20%" and "1", no verdict, and "Pick a milestone to see the verdict, burn-up and epics"

#### Scenario: No milestones
- GIVEN project `beta` without milestones, at `/reports/status?project=beta&days=30`
- WHEN the Status section is shown
- THEN it says "beta has no milestones yet" and offers to copy `gin milestone create`

#### Scenario: Not started
- GIVEN planned milestone `m3` starting 18 Dec, on 23 Nov
- WHEN the Status section is shown
- THEN the verdict reads "Not started" and the burn-up is replaced by "Starts 18 Dec"

#### Scenario: Failure
- GIVEN `/api/reports/status` answers 502
- WHEN the user presses Retry and the next answer is 200
- THEN the Status section shows the report

### REQ-REPORTS-033: One scope for every report section
Every report section SHALL show, at its top, "Every report uses" and one select, listing the milestones of the team report (REQ-REPORTS-008) in the groups Active (`active`), Planned (`scheduled` and `planned`, by `start`) and Closed (latest `end` first), then "Last 7 days", "Last 30 days" and "Last 90 days". The page SHALL request the team report whatever the section. The URL SHALL hold the scope as `milestone=<id>` or as `days=<7|30|90>`, and the frontend SHALL, without adding a history entry:
- drop `days` WHEN both are given;
- write the team report's `milestone` WHEN neither is given, or WHEN `milestone` differs from it, or `days=30` WHEN `milestones` is empty;
- drop `sprint`.

Choosing an option SHALL replace the other key, add a history entry, and clear `member` and `status`. The scope SHALL stay when the section changes. Status, Team, Delivery and Rework SHALL request their reports for the scope (REQ-REPORTS-020, REQ-REPORTS-008, REQ-REPORTS-001), and Velocity SHALL mark the selected milestone (REQ-REPORTS-018). The select SHALL be no wider than the panel, a long option cut short with its full text as its `title`.
Source: `../ui/assets/2026-11-22/index.html#reports`

#### Scenario: Scope kept across sections
- GIVEN `/reports/team?project=alpha&milestone=m1`
- WHEN the user opens Delivery
- THEN the URL is `/reports/delivery?project=alpha&milestone=m1` and the report for `m1` is requested

#### Scenario: Pick a period
- GIVEN `/reports/delivery?project=alpha&milestone=m1`
- WHEN the user picks "Last 7 days"
- THEN the URL becomes `/reports/delivery?project=alpha&days=7`, with a history entry, and the report for 7 days is requested

#### Scenario: Default scope in the URL
- GIVEN `/reports/status?project=alpha`, whose team report selects `m2`
- WHEN the page loads
- THEN the URL becomes `/reports/status?project=alpha&milestone=m2` without a history entry

#### Scenario: Old link with a sprint and both keys
- GIVEN `/reports/delivery?project=alpha&days=7&milestone=m1&sprint=s7`
- WHEN the page loads
- THEN the URL becomes `/reports/delivery?project=alpha&milestone=m1` without a history entry

#### Scenario: No milestones
- GIVEN project `beta` without milestones
- WHEN `/reports/team?project=beta` loads
- THEN the URL becomes `/reports/team?project=beta&days=30` and the select lists only the three periods

#### Scenario: Picking clears the member
- GIVEN `/reports/team?project=alpha&milestone=m2&member=ann&status=closed`
- WHEN the user picks `m1`
- THEN the URL becomes `/reports/team?project=alpha&milestone=m1`

### REQ-REPORTS-034: Points delivered and estimate accuracy
Type: business-rule
For a scope, the server SHALL take as delivered the closed epics with points (REQ-REPORTS-021): for a milestone, those that belong to it today; for a period, those whose `closed_at` falls in it. Each delivered epic SHALL give each person a share: the epic's closed tracks (REQ-REPORTS-022) assigned to that person (REQ-BEADS-023, or `Unassigned`) ÷ its closed tracks, or 1 for the person of the epic's `assignee` when it has no closed track. The server SHALL count:
- `points_delivered`: for the team, the sum of the delivered epics' points; for a member, the sum of share × points, rounded to one decimal;
- `accuracy`, for a milestone whose `metadata.planned_days_per_point` is a number above 0: the planned days per point ÷ the actual days per point, where the actual days per point is the sum of (share ×) the actual days ÷ the sum of (share ×) the points of the delivered epics that have actual days, rounded to two decimals, and the ratio is rounded to two decimals, as gin-workflow's `velocity` does. An epic's actual days SHALL be the working days from the date of its `started_at` to the date of its `closed_at`, both included, at least 1, and it has none without `started_at`.

`accuracy` SHALL be `null` for a period, for a milestone without planned days per point, and when no delivered epic has actual days.

#### Scenario: Shared by tracks
- GIVEN closed epic `e-1` of 8 points in `m2`, whose 4 closed tracks were assigned 3 to `ann` and 1 to `bao@example.com`
- WHEN the team report of `m2` is built
- THEN `ann` has `points_delivered` 6, `bao` 2 and the team 8

#### Scenario: Epic without tracks
- GIVEN closed epic `e-2` of 3 points in `m2`, without tracks, assigned to `chi`
- WHEN the team report of `m2` is built
- THEN `chi` has `points_delivered` 3

#### Scenario: Same accuracy as gin-workflow
- GIVEN milestone `m1` with `planned_days_per_point` 1.5 and closed epics of 5 and 3 points that took 6 and 4 working days
- WHEN the team report of `m1` is built
- THEN `team.accuracy` is 1.2, the value of `velocity.accuracy` for `m1`

#### Scenario: No accuracy
- GIVEN a milestone without `planned_days_per_point`, and a period of 30 days
- WHEN their team reports are built
- THEN `accuracy` is `null` for the team and every member in both

### REQ-REPORTS-035: Team trend
The team report (REQ-REPORTS-008) SHALL hold, whatever its scope:
- `trend`: for the 6 listed milestones with the latest `start` on or before `today`, oldest `start` first, each with `id`, `title`, `start`, `end`, and the team's `closed`, `on_time` and `rework_rate` (REQ-REPORTS-010) and `points_delivered` and `accuracy` (REQ-REPORTS-034) for that milestone's scope;
- `unassigned`: `closed`, the closed beads of the selected scope without an assignee, and `total`, the closed beads of the selected scope.

#### Scenario: Last six milestones
- GIVEN project `alpha` with 8 milestones that started before `today` and one planned milestone
- WHEN the team report is built for any scope
- THEN `trend` holds the 6 latest started milestones, oldest first, and not the planned one

#### Scenario: Unassigned count
- GIVEN 30 closed scope beads, 8 of them without an assignee
- WHEN the team report is built
- THEN `unassigned` is `{closed: 8, total: 30}`

### REQ-REPORTS-036: Team trend and unassigned note
The Team section SHALL show:
- above the member table, WHEN `unassigned.closed` ÷ `unassigned.total` is 0.2 or more, the note "<closed> of <total> closed beads have no assignee, so member numbers undercount.";
- after the closed-per-day chart, a panel "Across milestones" with a column chart of `points_delivered` per milestone of `trend` and a table with the columns Milestone (its title linking to its milestone page), Closed, Points, On time, Rework and Accuracy, "—" for `null`, the row of the selected milestone highlighted and marked `aria-current="true"`, or "No started milestones yet" when `trend` is empty.

#### Scenario: Unassigned note
- GIVEN a team report with `unassigned` `{closed: 8, total: 30}`
- WHEN the Team section is shown
- THEN it says "8 of 30 closed beads have no assignee, so member numbers undercount."

#### Scenario: No note below a fifth
- GIVEN a team report with `unassigned` `{closed: 2, total: 30}`
- WHEN the Team section is shown
- THEN no note is shown

#### Scenario: Across milestones
- GIVEN a `trend` of `m0`, `m1` and `m2`, with `m2` selected and `m0`'s accuracy `null`
- WHEN the Team section is shown
- THEN the panel shows three columns and three rows, `m2` highlighted, and `m0`'s accuracy reads "—"

### REQ-REPORTS-037: Status summary Markdown format
Type: business-rule
WHEN building a Markdown status summary for a loaded milestone on Reports Status, the frontend SHALL produce:
- `# <milestone title> (<start> – <end>)` (or `# <milestone title>` when dates are missing) and a `Generated: <YYYY-MM-DD>` line;
- `**Verdict:** <verdict> — <verdict sentence>`;
- `## KPIs` with a bullet list of the five figures (Beads done, Points done, Pace, Blocked, Rework), each including its week-on-week change text when present;
- `## Risks` with a bullet list of the rendered risk items (blocked chains, unestimated epics, unapproved specs), or `None.` when there are no risks;
- `## Epics` with a Markdown table of columns `Epic | Verdict | Progress | Planned | Forecast | Assignee` in the same row order as `EpicTable`, using `—` when planned, forecast, or verdict is unavailable, and escaping `|` and newlines in cell text.

#### Scenario: Full status summary
- GIVEN a loaded Status section for milestone `PM reporting` with verdict `At risk`, 5 KPIs, 1 blocked-chain risk, and 2 epics
- WHEN `summaryMarkdown` is called
- THEN it returns Markdown containing the title heading, `**Verdict:** At risk — ...`, `## KPIs` with 5 bullets, `## Risks` with 1 bullet, and `## Epics` with a 2-row table matching `EpicTable` order

#### Scenario: No risks and degraded milestone detail
- GIVEN a loaded Status section with 0 risks and failed milestone detail
- WHEN `summaryMarkdown` is called
- THEN `## Risks` contains `None.` and the `## Epics` rows show `—` for Verdict, Planned, and Forecast

### REQ-REPORTS-038: Copy summary button on Reports Status
WHILE the Reports Status section (`/reports/status`) has a loaded milestone report, the section header SHALL show a `Copy summary` button; the button SHALL NOT be shown on period scopes or while the report is loading or in an error state. WHEN the user clicks `Copy summary`, the frontend SHALL build the Markdown of REQ-REPORTS-037 and write it via `navigator.clipboard.writeText`, SHALL show `Copied` on the button for 2 seconds on success, and IF the clipboard write rejects, THEN it SHALL show an inline `Couldn't copy` error message.

#### Scenario: Copy succeeds
- GIVEN `/reports/status` has loaded milestone `m1` and clipboard write resolves
- WHEN the user clicks `Copy summary`
- THEN `navigator.clipboard.writeText` is called with the Markdown summary and the button text changes to `Copied` for 2 seconds

#### Scenario: Copy fails
- GIVEN `/reports/status` has loaded milestone `m1` and clipboard write rejects
- WHEN the user clicks `Copy summary`
- THEN an inline `Couldn't copy` message is shown

#### Scenario: Hidden on period scope
- GIVEN `/reports/status` is switched to a 30-day period scope
- WHEN the section renders
- THEN no `Copy summary` button is rendered
