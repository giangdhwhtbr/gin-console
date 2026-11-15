# Spec Delta: Details panel only while a bead is selected

## ADDED

## MODIFIED

### REQ-UI-045: Selection and detail panel
<!-- base: a1ae02f7af8040978485b3a70739076d8eeb1dd8ac4fc4a0f057f5abdda0e7ec -->
WHILE the window is 1024px wide or more and the user clicks a row, the List view SHALL select it, keep its id in the URL as `select`, mark it selected, and show the bead in a panel beside the list with the content of the bead page (fields, text sections, relations and the discussion), without the breadcrumb and with an "Open page" link to `/beads/<project>/<id>`, SHALL show no panel while nothing is selected, the list then taking the full width, SHALL offer in the panel a button "Close details" that clears the selection, SHALL clear the selection on Escape when focus is not in a text field, and after clearing it SHALL hide the panel and move focus to the row that was selected, SHALL keep showing a selected bead that is not in the current list together with the note "Not in the current list", SHALL stay in view and scroll on its own as REQ-UI-078 describes, and a reload SHALL restore the selection, and WHILE the window is narrower than 1024px a click on a row SHALL open the bead page.

#### Scenario: Select a row
- GIVEN the List view and a window 1280px wide
- WHEN the user clicks the bead `t-1`
- THEN the URL has `select=t-1`, the row is marked selected and the panel shows its title, text and discussion

#### Scenario: Nothing selected
- GIVEN the URL has no `select` and a window 1280px wide
- WHEN the List view is shown
- THEN there is no details panel and the list takes the full width of the page

#### Scenario: Restored selection
- GIVEN the URL has `view=list&select=t-1`
- WHEN the page loads
- THEN `t-1` is selected, its branch is open and the panel shows it

#### Scenario: Selected bead not in the list
- GIVEN `t-1` is selected and a filter hides it
- WHEN the List view is shown
- THEN the panel still shows `t-1` with "Not in the current list"

#### Scenario: Open page link
- GIVEN a bead is selected
- WHEN the panel is shown
- THEN it has a link "Open page" to `/beads/<project>/t-1` and no breadcrumb

#### Scenario: Selection changes
- GIVEN `t-1` is selected and its comments are loading
- WHEN the user selects `t-2`
- THEN the panel shows `t-2` and the late comments of `t-1` do not replace its comments

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN the user taps the row of `t-1`
- THEN the bead page of `t-1` is shown

#### Scenario: Close the panel
- GIVEN `t-1` is selected in a window 1280px wide
- WHEN the user chooses "Close details"
- THEN the URL has no `select`, the panel is gone, the list takes the full width and the row of `t-1` has focus

#### Scenario: Escape closes the panel
- GIVEN `t-1` is selected and focus is on its row
- WHEN the user presses Escape
- THEN the selection is cleared and the panel is gone

#### Scenario: Escape in the search box
- GIVEN `t-1` is selected and the search box has focus and text
- WHEN the user presses Escape
- THEN the text is cleared and `t-1` stays selected

### REQ-UI-051: Selection and path
<!-- base: 5d91e490f8f30d663bbfc6cfa7efa764bc20a3a9743249b84276c2d488a08f42 -->
WHEN the Dependencies page of a bead opens, it SHALL select the bead being viewed (for a bead with children, through its heading bar), WHEN the project page opens, it SHALL select nothing, SHALL show the panel only while a bead is selected, the graph then taking the full width, SHALL offer in the panel a button "Close details" that selects nothing, kept in the URL as `select=none` so that a reload keeps the panel closed, and after closing SHALL move focus to the node that was selected, and WHEN the user clicks a node or presses Enter on it, it SHALL select that bead, keep its id in the URL as `select` without adding a history entry, highlight the node, all its direct and indirect blockers, all beads it blocks directly or indirectly and the arrows between them, dim every other node and arrow, and show the bead in a panel beside the graph (below it under 1024px) with the content of the bead page and an "Open page" link as REQ-UI-045 describes.

#### Scenario: Project page
- GIVEN the project page in a window 1280px wide
- WHEN it is shown
- THEN no node is selected, there is no details panel and the graph takes the full width

#### Scenario: Selected at first
- GIVEN the page of task `b`
- WHEN it is shown
- THEN `b` is selected, its chain is highlighted and the panel shows `b`

#### Scenario: Epic
- GIVEN the page of epic `e-1`
- WHEN it is shown
- THEN the heading bar is selected and the panel shows `e-1`

#### Scenario: Highlight chain
- GIVEN `a`→`b`→`c` and an unrelated `z`
- WHEN the user selects `b`
- THEN `a`, `b`, `c` and their arrows are highlighted, `z` is dimmed and the panel shows `b`

#### Scenario: No new history entry
- GIVEN the user selects a node
- WHEN the user presses the browser's back button
- THEN the previous page is shown, not the previous selection

#### Scenario: Restored
- GIVEN the URL has `select=b`
- WHEN the page loads
- THEN `b` is selected and its chain is highlighted

#### Scenario: Close the panel
- GIVEN the page of epic `e-1` with `e-1` selected
- WHEN the user chooses "Close details"
- THEN the URL has `select=none`, the panel is gone, the graph takes the full width, and a reload keeps it so

### REQ-UI-052: Graph keyboard
<!-- base: 39cbefa72840c8bd4dd7e9fd694bda23641de1b26f6f1083648f3bb456240c94 -->
WHILE a node has focus, the Dependencies page SHALL move focus along the arrows with ArrowDown to a blocked bead and ArrowUp to a blocker, and to the previous or next node of the same layer with ArrowLeft and ArrowRight, SHALL select the bead being viewed again on Escape, and select nothing (closing the panel as REQ-UI-051 describes) on Escape while the bead being viewed or, on the project page, any bead is selected, and SHALL keep a single node in the tab order; and under 1024px it SHALL offer the buttons "n blockers" and "n blocked" for the selected bead that move the selection along the arrows.

#### Scenario: Follow an arrow
- GIVEN `a`→`b` and focus on `a`
- WHEN the user presses ArrowDown
- THEN focus moves to `b`

#### Scenario: Escape
- GIVEN a node other than the bead being viewed is selected
- WHEN the user presses Escape
- THEN the bead being viewed is selected again

#### Scenario: Jump buttons
- GIVEN a window 390px wide and a selected bead with 2 blockers and 1 blocked bead
- WHEN the page is shown
- THEN the buttons "2 blockers" and "1 blocked" are shown and each selects a bead of its side

#### Scenario: Second Escape
- GIVEN the page of epic `e-1` with `e-1` selected
- WHEN the user presses Escape
- THEN nothing is selected, the URL has `select=none` and the panel is gone

### REQ-UI-106: Graph view
<!-- base: 0ef18c767946f8f7ccf277840e4cd7ec39273e06313b3a70eda08bb5b65cc93f -->
The Beads views SHALL offer the view Graph (`view=graph`), which SHALL draw, with the nodes, arrows, outside beads and cycle warning of the Dependencies page (REQ-UI-048 to REQ-UI-050, REQ-UI-079), the direct children of its scope: the bead named by `scope` in the URL when it exists and has children, else the selected milestone, else the project (REQ-MILESTONE-UI-006) when "All" or "No milestone" is selected. It SHALL draw a node only when the node's bead or one of its descendants matches the search, the filters and "Show closed", and only the arrows between drawn nodes. It SHALL offer the switch "Only linked" of REQ-UI-081, on at first when the scope is the project and off otherwise. WHEN a node is selected, the view SHALL keep it as `select` and show its details panel as the List view does, SHALL select the scope bead when `select` is absent and the scope is a bead, and SHALL show and close the panel as REQ-UI-051 and REQ-UI-052 describe. WHEN a node with children is opened, the view SHALL set `scope` to its id and show a breadcrumb from the milestone or project down to the scope, each item a link that sets `scope` to it. WHEN a node without children is opened, the frontend SHALL open its bead page. WHILE nothing matches, the view SHALL say "No beads match these filters".

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

## REMOVED
