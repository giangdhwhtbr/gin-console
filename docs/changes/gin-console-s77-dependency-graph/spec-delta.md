# Spec Delta: Dependency graph per bead

## ADDED

### REQ-UI-075: Dependencies page
The frontend SHALL show the Dependencies page of a scope, the project at `/beads/<project>/graph` or a bead at `/beads/<project>/<id>/graph`; WHERE the scope is the project or a bead with at least one child (found through `parent`), the page SHALL draw as nodes the beads of the project without a parent, or the direct children of the bead, with the arrows REQ-UI-079 describes, and a heading bar with the project's name or the bead's id as a link to its bead page and its title, "n of m done" over the nodes, and for a bead the beads that block it and the beads it blocks as links to their Dependencies pages; WHERE the scope is a bead without children, the page SHALL draw the bead itself, every bead that blocks it directly or not above it and every bead it blocks directly or not below it; and the page SHALL draw beads outside the scope as REQ-UI-050 describes, SHALL say "No dependencies" with a link to the bead when there is nothing to draw, "No beads in this project" for an empty project, "Bead not found" when the bead does not exist, and the error with a Retry button when the beads cannot be loaded, and SHALL refresh as REQ-UI-027 does.

#### Scenario: Epic
- GIVEN epic `e-1` with tasks `a` and `b`, `b` blocked by `a`
- WHEN `/beads/p/e-1/graph` is shown
- THEN the heading bar names `e-1` and "0 of 2 done", `a` and `b` are nodes and an arrow goes from `a` to `b`

#### Scenario: Project
- GIVEN epics `r-1` and `r-2` without a parent, `r-2` blocked by `r-1`, and tasks under each
- WHEN `/beads/p/graph` is shown
- THEN `r-1` and `r-2` are the nodes, their tasks are not, and an arrow goes from `r-1` to `r-2`

#### Scenario: Nested epics
- GIVEN epic `r` with the child epics `e-1` and `e-2`, each with tasks
- WHEN the page of `r` is shown
- THEN `e-1` and `e-2` are the nodes and their tasks are not

#### Scenario: Heading relations
- GIVEN epic `e-2` blocked by epic `e-1`
- WHEN the page of `e-2` is shown
- THEN the heading bar shows `e-1` as a blocker linking to `/beads/p/e-1/graph`

#### Scenario: Task
- GIVEN `a`→`b`→`c`, an unrelated `z`, and the page of `b`
- WHEN it is shown
- THEN `a`, `b` and `c` are drawn, `a` above `b` above `c`, and `z` is not

#### Scenario: Indirect
- GIVEN `a`→`b`→`c`→`d` and the page of `c`
- WHEN it is shown
- THEN `a` and `b` are drawn above `c` and `d` below it

#### Scenario: Nothing to draw
- GIVEN a task without blockers and blocking nothing
- WHEN its Dependencies page is shown
- THEN it says "No dependencies" and links to the bead

#### Scenario: Empty project
- GIVEN a project without beads
- WHEN `/beads/p/graph` is shown
- THEN it says "No beads in this project"

#### Scenario: Not found
- GIVEN a bead id that does not exist
- WHEN its Dependencies page is shown
- THEN it says "Bead not found"

#### Scenario: Load error
- GIVEN the request for the beads fails
- WHEN the page is shown
- THEN the error and a Retry button are shown, and the last graph stays when a later refresh fails

### REQ-UI-076: Closed beads and Hide done
The Dependencies page SHALL draw closed beads whatever "Show closed" of the Beads page says, and SHALL offer a switch "Hide done", off at first, that leaves out the closed beads and the arrows to them.

#### Scenario: Closed epic
- GIVEN a closed epic whose tasks are all closed and "Show closed" off on the Beads page
- WHEN its Dependencies page is shown
- THEN all its tasks are drawn as Done

#### Scenario: Hide done
- GIVEN an epic with a closed task `a` and an open task `b` blocked by `a`
- WHEN the user turns on "Hide done"
- THEN `a` and the arrow from it are not drawn, and `b` is

### REQ-UI-077: Zoom
The Dependencies page SHALL offer the buttons "Zoom in" and "Zoom out" that change the scale by 10% between 40% and 200%, the button "Fit to view" that scales the graph to fit the canvas without going above 100%, and the current scale as a percentage, SHALL start fitted, SHALL zoom with the wheel while `Ctrl` or `⌘` is held, SHALL let the user pan with the scroll bars of the canvas and the usual scrolling gestures, and SHALL not remember the scale.

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
- THEN the whole graph is visible and the percentage is below 100%

#### Scenario: Wheel
- GIVEN the pointer is over the canvas
- WHEN the user turns the wheel with `Ctrl` held
- THEN the scale changes, and without `Ctrl` the page scrolls as usual

### REQ-UI-078: Side panels scroll on their own
WHILE the window is 1024px wide or more, the details panel of the List view, the details panel of the Dependencies page and the discussion column of a bead page SHALL stay in view while the page scrolls, SHALL be no taller than the window less 3rem, SHALL scroll inside themselves when their content is taller, SHALL not pass the scroll on to the page when they reach their end, and SHALL be reachable with the keyboard with a name that says what they hold.

#### Scenario: Long bead in a panel
- GIVEN a bead whose content is taller than the window shown in the List view's panel
- WHEN the user scrolls inside the panel
- THEN the panel scrolls and the page does not

#### Scenario: Panel stays in view
- GIVEN a long list and a selected bead
- WHEN the user scrolls the page
- THEN the panel stays in view

#### Scenario: Keyboard
- GIVEN a panel with content taller than the window
- WHEN the user presses Tab
- THEN the panel can take focus and the arrow keys scroll it

### REQ-UI-079: Arrows between nodes with children
WHERE the scope of the Dependencies page has children, for every `blocked_by` relation between two beads that lie under the scope (each one a node or a descendant of a node at any depth), the page SHALL draw an arrow from the node that holds the blocker to the node that holds the blocked bead, SHALL draw no arrow when both lie under the same node, SHALL draw a single arrow for a pair of nodes with the label "n links" when n relations above one make it, and SHALL leave out a relation that has the scope bead itself as one end, which the heading bar shows instead.

#### Scenario: Direct relation
- GIVEN epics `r-1` and `r-2` without a parent and `r-2` blocked by `r-1`
- WHEN the project page is shown
- THEN an arrow goes from `r-1` to `r-2` without a label

#### Scenario: Through tasks
- GIVEN task `x` of epic `e-1` blocking tasks `y` and `z` of epic `e-2`, both epics without a parent
- WHEN the project page is shown
- THEN one arrow goes from `e-1` to `e-2` with the label "2 links"

#### Scenario: Deeper
- GIVEN a task under epic `e-1` under `r-1` blocking a task under `r-2`
- WHEN the project page is shown
- THEN an arrow goes from `r-1` to `r-2`

#### Scenario: Inside one node
- GIVEN tasks `a` and `b` of epic `e-1`, `b` blocked by `a`
- WHEN the project page is shown
- THEN there is no arrow for them, and the page of `e-1` draws `a`→`b`

#### Scenario: Cycle between nodes
- GIVEN a task of `e-1` blocking a task of `e-2` and another task of `e-2` blocking a task of `e-1`
- WHEN the project page is shown
- THEN both nodes are drawn and the warning "Dependency cycle between e-1, e-2" is shown

### REQ-UI-080: Going down and up
WHEN the user double-clicks a node or presses "View dependencies" in the details panel of the Dependencies page, the page SHALL show the Dependencies page of that bead and add a history entry, so that the browser's back button returns to the previous scope with its selection.

#### Scenario: Go down
- GIVEN the project page with the node `e-1`, which has tasks
- WHEN the user double-clicks `e-1`
- THEN `/beads/p/e-1/graph` is shown with the tasks of `e-1` as nodes

#### Scenario: Back
- GIVEN the user went down from the project page with `select=e-1` to the page of `e-1`
- WHEN the user presses the browser's back button
- THEN the project page is shown with `e-1` selected

#### Scenario: Bead without children
- GIVEN the node of task `a`
- WHEN the user double-clicks it
- THEN the page of `a` draws its blockers and the beads it blocks

### REQ-UI-081: Project entry and Only linked
The Beads page SHALL offer the link "Dependencies" next to the project picker to `/beads/<project>/graph`, and the Dependencies page of a scope with children SHALL offer a switch "Only linked", on at first on the project page and off at first on the page of a bead and not remembered, that leaves out the nodes without an arrow and shows "n without dependencies", and SHALL say "No dependencies between these beads" when it leaves out every node.

#### Scenario: Entry
- GIVEN the Beads page of project `p`
- WHEN it is shown
- THEN the link "Dependencies" goes to `/beads/p/graph`

#### Scenario: Only linked on the project page
- GIVEN `r-1`→`r-2` and 5 other beads without a parent and without arrows
- WHEN the project page is shown
- THEN `r-1` and `r-2` are drawn and "5 without dependencies" is shown

#### Scenario: Off inside a bead
- GIVEN an epic with an unlinked task
- WHEN its page is shown
- THEN the unlinked task is drawn and "Only linked" is off

## MODIFIED

### REQ-UI-030: Views
<!-- base: f54ba99fe6924d0ba94590c34767bb3dd06a56857ea81048776a710013eaeb5c -->
The Beads page SHALL offer the views List, Board and Focus kept in the URL as `view` (`list` when absent or unknown), SHALL load the beads once for all three views with the project, search, filters and "Show closed" of the list applying to each of them, and SHALL refresh them as in REQ-UI-027 without reloading the data when the view changes.

#### Scenario: Switch keeps filters
- GIVEN the List view with the filter status "open" and the search "fix"
- WHEN the user chooses Board
- THEN the URL has `view=board`, the filters are unchanged and no new request is made

#### Scenario: Restored from the URL
- GIVEN the URL has `?project=a&view=focus`
- WHEN the page loads
- THEN the Focus view is shown for project `a`

#### Scenario: Unknown view
- GIVEN the URL has `view=kanban`
- WHEN the page loads
- THEN the List view is shown

#### Scenario: Old Tree and Graph links
- GIVEN the URL has `?project=a&view=tree` or `?project=a&view=graph&epic=e-1`
- WHEN the page loads
- THEN the List view is shown and there is no Tree or Graph tab

### REQ-UI-045: Selection and detail panel
<!-- base: 6f25cd640db90635d3d4424b721b6fdce71e0411b54236e95a3ee56f7c7a2104 -->
WHILE the window is 1024px wide or more and the user clicks a row, the List view SHALL select it, keep its id in the URL as `select`, mark it selected, and show the bead in a panel beside the list with the content of the bead page (fields, text sections, relations and the discussion), without the breadcrumb and with an "Open page" link to `/beads/<project>/<id>`, the panel SHALL say "Select a bead to see its details" when nothing is selected, SHALL keep showing a selected bead that is not in the current list together with the note "Not in the current list", SHALL stay in view and scroll on its own as REQ-UI-078 describes, and a reload SHALL restore the selection, and WHILE the window is narrower than 1024px a click on a row SHALL open the bead page.

#### Scenario: Select a row
- GIVEN the List view and a window 1280px wide
- WHEN the user clicks the bead `t-1`
- THEN the URL has `select=t-1`, the row is marked selected and the panel shows its title, text and discussion

#### Scenario: Nothing selected
- GIVEN the URL has no `select`
- WHEN the List view is shown
- THEN the panel says "Select a bead to see its details"

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

### REQ-UI-048: Dependency layers
<!-- base: 97d1c9d878c00400ebc358f3b8e0717573d503e372346cec5c44e2fc203ea6d5 -->
The Dependencies page SHALL place each node one layer below its furthest blocker, so that nodes without blockers are in the first layer at the top, SHALL order the nodes of a layer by the average position of their blockers in the layers above to limit crossing arrows, and SHALL draw an arrow from each blocker down to the node it blocks.

#### Scenario: Chain
- GIVEN tasks `a`, `b`, `c` where `b` is blocked by `a` and `c` by `b`
- WHEN the epic is drawn
- THEN `a`, `b`, `c` are in layers 0, 1, 2 from the top, with arrows `a`→`b` and `b`→`c`

#### Scenario: Diamond
- GIVEN `d` blocked by `b` and `c`, both blocked by `a`
- WHEN the epic is drawn
- THEN `a` is in layer 0, `b` and `c` in layer 1 and `d` in layer 2

#### Scenario: Order inside a layer
- GIVEN `a` and `b` in layer 0, `x` blocked by `b` and `y` blocked by `a`, and `a` placed before `b`
- WHEN the epic is drawn
- THEN `y` is placed before `x` in layer 1, so that the arrows do not cross

#### Scenario: No relations
- GIVEN an epic whose tasks block none of each other
- WHEN the epic is drawn
- THEN all nodes are in layer 0 and the note "No blocking relations between these tasks" is shown

### REQ-UI-049: Node content
<!-- base: 548c5644d47cdf85dd5b763de99cde166e37aedee24543f62546be0ad3a3ce12 -->
The Dependencies page SHALL show on each node the content of a card: the bead id in the monospace face and `P<n>` on the first line, its title on one line with the full title as `title`, and its state as REQ-UI-064 describes, with the 4px left edge in the colour of the state, and on a node with children "n of m done" over its direct children with an icon that says it can be opened.

#### Scenario: Node with children
- GIVEN epic `e-1` without a parent with 3 tasks, 1 of them closed
- WHEN the project page is shown
- THEN the node `e-1` reads "1 of 3 done" with the open icon

#### Scenario: State label
- GIVEN a ready task and a blocked task
- WHEN the epic is drawn
- THEN the first node reads "Ready" with its icon and the second "Blocked" with its icon

#### Scenario: Closed bead
- GIVEN a closed task
- WHEN the epic is drawn
- THEN it is drawn as "Done", whatever "Show closed" says on the Beads page

### REQ-UI-051: Selection and path
<!-- base: 6844cc430e84a8fcdfc62fc9b63de30e0ec96f5257cc70e9c2b25298c6b5796f -->
WHEN the Dependencies page of a bead opens, it SHALL select the bead being viewed (for a bead with children, through its heading bar), WHEN the project page opens, it SHALL select nothing and the panel SHALL say "Select a bead to see its details", and WHEN the user clicks a node or presses Enter on it, it SHALL select that bead, keep its id in the URL as `select` without adding a history entry, highlight the node, all its direct and indirect blockers, all beads it blocks directly or indirectly and the arrows between them, dim every other node and arrow, and show the bead in a panel beside the graph (below it under 1024px) with the content of the bead page and an "Open page" link as REQ-UI-045 describes.

#### Scenario: Project page
- GIVEN the project page
- WHEN it is shown
- THEN no node is selected and the panel says "Select a bead to see its details"

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

### REQ-UI-052: Graph keyboard
<!-- base: 538db500efc449e1ecbcb2ea0f2189ccd824265a4c404aa822cd1bee0f5ec6f2 -->
WHILE a node has focus, the Dependencies page SHALL move focus along the arrows with ArrowDown to a blocked bead and ArrowUp to a blocker, and to the previous or next node of the same layer with ArrowLeft and ArrowRight, SHALL select the bead being viewed again on Escape, or nothing on the project page, and SHALL keep a single node in the tab order; and under 1024px it SHALL offer the buttons "n blockers" and "n blocked" for the selected bead that move the selection along the arrows.

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

### REQ-UI-053: Dependencies button
<!-- base: 77560dc039c0bb9455e2e6d6898a50a52dd9b72c3fbac39e2aef900df3b522aa -->
WHEN a bead page or a details panel shows a bead with at least one child, or a bead that has a blocker or blocks another bead, it SHALL offer the primary button "View dependencies" that goes to `/beads/<project>/<id>/graph` inside the console, and SHALL not offer it otherwise.

#### Scenario: Epic with tasks
- GIVEN the bead page of epic `e-1` with children in project `p`
- WHEN the page loads
- THEN "View dependencies" links to `/beads/p/e-1/graph`

#### Scenario: Task with a blocker
- GIVEN a task with one blocker
- WHEN its page loads
- THEN "View dependencies" is offered

#### Scenario: Nothing to draw
- GIVEN a task without blockers that blocks nothing, and an epic without children
- WHEN their pages load
- THEN there is no "View dependencies"

#### Scenario: Details panel
- GIVEN an epic with children shown in the details panel of the List view
- WHEN the panel is shown
- THEN it offers "View dependencies"

### REQ-UI-072: Breadcrumb
<!-- base: bebbe0c632f5874f64226e871ccf505fdb15b878b3704aaacc9b93401e26960e -->
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of the link "Beads" followed by the name of the view of the remembered place (REQ-UI-073) and, when a search, a status, priority, label, type or lane filter or "Show closed" is active, "· N filters" where N counts them, all as one link to the remembered place, then the parent of the bead as a link to its page when it has one, then the id of the bead marked `aria-current="page"`, or, on a Dependencies page, after the link to the remembered place, "Dependencies" as a link to the project page, then every ancestor of the scope bead from the top as a link to its Dependencies page, then the id of the scope bead, with the last item marked `aria-current="page"`, and under 640px SHALL show only the first link.

#### Scenario: Place and filters
- GIVEN the Beads page was last at `?project=a&view=board&status=open&q=fix`
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads › Board · 2 filters" then `a-1`, and the first link goes to `/beads?project=a&view=board&status=open&q=fix`

#### Scenario: Parent
- GIVEN the bead `a-2` has the parent `a-1`
- WHEN the bead page of `a-2` is shown
- THEN the breadcrumb has a link `a-1` to `/beads/a/a-1` before `a-2`

#### Scenario: No remembered place
- GIVEN the Beads page was not shown in this tab
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads" then `a-1` and "Beads" goes to `/beads?project=a`

#### Scenario: Details panel
- GIVEN a bead shown in the details panel of the List view
- WHEN the panel is shown
- THEN it has no breadcrumb and keeps its "Open page" link

#### Scenario: Dependencies page
- GIVEN `a-3` under `a-2` under `a-1`
- WHEN the Dependencies page of `a-3` is shown
- THEN the breadcrumb reads "Beads", "Dependencies" linking to `/beads/a/graph`, `a-1` and `a-2` linking to their Dependencies pages, and `a-3` as the current page

#### Scenario: Project Dependencies page
- GIVEN the Dependencies page of project `a`
- WHEN it is shown
- THEN the breadcrumb ends with "Dependencies" as the current page

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN the bead page is shown
- THEN only the first link of the breadcrumb is shown

### REQ-UI-050: Outside beads and cycles
<!-- base: 9cad241e580c67cda12626bd8b7965924fb435dd1f9cec2505cc8e9a98d2cfb5 -->
WHERE a drawn node, or a bead under it, has a `blocked_by` relation with a bead outside the scope, the Dependencies page SHALL draw that outside bead as a dimmed node with a dashed border, above with an arrow to the node when it blocks, and below with an arrow from the node when it is blocked, and IF the arrows form a cycle, THEN the page SHALL still draw every node, SHALL put the nodes of the cycle in layers without looping forever, and SHALL show the warning "Dependency cycle between …" naming the beads.

#### Scenario: Outside blocker
- GIVEN task `t-1` of `e-1` blocked by `x-9`, a task of another epic
- WHEN `e-1` is drawn
- THEN `x-9` is drawn dimmed with a dashed border above, with an arrow to `t-1`

#### Scenario: Outside blocked bead
- GIVEN task `t-1` of `e-1` blocking `x-9`, a task of another epic
- WHEN `e-1` is drawn
- THEN `x-9` is drawn dimmed with a dashed border below, with an arrow from `t-1`

#### Scenario: Cycle
- GIVEN `a` blocked by `b` and `b` blocked by `a`
- WHEN the epic is drawn
- THEN both nodes are drawn, the page responds, and the warning names `a` and `b`

### REQ-UI-054: Graph accessibility
<!-- base: 555bbd06cb5d00bca553223615ab7e2fae9e98ab461fb6c2553a06346fedf376 -->
The Dependencies page SHALL expose the graph to assistive technology with a visually hidden list stating, for every arrow, "<blocked id> is blocked by <blocker id>", followed for an arrow made of relations under the nodes by those relations in the same form, SHALL never convey a state by colour alone, SHALL give every colour a contrast of at least 4.5:1 against the node background in light and dark themes, and SHALL not animate when the user prefers reduced motion.

#### Scenario: Text alternative
- GIVEN `b` blocked by `a`
- WHEN the epic is drawn
- THEN the hidden list contains "b is blocked by a"

#### Scenario: Arrow made of relations
- GIVEN task `y` of `e-2` blocked by task `x` of `e-1`
- WHEN the project page is drawn
- THEN the hidden list contains "e-2 is blocked by e-1" followed by "y is blocked by x"

#### Scenario: Reduced motion
- GIVEN the user prefers reduced motion
- WHEN a node is selected
- THEN the highlight changes without a transition

## REMOVED

### REQ-UI-047: Epic picker
<!-- base: 6583c92a0edc339ab33b9283c1e766d40c7755662e1136587b1aa647bca495ca -->
Reason: the Graph tab is gone; an epic's graph is reached from the epic through "View dependencies" (REQ-UI-053), so there is no list of epics to pick from.
