# Spec Delta: Remove AI usage from Reports

## ADDED

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

## MODIFIED

### REQ-REPORTS-001: Report request
<!-- base: a4d0c5b45891e31d74967ec444b290327adbe19f4248efe75519db296ab45376 -->
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

### REQ-REPORTS-005: Quality section
<!-- base: 0963408576b49e4c1abd1f18e642cba296e4664f65284e0bd2a7f56a3b58480b -->
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
<!-- base: d88861e1be6d9866e38e13578c41d2998bcf2f427ce2bb298d26d08630aedcbe -->
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

### REQ-REPORTS-009: Team scope and bead rows
<!-- base: fa920d07adbbf7fd83de94edf1fcfe926834c4071035a05e4110254fc709663e -->
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
<!-- base: 4bd4f1afbde44ec43b2a5d058407e44d1ae44b77d2ea86bc14a8efdbe7517a74 -->
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

### REQ-REPORTS-016: Team bead list
<!-- base: 7125b4378b0c1019c31c44cc14339e08c65527cd6fea4229e0c7c21540b66b0b -->
The Team tab SHALL show the scope beads of the selected member, or of every member, under the heading "Beads" (with " · <member>" when one is selected). A tab list holds Open, In progress, Closed and All, each with its count. The default is Open, or Closed for a closed milestone. The columns are:
- Open: Bead, Epic, Type, Assignee, Priority (`P<priority>`), a status chip (Open, Blocked, or the status), and Age (days since `created_at`). Sorted by priority, then oldest first.
- In progress: Bead, Epic, Type, Assignee, and "In progress for" (`age_days`, in the warning color above 3 days). Sorted longest first.
- Closed: Bead, Epic, Type, Assignee, Closed (the date), Cycle, an On time chip ("On time" or "<late_days> d late"), and Rework (the bead's `rework`, REQ-REPORTS-019). Sorted newest first.
- All: Bead, Epic, Type, Assignee, and a status chip.

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

### REQ-UI-088: Reports page
<!-- base: 4bbbd1afca3c25036a40b9c66b4d13a14e1dff421d7ec246cae092a24a491530 -->
The frontend SHALL show the Reports page at `/reports`, loaded as its own chunk. The page header SHALL hold the project choice: each configured project and "All projects", with the current project (REQ-UI-124) as the default; choosing a project there makes it the current project. The panels of the Delivery and Quality tabs (REQ-UI-095) SHALL hold a period choice (7, 30 or 90 days, default 30) and a sprint field, which apply to those two tabs. The Team tab has its own choices (REQ-REPORTS-012). The page SHALL keep the choices in the URL query, so that a reload, the back button and a shared link show the same report. Each tab SHALL open with its own row of figures (REQ-UI-090, REQ-UI-091, REQ-REPORTS-013, REQ-REPORTS-018). The page SHALL show no tokens, cost, budget or `gin usage` command.

#### Scenario: shared link
- GIVEN the URL `/reports?project=all&days=7&tab=delivery`
- WHEN the page loads
- THEN "All projects" and 7 days are selected and the report for them is requested

#### Scenario: change period
- GIVEN the Reports page for `alpha`, 30 days and the Delivery tab
- WHEN the user picks 90 days
- THEN the URL becomes `/reports?project=alpha&days=90&tab=delivery` without a reload and the report is requested again

#### Scenario: period kept across tabs
- GIVEN the Reports page for `alpha` with 7 days picked on the Delivery tab
- WHEN the user picks the Team tab and then the Quality tab
- THEN 7 days is selected in the Quality panel

### REQ-UI-091: Quality view
<!-- base: 4c8236b7f9d38ff7dae42404a673f88f7761a13dcdb924fbc5f323f88089430f -->
The Quality tab SHALL show, in this order:
- A row of figures, each with a tooltip (REQ-UI-132) naming its source:
  - the rework rate (`totals.rework_rate`), or "—" when it is `null`;
  - reopens, summed over the member rows of REQ-REPORTS-005;
  - bugs found later, summed over the member rows.
- A table of the member rows, with closed beads, reopens, bugs and rework rate.
- A table of the epic rows, with the epic (its title linking to its bead page), closed beads, reopens, bugs and rework rate.
The tab SHALL show no tokens, review cycles, rejections, findings or waivers.

#### Scenario: figures
- GIVEN member rows `ann` (4 closed, 1 reopen) and `bao` (1 closed, 1 bug) and `totals.rework_rate` 0.4
- WHEN the Quality tab is shown
- THEN the figures read "40%", 1 reopen and 1 bug found later

#### Scenario: open an epic
- GIVEN an epic row for `e-1` of project `alpha`
- WHEN the user clicks its title
- THEN the page `/beads/alpha/e-1` is shown

#### Scenario: nothing closed
- GIVEN a report with no selected closed bead
- WHEN the Quality tab is shown
- THEN the rework rate reads "—" and each table says "No data in this period"

### REQ-UI-093: Report states
<!-- base: 746d6a97bf39476f00a68570e1f267a01ed7fd77c0a9e7684dd668b8a6a00520 -->
The Reports page SHALL show a loading state while the report loads, SHALL show "No data in this period" in a section that has no rows instead of an empty chart, IF the report request fails, THEN SHALL show the error with a Retry button, SHALL show, above the tabs and whatever tab is selected, a warning naming each project under `errors` with its error while showing the rest, and SHALL NOT show a late answer for filters that are no longer selected.

#### Scenario: partial failure
- GIVEN the answer for "All projects" has `errors` holding `beta`
- WHEN the page is shown
- THEN a warning above the tabs names `beta` and its error, it stays when the user picks another tab, and the sections show the other projects

#### Scenario: late answer
- GIVEN the report for 30 days is loading and the user picks 7 days
- WHEN the answer for 30 days arrives
- THEN the page does not show it

### REQ-UI-095: Report tabs
<!-- base: c32236adbb576dc893f70381d03160945184a42e6d36342f140350c089cdbe53 -->
WHILE the report sections are not listed in the sidebar (REQ-UI-129), the Reports page SHALL show the tabs Team, Delivery, Velocity and Quality, in that order, as a WAI-ARIA tab list in which Left and Right move between tabs. Under each tab name it SHALL show a headline:
- Team, from the team report of the selected milestone:
  - "Finished on time", or "Finished <n> d late" with a warning icon, for a closed milestone;
  - "Starts <start>" before its start;
  - "<closed> of <scope> done · late" with a warning icon when the milestone is late (REQ-MILESTONE-UI-023);
  - otherwise "<closed> of <scope> done · on pace", or "· behind pace" with a warning icon when `pace_needed` is above `pace`;
  - "No milestones" when the project has none;
  - no headline while "All projects" is selected.
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- Velocity: "<x> days per point" from the selected project's `days_per_point` (REQ-REPORTS-018), with "assumed" when it is assumed, once the Milestones list has loaded; no headline while "All projects" is selected or when `days_per_point` is `null`.
- Quality: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.

The page SHALL request the team report and the Milestones list (REQ-MILESTONE-UI-008, for the forecast `finish` of REQ-MILESTONE-UI-023 and for the Velocity tab) whenever a single project is selected, whatever the tab, and SHALL request the Milestones list at most once per project and refresh. WHILE the Milestones list is loading or after it failed, the Team headline SHALL apply REQ-MILESTONE-UI-023 without the forecast. It SHALL show no headline for a tab while its report loads or after it failed to load. It SHALL keep the selected tab in the URL query `tab` (`team`, `delivery`, `velocity` or `quality`), SHALL select Team when `tab` is missing or holds another value, including the retired `usage` and `coverage`, and SHALL keep the project, period, sprint, milestone and member when the tab changes. WHILE the window is narrower than the tab list, the tab list SHALL scroll sideways instead of widening the page and SHALL fade its edge on each side that has hidden tabs.
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
- GIVEN the Reports page at a window 360px wide where Quality does not fit
- WHEN the page is shown
- THEN the right edge of the tab list fades, and scrolling it to the end removes the right fade and shows a left one

### REQ-UI-129: Report sections in the sidebar
<!-- base: 32c4e2b1adb13041da79784fe2b3dd6586cc8c26789a03eab69fb9fad62ee9a3 -->
WHILE a Reports page is shown in a window 1024px wide or more with the sidebar expanded, the Main navigation SHALL list the report sections of REQ-UI-095 under the Reports link, each as a link with the section name and its headline, SHALL mark the selected section with `aria-current="page"`, and each link SHALL go to the same URL with `tab` set to its section. WHILE the window is narrower or the sidebar is collapsed, the sidebar SHALL list no sections and the page SHALL show the tab list of REQ-UI-095. The section links SHALL NOT show on other pages.

#### Scenario: Sections in the sidebar
- GIVEN a window 1440px wide, the sidebar expanded and `/reports?project=a&tab=delivery`
- WHEN the page is shown
- THEN the sidebar lists Team, Delivery, Velocity and Quality under Reports with their headlines, Delivery is marked current, and the page shows no tab list

#### Scenario: Change section
- GIVEN the Reports page at `/reports?project=a&days=7&tab=delivery` with sections in the sidebar
- WHEN the user clicks Quality in the sidebar
- THEN the URL becomes `/reports?project=a&days=7&tab=quality` and the Quality panel is shown

#### Scenario: Narrow window
- GIVEN a window 900px wide
- WHEN the Reports page is shown
- THEN the sidebar lists no sections and the page shows its tab list

## REMOVED

### REQ-REPORTS-002: Own share of a bead
<!-- base: 45a4d3f4dde8f852316ea1ab5f9bc0035f79808fa882a4c021b145562814649a -->
Reason: gin-workflow-wkwb retired AI usage tracking (decision 2026-11-21): nothing writes `metadata.ai_usage` and `gin usage` is gone.

### REQ-REPORTS-003: AI usage section
<!-- base: 3cabb52c9d2ff1d3da6cdc5182e023f4e4f88daa287acf1be45054f9608363d1 -->
Reason: gin-workflow-wkwb retired AI usage tracking (decision 2026-11-21): nothing writes `metadata.ai_usage` and `gin usage` is gone.

### REQ-REPORTS-006: Data coverage section
<!-- base: 391c959718a23d98ee1f87910596187f960f9f273b6e778c49818cdfed1a9c20 -->
Reason: gin-workflow-wkwb retired AI usage tracking (decision 2026-11-21): nothing writes `metadata.ai_usage` and `gin usage` is gone.

### REQ-UI-089: AI usage view
<!-- base: 35bfa375907aa0a6f1b141684415b1ebbcaac28719f4946d11fd12b16cded8ed -->
Reason: gin-workflow-wkwb retired AI usage tracking (decision 2026-11-21): nothing writes `metadata.ai_usage` and `gin usage` is gone.

### REQ-UI-092: Data coverage view
<!-- base: f8f900318172aa5b5648163802818fb251bb6a5d05a888a48f3fa63242205ec7 -->
Reason: gin-workflow-wkwb retired AI usage tracking (decision 2026-11-21): nothing writes `metadata.ai_usage` and `gin usage` is gone.
