# Milestone ui

## Purpose

## Requirements

### REQ-MILESTONE-UI-001: Milestones list
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

### REQ-MILESTONE-UI-002: Milestone graph
gin-console SHALL show, on a milestone's page, in the Graph view of the Beads tab (REQ-MILESTONE-UI-018, REQ-UI-106), the milestone's epics and their dependency edges, marking dependencies outside the milestone as external.

#### Scenario: graph
- GIVEN milestone M1 with epics A and B, B depending on A
- WHEN the user opens the Graph view of the Beads tab of M1
- THEN A and B are shown with an edge from A to B

#### Scenario: dependency outside the milestone
- GIVEN epic A in M1 depending on epic X in M2
- WHEN the user opens the Graph view of the Beads tab of M1
- THEN X is shown as an external node with an edge to A

### REQ-MILESTONE-UI-003: Milestone Gantt tab
gin-console SHALL show, on a milestone's page, a Gantt tab drawing one continuous bar per epic, weekends included, from `planned_start` to `planned_end` of `gin milestone show --json`, as gin-workflow scheduled them on the milestone's lanes and without rescheduling them, in the look of the epic's state glyph (REQ-UI-064): filled in the In progress colour while it is in progress, in the Done colour when it is closed and in the Blocked colour when it is blocked (REQ-BEADS-021), an outline in the Ready colour when it is open, and a dashed outline in the Deferred colour when it is deferred, the part of a bar after the milestone `end` hatched in the warning colour, with a line at the JSON `today` date, a line at the milestone `end`, and each epic's warnings as the verdict of REQ-MILESTONE-UI-024, reading `spec_due` as "Spec due before kick-off", `after_integration` as "Ends after integration on <integration date>", `open_bugs` as "<count> open bug(s)" and `oversized` as "<days> working day(s) longer than the milestone", and any other code as the code itself.

#### Scenario: overflow shown
- GIVEN milestone M1 whose `show` output gives epic A warning `overflow` of 2 days
- WHEN the user opens the Gantt tab of M1
- THEN A's bar extends past the end line, the part past it hatched in the warning colour, and A's verdict reads "2 working days past the end"

#### Scenario: lane-bound dates
- GIVEN milestone M1 with `lanes: 1` whose `show` output places independent epics A on 2026-11-09 to 2026-11-10 and B on 2026-11-11 to 2026-11-12
- WHEN the user opens the Gantt tab of M1
- THEN B's bar starts on 2026-11-11, after A's bar ends, and not alongside A

#### Scenario: today from the JSON
- GIVEN milestone M1 whose `show` output has `today: 2026-11-04`
- WHEN the user opens the Gantt tab of M1
- THEN the today line is drawn at 2026-11-04 whatever the browser's date

#### Scenario: external blocker named
- GIVEN epic A in M1 with warning `external_blocker` and `external_depends_on` `[{"id": "E9", "milestone": "M2"}]`
- WHEN the user opens the Gantt tab of M1
- THEN A shows an external blocker warning naming E9 and M2

#### Scenario: newer warnings
- GIVEN epics in M1 with warnings `spec_due`, `after_integration` (integration 2026-11-24), `open_bugs` with `count: 2` and `oversized` with `days: 3`
- WHEN the user opens the Gantt tab of M1
- THEN their verdicts read "Spec due before kick-off", "Ends after integration on 24 Nov", "2 open bugs" and "3 working days longer than the milestone"

#### Scenario: One bar per epic
- GIVEN in-progress epic A planned from Thursday 2026-11-05 to Wednesday 2026-11-11
- WHEN the user opens the Gantt tab
- THEN A is one continuous bar filled in the In progress colour from 5 Nov to 11 Nov, across the weekend, and not one pill per working day

### REQ-MILESTONE-UI-004: Kick-start preview
WHILE a milestone is `planned` or `scheduled`, gin-console SHALL show on its Gantt tab a Kick-start date picker defaulting to `kickoff`, else `start`, and WHEN the user picks a date SHALL redraw the Gantt from `gin milestone show <id> --start <date> --json`, labelled as a read-only preview with the command `gin milestone kickstart <id> --date <date>`; it SHALL NOT show the picker for `active` or `closed` milestones, and IF the preview fails, THEN it SHALL show the error in the Gantt tab instead of any plan.

#### Scenario: preview
- GIVEN planned milestone M1
- WHEN the user picks 2026-11-16 as the kick-start date
- THEN the Gantt is drawn from 2026-11-16, labelled preview, and shows `gin milestone kickstart M1 --date 2026-11-16`

#### Scenario: active milestone
- GIVEN active milestone M1
- WHEN the user opens its Gantt tab
- THEN no Kick-start date picker is shown

#### Scenario: preview fails
- GIVEN planned milestone M1 whose `show --start 2026-11-16` exits 1
- WHEN the user picks 2026-11-16
- THEN the Gantt tab shows the error and no bars

### REQ-MILESTONE-UI-005: Milestones unavailable
IF the installed gin-workflow has no `milestone` command, reports a `schema` other than 1, or reports that milestones need `providers.task_tracking: beads`, THEN gin-console SHALL show an error on the Milestones pages that names the cause and the fix (`gin-workflow/install.sh`, or switching the project to Beads tracking).

#### Scenario: old gin-workflow
- GIVEN project P whose gin-workflow has no `milestone` command
- WHEN the user opens Milestones for P
- THEN an error says milestones need a newer gin and to run `gin-workflow/install.sh`

#### Scenario: markdown tracking
- GIVEN project P with `providers.task_tracking: markdown`
- WHEN the user opens Milestones for P
- THEN an error says milestones need `providers.task_tracking: beads`

#### Scenario: unknown schema
- GIVEN project P whose `milestone list` reports `schema: 2`
- WHEN the user opens Milestones for P
- THEN an error says schema 2 is not supported and no milestone is listed

### REQ-MILESTONE-UI-006: Project Dependencies graph unchanged by milestones
gin-console's project-level Dependencies graph SHALL treat a parent of type `milestone` as no parent, so that epics under milestones keep their own nodes and epic-to-epic edges.

#### Scenario: epics under a milestone
- GIVEN epics A and B, B depending on A, both children of milestone M1
- WHEN the user opens the project Dependencies graph
- THEN A and B are shown as nodes with an edge from A to B, and M1 does not hide them

### REQ-MILESTONE-UI-007: Milestones are not ready work in the console
gin-console SHALL exclude beads of type `milestone` from the ready work it collects.

#### Scenario: open milestone without blockers
- GIVEN open milestone M1 without blockers
- WHEN the console collects ready beads for the project
- THEN M1 is not counted or flagged as ready

### REQ-MILESTONE-UI-008: Milestones API
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

### REQ-MILESTONE-UI-009: Milestone beads hidden from Beads views
The List, Board, Focus, and Dependencies views SHALL NOT show beads of type `milestone`, and SHALL show the beads whose parent is a milestone as having no parent.

#### Scenario: list view
- GIVEN milestone M1 with child epics A and B
- WHEN the user opens the List view
- THEN M1 is not listed and A and B are roots

#### Scenario: board view
- GIVEN open milestone M1 and open epic A
- WHEN the user opens the Board view
- THEN A is on the board and M1 is in no column

### REQ-MILESTONE-UI-010: Epics not in a milestone
gin-console SHALL show, below the milestones of the Milestones page, a section "Epics not in a milestone" listing each bead of type `epic` without a parent from `GET /api/beads` for the project, each row with its state, id, title linked to `/beads/<project>/<id>`, priority, and labels, ordered by priority then id, SHALL show in the section heading the number of listed rows, SHALL list only open epics unless a "Show closed" checkbox is checked, which adds closed epics shown dimmed, and IF the beads request fails, THEN SHALL show the error and a Retry button in the section without changing the milestones.

#### Scenario: epics without a parent
- GIVEN project P with open epics A (labelled `roadmap`) and B (no labels) without a parent, open epic C whose parent is milestone M1, open epic D whose parent is epic A, and open task T without a parent
- WHEN the user opens Milestones for P
- THEN the section heading shows 2, and the section lists A and B only, each title linking to its bead page

#### Scenario: show closed
- GIVEN project P with open epic A and closed epic E, both without a parent
- WHEN the user checks "Show closed"
- THEN the section lists A and E with E dimmed, and the heading shows 2

#### Scenario: every epic in a milestone
- GIVEN project P whose open epics all have a milestone parent
- WHEN the user opens Milestones for P
- THEN the section heading shows 0 and the section says every epic is in a milestone

#### Scenario: beads request fails
- GIVEN project P whose milestones load and whose `GET /api/beads` responds 502
- WHEN the user opens Milestones for P
- THEN the milestones are listed, the section shows the error with a Retry button, and Retry requests the beads again

### REQ-MILESTONE-UI-011: Gantt zoom
The Gantt tab SHALL offer the zoom modes `1 week`, `2 weeks` and `Whole milestone`, SHALL take the mode from the URL parameter `zoom` (`1w`, `2w`, or absent for the whole milestone, which is also used for any other value), SHALL write the chosen mode to that parameter while keeping `tab` and `start`, and in every mode SHALL size the working-day columns so that the days in view span the chart width: the whole plan for `Whole milestone`, seven or fourteen calendar days for `1 week` or `2 weeks`, with weekend columns kept narrow. WHEN a zoomed mode opens, the first day in view SHALL be the Monday of the week that holds the JSON `today` if that day is within the plan, else the Monday of the week that holds the plan's first day.

#### Scenario: whole milestone fills the width
- GIVEN milestone M1 whose plan spans 2026-11-02 to 2026-11-11 and a URL without `zoom`
- WHEN the user opens the Gantt tab of M1
- THEN `Whole milestone` is selected and the last day of the plan ends at the right edge of the chart

#### Scenario: two weeks from today
- GIVEN milestone M1 whose plan spans 2026-11-02 to 2026-11-27 and `today: 2026-11-11`
- WHEN the user chooses `2 weeks`
- THEN the URL has `zoom=2w` and the days in view are 2026-11-09 to 2026-11-22

#### Scenario: today outside the plan
- GIVEN milestone M1 whose plan starts on Wednesday 2026-11-04 and `today: 2026-10-29`
- WHEN the user opens the Gantt tab of M1 with `zoom=1w`
- THEN the days in view are 2026-11-02 to 2026-11-08

#### Scenario: unknown zoom
- GIVEN a URL with `zoom=3w`
- WHEN the user opens the Gantt tab
- THEN `Whole milestone` is selected

#### Scenario: zoom kept with the preview
- GIVEN planned milestone M1 shown with `zoom=1w`
- WHEN the user picks a kick-start date
- THEN the URL keeps `zoom=1w` and the preview is drawn at one week

### REQ-MILESTONE-UI-012: Gantt panning
WHILE the Gantt is zoomed to `1 week` or `2 weeks`, gin-console SHALL draw the whole plan in a chart that scrolls sideways, SHALL offer ‹ and › that move the first day in view to the previous or next Monday one or two weeks away, each disabled at its end of the plan, and SHALL show the first and last day in view, updated on every move. WHILE the chart is wider than its view, in any zoom mode, gin-console SHALL move the days in view when the user drags the chart with the mouse further than 4 px, scrolls sideways, or swipes, and SHALL NOT follow a link or toggle a control when the pointer was released at the end of such a drag. WHEN the plan refreshes, the days in view SHALL stay the same.

#### Scenario: drag to later dates
- GIVEN milestone M1 zoomed to `1 week` with 2026-11-02 to 2026-11-08 in view
- WHEN the user drags the chart to the left by the width of one week
- THEN 2026-11-09 to 2026-11-15 are in view and the label reads "9 Nov – 15 Nov"

#### Scenario: drag over a link
- GIVEN milestone M1 zoomed to `1 week`
- WHEN the user presses on an epic id, drags 40 px and releases
- THEN the days in view move and the bead page is not opened

#### Scenario: step by a period
- GIVEN milestone M1 zoomed to `2 weeks` with 2026-11-02 to 2026-11-15 in view
- WHEN the user presses ›
- THEN 2026-11-16 to 2026-11-29 are in view

#### Scenario: end of the plan
- GIVEN milestone M1 zoomed to `1 week` with the first day of the plan in view
- WHEN the Gantt is shown
- THEN ‹ is disabled

#### Scenario: whole milestone does not pan
- GIVEN milestone M1 shown as `Whole milestone` on a screen wide enough for the plan
- WHEN the Gantt is shown
- THEN ‹, › and the label of days in view are not shown and dragging does not move the chart

### REQ-MILESTONE-UI-013: Readable Gantt rows
Each epic row of the Gantt SHALL show, in a label column 168px wide under 1024px windows, 300px from 1024px, 380px from 1280px and 440px from 1600px that stays visible while the chart scrolls and that no chart line, arrow, bar or title crosses, the state glyph (REQ-UI-064) and title on one line and the epic id (linking to its bead page), the estimate as text (REQ-UI-140), the period, the strand of its tracks (REQ-UI-138), prep and spec on the next, the estimate reading "<n>d", or "<n>d left" when the epic is in progress and its `remaining_days` is below its estimate, or "assumed <n>d" when it has no estimate and `assumed_days` is set, preceded by "<p> pt, " when the epic has `points`, each line cut short with an ellipsis instead of wrapping and the full title available on hover, except that under 1024px the items of the second line (id, estimate, period, strand, prep, spec) wrap onto further lines rather than being cut, followed by the verdict of REQ-MILESTONE-UI-024, the spec item being left out when a warning of the epic already says the spec is not confirmed; WHEN at least 90 px of chart are left after an epic's bar, the row SHALL also show the epic's title after the bar, cut short with an ellipsis before the next end or today line or the edge of the chart.

#### Scenario: long id
- GIVEN epic `gin-workflow-rm-process-hygiene` titled "Process hygiene: consistent skills, rules that bind where it matters"
- WHEN the Gantt is shown on a phone
- THEN the title takes one line cut short with an ellipsis, and the id, period and strand wrap onto the following lines, none of them cut to less than its first word

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
- THEN C's second line reads "5 pt, 7d" and D's reads "3 pt, 1d left"

#### Scenario: Wide window
- GIVEN in-progress epic `ex-e3` with `points: 8`, `estimate_days: 20`, `remaining_days: 11`, 5 of 11 tracks closed and no confirmed spec, in an active milestone that warns "Spec not confirmed"
- WHEN the Gantt is shown at 2000px
- THEN the label column is 440px wide, the second line starts with the id and "8 pt, 11d left" and is cut with an ellipsis inside the column, it does not say "No confirmed spec", and no text of the label column overlaps a bar or a line

#### Scenario: Tail title stops at the end line
- GIVEN an epic whose bar ends 60px before the milestone's end line and whose title is longer than that
- WHEN the Gantt is shown
- THEN its title after the bar ends with an ellipsis before the end line

### REQ-MILESTONE-UI-014: Dependency arrows on the Gantt
For each epic B of the milestone and each id A in B's `depends_on` that is an epic of the same milestone, the Gantt SHALL draw an arrow from the end of A's last bead to the start of B's first bead, in the blocked color IF B's `planned_start` is not after A's `planned_end`, and SHALL draw no arrow for an id that is not an epic of the milestone. WHILE the pointer is over an epic's row or bar, or focus is inside its row, the Gantt SHALL highlight that epic, every epic it depends on or that depends on it directly or through other epics, and the arrows between them, and SHALL fade the other epics and arrows.

#### Scenario: arrow
- GIVEN epic B in M1 with `depends_on: ["A"]`, A planned 2026-11-02 and B planned 2026-11-03
- WHEN the user opens the Gantt tab of M1
- THEN an arrow runs from the end of A's bead on 2026-11-02 to the start of B's bead on 2026-11-03

#### Scenario: dependency outside the milestone
- GIVEN epic B in M1 with `depends_on: ["X"]` where X is not an epic of M1
- WHEN the user opens the Gantt tab of M1
- THEN no arrow is drawn for X

#### Scenario: chain highlight
- GIVEN epics A, B, C, D in M1 where B depends on A, C depends on B, and D has no dependency
- WHEN the user points at B
- THEN A, B, C and the arrows A→B and B→C are highlighted and D is faded

#### Scenario: dependent starts too early
- GIVEN epic B in M1 depending on A, with A planned to end 2026-11-05 and B planned to start 2026-11-05
- WHEN the user opens the Gantt tab of M1
- THEN the arrow from A to B is drawn in the blocked color

### REQ-MILESTONE-UI-015: Child beads on the Gantt
The Gantt SHALL load the project's beads, open and closed, and for each epic with beads whose `parent` is that epic and that are not merge gates (REQ-BEADS-019) SHALL show an expand button in its row, with the strand of REQ-UI-138 over its tracks when it has a track and "Prep x/y" (closed prep tasks over all prep tasks, REQ-BEADS-002) when it has a prep task, a track being a child that is neither a prep task nor a merge gate; WHEN the user expands an epic, the Gantt SHALL show under it one row per child that is not a merge gate, prep tasks included, ordered by id, with the child's state glyph (REQ-UI-064), its id (linking to its bead page), its title, the word "Prep" for a prep task (REQ-UI-140), its lane (REQ-UI-115), and "closed <date>" from `closed_at` for a closed child or its status otherwise, and SHALL shade the parent epic's period in those rows without drawing bars for them. Epics SHALL start collapsed, and expanding or collapsing one SHALL leave the others as they are. IF the beads cannot be loaded, THEN the Gantt SHALL be drawn without expand buttons or counts.

#### Scenario: expand
- GIVEN epic `gin-workflow-rm-cost-control` with four closed children, closed on 2026-11-01
- WHEN the user expands it
- THEN four rows `.1` to `.4` are shown under it, each with "closed 1 Nov", and the epic row shows the strand with "4/4"

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
- THEN `e-1` shows the strand with "1/2" and "Prep 1/1" with rows `p-1`, `t-1` and `t-2`, `e-2` shows "Prep 0/1" and no strand with the row `p-2`, and only `p-1` and `p-2` show the word "Prep"

#### Scenario: merge gate and lane
- GIVEN epic `e-1` with track `t-1` in lane `be` (open) and merge gate `g-1` (open) whose parent is `e-1`
- WHEN the user expands `e-1`
- THEN `e-1` shows the strand with "0/1", the only row is `t-1` with the lane "be", and `g-1` has no row

## Diagrams
- [Milestones forecast](diagrams/milestones-forecast-activity.md)
- [Milestone Beads tab](diagrams/milestone-beads-tab-activity.md)
- [Milestone Retro tab](diagrams/milestone-retro-activity.md)
- [Milestone velocity](diagrams/milestone-velocity-activity.md)
- [Milestone status](diagrams/milestone-state.md)
- [Milestone status and late mark](diagrams/milestone-status-activity.md)
- [Gantt verdict](diagrams/gantt-verdict-activity.md)
- [WBS export](diagrams/wbs-export-activity.md)
- [Project timeline](diagrams/project-timeline-activity.md)

## Use Cases
- [Read the verdict of a Gantt row](use-cases/read-gantt-verdict.md)
- [Export a WBS](use-cases/export-wbs.md)
- [See the project timeline](use-cases/see-project-timeline.md)

### REQ-MILESTONE-UI-016: Project forecast card
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

### REQ-MILESTONE-UI-017: Lanes on the milestone page
WHEN a milestone's `show` output has `lanes`, gin-console SHALL show "<n> lanes" ("1 lane" when `<n>` is 1) in the milestone page header next to the finish line, and SHALL show nothing in its place when `lanes` is missing.
Source: `assets/2026-11-08/mockup/index.html#milestone`

#### Scenario: lanes shown
- GIVEN milestone M1 whose `show` output has `lanes: 2`
- WHEN the user opens M1
- THEN the header shows "2 lanes"

#### Scenario: older gin-workflow
- GIVEN milestone M1 whose `show` output has no `lanes` key
- WHEN the user opens M1
- THEN the header shows no lane count and the rest of the header is unchanged

### REQ-MILESTONE-UI-018: Beads tab on the milestone page
The milestone page SHALL offer the tabs Gantt, Beads and Retro (REQ-MILESTONE-UI-019), kept in the URL as `tab` (`gantt` when absent or unknown, `beads`, `retro`), and SHALL treat `tab=graph` as `tab=beads` with `view=graph`. WHILE the Beads tab is shown, the page SHALL show the Beads views (REQ-UI-030) of the milestone's project with the milestone fixed to this one, no Milestone filter in the filter bar or its sheet (REQ-UI-142) and "Clear filters" leaving the milestone as it is (REQ-UI-143), SHALL keep their search, filters, view, selection and graph scope in the milestone page's URL with the names the Beads page uses, and SHALL fetch closed beads without "Show closed" WHILE the milestone is closed. WHEN the user changes tab, the page SHALL keep only `start` and `zoom` of the query besides `tab`.

#### Scenario: Beads tab
- GIVEN milestone `m2` of project `p` with epics `e1` and `e2` and a bead `x` under milestone `m3`
- WHEN the user opens `/milestones/p/m2?tab=beads`
- THEN the List view shows `e1` and `e2` and not `x`, and there is no Milestone filter

#### Scenario: View and filters in the URL
- GIVEN the Beads tab of `m2`
- WHEN the user chooses Board and the status "open"
- THEN the URL is `/milestones/p/m2?tab=beads&view=board&status=open` and reloading it shows the same Board and filter

#### Scenario: Clear filters keeps the milestone
- GIVEN the Beads tab of `m2` at `/milestones/p/m2?tab=beads&view=board&status=open`
- WHEN the user chooses "Clear filters"
- THEN the URL is `/milestones/p/m2?tab=beads&view=board` and the Board shows the beads of `m2`

#### Scenario: Changing tab
- GIVEN `/milestones/p/m2?tab=beads&view=board&status=open&start=2026-11-10&zoom=2w`
- WHEN the user chooses Gantt and then Beads
- THEN the URL is `/milestones/p/m2?start=2026-11-10&zoom=2w` and then `/milestones/p/m2?tab=beads&start=2026-11-10&zoom=2w`, and the List view shows no filter

#### Scenario: Old Graph link
- GIVEN a link to `/milestones/p/m2?tab=graph`
- WHEN it is opened
- THEN the Beads tab is shown on the Graph view

#### Scenario: Closed milestone
- GIVEN closed milestone `m1` whose beads are all closed
- WHEN the user opens its Beads tab with "Show closed" off
- THEN the closed beads of `m1` are shown

### REQ-MILESTONE-UI-019: Retro tab on the milestone page
The milestone page SHALL offer a third tab "Retro", kept in the URL as `tab=retro` and labelled with the number of members who left a retro, that SHALL read the comments of the milestone bead through `GET /api/beads/{project}/{id}/comments` and show:
- the newest comment that starts with `[gin close] <milestone id>`, with its author and date and the text after each of the labels `Delivered:`, `Spillover:`, `Outcome:`, `Demo:`, `Retros:`, `Metrics:` and `Action:` that it holds, rendered as Markdown, leaving out a label it lacks;
- for each member, by name, the newest comment that starts with `[gin retro] <milestone id> <member>`, with its date and the text after `Went well:`, `Slowed us:` and `Change next:`;
- a comment with one of these prefixes but none of the labels, as its full text with the note "Not in the expected format";
- "No retros yet. Members record one with `/retro`." when there is no retro and no close comment.
IF the comments cannot be loaded, THEN the tab SHALL show the error with a Retry button.

#### Scenario: Close and retros
- GIVEN milestone `m1` with a comment `[gin close] m1` holding `Delivered:`, `Spillover:` and `Action:`, and comments `[gin retro] m1 ann` and `[gin retro] m1 bao`
- WHEN the user opens `/milestones/p/m1?tab=retro`
- THEN the tab reads "Retro 2", shows the close block with Delivered, Spillover and Action, then the retros of ann and bao

#### Scenario: Newest retro per member
- GIVEN two comments `[gin retro] m1 ann` from 10 Nov and 12 Nov
- WHEN the Retro tab is shown
- THEN only the retro of 12 Nov is shown for ann

#### Scenario: Retro of another milestone
- GIVEN a comment `[gin retro] m2 ann` on the bead of `m1`
- WHEN the Retro tab of `m1` is shown
- THEN it is not counted or shown

#### Scenario: Not in the expected format
- GIVEN a comment `[gin retro] m1 chi` with no `Went well:`, `Slowed us:` or `Change next:`
- WHEN the Retro tab is shown
- THEN chi's comment is shown in full with "Not in the expected format"

#### Scenario: Nothing yet
- GIVEN milestone `m1` without retro or close comments
- WHEN the Retro tab is shown
- THEN it reads "Retro" without a number and says "No retros yet. Members record one with `/retro`."

### REQ-MILESTONE-UI-020: Integration, deadline and away in the milestone header
WHEN a milestone's `show` output has `integration`, `deadline` or a non-empty `away`, the milestone page header SHALL show "Integration <date>", "Deadline <date>" and "Away: <member> <dates>, …" (each range of a member as a date or "<from>–<to>"), and SHALL show nothing for each of them that is `null`, empty or missing.

#### Scenario: All three
- GIVEN milestone `m1` whose `show` output has `integration: 2026-11-24`, `deadline: 2026-11-28` and `away: {"ann": ["2026-11-18..2026-11-20"], "bao": ["2026-11-25"]}`
- WHEN the user opens `m1`
- THEN the header shows "Integration 24 Nov", "Deadline 28 Nov" and "Away: ann 18–20 Nov, bao 25 Nov"

#### Scenario: Older gin-workflow
- GIVEN milestone `m1` whose `show` output has no `integration`, `deadline` or `away` key
- WHEN the user opens `m1`
- THEN the header shows none of them and the rest of the header is unchanged

### REQ-MILESTONE-UI-021: Velocity on the milestone page
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

### REQ-MILESTONE-UI-022: Status of a milestone bead
Wherever the frontend shows the state of a bead of type `milestone` (the header of its bead page, and any view that draws a milestone bead with a state mark; the Beads views leave milestone beads out, REQ-MILESTONE-UI-009), it SHALL show its milestone status (Planned, Scheduled, Active or Closed) from `GET /api/beads/milestones` (REQ-BEADS-015) instead of its bead status; the Milestones list, the milestone page, the milestone card of a bead page and the Team tab SHALL draw a milestone status with the same icon and word. IF that request fails, THEN the bead page SHALL show the bead status as REQ-UI-064 describes.

#### Scenario: Bead page of a milestone
- GIVEN milestone `ex-m2` with status `open` whose kick-off was on 10 Nov 2026, shown on 21 Nov 2026
- WHEN its bead page is shown
- THEN its header shows "Active" with the active icon and not "Open" or "Ready"

#### Scenario: Milestones unavailable
- GIVEN `GET /api/beads/milestones` answers 502
- WHEN the bead page of `ex-m2` is shown
- THEN its header shows its bead status

### REQ-MILESTONE-UI-023: Late milestone
Type: business-rule
A milestone SHALL be late WHEN it is not closed and today is after its `end`, WHEN it is not closed and its forecast `finish` (REQ-MILESTONE-UI-008) is after its `end`, or WHEN it is closed and the day it closed is after its `end`. The Milestones list (REQ-MILESTONE-UI-001), the milestone card of a bead page and of an epic Overview (REQ-UI-120), the Team tab (REQ-REPORTS-012), the Team headline (REQ-UI-095) and the Overview page (REQ-OVERVIEW-007) SHALL mark a milestone late by this rule only, and "behind pace" SHALL describe the pace of closing only, never lateness.

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
- THEN `m3` reads "Closed, on time" and `m4` reads "Closed, 2 d late"

#### Scenario: Behind pace is not late
- GIVEN active milestone `m5` ending on 11 Dec 2026 with a forecast `finish` of 10 Dec 2026, `pace` 2.0 and `pace_needed` 3.4, shown on 21 Nov 2026
- WHEN the Team tab is shown
- THEN its headline says "behind pace" and nothing calls `m5` late

### REQ-MILESTONE-UI-024: One verdict per Gantt row
Each epic row of the Gantt SHALL show at most one verdict, on one line under its label: the first of the epic's warning lines (REQ-MILESTONE-UI-003, one line per warning and one per entry of `external_depends_on` for `external_blocker`) in the order `late`, `overflow`, `external_blocker`, `after_integration`, `oversized`, `open_bugs`, `spec_due`, `spec_not_ready`, `unestimated`, then any other code, written as REQ-MILESTONE-UI-003 writes it, in the warning colour after the Blocked glyph (REQ-UI-064) drawn in the warning colour for `late` and `external_blocker` and a dashed ring in the warning colour for any other code, followed by "+<n>" WHEN the epic has n further warning lines; the verdict SHALL carry a tooltip (REQ-UI-132) listing every warning line of the epic in that order; an epic without warnings SHALL show no verdict, and the height of a row SHALL NOT depend on the number of its warnings.
Source: `../ui/assets/2026-11-22/index.html#reports`, `../ui/assets/2026-11-22/reports-light.png`

#### Scenario: Several warnings
- GIVEN epic A of milestone M1 with the warnings `spec_due`, `open_bugs` with `count: 2` and `overflow` with `days: 2`
- WHEN the Gantt of M1 is shown
- THEN A's verdict reads "2 working days past the end" after a dashed ring, followed by "+2", and its tooltip lists "2 working days past the end", "2 open bugs" and "Spec due before kick-off" in that order

#### Scenario: Late comes first
- GIVEN epic B with the warnings `unestimated` and `late`, planned to end on 12 Nov
- WHEN the Gantt is shown
- THEN B's verdict reads "Late: should have finished 12 Nov" after the Blocked glyph, followed by "+1"

#### Scenario: No warnings
- GIVEN epic C without warnings
- WHEN the Gantt is shown
- THEN C's row shows no verdict

#### Scenario: Same height
- GIVEN epic D with 5 warnings and epic E with 1 warning
- WHEN the Gantt is shown
- THEN the rows of D and E have the same height

### REQ-MILESTONE-UI-025: Epic counts by state in the Milestones list
WHEN a client requests `GET /api/milestones?project=<name>`, the server SHALL add to the `epics` of each list entry the counts `in_progress`, `blocked`, `ready` and `deferred` of the milestone's epics that are not closed, each epic counted in the state the Board gives it (REQ-UI-031, REQ-BEADS-021), taken from the project's Beads export (REQ-BEADS-012) by the children of the milestone bead, keeping `total` and `closed` from `gin milestone list`; WHEN the milestone bead is not in the export, these counts SHALL be 0 and `ready` SHALL be `total` minus `closed`.

#### Scenario: Counts by state
- GIVEN milestone `m1` whose list entry has `epics` `{total: 4, closed: 1}`, and whose bead has the epics `e-1` (closed), `e-2` (in progress), `e-3` (open, blocked by an open bead) and `e-4` (open and ready)
- WHEN a client requests `GET /api/milestones?project=<name>`
- THEN `m1` has `epics` `{total: 4, closed: 1, in_progress: 1, blocked: 1, ready: 1, deferred: 0}`

#### Scenario: Milestone bead missing
- GIVEN milestone `m2` whose list entry has `epics` `{total: 3, closed: 1}` and no bead in the export
- WHEN a client requests the list
- THEN `m2` has `epics` `{total: 3, closed: 1, in_progress: 0, blocked: 0, ready: 2, deferred: 0}`

### REQ-MILESTONE-UI-026: WBS export endpoint
WHEN a client requests `GET /api/milestones/{project}/wbs` with query parameter `format` (`xlsx`, `csv`, or `md`) and optional `milestone` (a milestone bead id), the server SHALL read the project's Beads snapshot including closed beads (REQ-BEADS-012) and the project's milestone list and detail(s) from `gin`, SHALL build the WBS rows (REQ-MILESTONE-UI-027, REQ-MILESTONE-UI-028), and SHALL return HTTP 200 with `Content-Disposition: attachment; filename="<project>-wbs-<YYYY-MM-DD>.<ext>"` (or `<project>-<milestone>-wbs-<YYYY-MM-DD>.<ext>` when `milestone` is given) and the matching media type (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv; charset=utf-8`, or `text/markdown; charset=utf-8`). The server SHALL respond 404 when `project` is not configured or `milestone` is not a milestone in the project's snapshot, and SHALL respond 422 when `format` is missing or not one of `xlsx`, `csv`, `md`, or when `milestone` contains characters outside letters, digits, `.`, `_`, and `-`. IF the project's Beads export cannot be read, THEN the server SHALL respond 502 with `error` set to the reason. IF `gin milestone list` or `gin milestone show` fails, THEN the server SHALL still return HTTP 200 using the Beads snapshot alone, leaving `gin`-derived planned dates, forecast end, and epic estimates blank, and SHALL include a warning message in the `X-WBS-Warning` response header as well as in the Excel `About` sheet and Markdown header.

#### Scenario: Milestone Excel download
- GIVEN configured project `alpha` with milestone `m1`
- WHEN a client requests `GET /api/milestones/alpha/wbs?milestone=m1&format=xlsx` on `2026-11-24`
- THEN the server responds 200 with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="alpha-m1-wbs-2026-11-24.xlsx"`

#### Scenario: Project CSV download
- GIVEN configured project `alpha`
- WHEN a client requests `GET /api/milestones/alpha/wbs?format=csv` on `2026-11-24`
- THEN the server responds 200 with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="alpha-wbs-2026-11-24.csv"`

#### Scenario: Invalid project, milestone, or format
- GIVEN configured project `alpha` without milestone `m99`
- WHEN a client requests `/api/milestones/nope/wbs?format=md`, `/api/milestones/alpha/wbs?milestone=m99&format=md`, `/api/milestones/alpha/wbs?format=pdf`, and `/api/milestones/alpha/wbs?milestone=a%20b&format=md`
- THEN the responses are 404, 404, 422, and 422

#### Scenario: Unreadable Beads export
- GIVEN configured project `alpha` whose `.beads/issues.jsonl` cannot be read
- WHEN a client requests `GET /api/milestones/alpha/wbs?format=csv`
- THEN the server responds 502 with a non-empty `error`

#### Scenario: Degraded gin CLI fallback
- GIVEN configured project `alpha` with milestone `m1` whose snapshot has epic `e1` and task `t1`, while `gin milestone show` fails
- WHEN a client requests `GET /api/milestones/alpha/wbs?milestone=m1&format=md`
- THEN the server responds 200 with rows for `m1`, `e1`, and `t1`, blank `gin`-derived dates and epic estimates, a non-empty `X-WBS-Warning` header, and the warning noted in the Markdown header

### REQ-MILESTONE-UI-027: WBS hierarchy, ordering, and numbering
Type: business-rule
WHEN building WBS rows for a milestone or a project, the server SHALL include all open and closed beads in scope EXCEPT prep tasks (label `prep`) and merge gates (REQ-BEADS-019), SHALL guard against parent-child cycles, and SHALL assign deterministic hierarchical WBS numbers (`1`, `1.1`, `1.1.1`, continuing for any deeper levels):
- For a milestone scope, the milestone bead SHALL be root `1`, its child epics `1.n`, and their descendants `1.n.m` (and deeper).
- For a project scope, top-level roots SHALL be ordered as: (1) milestones ordered by planned `start` ascending (nulls last) then `id`, (2) epics with no milestone parent ordered by planned start ascending (nulls last), priority ascending, then `created_at` ascending and `id`, and (3) parentless non-epic beads ordered by priority ascending, then `created_at` ascending and `id`.
- Children of any node SHALL be ordered: epics by planned start ascending (nulls last), priority ascending, `created_at` ascending, then `id`; non-epics by priority ascending, `created_at` ascending, then `id`.
- An empty scope (e.g. a project with no beads or a milestone with no children) SHALL produce a valid row list without error.

#### Scenario: Milestone hierarchy and exclusion of prep and merge gates
- GIVEN milestone `m1` with epic `e1` (planned start `2026-12-01`) and epic `e2` (planned start `2026-12-05`), where `e1` has open task `t1`, closed task `t2`, a `prep`-labelled task `p1`, and a merge gate `g1`
- WHEN the WBS is built for milestone `m1`
- THEN rows are numbered `1` (`m1`), `1.1` (`e1`), `1.1.1` (`t1` or `t2` by priority/created), `1.1.2` (the other task), and `1.2` (`e2`), and neither `p1` nor `g1` appears

#### Scenario: Project root ordering and deeper nesting
- GIVEN project `alpha` with milestone `m2` (start `2026-12-20`), milestone `m1` (start `2026-12-01`), unassigned epic `e9`, parentless bug `b1`, and a task `t1` under `e9` with child task `t1a`
- WHEN the WBS is built for project `alpha`
- THEN roots are numbered `1` (`m1`), `2` (`m2`), `3` (`e9`), `4` (`b1`), and `t1a` is numbered `3.1.1`

#### Scenario: Cycle guard
- GIVEN two beads `a` and `b` whose `parent-child` links form a cycle
- WHEN the WBS is built
- THEN the builder terminates without infinite recursion and emits each bead at most once

### REQ-MILESTONE-UI-028: WBS row fields and definitions
Type: business-rule
WHEN populating columns for each WBS row, the server SHALL compute:
- `WBS`: hierarchical number from REQ-MILESTONE-UI-027;
- `ID`: bead id;
- `Name`: bead title;
- `Type`: plain bead type label (e.g. Milestone, Epic, Task, Bug, Feature, Chore);
- `Status`: plain status word using the shared rules (`Done` when `is_done`, `Blocked` when `is_blocked`, `In progress` when `in_progress`, else `Open`);
- `Assignee`: normalized person display name (`member_of`) or `Unassigned`, NEVER reading the bead's `owner` field (REQ-UI-135);
- `Points`: `metadata.points` for epics and tasks (blank if unset), and the sum of its child epics' points for milestones (blank if none are set);
- `Estimate (days)`: for epics, `gin` `estimate_days`, else `gin` `assumed_days` followed by `(assumed)` (gin leaves `estimate_days` null for an assumed estimate), else blank; for milestones, the sum of its epics' estimate days, assumed ones included; for tasks/bugs, `estimated_minutes / 480` when set, else blank;
- `Planned start` and `Planned end`: `metadata.start`/`metadata.end` for milestones; for epics, `planned_start`/`planned_end` from `gin milestone show` of the epic's milestone, or from the `forecast.epics` of `gin milestone list` for an epic without a milestone; blank for tasks/bugs;
- `Forecast end`: `gin` `finish` for milestones; for epics, the date of `closed_at` when closed else forecast `planned_end` from `gin milestone list`; blank for tasks/bugs;
- `% done`: for milestones, done points ÷ total points of its epics using the burn-up rule (blank when total points is 0); for epics, closed tracks ÷ total tracks from `child_counts`, `100%` when the epic is closed, `0%` when open and not split; for tasks/bugs, `100%` when closed else `0%`;
- `Depends on`: comma-separated WBS numbers for blockers present in the exported WBS, falling back to the blocker's bead id when the blocker is outside the exported scope.

#### Scenario: Assignee never uses owner and blocked uses is_blocked
- GIVEN open task `t1` with `owner: "alice@example.com"`, `assignee: null`, blocked by open task `t2` (WBS `1.1.1`) and external bead `ext-9`
- WHEN `t1`'s WBS row is built
- THEN `Status` is `Blocked`, `Assignee` is `Unassigned`, and `Depends on` is `1.1.1, ext-9`

#### Scenario: Rollups on milestone and epic
- GIVEN milestone `m1` with closed epic `e1` (5 points, `estimate_days` 2), open epic `e2` (3 points, `estimate_days` 1, 1 of 2 tracks closed), and open epic `e3` (no points, `estimate_days` null, `assumed_days` 2, not split)
- WHEN WBS rows are built for `m1`
- THEN `e1` has `100%` done and `Forecast end` equal to the date of its `closed_at`, `e2` has `50%` done, `e3` has `0%` done and estimate `2 (assumed)`, and `m1` has `Points` 8, `Estimate (days)` 5, and `% done` `81%` (`(5 + 1.5) / 8`)

### REQ-MILESTONE-UI-029: WBS Excel format
WHEN `format=xlsx` is requested, the server SHALL serialize the WBS using `openpyxl` into a valid `.xlsx` workbook with two sheets:
- Sheet `WBS`: frozen header row (`A2`), autofilter across the header columns, bold level-1 rows, Excel row outline grouping (`outlineLevel`) matching each row's nesting depth so levels collapse cleanly, real Excel date cells (`YYYY-MM-DD`) for Planned start, Planned end, and Forecast end, real numeric percent cells (`0%`) for `% done`, and formula-injection protection prefixing any string cell starting with `=`, `+`, `-`, or `@` with `'`.
- Sheet `About`: key-value rows naming the project, scope (project or milestone title and id), `generated_at` timestamp, the definitions used (done, blocked, progress, assignee, estimate), and any degraded-`gin` warning.

#### Scenario: Excel workbook structure and grouping
- GIVEN a WBS with milestone `1`, epic `1.1`, and task `1.1.1` whose title starts with `=SUM(A1)`
- WHEN serialized with `to_xlsx` and read back with `openpyxl`
- THEN sheets `WBS` and `About` exist, `WBS` has `freeze_panes == "A2"`, autofilter enabled, row outline levels `0`, `1`, `2`, date cells stored as `date` values, `% done` stored as numeric ratios formatted as `0%`, and the title cell starts with `'=SUM(A1)`

### REQ-MILESTONE-UI-030: WBS CSV for Jira format
WHEN `format=csv` is requested, the server SHALL serialize a UTF-8 CSV compatible with Jira External System Import:
- Columns SHALL be `Issue ID`, `Parent ID`, `Issue Type`, `Summary`, `Status`, `Labels`, `Assignee`, `Story Points`, `Original Estimate`, `Start date`, `Due date`, `Fix Version`, zero or more `Link "Blocks"` columns (as many as the most issues in the file that any one row blocks), followed by `WBS`, `Forecast end`, `% done`, `Depends on` (as in REQ-MILESTONE-UI-028), and `Bead ID`.
- Milestones SHALL NOT be emitted as issue rows; instead, every issue under a milestone SHALL carry that milestone's title in `Fix Version`.
- `Issue ID` SHALL be the row's position among the issue rows, starting at `1`.
- `Parent ID` SHALL reference the parent row's `Issue ID` (blank for epics and parentless issues), and every parent row SHALL appear before its children.
- `Issue Type` SHALL be `Sub-task` for a bead whose parent is neither an epic nor a milestone, else `Epic` for an epic, `Bug` for a bug, and `Task` for any other bead. Because Jira allows one sub-task level, a `Sub-task`'s `Parent ID` SHALL reference its nearest ancestor that is not a `Sub-task`.
- `Status` SHALL map Done → `Done`, In progress → `In Progress`, and Open or Blocked → `To Do`; blocked rows SHALL include `blocked` in `Labels`.
- `Assignee` SHALL be the assignee's email when known, else the normalized handle, or blank when unassigned.
- `Original Estimate` SHALL be total seconds as an integer (`1 day = 28800` seconds, blank when unset).
- `Start date`, `Due date`, and `Forecast end` SHALL use ISO `YYYY-MM-DD`.
- Each `Link "Blocks"` cell SHALL hold the `Issue ID` of an issue in the file that the row's bead blocks, because Jira imports a link column as the outward link (`<row> blocks <cell>`); a blocker outside the file SHALL give no link and stays named in `Depends on`.
- String cells starting with `=`, `+`, `-`, or `@` SHALL be prefixed with `'` to prevent spreadsheet formula injection.

#### Scenario: Jira CSV hierarchy, Fix Version, estimate seconds, and blocked label
- GIVEN milestone `m1` titled `PM reporting` containing epic `e1` (estimate 2 days, planned `2026-12-18` to `2026-12-22`) and blocked task `t1` under `e1` blocked by open task `t2` under `e1`
- WHEN serialized with `to_csv`
- THEN `m1` has no row, `e1` has `Issue ID` `1`, `e1`, `t1`, and `t2` each have `Fix Version` = `PM reporting`, `e1` precedes `t1` and `t2` with `1` in their `Parent ID`, `e1`'s `Original Estimate` is `57600`, `t1` has `Status` = `To Do`, `Labels` containing `blocked`, an empty `Link "Blocks"`, and `t2`'s WBS number in `Depends on`, and `t2`'s `Link "Blocks"` holds `t1`'s `Issue ID`

#### Scenario: Jira CSV sub-task levels
- GIVEN epic `e9` with task `t1`, `t1` with child task `t1a`, and `t1a` with child task `t1b`
- WHEN serialized with `to_csv`
- THEN `t1` is a `Task` whose `Parent ID` is `e9`'s `Issue ID`, and `t1a` and `t1b` are each a `Sub-task` whose `Parent ID` is `t1`'s `Issue ID`

### REQ-MILESTONE-UI-031: WBS Markdown format
WHEN `format=md` is requested, the server SHALL serialize a UTF-8 Markdown document starting with `# <project> WBS — <scope>`, a `Generated: <YYYY-MM-DD HH:MM UTC>` line, an optional `> Warning: <message>` callout when `gin` degraded, and a GitHub-flavored Markdown table with the columns of REQ-MILESTONE-UI-028, escaping `|` as `\|` and replacing newlines in cell text with spaces.

#### Scenario: Markdown escaping and warning
- GIVEN a WBS for project `alpha` with a task titled `Fix A | B\nnow` and a degraded-`gin` warning
- WHEN serialized with `to_markdown`
- THEN the output contains `# alpha WBS — Project`, the `> Warning:` line, and a table row containing `Fix A \| B now`

### REQ-MILESTONE-UI-032: Export WBS menu on Milestone and Milestones pages
The Milestone page header (`MilestonePage`) SHALL show an `Export WBS` button that opens a menu with three download links — `Excel (.xlsx)`, `CSV for Jira (.csv)`, and `Markdown (.md)` — pointing to `/api/milestones/<project>/wbs?milestone=<id>&format=<fmt>` with the `download` attribute. The Milestones list page header (`MilestonesPage`) SHALL show the same `Export WBS` menu pointing to `/api/milestones/<project>/wbs?format=<fmt>` for a project-wide export.

#### Scenario: Milestone page menu links
- GIVEN the user opens milestone `m1` of project `alpha`
- WHEN the user opens the `Export WBS` menu in the header
- THEN three download links appear for `/api/milestones/alpha/wbs?milestone=m1&format=xlsx`, `format=csv`, and `format=md`

#### Scenario: Milestones list page menu links
- GIVEN the user opens the Milestones list for project `alpha`
- WHEN the user opens the `Export WBS` menu in the header
- THEN three download links appear for `/api/milestones/alpha/wbs?format=xlsx`, `format=csv`, and `format=md`

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
