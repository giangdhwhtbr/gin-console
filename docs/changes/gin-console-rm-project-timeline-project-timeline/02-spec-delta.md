# Spec Delta: Project timeline

## ADDED

### REQ-MILESTONE-UI-033: Milestones views
The Milestones page SHALL offer the views Timeline and List as a row of links labelled "View", the current one marked `aria-current="page"`, kept in the URL as `view=timeline` or `view=list`. A URL without `view`, or with another value, SHALL show the Timeline and SHALL NOT add `view` to the URL. The List view SHALL be the list of REQ-MILESTONE-UI-001 with the forecast card of REQ-MILESTONE-UI-016 and the epics of REQ-MILESTONE-UI-010; the Timeline SHALL be the view of REQ-MILESTONE-UI-035. Changing the view SHALL keep the project, `closed` and `zoom` and SHALL request nothing again, and choosing another project SHALL keep `view` and `closed` as REQ-UI-123 says.

#### Scenario: Default view
- GIVEN `/milestones?project=alpha`
- WHEN the page loads
- THEN the Timeline is shown, Timeline is marked current, and the URL has no `view`

#### Scenario: List
- GIVEN the Timeline of `alpha`
- WHEN the user opens List
- THEN the URL becomes `/milestones?project=alpha&view=list`, the list and the forecast card are shown, and `GET /api/milestones?project=alpha` was requested once

### REQ-MILESTONE-UI-034: Project finish in the header
WHEN the Milestones list of a project has a non-null `forecast`, the Milestones page SHALL show under its title, in both views, one line with "Project finishes <finish>" (REQ-UI-131), then "deadline <deadline>" when `deadline` is set, then "<n> working days late" with a warning icon when `overflow_days` <n> is above 0. It SHALL show "Project finish not estimated" in place of the finish when `finish` is null, and "Forecast unavailable: <error>" in the destructive color in place of the line when `error` is set. It SHALL show no line when `forecast` is null.

#### Scenario: Late against the deadline
- GIVEN project `gin-workflow` whose forecast has `finish` 2026-12-22, `deadline` 2026-12-11 and `overflow_days` 7, with today in 2026
- WHEN the Milestones page is shown
- THEN the header reads "Project finishes 22 Dec", "deadline 11 Dec" and "7 working days late" with a warning icon

#### Scenario: No deadline
- GIVEN a forecast with `finish` 2027-01-19, `deadline` null and `overflow_days` 0
- WHEN the page is shown
- THEN the header reads "Project finishes 19 Jan" and nothing more

#### Scenario: Forecast error
- GIVEN a forecast with `error` "dependency cycle: e-1 -> e-2 -> e-1"
- WHEN the page is shown
- THEN the header reads "Forecast unavailable: dependency cycle: e-1 -> e-2 -> e-1"

### REQ-MILESTONE-UI-035: Timeline rows
The Timeline SHALL show, against the axis of REQ-MILESTONE-UI-036, one group per milestone and then a group "Not in a milestone", in this order: the closed milestones when "Show closed" is on (REQ-MILESTONE-UI-037), by `start`; the milestones of `forecast.milestones`, in that order; the other open milestones with dates, by `start`. Each group SHALL have:
- a milestone row with its title linking to its milestone page, its status (REQ-MILESTONE-UI-022) and "Finishes <finish>" from its `forecast.milestones` entry, and a bar from its `start` to its `end`; WHEN its chained `finish` is after its `end`, the part of the bar from the day after `end` to `finish` hatched in the warning color;
- one row per epic of `forecast.epics` whose `milestone` is the group's milestone, in the order of `forecast.epics`, with its title linking to its bead page, "Lane <lane>", "<remaining_days> d left" when `remaining_days` is set, a warning icon when `warnings` is not empty, and a bar from `planned_start` to `planned_end` in the colour of its state (REQ-UI-064).

The group "Not in a milestone" SHALL hold the epics of `forecast.epics` whose `milestone` is null or names no listed milestone, and SHALL be left out when it has none. Each bar SHALL have an accessible name with the title, the dates, the days left and the days over (the `overflow` warning's `days`), such as "Multi-currency pricing: planned 11 Dec – 2 Feb, 38 days left, 42 days over"; the bars SHALL be decoration for assistive technology beside the links of the labels.

#### Scenario: Milestone and its epics
- GIVEN milestone `ex-m2` from 2026-11-16 to 2026-12-04 whose `forecast.milestones` entry finishes 2027-07-02, and epic `ex-e13` of `ex-m2` planned 2026-12-11 to 2027-02-02 with `remaining_days` 38, lane 1 and an `overflow` warning of 42 days
- WHEN the Timeline is shown
- THEN the `ex-m2` row has a bar from 16 Nov to 4 Dec and a hatched part from 5 Dec to 2 Jul, and the `ex-e13` row reads "Lane 1", "38 d left", shows a warning icon, and its bar is named "Multi-currency pricing: planned 11 Dec – 2 Feb, 38 days left, 42 days over"

#### Scenario: Not in a milestone
- GIVEN project `gin-workflow` with 3 closed milestones and 13 forecast epics whose `milestone` is null
- WHEN the Timeline is shown with "Show closed" off
- THEN the only group is "Not in a milestone" with 13 epic rows in the order of `forecast.epics`

#### Scenario: Order of groups
- GIVEN closed milestone `m0`, chained milestones `m2` then `m3`, an open milestone `m4` not in the chain, and an epic without a milestone
- WHEN the Timeline is shown with "Show closed" on
- THEN the groups are `m0`, `m2`, `m3`, `m4` and "Not in a milestone"

### REQ-MILESTONE-UI-036: Timeline axis and zoom
The Timeline SHALL draw a calendar axis, one equal step per day, that spans from the earliest day of the shown bars to the latest of their last days, the forecast `finish` and the `deadline`, with today included. It SHALL offer the zoom buttons Weeks, Months and Quarters, marked with `aria-pressed`, kept in the URL as `zoom=weeks|months|quarters` with Months when `zoom` is missing or another value, where a day is 24px, 6px and 2px wide, and the axis header SHALL label each Monday ("16 Nov"), each month ("Nov 2026" in January and on the first month shown, else "Dec"), or each quarter ("Q1 2027"). In Weeks, Saturdays and Sundays SHALL be shaded. The axis SHALL show a line for today with the chip "Today" and, when `deadline` is set, a line with the chip "Deadline". The labels SHALL stay in a column on the left while the axis scrolls sideways inside its frame, by scroll or by dragging, and the page SHALL NOT scroll sideways at 390px. WHEN the Timeline opens or the zoom changes, it SHALL scroll so that today is in view near the left edge.

#### Scenario: Zoom
- GIVEN the Timeline of `example` on Months
- WHEN the user presses Quarters
- THEN the URL has `zoom=quarters`, Quarters has `aria-pressed="true"`, a day is 2px wide and the header reads "Q4 2026", "Q1 2027" and so on

#### Scenario: Weeks across a year end
- GIVEN a Timeline whose axis runs from 2026-12-21 to 2027-01-15 on Weeks
- WHEN it is shown
- THEN the header reads "21 Dec", "28 Dec", "4 Jan" and "11 Jan", and the weekends are shaded

#### Scenario: Today and deadline
- GIVEN today 2026-11-26 and a forecast with `deadline` 2026-12-11
- WHEN the Timeline is shown
- THEN a line with "Today" stands at 26 Nov and a line with "Deadline" at 11 Dec, and the view is scrolled so that 26 Nov is near the left edge

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN the Timeline of `example` is shown
- THEN the labels stay visible, the axis scrolls inside its frame, and the page has no horizontal scroll

### REQ-MILESTONE-UI-037: Closed history on the Timeline
The Timeline SHALL offer "Show closed", off by default, kept in the URL as `closed=1`. WHILE it is on, the Timeline SHALL add each closed milestone as a group whose bar runs from its `start` to its `end`, with "Finished <finish>" when `finish` is set, and SHALL add to each group the epics of `closed_epics` (REQ-MILESTONE-UI-008) whose `milestone` is its milestone, and to "Not in a milestone" the others, each with a bar from its `start` to its `end`, before the open epics of the group, all in the Done style of REQ-UI-064.

#### Scenario: Show closed
- GIVEN project `example` with closed milestones `ex-m0a`, `ex-m0b` and `ex-m1`, and closed epic `ex-e2` of `ex-m1` started 2026-10-12 and closed 2026-10-28
- WHEN the user turns on "Show closed"
- THEN the URL has `closed=1`, the three milestones come first, `ex-m0b` reads "Finished 13 Oct", and `ex-e2` has a Done bar from 12 Oct to 28 Oct under `ex-m1`

#### Scenario: Off by default
- GIVEN `/milestones?project=example`
- WHEN the Timeline is shown
- THEN no closed milestone and no closed epic is shown

### REQ-MILESTONE-UI-038: Timeline states
The Timeline SHALL show:
- "No open work to forecast" WHEN `forecast` is null, with the closed history still shown when "Show closed" is on;
- the milestone bars without a hatched part and without epic bars WHEN `forecast.error` is set (REQ-MILESTONE-UI-034 names the error);
- "No open epics" on a milestone row whose `forecast.milestones` entry has `start` and `finish` null;
- a dashed outline and "assumed estimate" in the bar's accessible name for an epic whose `estimate_source` is `assumed`;
- "Closed epics unavailable: Beads could not be read" WHEN "Show closed" is on and `closed_epics` is null;
- the loading state and the error with Retry of the Milestones page while the list loads and IF it fails (REQ-MILESTONE-UI-008).

#### Scenario: No forecast
- GIVEN a project with closed milestones only and `forecast` null
- WHEN the Timeline is shown, and then "Show closed" is turned on
- THEN it says "No open work to forecast", and then shows the closed milestones

#### Scenario: Milestone without open epics
- GIVEN chained milestone `ex-m4` with `start` and `finish` null
- WHEN the Timeline is shown
- THEN its row shows its window and "No open epics"

#### Scenario: Assumed estimate
- GIVEN epic `ex-e12` with `estimate_source` `assumed`
- WHEN the Timeline is shown
- THEN its bar has a dashed outline and its name contains "assumed estimate"

#### Scenario: Closed epics unavailable
- GIVEN a list whose `closed_epics` is null
- WHEN "Show closed" is turned on
- THEN the Timeline says "Closed epics unavailable: Beads could not be read" and still shows the closed milestones

## MODIFIED

### REQ-MILESTONE-UI-001: Milestones list
<!-- base: 6e63a57f6127d00ea3e61540fd2981a089528093bc723a41c37e8f00d32b0046 -->
gin-console SHALL show a Milestones entry in the sidebar that opens the Milestones page of a project (REQ-MILESTONE-UI-033), whose List view lists the milestones with title, status (REQ-MILESTONE-UI-022), start and end (and kickoff when set), parallel lanes, forecast finish, epic progress as the strand of REQ-UI-138 over the counts of REQ-MILESTONE-UI-025, commitment met, and warning count as "<n> warnings" after a dashed ring in the warning color, from `gin milestone list --all --json`, under the column headers Status, Milestone, Period, Parallel lanes, Commitment met, Epics and Warnings. Parallel lanes SHALL read "<n> lanes" ("1 lane" when `<n>` is 1), or "–" when the entry has no `lanes`. The forecast finish SHALL read "Finishes <date>" (REQ-UI-131) when the entry's `finish` is set, in the warning color when the milestone is late (REQ-MILESTONE-UI-023). Commitment met SHALL read "Commitment met <n>%" with the entry's `velocity.say_do` as a whole percent, or "–" when the entry has no `velocity` or its `say_do` is `null`. gin-console SHALL show a list entry's `error` in place of its progress and warnings, SHALL show "No dates" in place of the period of an entry whose `start` or `end` is `null`, SHALL cut a long title short with the full title as `title`, and SHALL NOT show the `unassigned_epics` count, which REQ-MILESTONE-UI-010 replaces with a list.
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

### REQ-MILESTONE-UI-008: Milestones API
<!-- base: 1d2ab3ade1d5366b8ea8a65e436c91737ce19fdbe6275f318539ab37d55e2c93 -->
WHEN a client requests `GET /api/milestones?project=<name>` or `GET /api/milestones/{project}/{id}` with an optional `start=YYYY-MM-DD`, the server SHALL return the output of `gin milestone list --all --json` or `gin milestone show <id> [--start <date>] --json` run in the project directory, including the list's `forecast` with its `milestones` (each with `id`, `start`, `finish` and `overflow_days`, an empty list when the output lacks them) and its `epics` (each with `id`, `title`, `status`, `milestone`, `lane`, `planned_start`, `planned_end`, `remaining_days`, `estimate_source` and `warnings`, each warning with `code` and `days`, an empty list when the output lacks them, and `null`, or `[]` for `warnings`, for a key an epic lacks), the list's `closed_epics` (each closed epic of the project's Beads export labelled `roadmap`, with `id`, `title`, `milestone` (the nearest milestone among its parents, or `null`), `start` (the local date of its `started_at`, else of its `created_at`) and `end` (the local date of its `closed_at`), leaving out one without `closed_at`; `null` when the export cannot be read), the `days_per_point` (`value`, `measured_epics`, `assumed`) of the list and of the shown milestone, the `lanes` and `velocity` (`committed_points`, `completed_points`, `added_points`, `say_do`, `days_per_point`, `planned_days_per_point`, `accuracy`) of each list entry and of the shown milestone, the shown milestone's `integration`, `deadline` and `away`, and each epic's `remaining_days`, `assumed_days`, `points`, `points_reason`, `estimate_source`, `actual_days` and `actual_days_per_point`, with `null` (`{}` for `away`) for each of them that the output lacks, and SHALL accept a list entry whose `start` and `end` are `null` and return them as `null`. It SHALL cache a response without `start` for 5 seconds and never cache one with `start`, SHALL respond 404 for an unknown project or missing directory, 422 without running any command for a `start` that is not an ISO date, and IF the command fails or its output is not `schema: 1`, THEN SHALL respond 502 with `error` and `cause` set to `outdated` (no `milestone` command), `tracking` (project not on Beads tracking), `schema` (schema not 1), or `null`.

#### Scenario: list
- GIVEN project P whose `milestone list --all --json` prints schema 1 with M1
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 200 with M1, `unassigned_epics`, and `today`

#### Scenario: forecast and lanes
- GIVEN project P whose `milestone list` prints M1 with `lanes: 2` and a `forecast` with `deadline: 2026-12-31`, `lanes: 1`, `start: 2026-11-08`, `finish: 2026-12-23`, `overflow_days: 0`, `open_epics: 5`, `unestimated: 1`, `error: null`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response carries M1 with `lanes: 2` and that `forecast` unchanged

#### Scenario: forecast epics
- GIVEN project P whose `milestone list` prints a `forecast` whose `epics` hold `{id: e-1, milestone: M1, lane: 1, planned_start: 2026-11-23, planned_end: 2026-11-25, remaining_days: 3, estimate_source: "points", warnings: []}` and `{id: e-5, milestone: M1, lane: 1, planned_start: 2026-12-23, planned_end: 2027-01-01, remaining_days: null, estimate_source: "assumed", warnings: []}`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response's `forecast.epics` holds `e-1` and `e-5` with every key as printed

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

#### Scenario: Chained milestones
- GIVEN project P whose `forecast.milestones` holds `{id: M2, start: 2026-11-26, finish: 2027-07-02, overflow_days: 150}` and `{id: M4, start: null, finish: null, overflow_days: 0}`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response's `forecast.milestones` holds both unchanged

#### Scenario: Closed epics
- GIVEN project P whose Beads export holds closed epic `e-2` labelled `roadmap` under milestone `m1`, started 2026-10-12 and closed 2026-10-28, closed epic `e-3` labelled `roadmap` without `started_at`, created 2026-10-01 and closed 2026-10-09, and closed epic `e-4` without the `roadmap` label
- WHEN a client requests `GET /api/milestones?project=P`
- THEN `closed_epics` holds `{id: e-2, milestone: m1, start: 2026-10-12, end: 2026-10-28}` and `{id: e-3, milestone: null, start: 2026-10-01, end: 2026-10-09}` with their titles, and not `e-4`

#### Scenario: Closed epics unreadable
- GIVEN project P whose `milestone list` succeeds and whose Beads export cannot be read
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 200 with `closed_epics: null`
