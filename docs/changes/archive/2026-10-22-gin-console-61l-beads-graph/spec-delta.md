# Spec Delta: Beads graph

## ADDED

### REQ-UI-047: Epic picker
WHILE the Graph view is shown and `epic` does not name an epic of the loaded beads, the Graph view SHALL list the epics, each with its id, title, number of descendant tasks and number of those tasks that are blocked, and SHALL say "No epics" when there are none.

#### Scenario: List of epics
- GIVEN epic `e-1` with three descendant tasks of which one is blocked, and epic `e-2` without tasks
- WHEN the Graph view is shown without `select`
- THEN both epics are listed and `e-1` shows 3 tasks and 1 blocked

#### Scenario: Epic is not an epic
- GIVEN the URL has `view=graph&epic=t-1` and `t-1` is a task
- WHEN the page loads
- THEN the epics are listed and no error is shown

### REQ-UI-048: Dependency layers
WHEN an epic is chosen, the Graph view SHALL draw every descendant of the epic (found through `parent`) as a node, SHALL draw an arrow from each blocker to the node it blocks for every `blocked_by` id among the drawn nodes, and SHALL place each node one layer to the right of its furthest blocker, so that nodes without blockers are in the first layer.

#### Scenario: Chain
- GIVEN tasks `a`, `b`, `c` where `b` is blocked by `a` and `c` by `b`
- WHEN the epic is drawn
- THEN `a`, `b`, `c` are in layers 0, 1, 2 with arrows `a`→`b` and `b`→`c`

#### Scenario: Diamond
- GIVEN `d` blocked by `b` and `c`, both blocked by `a`
- WHEN the epic is drawn
- THEN `a` is in layer 0, `b` and `c` in layer 1 and `d` in layer 2

#### Scenario: Nested children
- GIVEN task `t-1` whose parent is epic `e-1` and task `t-2` whose parent is `t-1`
- WHEN `e-1` is drawn
- THEN both `t-1` and `t-2` are nodes

#### Scenario: No dependencies
- GIVEN an epic whose tasks block none of each other
- WHEN the epic is drawn
- THEN all nodes are in layer 0 and the note "No blocking relations between these tasks" is shown

#### Scenario: Epic without tasks
- GIVEN an epic without descendants
- WHEN the epic is drawn
- THEN the page says the epic has no tasks

### REQ-UI-049: Node content
The Graph view SHALL show on each node the bead id, its priority as `P<n>`, its title on one line with the full title as `title`, and its state as an icon together with a text label among Ready, In progress, Blocked, Done and Deferred, using the Board column rules of REQ-UI-031, and SHALL tint the node's left edge with a colour per state.

#### Scenario: State label
- GIVEN a ready task and a blocked task
- WHEN the epic is drawn
- THEN the first node reads "Ready" with its icon and the second "Blocked" with its icon

#### Scenario: Closed hidden
- GIVEN a closed task and "Show closed" off
- WHEN the epic is drawn
- THEN the closed task and its arrows are not drawn

### REQ-UI-050: Outside blockers and cycles
WHERE a drawn node is blocked by a bead outside the epic, the Graph view SHALL draw that blocker as a dimmed node with a dashed border and an arrow to the node, and IF the blocking relations form a cycle, THEN the Graph view SHALL still draw every node, SHALL put the nodes of the cycle in layers without looping forever, and SHALL show the warning "Dependency cycle between …" naming the beads.

#### Scenario: Outside blocker
- GIVEN task `t-1` of `e-1` blocked by `x-9`, a task of another epic
- WHEN `e-1` is drawn
- THEN `x-9` is drawn dimmed with a dashed border and an arrow to `t-1`

#### Scenario: Cycle
- GIVEN `a` blocked by `b` and `b` blocked by `a`
- WHEN the epic is drawn
- THEN both nodes are drawn, the page responds, and the warning names `a` and `b`

### REQ-UI-051: Selection and path
WHEN the user clicks a node or presses Enter on it, the Graph view SHALL keep its id in the URL as `select` and the chosen epic as `epic`, SHALL highlight the node, all its direct and indirect blockers, all beads it blocks directly or indirectly and the arrows between them, SHALL dim every other node and arrow, and SHALL show the bead in a panel beside the graph as REQ-UI-045 describes for the Tree view.

#### Scenario: Highlight chain
- GIVEN `a`→`b`→`c` and an unrelated `z`
- WHEN the user selects `b`
- THEN `a`, `b`, `c` and their arrows are highlighted, `z` is dimmed and the panel shows `b`

#### Scenario: Restored
- GIVEN the URL has `view=graph&epic=e-1&select=b`
- WHEN the page loads
- THEN `b` is selected and its chain is highlighted

### REQ-UI-052: Graph keyboard
WHILE a node has focus, the Graph view SHALL move focus along the edges with ArrowRight to a blocked bead and ArrowLeft to a blocker, and to the previous or next node of the same layer with ArrowUp and ArrowDown, SHALL clear the selection on Escape, and SHALL keep a single node in the tab order.

#### Scenario: Follow an edge
- GIVEN `a`→`b` and focus on `a`
- WHEN the user presses ArrowRight
- THEN focus moves to `b`

#### Scenario: Escape
- GIVEN a selected node
- WHEN the user presses Escape
- THEN nothing is selected and the highlight is removed

### REQ-UI-053: Graph link from an epic
WHEN a bead page shows an epic, the page SHALL offer the link "View graph" to `/beads?project=<project>&view=graph&epic=<id>` inside the console.

#### Scenario: Epic page
- GIVEN the bead page of epic `e-1` in project `p`
- WHEN the page loads
- THEN "View graph" links to `/beads?project=p&view=graph&epic=e-1`

#### Scenario: Not an epic
- GIVEN the bead page of a task
- WHEN the page loads
- THEN there is no "View graph" link

### REQ-UI-054: Graph accessibility
The Graph view SHALL expose the graph to assistive technology with a visually hidden list stating, for every arrow, "<blocked id> is blocked by <blocker id>", SHALL never convey a state by colour alone, SHALL give every colour a contrast of at least 4.5:1 against the node background in light and dark themes, and SHALL not animate when the user prefers reduced motion.

#### Scenario: Text alternative
- GIVEN `b` blocked by `a`
- WHEN the epic is drawn
- THEN the hidden list contains "b is blocked by a"

#### Scenario: Reduced motion
- GIVEN the user prefers reduced motion
- WHEN a node is selected
- THEN the highlight changes without a transition

## MODIFIED

### REQ-UI-030: Views
<!-- base: 4beb5dc352411a31d2351a0e220634345d6f5553cacf1ef1e8c45fc3d39e6470 -->
The Beads page SHALL offer the views List, Board, Focus, Tree and Graph kept in the URL as `view` (`list` when absent or unknown), SHALL load the beads once for all five views with the project, search, filters and "Show closed" of the list applying to each of them, and SHALL refresh them as in REQ-UI-027 without reloading the data when the view changes.

#### Scenario: Switch keeps filters
- GIVEN the List view with the filter status "open" and the search "fix"
- WHEN the user chooses Board
- THEN the URL has `view=board`, the filters are unchanged and no new request is made

#### Scenario: Restored from the URL
- GIVEN the URL has `?project=a&view=focus`
- WHEN the page loads
- THEN the Focus view is shown for project `a`

#### Scenario: Tree view
- GIVEN the URL has `?project=a&view=tree`
- WHEN the page loads
- THEN the Tree view is shown for project `a`

#### Scenario: Graph view
- GIVEN the URL has `?project=a&view=graph`
- WHEN the page loads
- THEN the Graph view is shown for project `a`

#### Scenario: Unknown view
- GIVEN the URL has `view=kanban`
- WHEN the page loads
- THEN the List view is shown

## REMOVED
