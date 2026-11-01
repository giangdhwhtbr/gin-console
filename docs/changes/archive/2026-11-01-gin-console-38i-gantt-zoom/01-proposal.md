# Gantt zoom

Epic: gin-console-38i
Date: 2026-11-01
Mockup: https://claude.ai/artifact/FVdt4bqMsyWdPUDg2p2Dd4 (version 3, confirmed by the user 2026-11-01)

## Why
The milestone Gantt draws every day at a fixed width (20 px, 28 px on wide screens) over the whole plan. A short milestone such as `gin-workflow-8w27` (8 working days) fills a third of a laptop screen and leaves the rest empty. A 4-week milestone cannot be narrowed to the next one or two weeks. The beads are 16 px high and the 160 px label column wraps epic ids over four lines. The Gantt also ignores `depends_on`, so the order between epics shows only on the Graph tab, and the beads under an epic are not visible at all.

## What Changes
1. **Zoom**: a toolbar offers `1 week`, `2 weeks` and `Whole milestone`. In every mode the days stretch to the width of the chart. The mode is kept in the URL as `zoom=1w` or `zoom=2w`; the whole milestone is the default.
2. **Panning**: in `1 week` and `2 weeks` the whole plan is drawn and the chart scrolls sideways. The user drags it with the mouse, swipes on a touch screen, scrolls a trackpad, or uses ‹ › to move one period, snapping to Monday. A label shows the dates in view.
3. **Readable rows**: taller rows and beads; a wider label column with the title on the first line and the id, period and estimate on the second; the title repeated after the bar when there is room.
4. **Dependency arrows**: an arrow from the end of each epic to the start of every epic of the same milestone that depends on it. Pointing at or focusing an epic highlights its chain and fades the rest.
5. **Child beads**: an epic with child beads gets an expand button and a closed count. Expanded, each child is a row with its status, id, title and closing date.

## User Stories

### US-1: Focus on the next weeks
As a PM, I want to zoom the Gantt to one or two weeks, so that I can read the near-term plan of a long milestone without the far end squeezing it.
REQ: REQ-MILESTONE-UI-011

Acceptance criteria:
- `1 week`, `2 weeks` and `Whole milestone` are offered above the Gantt; `Whole milestone` is selected when the URL has no `zoom`.
- In each mode the chart has no empty area to the right of the last day.
- Choosing `2 weeks` shows ten working days across the chart width, starting on the Monday of the week that holds `today`.
- Reloading the page keeps the chosen zoom.

### US-2: Move through the plan
As a PM, I want to drag the Gantt sideways or step it by a period, so that I can look at later or earlier dates while zoomed in.
REQ: REQ-MILESTONE-UI-012

Acceptance criteria:
- Dragging the chart with the mouse moves the dates in view; a drag that starts on an epic link does not open it.
- On a phone or a trackpad, swiping or scrolling sideways moves the dates in view.
- ‹ › move by one or two weeks and stop on a Monday; each is disabled at its end of the plan.
- The label above the chart names the first and last day in view and follows every move.

### US-3: Read epics without squinting
As a PM, I want each epic row to show its title on one line and its id below it, so that I can tell epics apart at a glance.
REQ: REQ-MILESTONE-UI-013

Acceptance criteria:
- Each epic's title is the first line of its label and its id, period and estimate the second; neither wraps.
- When the chart has room after a bar, the epic's title follows the bar.

### US-4: See which epic waits on which
As a PM, I want arrows between dependent epics on the Gantt, so that I can see why an epic starts when it does.
REQ: REQ-MILESTONE-UI-014

Acceptance criteria:
- Epic B that depends on epic A in the same milestone has an arrow from the end of A to the start of B.
- Pointing at or focusing B highlights the arrows and epics of its chain and fades the others.
- A dependency on an epic outside the milestone draws no arrow and keeps its warning.

### US-5: Look inside an epic
As a PM, I want to expand an epic on the Gantt to list its child beads, so that I can see how far its work has got without leaving the schedule.
REQ: REQ-MILESTONE-UI-015

Acceptance criteria:
- An epic with child beads shows an expand button and "N/M closed"; an epic without has neither.
- Expanding lists each child with its status, id (linking to its bead page), title, and "closed <date>" or its status.
- Expanding or collapsing one epic leaves the others as they were.
- If the beads cannot be loaded, the Gantt is still drawn, without expand buttons.

## Capabilities Affected
- `milestone-ui`: REQ-MILESTONE-UI-011 to -015 added. REQ-MILESTONE-UI-003 and -004 stay as they are; zoom, panning and child beads also apply to a kick-start preview.

## Non-goals
- Dragging bars to change dates, or any other change to the plan (the console is read-only).
- Free zoom levels (a slider, Ctrl+wheel) or selecting a range on the axis. Decided 2026-11-01 (user): presets.
- Planned dates or bars for child beads: gin-workflow schedules epics only. Marks at a child's closing date. Decided 2026-11-01 (user): list only.
- Grandchildren, and keeping expanded epics or the scroll position in the URL.
- Changes to gin-workflow, the milestones API, or the beads API.

## Success Criteria
- On `gin-workflow-8w27`, `Whole milestone` fills the chart width, `gin-workflow-dura` has an arrow from `gin-workflow-rm-cost-control`, and expanding `gin-workflow-rm-cost-control` lists its four closed tracks.
- Vitest cases carry REQ-MILESTONE-UI-011 to -015; the manual check in `05-tests.md` passes on a laptop and a phone, light and dark.
