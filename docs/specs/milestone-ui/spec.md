# Milestone ui

## Purpose

## Requirements

### REQ-MILESTONE-UI-001: Milestones list
gin-console SHALL show a Milestones entry in the sidebar that opens a per-project list of milestones with title, status, start and end (and kickoff when set), epic progress, and warning count, from `gin-workflow milestone list --all --json`, SHALL show a list entry's `error` in place of its progress and warnings, and SHALL NOT show the `unassigned_epics` count, which REQ-MILESTONE-UI-010 replaces with a list.

#### Scenario: list
- GIVEN project P whose gin-workflow reports milestones M1 (active) and M2 (planned)
- WHEN the user opens Milestones for P
- THEN both milestones are listed with their status, period, progress, and warning count

#### Scenario: unassigned count not shown
- GIVEN project P whose `milestone list` reports `unassigned_epics: 4`
- WHEN the user opens Milestones for P
- THEN the page does not show a sentence counting roadmap epics outside milestones

#### Scenario: schedule error
- GIVEN project P whose `milestone list` reports M2 with `error` "dependency cycle: A -> B -> A"
- WHEN the user opens Milestones for P
- THEN M2 shows that error in place of its progress and warning count, and M1 is shown normally

### REQ-MILESTONE-UI-002: Milestone Graph tab
gin-console SHALL show, on a milestone's page, a Graph tab with the milestone's epics and their dependency edges, marking dependencies outside the milestone as external.

#### Scenario: graph
- GIVEN milestone M1 with epics A and B, B depending on A
- WHEN the user opens the Graph tab of M1
- THEN A and B are shown with an edge from A to B

#### Scenario: dependency outside the milestone
- GIVEN epic A in M1 depending on epic X in M2
- WHEN the user opens the Graph tab of M1
- THEN X is shown as an external node with an edge to A

### REQ-MILESTONE-UI-003: Milestone Gantt tab
gin-console SHALL show, on a milestone's page, a Gantt tab drawing one bar per epic from `planned_start` to `planned_end` of `gin-workflow milestone show --json`, colored by bead status, with a line at the JSON `today` date, a line at the milestone `end`, and each epic's warnings.

#### Scenario: overflow shown
- GIVEN milestone M1 whose `show` output gives epic A warning `overflow` of 2 days
- WHEN the user opens the Gantt tab of M1
- THEN A's bar extends past the end line and A shows an overflow warning of 2 days

#### Scenario: today from the JSON
- GIVEN milestone M1 whose `show` output has `today: 2026-11-04`
- WHEN the user opens the Gantt tab of M1
- THEN the today line is drawn at 2026-11-04 whatever the browser's date

#### Scenario: external blocker named
- GIVEN epic A in M1 with warning `external_blocker` and `external_depends_on` `[{"id": "E9", "milestone": "M2"}]`
- WHEN the user opens the Gantt tab of M1
- THEN A shows an external blocker warning naming E9 and M2

### REQ-MILESTONE-UI-004: Kick-start preview
WHILE a milestone is `planned` or `scheduled`, gin-console SHALL show on its Gantt tab a Kick-start date picker defaulting to `kickoff`, else `start`, and WHEN the user picks a date SHALL redraw the Gantt from `gin-workflow milestone show <id> --start <date> --json`, labelled as a read-only preview with the command `gin-workflow milestone kickstart <id> --date <date>`; it SHALL NOT show the picker for `active` or `closed` milestones, and IF the preview fails, THEN it SHALL show the error in the Gantt tab instead of any plan.

#### Scenario: preview
- GIVEN planned milestone M1
- WHEN the user picks 2026-11-16 as the kick-start date
- THEN the Gantt is drawn from 2026-11-16, labelled preview, and shows `gin-workflow milestone kickstart M1 --date 2026-11-16`

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
- THEN an error says milestones need a newer gin-workflow and to run `gin-workflow/install.sh`

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
WHEN a client requests `GET /api/milestones?project=<name>` or `GET /api/milestones/{project}/{id}` with an optional `start=YYYY-MM-DD`, the server SHALL return the output of `gin-workflow milestone list --all --json` or `gin-workflow milestone show <id> [--start <date>] --json` run in the project directory, SHALL cache a response without `start` for 5 seconds and never cache one with `start`, SHALL respond 404 for an unknown project or missing directory, 422 without running any command for a `start` that is not an ISO date, and IF the command fails or its output is not `schema: 1`, THEN SHALL respond 502 with `error` and `cause` set to `outdated` (no `milestone` command), `tracking` (project not on Beads tracking), `schema` (schema not 1), or `null`.

#### Scenario: list
- GIVEN project P whose `milestone list --all --json` prints schema 1 with M1
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 200 with M1, `unassigned_epics`, and `today`

#### Scenario: preview not cached
- GIVEN a request for M1 with `start=2026-11-16` answered less than 5 seconds ago
- WHEN a client requests M1 with `start=2026-11-16` again
- THEN `milestone show M1 --start 2026-11-16 --json` runs again

#### Scenario: invalid start
- GIVEN project P
- WHEN a client requests `GET /api/milestones/P/M1?start=next-monday`
- THEN the response is 422 and no command runs

#### Scenario: old gin-workflow
- GIVEN project P whose `gin-workflow milestone` exits 2 with `invalid choice: 'milestone'`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 502 with `cause: "outdated"`, and the failure is not cached

#### Scenario: markdown tracking
- GIVEN project P whose `milestone list` exits 1 with `milestone error: milestones need providers.task_tracking: beads`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 502 with `cause: "tracking"`

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
Each epic row of the Gantt SHALL show, in a label column that stays visible while the chart scrolls, the status icon and title on one line and the epic id (linking to its bead page), period and estimate on the next, each line cut short with an ellipsis instead of wrapping and the full title available on hover, followed by the epic's warnings; WHEN at least 90 px of chart are left after an epic's bar, the row SHALL also show the epic's title after the bar.

#### Scenario: long id
- GIVEN epic `gin-workflow-rm-process-hygiene` titled "Process hygiene: consistent skills, rules that bind where it matters"
- WHEN the Gantt is shown on a phone
- THEN the title and the id each take one line, cut short with an ellipsis

#### Scenario: title after the bar
- GIVEN epic A whose bar ends on the first day of a 10-day plan shown as `Whole milestone`
- WHEN the Gantt is shown
- THEN A's title is shown after its bar

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
The Gantt SHALL load the project's beads, open and closed, and for each epic with beads whose `parent` is that epic SHALL show an expand button and "N/M closed" (closed children over all children) in its row; WHEN the user expands an epic, the Gantt SHALL show under it one row per child, ordered by id, with the child's status icon, its id (linking to its bead page), its title, and "closed <date>" from `closed_at` for a closed child or its status otherwise, and SHALL shade the parent epic's period in those rows without drawing bars for them. Epics SHALL start collapsed, and expanding or collapsing one SHALL leave the others as they are. IF the beads cannot be loaded, THEN the Gantt SHALL be drawn without expand buttons or counts.

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
