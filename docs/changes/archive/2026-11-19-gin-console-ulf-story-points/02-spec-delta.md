# Spec Delta: Story points and velocity KPIs

## ADDED

### REQ-MILESTONE-UI-021: Velocity on the milestone page
WHEN the shown milestone's `show` output has a `velocity`, the milestone page header SHALL show "Committed <c> pt · Completed <d> pt · Added <a> pt · Say/do <s>%" (`say_do` as a whole percent, "–" when `null`), or "Not kicked off · Completed <d> pt" when `committed_points` is `null`, and, when `velocity.days_per_point` is not `null`, "<x> d/pt (planned <y>, accuracy <z>)" with `<x>` and `<y>` to one decimal and `<z>` to two decimals, leaving out "planned" or "accuracy" when it is `null`; it SHALL show none of this when `velocity` is `null` or missing, and nothing per member.

#### Scenario: Kicked off
- GIVEN milestone `m1` whose `show` output has `velocity` `{committed_points: 13, completed_points: 8, added_points: 3, say_do: 0.62, days_per_point: 1.4, planned_days_per_point: 1.2, accuracy: 0.86}`
- WHEN the user opens `m1`
- THEN the header shows "Committed 13 pt · Completed 8 pt · Added 3 pt · Say/do 62%" and "1.4 d/pt (planned 1.2, accuracy 0.86)"

#### Scenario: Not kicked off
- GIVEN milestone `m2` whose `velocity` has `committed_points: null`, `completed_points: 0`, `say_do: null` and `days_per_point: null`
- WHEN the user opens `m2`
- THEN the header shows "Not kicked off · Completed 0 pt" and no "d/pt"

#### Scenario: Older gin-workflow
- GIVEN milestone `m1` whose `show` output has no `velocity` key
- WHEN the user opens `m1`
- THEN the header shows no velocity and the rest of the header is unchanged

### REQ-REPORTS-018: Velocity tab
WHEN the Velocity tab is selected, the frontend SHALL request `GET /api/milestones?project=<p>` (REQ-MILESTONE-UI-008) for the selected project, or for every configured project when "All projects" is selected, and SHALL show for each project (under the project's name when all are selected):
- a row of figures: the project's `days_per_point.value` to one decimal as "<x> d/pt", with "assumed" when `days_per_point.assumed` is true and "—" when `days_per_point` is `null` or missing; and the say/do (whole percent) and accuracy (two decimals) of the milestone with the latest `start` among those whose `velocity.say_do` is not `null`, or "—";
- for the milestones whose `velocity` has a `committed_points` that is not `null` or a `completed_points` above 0, oldest `start` first:
  - a column chart of `committed_points` and `completed_points` per milestone;
  - a line chart of `days_per_point` and `planned_days_per_point` per milestone, leaving out `null` points;
  - a table with committed, completed and added points, say/do, days per point, planned days per point and accuracy, "—" for `null`;
- "No kicked-off milestones with points yet" when no milestone qualifies;
- the error and cause of a project whose request failed (REQ-MILESTONE-UI-005), with the other projects still shown.

The tab SHALL hold no period or sprint choice, SHALL show nothing per member, and the Reports backend SHALL NOT run `gin` for it.

#### Scenario: Milestones with velocity
- GIVEN project `alpha` whose milestones list has `days_per_point` `{value: 1.4, measured_epics: 6, assumed: false}`, closed `m1` (start 1 Oct) with `velocity` `{committed_points: 10, completed_points: 8, added_points: 0, say_do: 0.8, days_per_point: 1.5, planned_days_per_point: 1.2, accuracy: 0.8}`, active `m2` (start 3 Nov) with `{committed_points: 13, completed_points: 5, added_points: 2, say_do: 0.38, days_per_point: 1.3, planned_days_per_point: 1.4, accuracy: 1.08}`, and planned `m3` with `{committed_points: null, completed_points: 0, …}`
- WHEN the user opens `/reports?project=alpha&tab=velocity`
- THEN the figures read "1.4 d/pt", "38%" and "1.08", the charts and the table hold `m1` then `m2`, and `m3` is not shown

#### Scenario: Assumed days per point
- GIVEN project `alpha` whose `days_per_point` is `{value: 1.0, measured_epics: 0, assumed: true}`
- WHEN the Velocity tab is shown
- THEN the figure reads "1.0 d/pt" with "assumed"

#### Scenario: Nothing kicked off yet
- GIVEN project `alpha` whose milestones all have `committed_points: null` and `completed_points: 0`, or no `velocity` key
- WHEN the Velocity tab is shown
- THEN it shows "No kicked-off milestones with points yet" and no chart

#### Scenario: All projects with one failing
- GIVEN projects `alpha` with velocity and `beta` whose `GET /api/milestones?project=beta` answers 502 with `cause: "outdated"`
- WHEN the user opens `/reports?project=all&tab=velocity`
- THEN `alpha` shows its figures, charts and table, and `beta` shows the outdated error

## MODIFIED

### REQ-MILESTONE-UI-001: Milestones list
<!-- base: edeac1240ba83043ed9f57c1ff30722529f4dd6c87eece2c28a565acd4de3ac0 -->
gin-console SHALL show a Milestones entry in the sidebar that opens a per-project list of milestones with title, status, start and end (and kickoff when set), lanes, forecast finish, epic progress, say/do, and warning count, from `gin milestone list --all --json`. Lanes SHALL read "<n> lanes" ("1 lane" when `<n>` is 1), or "–" when the entry has no `lanes`. The forecast finish SHALL read "Finishes <date>" when the entry's `finish` is set, in the warning color when it is after the entry's `end`. Say/do SHALL read "Say/do <n>%" with the entry's `velocity.say_do` as a whole percent, or "–" when the entry has no `velocity` or its `say_do` is `null`. gin-console SHALL show a list entry's `error` in place of its progress and warnings, SHALL show "No dates" in place of the period of an entry whose `start` or `end` is `null`, SHALL cut a long title short with the full title as `title`, and SHALL NOT show the `unassigned_epics` count, which REQ-MILESTONE-UI-010 replaces with a list.
Source: `assets/2026-11-08/mockup/index.html#milestones`

#### Scenario: list
- GIVEN project P whose gin-workflow reports milestones M1 (active) and M2 (planned)
- WHEN the user opens Milestones for P
- THEN both milestones are listed with their status, period, lanes, progress, and warning count

#### Scenario: lanes and finish
- GIVEN project P whose `milestone list` reports M1 with `lanes: 2`, `end: 2026-11-12`, `finish: 2026-11-23`, and M2 with `lanes: 1`, `end: 2026-12-04`, `finish: 2026-12-01`
- WHEN the user opens Milestones for P
- THEN M1 shows "2 lanes" and "Finishes 23 Nov" in the warning color, and M2 shows "1 lane" and "Finishes 1 Dec" without it

#### Scenario: say/do
- GIVEN project P whose `milestone list` reports M1 with `velocity.say_do: 0.62`, M2 with `velocity.say_do: null`, and M3 without `velocity`
- WHEN the user opens Milestones for P
- THEN M1 shows "Say/do 62%", and M2 and M3 show "–" for say/do

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

### REQ-MILESTONE-UI-008: Milestones API
<!-- base: d38e632dae33b5e22393a3e5dba32c567f5a407cff45ab5fb99b5ef0e01c889e -->
WHEN a client requests `GET /api/milestones?project=<name>` or `GET /api/milestones/{project}/{id}` with an optional `start=YYYY-MM-DD`, the server SHALL return the output of `gin milestone list --all --json` or `gin milestone show <id> [--start <date>] --json` run in the project directory, including the list's `forecast`, the `days_per_point` (`value`, `measured_epics`, `assumed`) of the list and of the shown milestone, the `lanes` and `velocity` (`committed_points`, `completed_points`, `added_points`, `say_do`, `days_per_point`, `planned_days_per_point`, `accuracy`) of each list entry and of the shown milestone, the shown milestone's `integration`, `deadline` and `away`, and each epic's `remaining_days`, `assumed_days`, `points`, `points_reason`, `estimate_source`, `actual_days` and `actual_days_per_point`, with `null` (`{}` for `away`) for each of them that the output lacks, and SHALL accept a list entry whose `start` and `end` are `null` and return them as `null`. It SHALL cache a response without `start` for 5 seconds and never cache one with `start`, SHALL respond 404 for an unknown project or missing directory, 422 without running any command for a `start` that is not an ISO date, and IF the command fails or its output is not `schema: 1`, THEN SHALL respond 502 with `error` and `cause` set to `outdated` (no `milestone` command), `tracking` (project not on Beads tracking), `schema` (schema not 1), or `null`.

#### Scenario: list
- GIVEN project P whose `milestone list --all --json` prints schema 1 with M1
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 200 with M1, `unassigned_epics`, and `today`

#### Scenario: forecast and lanes
- GIVEN project P whose `milestone list` prints M1 with `lanes: 2` and a `forecast` with `deadline: 2026-12-31`, `lanes: 1`, `start: 2026-11-08`, `finish: 2026-12-23`, `overflow_days: 0`, `open_epics: 5`, `unestimated: 1`, `error: null`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response carries M1 with `lanes: 2` and that `forecast` unchanged

#### Scenario: story points
- GIVEN project P whose `milestone list` prints `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}` and M1 with `velocity: {committed_points: 13, completed_points: 8, added_points: 3, say_do: 0.62, days_per_point: 1.4, planned_days_per_point: 1.2, accuracy: 0.86}`, and whose `milestone show M1` prints the same `days_per_point` and `velocity` and an epic with `points: 5`, `points_reason: "new endpoint and UI"`, `estimate_source: "points"`, `estimate_days: 7`, `actual_days: 6` and `actual_days_per_point: 1.2`
- WHEN a client requests the list and M1
- THEN both responses carry those values unchanged

#### Scenario: output from an older gin-workflow
- GIVEN project P whose `milestone list` prints schema 1 without `forecast`, `lanes`, `days_per_point` and `velocity`, and whose `milestone show M1` prints none of `lanes`, `days_per_point`, `velocity` and the epic keys `points`, `points_reason`, `estimate_source`, `actual_days` and `actual_days_per_point`
- WHEN a client requests the list and M1
- THEN both responses are 200, the list has `forecast: null` and `days_per_point: null` and M1 entry `lanes: null` and `velocity: null`, and M1 has `lanes: null`, `days_per_point: null`, `velocity: null` and each of those epic keys `null`

#### Scenario: preview not cached
- GIVEN a request for M1 with `start=2026-11-16` answered less than 5 seconds ago
- WHEN a client requests M1 with `start=2026-11-16` again
- THEN `milestone show M1 --start 2026-11-16 --json` runs again

#### Scenario: invalid start
- GIVEN project P
- WHEN a client requests `GET /api/milestones/P/M1?start=next-monday`
- THEN the response is 422 and no command runs

#### Scenario: old gin-workflow
- GIVEN project P whose `gin milestone` exits 2 with `invalid choice: 'milestone'`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 502 with `cause: "outdated"`, and the failure is not cached

#### Scenario: markdown tracking
- GIVEN project P whose `milestone list` exits 1 with `milestone error: milestones need providers.task_tracking: beads`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 502 with `cause: "tracking"`

#### Scenario: entry without dates
- GIVEN project P whose `milestone list` prints M1 and M4 with `start: null`, `end: null` and `error: "M4 has no start/end metadata"`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 200 with M1, and M4 with `start: null`, `end: null` and that `error`

#### Scenario: schedule facts
- GIVEN project P whose `milestone show M1` prints `integration: 2026-11-24`, `deadline: null`, `away: {"ann": ["2026-11-18"]}` and an epic with `remaining_days: 2` and `assumed_days: null`
- WHEN a client requests `GET /api/milestones/P/M1`
- THEN the response carries those values unchanged

### REQ-MILESTONE-UI-013: Readable Gantt rows
<!-- base: ad4d4b1f5d448a40564565fbeed6eb2b0e5bebd399bfe5e2664eb80aab6829fa -->
Each epic row of the Gantt SHALL show, in a label column that stays visible while the chart scrolls, the status icon and title on one line and the epic id (linking to its bead page), period and estimate on the next, the estimate reading "<n>d", or "<n>d left" when the epic is in progress and its `remaining_days` is below its estimate, or "assumed <n>d" when it has no estimate and `assumed_days` is set, preceded by "<p> pt · " when the epic has `points`, each line cut short with an ellipsis instead of wrapping and the full title available on hover, except that under 1024px the items of the second line (id, period and estimate, closed tracks, prep, spec) wrap onto further lines rather than being cut, followed by the epic's warnings; WHEN at least 90 px of chart are left after an epic's bar, the row SHALL also show the epic's title after the bar.

#### Scenario: long id
- GIVEN epic `gin-workflow-rm-process-hygiene` titled "Process hygiene: consistent skills, rules that bind where it matters"
- WHEN the Gantt is shown on a phone
- THEN the title takes one line cut short with an ellipsis, and the id, period and closed tracks wrap onto the following lines, none of them cut to less than its first word

#### Scenario: title after the bar
- GIVEN epic A whose bar ends on the first day of a 10-day plan shown as `Whole milestone`
- WHEN the Gantt is shown
- THEN A's title is shown after its bar

#### Scenario: remaining and assumed days
- GIVEN an in-progress epic A with `estimate_days: 5` and `remaining_days: 2`, and an open epic B without an estimate and with `assumed_days: 3`
- WHEN the Gantt is shown
- THEN A's second line reads "2d left" and B's reads "assumed 3d"

#### Scenario: points
- GIVEN an open epic C with `points: 5` and `estimate_days: 7`, and an in-progress epic D with `points: 3`, `estimate_days: 4` and `remaining_days: 1`
- WHEN the Gantt is shown
- THEN C's second line reads "5 pt · 7d" and D's reads "3 pt · 1d left"

### REQ-MILESTONE-UI-016: Project forecast card
<!-- base: dd6fb5265e6fb7f4303946a08fbc79adc352ee978b4352e6683fc8c5b93bfe77 -->
WHEN the Milestones list of a project has a non-null `forecast`, gin-console SHALL show a forecast card above the milestone list with:
- the forecast `finish` ("Finishes <date>"), or "No estimate: every open epic is unestimated" when `finish` is null;
- the `deadline` and how `finish` compares with it:
  - "<n> working days past the deadline" in the warning color when `overflow_days` is above 0;
  - "on the deadline" when `finish` equals `deadline`;
  - "<n> working days spare" otherwise. `<n>` counts the days Monday to Friday after `finish` up to and including `deadline`, the same count as gin-workflow `workdays_after`.
  - The comparison is left out when `finish` is null.
- "No deadline" when `deadline` is null, with the roadmap line `- Deadline: YYYY-MM-DD` to add;
- the default lanes (`lanes`), the open epic count (`open_epics`), and the unestimated epic count (`unestimated`), with a warning mark when `unestimated` is above 0;
- the list's `days_per_point` as "<x> days per point" to one decimal, followed by "(assumed)" when `assumed` is true, left out when `days_per_point` is `null` or missing;
- the forecast `error`, when set, in the destructive color, with the other figures still shown.
Source: `assets/2026-11-08/mockup/index.html#milestones`

The page SHALL NOT show the card when `forecast` is null or missing.

#### Scenario: on time with a deadline
- GIVEN project P whose `milestone list` reports forecast `finish: 2026-12-23`, `deadline: 2026-12-31`, `overflow_days: 0`, `lanes: 2`, `open_epics: 5`, `unestimated: 0`
- WHEN the user opens Milestones for P
- THEN the card reads "Finishes 23 Dec", "6 working days spare", "2 lanes", "5 open epics", and "0 unestimated" without a warning mark

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
- THEN the card reads "No estimate: every open epic is unestimated" and "2 unestimated" with a warning mark, and shows no deadline comparison

#### Scenario: days per point
- GIVEN project P whose list has a forecast and `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`, and project Q whose list has a forecast and `days_per_point: {value: 1.0, measured_epics: 0, assumed: true}`
- WHEN the user opens Milestones for P and then for Q
- THEN P's card reads "1.4 days per point" and Q's reads "1.0 days per point (assumed)"

#### Scenario: forecast error
- GIVEN project P whose forecast has `error: "Deadline: soon is not a date (YYYY-MM-DD)"`, `deadline: null`, `finish: 2026-11-20`
- WHEN the user opens Milestones for P
- THEN the card shows that error in the destructive color and still reads "Finishes 20 Nov"

#### Scenario: no forecast
- GIVEN project P whose `milestone list` reports `forecast: null`, or no `forecast` key
- WHEN the user opens Milestones for P
- THEN no forecast card is shown and the milestone list is shown as before

### REQ-BEADS-001: Bead list
<!-- base: 877b56b8c57a75fdcce53947af5e0a06e5e5fb81c442015fb96ed6bd5a82f290 -->
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

### REQ-REPORTS-004: Delivery flow section
<!-- base: 849689dc9f2f177683a2f26144c079c3342a785f457e3f264b942187e1258125 -->
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

### REQ-UI-090: Delivery flow view
<!-- base: 9e053e37a7d2f0e4dff3aab412bb1f3d4364638e91f2c798abb48cce5ef7bd2f -->
The Delivery tab SHALL show, in this order:
- A row of figures: beads closed (`totals.closed`), and the median cycle time and median lead time from `delivery.overall` ("—" when absent).
- Beads closed per ISO week, as a column chart stacked by type with a legend.
- Cycle time and lead time as two range charts side by side, each with a dot at the median and a tick at the 85th percentile. A switch SHALL choose between By type (the default) and By member. Each range SHALL show, on hover and on focus, its type or member, the number of beads, the median and the 85th percentile.
- The estimate table of REQ-REPORTS-004, when it has rows. Each row SHALL show its estimate as "<n>d", or "<p> pt" when it has `points`, and its actual working days. A row with an estimate in days SHALL hold a chip with the actual minus the estimated working days, rounded to one decimal:
  - "+<n> d" in the warning color when the difference is above 0;
  - "on estimate" when it is 0;
  - "−<n> d" when it is below 0.

  A row with points and no estimate in days SHALL show "<x> d/pt" from its `days_per_point` in place of the chip.

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

#### Scenario: points row
- GIVEN an estimate row with `estimate_days: null`, `points: 5`, `actual_days: 7` and `days_per_point: 1.4`
- WHEN the Delivery tab is shown
- THEN the row reads "5 pt", "7" and "1.4 d/pt", with no chip

#### Scenario: no work in progress
- GIVEN the Delivery tab is shown
- WHEN the figures and sections are read
- THEN there is no "In progress now" figure, no "Oldest in progress" table and no "In progress by member" chart

### REQ-UI-095: Report tabs
<!-- base: bd16d69a8a53e10fb7b7c711d872ba2f98d43d8b5971e5cf56f043339b34ce65 -->
The Reports page SHALL show the tabs Team, Delivery, Velocity, AI usage, Quality and Data coverage, in that order, as a WAI-ARIA tab list in which Left and Right move between tabs. Under each tab name it SHALL show a headline:
- Team, from the team report of the selected milestone:
  - "Finished on time", or "Finished <n> d late" with a warning icon, for a closed milestone;
  - "Starts <start>" before its start;
  - "<closed> of <scope> closed · on pace", or "· behind pace" with a warning icon when `pace_needed` is above `pace`;
  - "<closed> of <scope> closed · past end" with a warning icon when `late_open` is above 0;
  - "No milestones" when the project has none;
  - no headline while "All projects" is selected.
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- Velocity: "<x> d/pt" from the selected project's `days_per_point` (REQ-REPORTS-018), with "assumed" when it is assumed, once the Velocity tab has loaded it; no headline while "All projects" is selected or when `days_per_point` is `null`.
- AI usage: "<tokens> tokens, <cost>", with "no price" in place of `<cost>` when `totals.cost` is absent.
- Quality: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.
- Data coverage: "<n> gaps" ("1 gap" when `<n>` is 1), with a warning icon when `<n>` is above 0. `<n>` is the sum of five counts: beads not collected, beads with unreadable usage, models without a price, beads with incomplete logs (`coverage.sources`), and projects under `errors`.

The page SHALL request the team report whenever a single project is selected, whatever the tab, so that the Team headline shows, and SHALL request the Milestones list for the Velocity tab only once that tab has been selected. It SHALL show no headline for a tab while its report loads or after it failed to load. It SHALL keep the selected tab in the URL query `tab` (`team`, `delivery`, `velocity`, `usage`, `quality` or `coverage`), SHALL select Team when `tab` is missing or holds another value, and SHALL keep the project, period, sprint, milestone and member when the tab changes. WHILE the window is narrower than the tab list, the tab list SHALL scroll sideways instead of widening the page.
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
- THEN the URL has `tab=velocity`, `GET /api/milestones?project=alpha` is requested once, and the Velocity headline reads "1.4 d/pt"

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
- THEN the Velocity tab is selected and has focus

### REQ-UI-109: Kind, capabilities and estimate in the Beads views
<!-- base: c5b34f386779bd3f575345138fc7114f6e8d9d0df6015a564063a022ac6170da -->
The frontend SHALL show a "Technical" or "Parity" badge for an epic of that kind, and no kind badge for a capability epic, on its List row, its Board and Focus card, its bead page and its Gantt label; SHALL show the bead's capabilities as chips on its bead page; SHALL show "Estimate <n>d" on the bead page of a bead with `estimate_minutes`, counting 480 minutes as one working day and rounding to one decimal, and "Points <p>" with its `points_reason` on the bead page of a bead with `points`; and SHALL show on an epic's List row its complexity (REQ-UI-028) and size as "<complexity> · <p> pt" when it has `points`, else "<complexity> · <n>d", or either part alone, among the items that give way before the title (REQ-UI-044).

#### Scenario: Technical epic
- GIVEN technical epic `e-1` with capabilities `beads` and `ui`, complexity `medium` and `estimate_minutes: 1440`
- WHEN its List row and its bead page are shown
- THEN the row shows "Technical" and "medium · 3d", and the bead page shows "Technical", the chips `beads` and `ui`, and "Estimate 3d"

#### Scenario: Capability epic
- GIVEN capability epic `e-2` without an estimate
- WHEN its List row is shown
- THEN it shows no kind badge and no estimate

#### Scenario: Partial day
- GIVEN a task with `estimate_minutes: 240`
- WHEN its bead page is shown
- THEN it shows "Estimate 0.5d"

#### Scenario: Pointed epic
- GIVEN epic `e-3` with complexity `medium`, `points: 5` and `points_reason: "new endpoint and UI"`, and epic `e-4` with `points: 3` and no complexity
- WHEN their List rows and the bead page of `e-3` are shown
- THEN `e-3`'s row shows "medium · 5 pt", `e-4`'s shows "3 pt", and the bead page of `e-3` shows "Points 5" and "new endpoint and UI"

## REMOVED
