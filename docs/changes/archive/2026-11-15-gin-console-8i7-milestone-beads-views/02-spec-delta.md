# Spec Delta: Milestone beads views

## ADDED

### REQ-MILESTONE-UI-018: Beads tab on the milestone page
The milestone page SHALL offer the tabs Gantt and Beads, kept in the URL as `tab` (`gantt` when absent or unknown, `beads`), and SHALL treat `tab=graph` as `tab=beads` with `view=graph`. WHILE the Beads tab is shown, the page SHALL show the Beads views (REQ-UI-030) of the milestone's project with the Milestone filter fixed to this milestone and no Milestone select, SHALL keep their search, filters, view, selection and graph scope in the milestone page's URL with the names the Beads page uses, and SHALL fetch closed beads without "Show closed" WHILE the milestone is closed. WHEN the user changes tab, the page SHALL keep only `start` and `zoom` of the query besides `tab`.

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

### REQ-UI-106: Graph view
The Beads views SHALL offer the view Graph (`view=graph`), which SHALL draw, with the nodes, arrows, outside beads and cycle warning of the Dependencies page (REQ-UI-048 to REQ-UI-050, REQ-UI-079), the direct children of its scope: the bead named by `scope` in the URL when it exists and has children, else the selected milestone, else the project (REQ-MILESTONE-UI-006) when "All" or "No milestone" is selected. It SHALL draw a node only when the node's bead or one of its descendants matches the search, the filters and "Show closed", and only the arrows between drawn nodes. It SHALL offer the switch "Only linked" of REQ-UI-081, on at first when the scope is the project and off otherwise. WHEN a node is selected, the view SHALL keep it as `select` and show its details panel as the List view does. WHEN a node with children is opened, the view SHALL set `scope` to its id and show a breadcrumb from the milestone or project down to the scope, each item a link that sets `scope` to it. WHEN a node without children is opened, the frontend SHALL open its bead page. WHILE nothing matches, the view SHALL say "No beads match these filters".

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

## MODIFIED

### REQ-MILESTONE-UI-002: Milestone graph
<!-- base: d40b9a3397f76dc2422ec20c1441cdda76d8a1b651bb7bf2c54d84e438a944cf -->
gin-console SHALL show, on a milestone's page, in the Graph view of the Beads tab (REQ-MILESTONE-UI-018, REQ-UI-106), the milestone's epics and their dependency edges, marking dependencies outside the milestone as external.

#### Scenario: graph
- GIVEN milestone M1 with epics A and B, B depending on A
- WHEN the user opens the Graph view of the Beads tab of M1
- THEN A and B are shown with an edge from A to B

#### Scenario: dependency outside the milestone
- GIVEN epic A in M1 depending on epic X in M2
- WHEN the user opens the Graph view of the Beads tab of M1
- THEN X is shown as an external node with an edge to A

### REQ-UI-030: Views
<!-- base: 43f74e7d546f43484f337447e1e9d4a01a01f9174cf6f358e153f3bd8cebc962 -->
The Beads page, and the Beads tab of a milestone page (REQ-MILESTONE-UI-018), SHALL offer the views List, Board, Focus and Graph (REQ-UI-106) kept in the URL as `view` (`list` when absent or unknown), SHALL load the beads once for all four views with the project, search, filters and "Show closed" of the list applying to each of them, and SHALL refresh them as in REQ-UI-027 without reloading the data when the view changes.

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

#### Scenario: Old Tree link
- GIVEN the URL has `?project=a&view=tree`
- WHEN the page loads
- THEN the List view is shown and there is no Tree tab

#### Scenario: Old Graph link
- GIVEN the URL has `?project=a&view=graph&epic=e-1`
- WHEN the page loads
- THEN the Graph view is shown and `epic` is ignored

### REQ-UI-072: Breadcrumb
<!-- base: e5d0e14ad51e95f446b51b166830f149bd95eac3a2807e8e83827e783ce31d5b -->
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of the link "Beads", or the milestone id when the remembered place is the Beads tab of a milestone page, followed by the name of the view of the remembered place (REQ-UI-073) and, when a search, a status, priority, label, type, assignee or sprint filter or "Show closed" is active, "· N filters" where N counts them, all as one link to the remembered place, then the parent of the bead as a link to its page when it has one, then the id of the bead marked `aria-current="page"`, or, on a Dependencies page, after the link to the remembered place, "Dependencies" as a link to the project page, then every ancestor of the scope bead from the top as a link to its Dependencies page, then the id of the scope bead, with the last item marked `aria-current="page"`, and under 640px SHALL show only the first link.

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

#### Scenario: From a milestone page
- GIVEN the Beads tab of milestone `m2` of project `a` was last at `?tab=beads&view=board&status=open`
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "m2 › Board · 1 filter" then `a-1`, and the first link goes to `/milestones/a/m2?tab=beads&view=board&status=open`

### REQ-UI-073: Remembered place
<!-- base: f37817f9786fc352e9d08b287cb4529e4f0ee7b71ee66659d838efaea6e904f6 -->
The Beads page and the Beads tab of a milestone page SHALL remember their path and URL query for the current browser tab, the one shown last replacing the other, SHALL use it for the first link of the breadcrumb when the remembered project is the project of the bead and `/beads?project=<project>` otherwise, SHALL NOT change it when the user goes from bead to bead, and IF the browser refuses to store it, THEN SHALL keep it for the visit without an error.

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

#### Scenario: Milestone page last
- GIVEN the user opened the Beads page and then the Beads tab of milestone `m2` with the Graph view
- WHEN the user opens a node's bead page and uses the first link of the breadcrumb
- THEN the Graph view of the Beads tab of `m2` is shown

### REQ-UI-081: Only linked
<!-- base: fc0654d63c7ea364ca8ccfd3e4a2bd0ee2af549485498cf9c399eb29a5865a57 -->
The Beads page SHALL NOT offer a link "Dependencies" next to the project picker, its Graph view (REQ-UI-106) taking its place, and the Dependencies page of a scope with children SHALL offer a switch "Only linked", on at first on the project page and off at first on the page of a bead and not remembered, that leaves out the nodes without an arrow and shows "n without dependencies", and SHALL say "No dependencies between these beads" when it leaves out every node.

#### Scenario: No separate entry
- GIVEN the Beads page of project `p`
- WHEN it is shown
- THEN there is no link "Dependencies" next to the project picker and the views offer Graph

#### Scenario: Only linked on the project page
- GIVEN `r-1`→`r-2` and 5 other beads without a parent and without arrows
- WHEN the project page is shown
- THEN `r-1` and `r-2` are drawn and "5 without dependencies" is shown

#### Scenario: Off inside a bead
- GIVEN an epic with an unlinked task
- WHEN its page is shown
- THEN the unlinked task is drawn and "Only linked" is off

### REQ-UI-104: Beads milestone filter
<!-- base: 3cd9495315016b02ce4436048db486c838763093fa8f16f059ba0197fbe36f12 -->
WHEN the Beads page loads a project, the frontend SHALL request `GET /api/beads/milestones?project=<name>` and SHALL offer a "Milestone" single-select in the bead filter bar, and in its mobile sheet (REQ-UI-084), listing "All", "No milestone", then the milestones grouped as Active (`active`), Planned (`scheduled` and `planned`, by `start`) and Closed (latest `end` first), kept in the URL as `milestone` (`all`, `none` or a milestone id). WHEN the URL has no `milestone`, the filter SHALL select `current`, or "All" when `current` is `null`. WHILE a milestone is selected, only the beads whose `milestone` is that id SHALL match; WHILE "No milestone" is selected, only the beads whose `milestone` is `null` SHALL match. WHILE a closed milestone is selected, closed beads SHALL be fetched and shown without "Show closed". The filter SHALL apply to the List, Board, Focus and Graph views. IF the milestones request fails, THEN the select SHALL say "Milestones unavailable" and the page SHALL behave as with "All".

#### Scenario: Default to the current milestone
- GIVEN project `alpha` whose current milestone is `m2`, with beads under `m2` and `m3` and a bead under no milestone
- WHEN the user opens `/beads?project=alpha`
- THEN only the beads under `m2` are shown and the Milestone select shows `m2`

#### Scenario: All and No milestone
- GIVEN the same project
- WHEN the user chooses "All" and then "No milestone"
- THEN every bead is shown with `milestone=all` in the URL, then only the bead under no milestone with `milestone=none`

#### Scenario: Closed milestone
- GIVEN closed milestone `m1` whose beads are all closed, and "Show closed" off
- WHEN the user chooses `m1`
- THEN the beads are requested with `closed=1` and the closed beads of `m1` are shown

#### Scenario: No current milestone
- GIVEN a project whose milestones are all closed
- WHEN the user opens its Beads page without `milestone`
- THEN "All" is selected and every open bead is shown

#### Scenario: Milestones unavailable
- GIVEN `GET /api/beads/milestones` answers 502
- WHEN the Beads page loads
- THEN the Milestone select says "Milestones unavailable" and every bead is shown

## REMOVED
