# Spec Delta: Gantt zoom

## ADDED

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

## MODIFIED

## REMOVED
