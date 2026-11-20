# Spec Delta: Graph and Lanes canvas usability

## ADDED

### REQ-UI-122: Canvas scrolling
Type: non-functional
Category: usability
The canvas of the Graph view (REQ-UI-106), with its nodes or lane boxes (REQ-UI-117), the canvas of the Lanes view (REQ-UI-111) and the canvas of the Dependencies page (REQ-UI-075) SHALL each be as tall as its content at the current scale. They SHALL scroll only sideways, with no vertical scroll bar of their own, and SHALL leave the page as the one vertical scroller. A wheel turn or a vertical swipe over a canvas without `Ctrl` or `⌘` SHALL scroll the page. A sideways swipe SHALL move the canvas and SHALL NOT pass on to the browser's history at the canvas's edge. The details panel and the discussion column keep their own scroll (REQ-UI-078).

#### Scenario: Wheel over the Lanes view
- GIVEN the Lanes view of `ex-e12` at 1440×900, with the page scrolled to the top and the pointer over the cards
- WHEN the user turns the wheel down
- THEN the page scrolls down and the canvas has no vertical scroll bar

#### Scenario: Wheel over the Graph view
- GIVEN the Graph view of `ex-e12` with "Show closed" on at 1440×900, where the page is taller than the window, with the pointer over a lane box
- WHEN the user turns the wheel down
- THEN the page scrolls down

#### Scenario: Sideways
- GIVEN the Graph view of the project wider than the window
- WHEN the user scrolls sideways over the canvas
- THEN the canvas moves sideways and the page does not move

## MODIFIED

### REQ-UI-106: Graph view
<!-- base: 3747fc19b8c89d6b0c626fd1ccb2c80c38b10e93791306bcfdd73e9ae83086fa -->
The Beads views SHALL offer the view Graph (`view=graph`), which SHALL draw, with the nodes, arrows, outside beads and cycle warning of the Dependencies page (REQ-UI-048 to REQ-UI-050, REQ-UI-079), the direct children of its scope: the bead named by `scope` in the URL when it exists and has children, else the selected milestone, else the project (REQ-MILESTONE-UI-006) when "All" or "No milestone" is selected. It SHALL draw a node only when the node's bead or one of its descendants matches the search, the filters and "Show closed", and only the arrows between drawn nodes. It SHALL offer the switch "Only linked" of REQ-UI-081, on at first when the scope is the project and off otherwise. WHEN a node is selected, the view SHALL keep it as `select` and show its details panel as the List view does, SHALL select nothing and show no details panel while `select` is absent, whatever the scope, so that the panel opens only when the user selects a node, and SHALL show and close the panel as REQ-UI-051 and REQ-UI-052 describe. WHEN a node with children is opened, the view SHALL set `scope` to its id and show a breadcrumb from the milestone or project down to the scope, each item a link that sets `scope` to it. WHEN a node without children is opened, the frontend SHALL open its bead page. WHILE nothing matches, the view SHALL say "No beads match these filters".

#### Scenario: Milestone scope
- GIVEN milestone `m2` with epics `e1` and `e2`, `e2` blocked by `x` under milestone `m3`
- WHEN the Beads page shows `milestone=m2&view=graph`
- THEN `e1` and `e2` are drawn, `x` is drawn as an outside bead with an arrow to `e2`

#### Scenario: Project scope
- GIVEN milestone "All" is selected
- WHEN the Graph view is shown
- THEN the beads of the project without a parent are drawn, epics under a milestone included, and "Only linked" is on

#### Scenario: Filters apply to the nodes
- GIVEN epic `e1` with a task assigned to `bao` and epic `e2` with no bead assigned to `bao`
- WHEN the assignee filter is `bao`
- THEN `e1` is drawn and `e2` is not

#### Scenario: Shared with the other views
- GIVEN the List view with the search "pay"
- WHEN the user chooses Graph
- THEN the search "pay" still applies and no new request is made

#### Scenario: Drill down and back
- GIVEN the Graph view of milestone `m2`
- WHEN the user opens epic `e1`, which has tasks
- THEN the URL has `scope=e1`, the tasks of `e1` are drawn, and the breadcrumb `m2` › `e1` returns to the epics of `m2` when `m2` is chosen

#### Scenario: Open a leaf
- GIVEN the tasks of `e1` are drawn
- WHEN the user opens task `e1.1`, which has no children
- THEN the bead page of `e1.1` is shown

#### Scenario: Details panel
- GIVEN the Graph view
- WHEN the user selects `e1`
- THEN the URL has `select=e1` and the details panel shows `e1`

#### Scenario: Nothing matches
- GIVEN a search that matches no bead
- WHEN the Graph view is shown
- THEN it says "No beads match these filters"

#### Scenario: No panel on the project scope
- GIVEN milestone "All" is selected and the URL has no `select`, in a window 1280px wide
- WHEN the Graph view is shown
- THEN there is no details panel and the graph takes the full width

#### Scenario: No panel on opening an epic
- GIVEN the URL `/beads?project=example&milestone=all&view=graph&scope=ex-e12` without `select`, in a window 1440px wide
- WHEN the page loads
- THEN no node is selected, no details panel is shown and the canvas spans the width of the page; WHEN the user clicks the card of `ex-e12.2`, THEN the URL has `select=ex-e12.2` and the details panel shows it

### REQ-UI-117: Lane clusters in the Graph view
<!-- base: d860e924c0250900d2df2e9823e7f52011f9e218f2c80e075d77cb32ba2f3188 -->
WHILE the scope of the Graph view (REQ-UI-106) has a loaded child that is not a merge gate and whose `lane` is not `null` (REQ-BEADS-019, the condition of the Lanes tab in REQ-UI-111), the Graph view SHALL draw, instead of the layers of REQ-UI-048:
- one box per lane of the scope's children that are not merge gates, holding the cards of its drawn tracks, and one dashed "No lane" box for the drawn children without a lane;
- the boxes in tiers from left to right: a box, the "No lane" box included, is in the tier to the right of every box whose tracks its tracks wait for, directly or through a merge gate (REQ-UI-111); the boxes of one tier stand one under another in the row order of the Lanes view; the "No lane" box comes last in its tier, and in the last tier when none of its tracks depends on or blocks a track of a lane; lanes that wait for each other in a loop share one tier;
- the cards inside a box from left to right by their dependency layer within the lane, the cards of one layer one under another;
- an arrow between two cards of one box for each dependency between them, and an arrow from the right edge of a card to the left edge of the box of another lane, level with the waiting card, for each dependency of that lane's tracks on it, directly or through a merge gate, so that no dependency between drawn cards goes without an arrow; an arrow to a box that is not in a later tier (lanes in a loop) runs in a channel below every box;
- no node for a merge gate, but a chip on its arrow in the gap between two tiers: "Waiting · <lane> #<N>" on a dashed arrow while the gate is not closed, "Merged · <lane> #<N>" when it is closed (`<lane>` and `<N>` from its `waits_for`); and, for a gate whose track is not drawn, the chip "Waiting for track <N>" or "Merged track <N>" on the top edge of the waiting box.

The view SHALL leave out a box with no drawn card, SHALL NOT offer the switch "Only linked" (REQ-UI-081) and SHALL keep the selection, details panel, Escape, opening and screen-reader list of REQ-UI-051, REQ-UI-052, REQ-UI-054 and REQ-UI-106. WHEN a card has focus, Arrow Left and Arrow Right SHALL move to the previous or next card of its box and, from the first or last card of a box, to the card that an arrow of the focused card comes from in the tier on the left or leads to in the tier on the right, the nearest by y when there are several, else to the card of that tier nearest by y; Arrow Up and Arrow Down SHALL move to the card nearest by x in the box above or below in the same tier. No arrow, chip or box SHALL be drawn over a card or over the text of a header.

#### Scenario: Boxes in tiers
- GIVEN epic `ex-e12` with lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6), qa (track 4, waiting for tracks 2 and 3 through merge gates) and two tracks without a lane, with "Show closed" on
- WHEN the user opens the Graph view with `scope=ex-e12`
- THEN boxes be, fe and infra stand one under another in the first tier on the left, qa and then "No lane" stand in the second tier to their right, and no node reads "Waits for"

#### Scenario: Tracks left to right
- GIVEN track 2 of lane be blocked by track 1
- WHEN the Graph of `ex-e12` is shown
- THEN the card of track 2 is right of the card of track 1 inside the be box, with an arrow from track 1 to track 2

#### Scenario: Gate chips
- GIVEN track 4 of lane qa blocked by an open merge gate waiting for track 2 of lane be and a closed one waiting for track 3 of lane fe
- WHEN the Graph of `ex-e12` is shown
- THEN a dashed arrow from the right edge of track 2 to the left edge of the qa box carries "Waiting · be #2", and an arrow from track 3 to the qa box carries "Merged · fe #3", both chips in the gap between the two tiers

#### Scenario: Track not drawn
- GIVEN a merge gate titled `external: .planning/plans/other.md#7` that blocks track 4 and whose track is not a child of `ex-e12`
- WHEN the Graph of `ex-e12` is shown
- THEN the chip "Waiting for track 7" is on the top edge of the qa box and no arrow is drawn for it

#### Scenario: No lane box with dependencies
- GIVEN a track without a lane that is blocked by track 2 of lane be, and a track of lane fe blocked by another track without a lane
- WHEN the Graph view of the scope is shown
- THEN the "No lane" box is in the tier to the right of be, and an arrow runs from track 2 to the "No lane" box and another from the "No lane" track to the fe box

#### Scenario: Lanes in a loop
- GIVEN lane x with a track blocked by a track of lane y, and lane y with a track blocked by a track of lane x
- WHEN the Graph view of the scope is shown
- THEN boxes x and y share a tier, both arrows are drawn in the channel below the boxes, and the cycle warning names x and y

#### Scenario: Scope without lanes
- GIVEN epic `ex-e3`, whose tracks have no lane
- WHEN the user opens its Graph view
- THEN the nodes are drawn in layers as in REQ-UI-048 with no box, and the switch "Only linked" is offered

#### Scenario: Keys between boxes
- GIVEN the focus on track 2, the last card of the be box
- WHEN the user presses Arrow Right, then Enter
- THEN the focus moves to track 4 in the qa box, and Enter selects it and the details panel shows it
### REQ-UI-077: Zoom
<!-- base: fa902e47e0623f004fe68edd6da35fd8af4583e94fc8cb3d08722a898ffa3f64 -->
The Dependencies page SHALL offer the buttons "Zoom in" and "Zoom out" that change the scale by 10% between 40% and 200%, the button "Fit to view" that scales the graph to the width of the canvas without going above 100%, and the current scale as a percentage, SHALL start fitted, SHALL zoom with the wheel while `Ctrl` or `⌘` is held, SHALL let the user pan sideways with the scroll bar of the canvas and the usual sideways gestures and up and down by scrolling the page (REQ-UI-122), and SHALL not remember the scale.

#### Scenario: Buttons
- GIVEN the graph at 100%
- WHEN the user presses "Zoom out" twice
- THEN the percentage reads 80%

#### Scenario: Limits
- GIVEN the graph at 40%
- WHEN the user presses "Zoom out"
- THEN it stays at 40%

#### Scenario: Fit
- GIVEN a graph wider than the canvas
- WHEN the page opens or the user presses "Fit to view"
- THEN the whole width of the graph is visible and the percentage is below 100%

#### Scenario: Fit a tall graph
- GIVEN a graph narrower than the canvas and taller than the window
- WHEN the user presses "Fit to view"
- THEN the percentage reads 100% and the page scrolls to show the rest of the graph

#### Scenario: Wheel
- GIVEN the pointer is over the canvas
- WHEN the user turns the wheel with `Ctrl` held
- THEN the scale changes, and without `Ctrl` the page scrolls as usual

## REMOVED
