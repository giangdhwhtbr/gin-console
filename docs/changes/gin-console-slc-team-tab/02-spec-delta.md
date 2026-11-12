# Spec Delta: Team tab

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     A requirement taken from a confirmed input adds "Source:" after its statement, with backticked paths
     relative to the living spec.md, such as `assets/<YYYY-MM-DD>/mockup/index.html#<screen-id>`.
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...". -->

## ADDED

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
The scope of a milestone SHALL be every bead that is neither an epic nor a milestone and whose chain of parents holds an epic whose parent is the milestone.

Each scope bead SHALL fall in one bucket:
- `closed` for status `closed`;
- `in_progress` for status `in_progress`;
- `open` for any other status.

Its member SHALL be its `assignee`, or `Unassigned` when it has none.

The response SHALL hold `beads`, one row per scope bead, with:
- `id`, `title`, `issue_type`, `status`, `bucket`, `assignee`, `priority` and `created_at`;
- `epic`: the `id` and `title` of the nearest epic in its chain of parents;
- `started_at` and `closed_at`;
- `cycle_days`, as the cycle time of REQ-REPORTS-004, or `null`;
- `age_days`: for an in-progress bead, the days since `started_at` (else `updated_at`); otherwise `null`;
- `late_days`: for a closed bead, the working days (Monday to Friday) after the milestone's `end` up to the date of `closed_at`, 0 when it closed on or before `end`; otherwise `null`;
- `rework`: the bead's own reopens plus bugs found later (REQ-REPORTS-002), or `null` when it has no readable `ai_usage`.

#### Scenario: nested beads
- GIVEN milestone `m2` with epic `e1`, whose child `e1.1` has child `e1.1.1`, and epic `e9` under milestone `m3` with child `e9.1`
- WHEN the team report for `m2` is built
- THEN `beads` holds `e1.1` and `e1.1.1` with epic `e1`, and neither `e1` nor `e9.1`

#### Scenario: buckets and members
- GIVEN scope beads with status `blocked` and no assignee, `deferred` assigned to `ann`, and `in_progress` assigned to `bao`
- WHEN the team report is built
- THEN their buckets are `open`, `open` and `in_progress`, and their members are `Unassigned`, `ann` and `bao`

#### Scenario: late close
- GIVEN milestone `m2` ending on Friday 2026-11-27 and a scope bead closed on Tuesday 2026-12-01
- WHEN the team report is built
- THEN its `late_days` is 2

### REQ-REPORTS-010: Team and member KPIs
The response SHALL hold `team`, over the whole scope, and `members`, with one row per member of REQ-REPORTS-009 sorted by scope count (largest first) and then by name, with `Unassigned` last. Each holds:
- `scope`, `closed`, `in_progress` and `open` counts;
- `blocked`: open beads with status `blocked`;
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
- A Member select with "All members (<n>)" and each row of `members` as "<member> · <scope>".
- A "Clear member" control while a member is selected.
- A link "Open Gantt" to the milestone page.
- The milestone line:
  - the title;
  - a status chip: Active, Scheduled, Planned, "Closed · on time", or "Closed · <n> d late", where `<n>` is the working days from `end` to `closed_on`;
  - "<start> – <end>";
  - "working day <elapsed> of <working_days> · <days_left> left" while the period holds `today`, "starts in <n> working days" before `start`, or "finished <closed_on>" once closed.
- WHEN `undated` is above 0, the note "<undated> milestones without start and end dates are not listed".

It SHALL keep the milestone, member and bead status in the URL query (`milestone`, `member`, `status`). It SHALL put the answer's `milestone` in the URL when it differs. It SHALL select All members when `member` is not one of `members`. A change of milestone SHALL clear the member and status. The tab SHALL NOT show the period or sprint choice, and SHALL keep `days` and `sprint` in the URL for the other tabs.
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

#### Scenario: no period choice
- GIVEN the Team tab is selected
- WHEN the panel is shown
- THEN no period buttons and no sprint field are shown

### REQ-REPORTS-013: Team figures
The Team tab SHALL show a row of figures, in this order, from `team`, or from the selected member's row:
- Done: "<closed> / <scope>" and "<done> of scope" ("of assigned" for a member).
- In progress: the count and "oldest <n> d", in the warning color above 3 days, or "nothing started".
- Open: the count, and "<blocked> blocked · <unclaimed> unclaimed" ("<blocked> blocked" for a member). This line is in the warning color when `blocked` is above 0.
- Pace or Throughput:
  - For the team, while `pace_needed` is not `null`: Pace, "<pace> / day" and "needs <pace_needed> / day to end on <end>". Both are in the warning color when `pace_needed` is above `pace`.
  - Otherwise: Throughput, "<throughput> / week".
- Median cycle: "<n> d" or "—".
- On time: the percentage, in the warning color below 100%. Under it: "<late_open> still open after end" in the warning color when `late_open` is above 0, else "closed by <end>".
- Rework: the percentage or "—", and "<reopens> reopens · <bugs> bugs later".

Under the figures, a "Scope by status" bar SHALL show segments for Closed, In progress, Open (without blocked) and Blocked, sized by count, with a legend giving each count.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-active.png`

#### Scenario: behind pace
- GIVEN `team.pace` 2.0 and `pace_needed` 3.4
- WHEN the Team tab is shown
- THEN the Pace figure reads "2.0 / day" and "needs 3.4 / day to end on 27 Nov", in the warning color

#### Scenario: member figures
- GIVEN member `ann` with scope 11, closed 6 and 1 blocked bead
- WHEN the user selects `ann`
- THEN the figures read "6 / 11", "55% of assigned", "1 blocked", and Throughput instead of Pace

#### Scenario: closed milestone
- GIVEN a closed milestone with `throughput` 13.2 and `on_time` 0.88
- WHEN the Team tab is shown
- THEN the figures show Throughput "13.2 / week" and On time "88%" in the warning color

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
The Team tab SHALL show the scope beads of the selected member, or of every member, under the heading "Beads" (with " · <member>" when one is selected). A tab list holds Open, In progress, Closed and All, each with its count. The default is Open, or Closed for a closed milestone. The columns are:
- Open: Bead, Epic, Type, Assignee, Priority (`P<priority>`), a status chip (Open, Blocked, or the status), and Age (days since `created_at`). Sorted by priority, then oldest first.
- In progress: Bead, Epic, Type, Assignee, and "In progress for" (`age_days`, in the warning color above 3 days). Sorted longest first.
- Closed: Bead, Epic, Type, Assignee, Closed (the date), Cycle, an On time chip ("On time" or "<late_days> d late"), and Rework ("—" when `null`). Sorted newest first.
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
- GIVEN a closed bead `a-3` with cycle 0.9 days, `late_days` 2 and `rework` `null`
- WHEN the Closed list is shown
- THEN its row shows "0.9 d", "2 d late" and "—", and its title opens `/beads/alpha/a-3`

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
- WHEN `milestones` is empty, it SHALL show "<project> has no milestones yet", one sentence on what a milestone is, and the command `gin-workflow milestone create` with a copy button.
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
- THEN it says "beta has no milestones yet" and offers to copy `gin-workflow milestone create`

#### Scenario: failure
- GIVEN `/api/reports/team` answers 502
- WHEN the user presses Retry and the next answer is 200
- THEN the Team tab shows the report

#### Scenario: late answer
- GIVEN the team report for `m2` is loading and the user picks `m1`
- WHEN the answer for `m2` arrives
- THEN the page does not show it

## MODIFIED

### REQ-REPORTS-004: Delivery flow section
<!-- base: aaee918f23fbef0f594d799ae30710ee2973737bfb9612707e2976d745f83526 -->
The report SHALL hold:
- Beads closed per ISO week, by `issue_type`.
- The median and 85th percentile cycle time (`started_at` to `closed_at`) and lead time (`created_at` to `closed_at`), in days, per `issue_type`, per member, and over all selected closed beads together (`overall`). A time SHALL leave a bead out when a timestamp is missing or the close is before the start. Within a row, a time SHALL be absent when no bead has it.
- For each selected closed epic with `estimated_minutes`: its estimate in working days (`estimated_minutes / 480`), against the weekdays from its `started_at` (else `created_at`) to its `closed_at`, both dates counted.

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

### REQ-UI-088: Reports page
<!-- base: f4f2b4191db609b7ed63259230f45c906087460ef05a786fd29d88d7657e55ea -->
The frontend SHALL show the Reports page at `/reports`, loaded as its own chunk. The page header SHALL hold the project choice: each configured project and "All projects", with the first project as the default. The panels of the Delivery, AI usage, Quality and Data coverage tabs (REQ-UI-095) SHALL hold a period choice (7, 30 or 90 days, default 30) and a sprint field, which apply to those four tabs. The Team tab has its own choices (REQ-REPORTS-012). The page SHALL keep the choices in the URL query, so that a reload, the back button and a shared link show the same report. Each tab SHALL open with its own row of figures (REQ-UI-089 to REQ-UI-091, REQ-REPORTS-013). The page SHALL label every cost "estimated" and SHALL show "no price" where a cost is absent.

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

### REQ-UI-090: Delivery flow view
<!-- base: 0c45d2783c018d49e8f9862ab3ac66a458fc9a56074702c24b1d4b8458c6fef0 -->
The Delivery tab SHALL show, in this order:
- A row of figures: beads closed (`totals.closed`), and the median cycle time and median lead time from `delivery.overall` ("—" when absent).
- Beads closed per ISO week, as a column chart stacked by type with a legend.
- Cycle time and lead time as two range charts side by side, each with a dot at the median and a tick at the 85th percentile. A switch SHALL choose between By type (the default) and By member. Each range SHALL show, on hover and on focus, its type or member, the number of beads, the median and the 85th percentile.
- The estimate table of REQ-REPORTS-004, when it has rows. Each row SHALL hold a chip with the actual minus the estimated working days, rounded to one decimal:
  - "+<n> d" in the warning color when the difference is above 0;
  - "on estimate" when it is 0;
  - "−<n> d" when it is below 0.

The Delivery tab SHALL NOT show beads in progress; the Team tab shows them (REQ-REPORTS-013 to REQ-REPORTS-016).
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: no estimates
- GIVEN a report without estimated epics
- WHEN the page is shown
- THEN no estimate table is shown

#### Scenario: by member
- GIVEN a report whose `by_member` holds `ann` with median cycle time 1.5 days
- WHEN the user picks By member
- THEN both range charts show one range per member and `ann`'s cycle range has its dot at 1.5 days

#### Scenario: estimate chip
- GIVEN epics estimated at 5 working days that took 7, 3 and 4.5
- WHEN the Delivery tab is shown
- THEN their chips read "+2 d" in the warning color, "−2 d" and "−0.5 d"

#### Scenario: no work in progress
- GIVEN the Delivery tab is shown
- WHEN the figures and sections are read
- THEN there is no "In progress now" figure, no "Oldest in progress" table and no "In progress by member" chart

### REQ-UI-095: Report tabs
<!-- base: 466368dbbc3ea996e227f64ca452c57a0f930e6b90ed373bb881250f08f9133d -->
The Reports page SHALL show the tabs Team, Delivery, AI usage, Quality and Data coverage, in that order, as a WAI-ARIA tab list in which Left and Right move between tabs. Under each tab name it SHALL show a headline:
- Team, from the team report of the selected milestone:
  - "Finished on time", or "Finished <n> d late" with a warning icon, for a closed milestone;
  - "Starts <start>" before its start;
  - "<closed> of <scope> closed · on pace", or "· behind pace" with a warning icon when `pace_needed` is above `pace`;
  - "<closed> of <scope> closed · past end" with a warning icon when `late_open` is above 0;
  - "No milestones" when the project has none;
  - no headline while "All projects" is selected.
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- AI usage: "<tokens> tokens, <cost>", with "no price" in place of `<cost>` when `totals.cost` is absent.
- Quality: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.
- Data coverage: "<n> gaps" ("1 gap" when `<n>` is 1), with a warning icon when `<n>` is above 0. `<n>` is the sum of five counts: beads not collected, beads with unreadable usage, models without a price, beads with incomplete logs (`coverage.sources`), and projects under `errors`.

The page SHALL request the team report whenever a single project is selected, whatever the tab, so that the Team headline shows. It SHALL show no headline for a tab while its report loads or after it failed to load. It SHALL keep the selected tab in the URL query `tab` (`team`, `delivery`, `usage`, `quality` or `coverage`), SHALL select Team when `tab` is missing or holds another value, and SHALL keep the project, period, sprint, milestone and member when the tab changes. WHILE the window is narrower than the tab list, the tab list SHALL scroll sideways instead of widening the page.
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

#### Scenario: headlines
- GIVEN a report with 41 closed beads, 12,400,000 tokens, cost 38.2, rework rate 0.09, 3 beads not collected, 1 unreadable bead and 1 unpriced model
- WHEN the page is shown
- THEN the headlines read "41 beads closed", "12.4M tokens, $38.20", "9% rework" and "5 gaps", and the Data coverage headline has a warning icon

#### Scenario: no gaps
- GIVEN a report with no coverage gaps and no failed project
- WHEN the page is shown
- THEN the Data coverage headline reads "0 gaps" without a warning icon

#### Scenario: team headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed, `pace` 3.6 and `pace_needed` 3.4
- WHEN the page is shown on the Delivery tab
- THEN the Team headline reads "27 of 64 closed · on pace" without a warning icon

#### Scenario: keyboard
- GIVEN the Delivery tab is selected and has focus
- WHEN the user presses Right
- THEN the AI usage tab is selected and has focus

## REMOVED
