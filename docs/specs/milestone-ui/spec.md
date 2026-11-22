# Milestone ui

## Purpose

## Requirements

### REQ-MILESTONE-UI-001: Milestones list
gin-console SHALL show a Milestones entry in the sidebar that opens a per-project list of milestones with title, status (REQ-MILESTONE-UI-022), start and end (and kickoff when set), parallel lanes, forecast finish, epic progress as the strand of REQ-UI-138 over the counts of REQ-MILESTONE-UI-025, commitment met, and warning count as "<n> warnings" after a dashed ring in the warning color, from `gin milestone list --all --json`, under the column headers Status, Milestone, Period, Parallel lanes, Commitment met, Epics and Warnings. Parallel lanes SHALL read "<n> lanes" ("1 lane" when `<n>` is 1), or "–" when the entry has no `lanes`. The forecast finish SHALL read "Finishes <date>" (REQ-UI-131) when the entry's `finish` is set, in the warning color when the milestone is late (REQ-MILESTONE-UI-023). Commitment met SHALL read "Commitment met <n>%" with the entry's `velocity.say_do` as a whole percent, or "–" when the entry has no `velocity` or its `say_do` is `null`. gin-console SHALL show a list entry's `error` in place of its progress and warnings, SHALL show "No dates" in place of the period of an entry whose `start` or `end` is `null`, SHALL cut a long title short with the full title as `title`, and SHALL NOT show the `unassigned_epics` count, which REQ-MILESTONE-UI-010 replaces with a list.
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

## Use Cases
- [Read the verdict of a Gantt row](use-cases/read-gantt-verdict.md)

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
The milestone page SHALL offer the tabs Gantt, Beads and Retro (REQ-MILESTONE-UI-019), kept in the URL as `tab` (`gantt` when absent or unknown, `beads`, `retro`), and SHALL treat `tab=graph` as `tab=beads` with `view=graph`. WHILE the Beads tab is shown, the page SHALL show the Beads views (REQ-UI-030) of the milestone's project with the Milestone filter fixed to this milestone and no Milestone select, SHALL keep their search, filters, view, selection and graph scope in the milestone page's URL with the names the Beads page uses, and SHALL fetch closed beads without "Show closed" WHILE the milestone is closed. WHEN the user changes tab, the page SHALL keep only `start` and `zoom` of the query besides `tab`.

#### Scenario: Beads tab
- GIVEN milestone `m2` of project `p` with epics `e1` and `e2` and a bead `x` under milestone `m3`
- WHEN the user opens `/milestones/p/m2?tab=beads`
- THEN the List view shows `e1` and `e2` and not `x`, and there is no Milestone select

#### Scenario: View and filters in the URL
- GIVEN the Beads tab of `m2`
- WHEN the user chooses Board and the status "open"
- THEN the URL is `/milestones/p/m2?tab=beads&view=board&status=open` and reloading it shows the same Board and filter

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
