# Spec Delta: One hierarchical List view

## ADDED

### REQ-UI-072: Breadcrumb
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of the link "Beads" followed by the name of the view of the remembered place (REQ-UI-073) and, when a search, a status, priority, label, type or lane filter or "Show closed" is active, "· N filters" where N counts them, all as one link to the remembered place, then the parent of the bead as a link to its page when it has one, then the id of the bead marked `aria-current="page"`, and under 640px SHALL show only the first link.

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

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN the bead page is shown
- THEN only the first link of the breadcrumb is shown

### REQ-UI-073: Remembered place
The Beads page SHALL remember its URL query for the current browser tab, SHALL use it for the first link of the breadcrumb when the remembered project is the project of the bead and `/beads?project=<project>` otherwise, SHALL NOT change it when the user goes from bead to bead, and IF the browser refuses to store it, THEN SHALL keep it for the visit without an error.

#### Scenario: Back to the Board with its filters
- GIVEN the Board with the filter status "open" is shown
- WHEN the user opens a card and then uses the first link of the breadcrumb
- THEN the Board is shown with the filter status "open"

#### Scenario: From bead to bead
- GIVEN the user came from the Board with filters and opens a related bead from the bead page
- WHEN the related bead is shown and the first link of the breadcrumb is used
- THEN the Board with the same filters is shown

#### Scenario: Other project
- GIVEN the remembered place belongs to project `a`
- WHEN the bead page of a bead of project `b` is shown
- THEN the first link goes to `/beads?project=b`

#### Scenario: Reload
- GIVEN the Beads page was last at `view=focus` in this tab
- WHEN the bead page is reloaded
- THEN its breadcrumb still returns to the Focus view

#### Scenario: Storage refused
- GIVEN the browser throws when the place is stored
- WHEN the user opens a bead and uses the breadcrumb
- THEN the remembered place of this visit is used and no error is shown

### REQ-UI-074: Remembered branches
The List view SHALL remember for the current browser tab which branches of each project are open, SHALL open them again when the List is shown after another page, and SHALL ignore remembered ids that are not among the loaded beads.

#### Scenario: Return to the List
- GIVEN the user opened the epic `e-1` in the List and then visited a bead page
- WHEN the List is shown again
- THEN `e-1` is open

#### Scenario: A bead is gone
- GIVEN `e-9` was remembered as open and is no longer loaded
- WHEN the List is shown
- THEN no error is shown and the other remembered branches are open

#### Scenario: Per project
- GIVEN branches were opened in project `a`
- WHEN the List of project `b` is shown
- THEN only the root level of `b` is open

## MODIFIED

### REQ-UI-024: Bead list
<!-- base: b38842902502bf56f127a6c81284812982c60dc476f31145af16cf6c6761d009 -->
The bead list SHALL show the loaded beads as an indented hierarchy as REQ-UI-041 describes, SHALL show for each bead the content REQ-UI-044 describes, and SHALL show how many of the loaded beads match the current search and filters.

#### Scenario: Hierarchy order
- GIVEN a P2 root bead updated yesterday and a P1 root bead updated last week
- WHEN the list loads
- THEN the P1 bead is first, and both show id, title, state, type and `P<n>`

#### Scenario: Count
- GIVEN 83 loaded beads of which 5 match the filters
- WHEN the list is shown
- THEN it says 5 of 83

#### Scenario: Empty
- GIVEN no bead matches
- WHEN the list is shown
- THEN it says no beads match

### REQ-UI-030: Views
<!-- base: 2c444d4120dde9b3cc67826c6434fd58b244b9d8aaa85ab7a6d4c228420d7d79 -->
The Beads page SHALL offer the views List, Board, Focus and Graph kept in the URL as `view` (`list` when absent or unknown), SHALL load the beads once for all four views with the project, search, filters and "Show closed" of the list applying to each of them, and SHALL refresh them as in REQ-UI-027 without reloading the data when the view changes.

#### Scenario: Switch keeps filters
- GIVEN the List view with the filter status "open" and the search "fix"
- WHEN the user chooses Board
- THEN the URL has `view=board`, the filters are unchanged and no new request is made

#### Scenario: Restored from the URL
- GIVEN the URL has `?project=a&view=focus`
- WHEN the page loads
- THEN the Focus view is shown for project `a`

#### Scenario: Graph view
- GIVEN the URL has `?project=a&view=graph`
- WHEN the page loads
- THEN the Graph view is shown for project `a`

#### Scenario: Unknown view
- GIVEN the URL has `view=kanban`
- WHEN the page loads
- THEN the List view is shown

#### Scenario: Old Tree link
- GIVEN the URL has `?project=a&view=tree`
- WHEN the page loads
- THEN the List view is shown and there is no Tree tab

### REQ-UI-041: List hierarchy
<!-- base: a69269f1cd6228bd3800e7ad9c2ad35d15deb9cbe9e213b2274ad6af08305a3f -->
The List view SHALL show as roots the beads without a parent or whose parent is not among the loaded beads, SHALL show the beads whose `parent` is a row as that row's children, indented by level, and SHALL order siblings by priority and then by last update, newest first.

#### Scenario: Roots and children
- GIVEN an epic `e-1` with children `t-1` and `t-2`, and a bead `x-1` without a parent
- WHEN the List view is shown
- THEN the roots are `e-1` and `x-1` and `e-1` has the children `t-1` and `t-2` indented under it

#### Scenario: Parent not loaded
- GIVEN a bead whose parent is closed and "Show closed" is off
- WHEN the List view is shown
- THEN that bead is a root

#### Scenario: Order
- GIVEN siblings of priority P2, P1 and P1 where one P1 sibling was updated later
- WHEN the List view is shown
- THEN the later-updated P1, the other P1, then the P2 are listed

### REQ-UI-043: List filters
<!-- base: 404ab53621aa925bddb444143f7d76232a2777ac355c8698575d950daaa428d3 -->
WHEN a search, a filter or a lane is active, the List view SHALL show only the beads that match them together with their ancestors in the hierarchy, with every branch that leads to a match open, and SHALL leave out closed beads unless "Show closed" is on.

#### Scenario: Match with ancestors
- GIVEN an epic with a child titled "Fix login" and another titled "Add search"
- WHEN the user searches "login"
- THEN the epic and the "Fix login" child are shown, open, and "Add search" is not

#### Scenario: Closed beads
- GIVEN a closed child and "Show closed" off
- WHEN the List view is shown
- THEN the closed child is not shown, and it is shown after "Show closed" is turned on

#### Scenario: Lane
- GIVEN beads labelled "frontend" and "backend" and the lane "frontend"
- WHEN the List view is shown
- THEN only the "frontend" beads and their ancestors are shown

### REQ-UI-044: List rows
<!-- base: a487117b8f048425b544414e2cea2c7e6634caf7efdb622845bc12e2772f08c1 -->
The List view SHALL show for each row an open/close control when it has children, its id in the monospace face, its title as a link to `/beads/<project>/<id>`, its state as REQ-UI-064 describes, its type as REQ-UI-067 describes, `P<n>`, the indicators of REQ-UI-066, its assignee or owner, up to three labels from 768px, and its last update, SHALL show for an epic how many of its direct children are closed with a progress bar, SHALL open only the root level at first unless branches were remembered (REQ-UI-074), SHALL open and close a branch when its control is used, SHALL offer "Expand all" and "Collapse all", SHALL show at most 2000 rows and say how many more are not shown, and SHALL draw a row on two lines under 768px.

#### Scenario: Row content
- GIVEN a blocked P1 bug assigned to alice with 2 comments
- WHEN the List view is shown
- THEN its row shows the id, the title link, "Blocked", the pill "bug", `P1`, a comment indicator 2 and alice

#### Scenario: Open a branch
- GIVEN the List view with a collapsed epic
- WHEN the user opens it
- THEN its children are shown, and closing it hides them again

#### Scenario: Expand all and collapse all
- GIVEN a hierarchy with several levels
- WHEN the user chooses "Expand all", then "Collapse all"
- THEN every branch opens, then only the roots are shown

#### Scenario: Epic progress
- GIVEN an epic with 5 children of which 3 are closed
- WHEN the List view is shown with "Show closed" on
- THEN the epic says "3/5 closed" with a progress bar

#### Scenario: Plain text
- GIVEN a title containing `<script>x</script>`
- WHEN the List view is shown
- THEN it appears as text and no `script` element exists

#### Scenario: Two lines on a phone
- GIVEN a window 390px wide
- WHEN a row is shown
- THEN the title is on the first line and the state, type and indicators on the second

#### Scenario: Row limit
- GIVEN 2100 root beads
- WHEN the List view is shown
- THEN 2000 rows are shown and a line says "100 more not shown"

### REQ-UI-045: Selection and detail panel
<!-- base: c621195c701294514df1ae979248942da0a0b1964cde256853d3c0f7aa05af21 -->
WHILE the window is 1024px wide or more and the user clicks a row, the List view SHALL select it, keep its id in the URL as `select`, mark it selected, and show the bead in a panel beside the list with the content of the bead page (fields, text sections, relations and the discussion), without the breadcrumb and with an "Open page" link to `/beads/<project>/<id>`, the panel SHALL say "Select a bead to see its details" when nothing is selected, SHALL keep showing a selected bead that is not in the current list together with the note "Not in the current list", and a reload SHALL restore the selection, and WHILE the window is narrower than 1024px a click on a row SHALL open the bead page.

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

### REQ-UI-046: List keyboard and roles
<!-- base: 53d2bad86f47629f3589cd3ebfdaab482e94e7c808c1ed9151324f2a72168a4e -->
The List view SHALL expose the hierarchy with `role="tree"` and each row with `role="treeitem"`, `aria-level`, `aria-selected` and, when it has children, `aria-expanded`, and WHILE a row has focus the Up and Down arrows SHALL move focus to the previous and next shown row, Right SHALL open a closed branch and otherwise move to its first child, Left SHALL close an open branch and otherwise move to its parent, and `Enter` SHALL select the row.

#### Scenario: Roles
- GIVEN the List view with an open epic
- WHEN it is shown
- THEN there is a tree, the epic is a treeitem with `aria-expanded` true and its children have a greater `aria-level`

#### Scenario: Move
- GIVEN focus is on the first row
- WHEN the user presses Down, then Up
- THEN focus moves to the next shown row, then back

#### Scenario: Open and close
- GIVEN focus is on a closed epic
- WHEN the user presses Right, then Left
- THEN the branch opens and focus moves to its first child on a second Right, and Left closes it or moves to the parent

#### Scenario: Select with Enter
- GIVEN focus is on a row
- WHEN the user presses `Enter`
- THEN the row is selected

## REMOVED

### REQ-UI-042: Blocking tree
<!-- base: a0f7c27769984f84f4ec2fea3d5c14c37767c61b5b8e9b4e2ef588b06c6e0d1d -->
Reason: the Blocking mode goes with the Tree view, which the hierarchical List replaces (the 2000-row limit moves to REQ-UI-044); what blocks what is answered by the dependency graph of a bead (epic gin-console-s77), and a blocked bead keeps its "Blocked" state and its dependency indicator on every card and row.
