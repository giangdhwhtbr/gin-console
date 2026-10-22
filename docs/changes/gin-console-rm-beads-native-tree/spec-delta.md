# Spec Delta: Dependency tree

## ADDED

### REQ-BEADS-010: Blocking dependencies
The server SHALL return with every bead of the list `blocked_by`, the ids of the beads that block it, taken from the dependencies `bd list` prints whose type is `blocks` or `blocked-by`, SHALL leave out dependencies of any other type, SHALL leave out a dependency whose fields have the wrong types without dropping the bead, and SHALL return an empty list for a bead without such dependencies.

#### Scenario: Blocking ids
- GIVEN a bead with a `blocks` dependency on `a-1` and a `blocked-by` dependency on `a-2`
- WHEN a client requests the list
- THEN its `blocked_by` is `a-1` and `a-2`

#### Scenario: Other types ignored
- GIVEN a bead with `parent-child`, `related` and `discovered-from` dependencies
- WHEN a client requests the list
- THEN its `blocked_by` is empty

#### Scenario: Malformed dependency
- GIVEN a bead with one dependency whose `depends_on_id` is a number and one valid `blocks` dependency
- WHEN a client requests the list
- THEN the bead is returned and its `blocked_by` holds only the valid one

#### Scenario: No dependencies
- GIVEN a bead without dependencies
- WHEN a client requests the list
- THEN its `blocked_by` is empty

### REQ-UI-041: Hierarchy tree
WHILE the Tree view is in Hierarchy mode (the default), the Tree view SHALL show as roots the beads without a parent or whose parent is not among the loaded beads, SHALL show the beads whose `parent` is a node as that node's children, and SHALL order siblings by priority and then by last update, newest first.

#### Scenario: Roots and children
- GIVEN an epic `e-1` with children `t-1` and `t-2`, and a bead `x-1` without a parent
- WHEN the Tree view is shown
- THEN the roots are `e-1` and `x-1` and `e-1` has the children `t-1` and `t-2`

#### Scenario: Parent not loaded
- GIVEN a bead whose parent is closed and "Show closed" is off
- WHEN the Tree view is shown
- THEN that bead is a root

#### Scenario: Order
- GIVEN siblings of priority P2, P1 and P1 where one P1 sibling was updated later
- WHEN the Tree view is shown
- THEN the later-updated P1, the other P1, then the P2 are listed

### REQ-UI-042: Blocking tree
WHILE the Tree view is in Blocking mode (kept in the URL as `tree=blocking`), the Tree view SHALL show as roots the beads that block at least one loaded bead and are blocked by none, SHALL show as a node's children the loaded beads whose `blocked_by` holds it, SHALL show a bead that is already above it on the same branch only as a leaf marked "also above", and SHALL show at most 2000 nodes, saying how many more are not shown.

#### Scenario: What a bead unlocks
- GIVEN `a-1` blocks `a-2`, and `a-2` blocks `a-3`
- WHEN the Tree view is shown in Blocking mode
- THEN the root is `a-1`, its child is `a-2` and the child of `a-2` is `a-3`

#### Scenario: Blocked from two places
- GIVEN `a-3` is blocked by both `a-1` and `a-2`
- WHEN the Tree view is shown in Blocking mode
- THEN `a-3` appears under `a-1` and under `a-2`

#### Scenario: Cycle
- GIVEN `a-1` blocks `a-2` and `a-2` blocks `a-1`
- WHEN the Tree view is shown in Blocking mode
- THEN the tree is finite and the repeated bead is a leaf marked "also above"

#### Scenario: Too many nodes
- GIVEN more than 2000 nodes would be shown
- WHEN the Tree view is shown
- THEN 2000 are shown and a line says how many more are not shown

#### Scenario: Mode in the URL
- GIVEN the URL has `?project=a&view=tree&tree=blocking`
- WHEN the page loads
- THEN the Tree view is shown in Blocking mode, and any other `tree` value gives Hierarchy mode

### REQ-UI-043: Tree filters
WHEN a search, a filter or a lane is active, the Tree view SHALL show only the beads that match them together with their ancestors in the tree, with every branch that leads to a match open, and SHALL leave out closed beads unless "Show closed" is on.

#### Scenario: Match with ancestors
- GIVEN an epic with a child titled "Fix login" and another titled "Add search"
- WHEN the user searches "login"
- THEN the epic and the "Fix login" child are shown, open, and "Add search" is not

#### Scenario: Closed beads
- GIVEN a closed child and "Show closed" off
- WHEN the Tree view is shown
- THEN the closed child is not shown, and it is shown after "Show closed" is turned on

#### Scenario: Lane
- GIVEN beads labelled "frontend" and "backend" and the lane "frontend"
- WHEN the Tree view is shown
- THEN only the "frontend" beads and their ancestors are shown

### REQ-UI-044: Tree nodes
The Tree view SHALL show for each node an open/close control when it has children, its id, its title, its status, `P<n>` and its type, SHALL show for an epic in Hierarchy mode how many of its direct children are closed, SHALL show "blocked by N" in Blocking mode for a bead with N loaded blockers, SHALL open only the root level at first, SHALL open and close a branch when its control is used, and SHALL offer "Expand all" and "Collapse all".

#### Scenario: Open a branch
- GIVEN the Tree view with a collapsed epic
- WHEN the user opens it
- THEN its children are shown, and closing it hides them again

#### Scenario: Expand all and collapse all
- GIVEN a tree with several levels
- WHEN the user chooses "Expand all", then "Collapse all"
- THEN every branch opens, then only the roots are shown

#### Scenario: Epic progress
- GIVEN an epic with 5 children of which 3 are closed
- WHEN the Tree view is shown with "Show closed" on
- THEN the epic says "3/5 closed"

#### Scenario: Plain text
- GIVEN a title containing `<script>x</script>`
- WHEN the Tree view is shown
- THEN it appears as text and no `script` element exists

### REQ-UI-045: Selection and detail panel
WHEN the user clicks a node, the Tree view SHALL select it, keep its id in the URL as `select`, mark it selected, and show the bead in a panel beside the tree with the content of the bead page (fields, text sections, relations and comments), without the "Back to beads" link and with an "Open page" link to `/beads/<project>/<id>`; the panel SHALL say "Select a bead to see its details" when nothing is selected, SHALL keep showing a selected bead that is not in the current tree together with the note "Not in the current tree", and a reload SHALL restore the selection.

#### Scenario: Select a node
- GIVEN the Tree view
- WHEN the user clicks the bead `t-1`
- THEN the URL has `select=t-1`, the node is marked selected and the panel shows its title, text and comments

#### Scenario: Nothing selected
- GIVEN the URL has no `select`
- WHEN the Tree view is shown
- THEN the panel says "Select a bead to see its details"

#### Scenario: Restored selection
- GIVEN the URL has `view=tree&select=t-1`
- WHEN the page loads
- THEN `t-1` is selected, its branch is open and the panel shows it

#### Scenario: Selected bead not in the tree
- GIVEN `t-1` is selected and a filter hides it
- WHEN the Tree view is shown
- THEN the panel still shows `t-1` with "Not in the current tree"

#### Scenario: Open page link
- GIVEN a bead is selected
- WHEN the panel is shown
- THEN it has a link "Open page" to `/beads/<project>/t-1` and no "Back to beads" link

#### Scenario: Selection changes
- GIVEN `t-1` is selected and its comments are loading
- WHEN the user selects `t-2`
- THEN the panel shows `t-2` and the late comments of `t-1` do not replace its comments

### REQ-UI-046: Tree keyboard and roles
The Tree view SHALL expose the tree with `role="tree"` and each node with `role="treeitem"`, `aria-level`, `aria-selected` and, when it has children, `aria-expanded`, and WHILE a node has focus the Up and Down arrows SHALL move focus to the previous and next shown node, Right SHALL open a closed branch and otherwise move to its first child, Left SHALL close an open branch and otherwise move to its parent, and `Enter` SHALL select the node.

#### Scenario: Roles
- GIVEN the Tree view with an open epic
- WHEN it is shown
- THEN there is a tree, the epic is a treeitem with `aria-expanded` true and its children have a greater `aria-level`

#### Scenario: Move
- GIVEN focus is on the first node
- WHEN the user presses Down, then Up
- THEN focus moves to the next shown node, then back

#### Scenario: Open and close
- GIVEN focus is on a closed epic
- WHEN the user presses Right, then Left
- THEN the branch opens and focus moves to its first child on a second Right, and Left closes it or moves to the parent

#### Scenario: Select with Enter
- GIVEN focus is on a node
- WHEN the user presses `Enter`
- THEN the node is selected

## MODIFIED

### REQ-UI-030: Views
<!-- base: bbaf454b5331d0dd05b570b28f47b9d971473c3732d0344e51c1e03c57526bdb -->
The Beads page SHALL offer the views List, Board, Focus and Tree kept in the URL as `view` (`list` when absent or unknown), SHALL load the beads once for all four views with the project, search, filters and "Show closed" of the list applying to each of them, and SHALL refresh them as in REQ-UI-027 without reloading the data when the view changes.

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

#### Scenario: Unknown view
- GIVEN the URL has `view=graph`
- WHEN the page loads
- THEN the List view is shown
