# Spec Delta: Epic page

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     A requirement taken from a confirmed input adds "Source:" after its statement, with backticked paths
     relative to the living spec.md, such as `assets/<YYYY-MM-DD>/mockup/index.html#<screen-id>`.
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...".
     A requirement may add, right under its heading, `Type: functional | non-functional | business-rule`
     (default functional). A non-functional one adds `Category:` (performance, security, reliability,
     usability, compatibility, maintainability, portability, constraint) and either a scenario or `Measure:`
     with a measurable target; it needs no activity diagram. A business rule keeps a scenario; use cases
     cite it on `Requirements:`. -->

## ADDED

### REQ-UI-119: Epic page tabs
WHEN a bead of type `epic` is shown as a page (not as the details panel of another view), the bead page SHALL keep its title, badges and facts (REQ-UI-028, REQ-UI-110) above a tab list "Overview", "Graph", "Lanes" and "Discussion (N)", SHALL show "Lanes" only while the epic has a loaded child that is not a merge gate and whose `lane` is not `null` (REQ-UI-111), SHALL keep the open tab in the URL as `tab` (`overview` when absent or unknown, or when it names "lanes" for an epic without lanes), SHALL change tab with the Left and Right arrow keys with `aria-selected` on the open tab, and SHALL show in each tab:
- Overview: the cards and sections of REQ-UI-120 and REQ-UI-121, then the description and the text sections of REQ-UI-038;
- Graph: the Graph view of REQ-UI-106 with the epic as the scope, with the search and filters of the Beads views and the lane boxes of REQ-UI-117;
- Lanes: the Lanes view of REQ-UI-111 to REQ-UI-114 with the epic as the scope;
- Discussion: the comments of REQ-UI-039, or "No comments" when `comment_count` is 0.
The epic page SHALL NOT show the discussion column of REQ-UI-068 or the tabs of REQ-UI-069, and the details panel of an epic SHALL keep its compact form with "Open page".
Source: `assets/2026-11-20/epic-page/mockup/index.html`, `assets/2026-11-20/epic-page/shots/overview-light.png`

#### Scenario: Opens on Overview
- GIVEN epic `ex-e12` with lanes and two comments
- WHEN `/beads/example/ex-e12` is shown
- THEN the tabs Overview, Graph, Lanes and "Discussion (2)" are offered and Overview is open

#### Scenario: Tab in the URL
- GIVEN the page of `ex-e12` on Overview
- WHEN the user chooses Graph
- THEN the URL has `tab=graph` and the Graph view with `ex-e12` as the scope is shown with the search and filters

#### Scenario: No Lanes tab without lanes
- GIVEN epic `ex-e3`, whose tracks have no lane, and the URL `/beads/example/ex-e3?tab=lanes`
- WHEN the page loads
- THEN the tabs are Overview, Graph and Discussion, and Overview is open

#### Scenario: Not an epic
- GIVEN task `ex-e3.2`
- WHEN its page is shown
- THEN it has no Overview, Graph or Lanes tab and keeps the layout of REQ-UI-028 and REQ-UI-068

### REQ-UI-120: Epic overview cards
The Overview tab of an epic page SHALL show three cards side by side from 1024px and one under another below:
- Progress: "<closed> of <total> tracks closed · <percent>%" over the epic's children that are neither prep tasks (REQ-BEADS-002) nor merge gates (REQ-BEADS-019), a bar split by state (Done, In progress, Ready, Blocked, Deferred, each by REQ-UI-064) with a legend giving each state's word and count, then as label/value facts "Points" ("<done> of <total> pt done" over the tracks with `points`, or "No points"), "Bugs" (the open beads of the epic's `bugs`, "0 open" when none) and "Prep" ("<closed>/<total>" of its prep tasks, or "none");
- Workflow: the stages discuss, plan, orchestrate, execute and ship with the epic's current stage marked and the earlier ones ticked, then "Gates" ("<satisfied> of <n> satisfied"), "Warnings" and "Waivers" (each a count with the items on hover and focus, or "none"), from `GET /api/beads/{project}/{id}/workflow` (REQ-BEADS-020); "No workflow" when the answer has no stage, and the error when it fails, the rest of the page unaffected;
- Milestone: the epic's milestone id and title linking to the milestone page, its status, its window "<start> – <end>", the working days (Monday to Friday) from today to `end`, both counted, while it is active, and its forecast finish with a warning mark when the finish is after `end` (from `GET /api/milestones?project=`, REQ-MILESTONE-UI-008); "No milestone" when the epic's `milestone` is `null`.
Source: `assets/2026-11-20/epic-page/mockup/index.html`

#### Scenario: Progress by state
- GIVEN epic `ex-e12` with 8 tracks (4 closed, 1 in progress, 2 ready, 1 blocked) and a merge gate child
- WHEN its Overview is shown
- THEN Progress reads "4 of 8 tracks closed · 50%" and its legend reads Done 4, In progress 1, Ready 2, Blocked 1

#### Scenario: Points
- GIVEN tracks with points 3 (closed), 5 (in progress) and 3 (closed), and tracks without points
- WHEN the Overview is shown
- THEN Points reads "6 of 11 pt done"

#### Scenario: Workflow stage
- GIVEN `gin state --workflow-id ex-e12` reports stage `execute`, 4 of 6 gates satisfied, no warnings and no waivers
- WHEN the Overview is shown
- THEN discuss, plan and orchestrate are ticked, execute is marked, ship is plain, and Gates reads "4 of 6 satisfied"

#### Scenario: Workflow unavailable
- GIVEN the workflow request answers 502 with an error
- WHEN the Overview is shown
- THEN the Workflow card shows the error and the Progress and Milestone cards are shown

#### Scenario: Milestone forecast late
- GIVEN milestone `ex-m2` active from 10 Nov to 1 Dec 2026 with a forecast finish of 16 Feb 2027
- WHEN the Overview of `ex-e12` is shown on 20 Nov 2026
- THEN the Milestone card shows "ex-m2 Checkout v2", "10 Nov – 1 Dec 2026", "8 working days" left and the finish 16 Feb 2027 with a warning mark

### REQ-UI-121: Epic lanes summary and tracks table
Under the cards, the Overview tab SHALL show, while the epic has lanes (REQ-UI-111), a section "Lanes" with one row per lane in the row order of the Lanes view: the lane colour of REQ-UI-118 as a swatch and pale background, the lane name, its state (REQ-UI-112) as an icon and words, the holder and lease, what it waits for ("waits for <lane> #<N> (merge pending)" or "(merged)" for each merge gate of its first open track), and "<closed>/<total> closed", with a link "Open the Lanes tab". It SHALL then show a section "Tracks" with a table of the epic's children that are not merge gates, with the columns Id (linking to the bead page), Title (cut with an ellipsis and `title`), State (REQ-UI-064), Lane (the lane chip of REQ-UI-115 with its colour swatch, or "No lane"), Assignee ("Unclaimed" when none), Points ("–" when none) and Blocked by (the open blockers' ids, a merge gate written "<lane> #<N> · merge pending"), first ordered by Id; WHEN the user activates a column header other than Blocked by, the table SHALL sort by that column, ascending then descending, with `aria-sort` on that header. Below 1024px the table SHALL keep Id, Title and State and let the rest scroll sideways within the table.
Source: `assets/2026-11-20/epic-page/mockup/index.html`

#### Scenario: Lanes summary
- GIVEN epic `ex-e12` with lanes be, fe, infra and qa
- WHEN its Overview is shown
- THEN the Lanes section lists be, fe, infra and qa with their states, and qa reads "waits for be #2 (merge pending), fe #3 (merged)" and "0/1 closed"

#### Scenario: No lanes section
- GIVEN epic `ex-e3` without lanes
- WHEN its Overview is shown
- THEN there is no Lanes section and the Tracks table has no colour swatch

#### Scenario: Tracks table
- GIVEN epic `ex-e12` with 8 tracks and a merge gate child
- WHEN its Overview is shown
- THEN the Tracks table has 8 rows ordered by id, no row reads "Waits for", and the row of `ex-e12.4` reads Blocked, "qa", "Unclaimed" and "be #2 · merge pending"

#### Scenario: Sort by a column
- GIVEN the Tracks table of `ex-e12`
- WHEN the user activates the State header twice
- THEN the rows are ordered by state ascending and then descending, and the header has `aria-sort` "descending"

### REQ-BEADS-020: Workflow of an epic
WHEN a client requests `GET /api/beads/{project}/{id}/workflow`, the server SHALL run `gin state --workflow-id <id> --format json` in the project's directory, as REQ-SERVER-006 does for an epic in progress, and SHALL answer the `stage`, `gates`, `warnings` and `review_waivers` it reports; IF the command fails or its output cannot be read, THEN the server SHALL answer 502 with `{"error": <message>}`; the server SHALL answer 404 when the project is not configured or the bead is not in its export, and SHALL serve the same answer for the same project and id for 60 seconds unless `POST /api/refresh` dropped it.

#### Scenario: Stage of an epic
- GIVEN epic `e-1` whose `gin state --workflow-id e-1` reports stage `execute`, gates `{"plan_approved": "satisfied", "shipped": "unmet"}`, one warning and no waiver
- WHEN a client requests `GET /api/beads/p/e-1/workflow`
- THEN the answer is 200 with that stage, those gates, the warning and an empty `review_waivers`

#### Scenario: Command fails
- GIVEN `gin state --workflow-id e-1` exits non-zero with "unknown workflow"
- WHEN a client requests the workflow of `e-1`
- THEN the answer is 502 with an `error` naming the failure, and it is not cached

#### Scenario: Unknown bead
- GIVEN no bead `nope` in project `p`
- WHEN a client requests `GET /api/beads/p/nope/workflow`
- THEN the answer is 404 and no command ran

## MODIFIED

### REQ-UI-048: Dependency layers
<!-- base: bf494d4b7d76ea1b63f7d05ded9e8f6d16aa167718b9073e870bf32a581eec6e -->
The Graph view (REQ-UI-106, which also serves the Graph tab of an epic page, REQ-UI-119) SHALL place each node one layer below its furthest blocker, so that nodes without blockers are in the first layer at the top, SHALL order the nodes of a layer by the average position of their blockers in the layers above to limit crossing arrows, SHALL draw an arrow from each blocker down to the node it blocks, and SHALL place the nodes without any arrow apart, below the layers, in rows of at most 3 nodes under the heading "n without dependencies".

#### Scenario: Chain
- GIVEN tasks `a`, `b`, `c` where `b` is blocked by `a` and `c` by `b`
- WHEN the Graph view of the epic is drawn
- THEN `a`, `b`, `c` are in layers 0, 1, 2 from the top, with arrows `a`→`b` and `b`→`c`

#### Scenario: Diamond
- GIVEN `d` blocked by `b` and `c`, both blocked by `a`
- WHEN the Graph view of the epic is drawn
- THEN `a` is in layer 0, `b` and `c` in layer 1 and `d` in layer 2

#### Scenario: Order inside a layer
- GIVEN `a` and `b` in layer 0, `x` blocked by `b` and `y` blocked by `a`, and `a` placed before `b`
- WHEN the Graph view of the epic is drawn
- THEN `y` is placed before `x` in layer 1, so that the arrows do not cross

#### Scenario: No relations
- GIVEN an epic with 7 tasks that block none of each other, and "Only linked" off
- WHEN the Graph view of the epic is drawn
- THEN the 7 nodes are placed in rows of 3, 3 and 1 under "7 without dependencies"

#### Scenario: Linked and unlinked
- GIVEN `b` blocked by `a`, and `c`, `d`, `e`, `f` without blockers that block nothing, and "Only linked" off
- WHEN the Graph view of the epic is drawn
- THEN `a` and `b` are in layers 0 and 1, and `c`, `d`, `e` then `f` are placed below them in rows of 3 under "4 without dependencies"

### REQ-UI-049: Node content
<!-- base: 24a50bbd21b44f5d293c6bda167a067ae4d6c85face55f72e28446b47d7895b8 -->
The Graph view (REQ-UI-106) SHALL show on each node the content of a card: the bead id in the monospace face shortened as REQ-UI-107 describes and `P<n>` on the first line, its title on one line with the full title as `title`, and its state as REQ-UI-064 describes on one line, the state label cut short before "n of m done" is, with the 4px left edge in the colour of the state, and on a node with children an icon that says it can be opened, with "n of m done" over its tracks (REQ-BEADS-002) when it has a track. The node of a prep task SHALL show a "Prep" chip.

#### Scenario: Node with children
- GIVEN epic `e-1` without a parent with 3 tasks, 1 of them closed, and "Show closed" on
- WHEN the Graph view of the project is shown
- THEN the node `e-1` reads "1 of 3 done" with the open icon

#### Scenario: State label
- GIVEN a ready task and a blocked task
- WHEN the Graph view of the epic is drawn
- THEN the first node reads "Ready" with its icon and the second "Blocked" with its icon

#### Scenario: Closed bead
- GIVEN a closed task and "Show closed" on
- WHEN the Graph view of the epic is drawn
- THEN it is drawn as "Done"

#### Scenario: Node with a prep task
- GIVEN epic `e-1` without a parent with tracks `t-1` (closed) and `t-2` (open), and the open prep task `p-1` labelled `prep` and `prep:mockup`, and "Show closed" on
- WHEN the Graph view of the project is shown, and then the Graph view with the scope `e-1`
- THEN the node `e-1` reads "1 of 2 done" with the open icon, and with the scope `e-1` the node `p-1` shows a "Prep" chip while `t-1` and `t-2` do not

#### Scenario: Long state line
- GIVEN an in-progress epic with 2 of 5 tracks done and a title of 80 characters
- WHEN its node is drawn
- THEN its id, title and state each take one line inside the node, and "2 of 5 done" is shown in full

### REQ-UI-050: Outside beads and cycles
<!-- base: 6b6c4d4de645a7e2ce7c6c76a086a5c1be7316dac7829cc8fd7b62264c364737 -->
WHERE a drawn node, or a bead under it, has a `blocked_by` relation with a bead outside the scope, the Graph view (REQ-UI-106) SHALL draw that outside bead as a dimmed node with a dashed border, above with an arrow to the node when it blocks, and below with an arrow from the node when it is blocked, and IF the arrows form a cycle, THEN the view SHALL still draw every node, SHALL put the nodes of the cycle in layers without looping forever, and SHALL show the warning "Dependency cycle between …" naming the beads.

#### Scenario: Outside blocker
- GIVEN task `t-1` of `e-1` blocked by `x-9`, a task of another epic
- WHEN the Graph view with the scope `e-1` is drawn
- THEN `x-9` is drawn dimmed with a dashed border above, with an arrow to `t-1`

#### Scenario: Outside blocked bead
- GIVEN task `t-1` of `e-1` blocking `x-9`, a task of another epic
- WHEN the Graph view with the scope `e-1` is drawn
- THEN `x-9` is drawn dimmed with a dashed border below, with an arrow from `t-1`

#### Scenario: Cycle
- GIVEN `a` blocked by `b` and `b` blocked by `a`
- WHEN the Graph view of the epic is drawn
- THEN both nodes are drawn, the page responds, and the warning names `a` and `b`

### REQ-UI-051: Selection and path
<!-- base: 704f443a0cfe40748399d0c741bb39270b3f36de9be48f879ce9f3f7b9220e72 -->
WHEN the Graph view (REQ-UI-106) opens with a bead as its scope and no `select` in the URL, it SHALL select the scope bead, WHEN it opens with the project or a milestone as its scope, it SHALL select nothing, SHALL show the panel only while a bead is selected, the graph then taking the full width, SHALL offer in the panel a button "Close details" that selects nothing, kept in the URL as `select=none` so that a reload keeps the panel closed, and after closing SHALL move focus to the node that was selected, and WHEN the user clicks a node or presses Enter on it, it SHALL select that bead, keep its id in the URL as `select` without adding a history entry, highlight the node, all its direct and indirect blockers, all beads it blocks directly or indirectly and the arrows between them, dim every other node and arrow, and show the bead in a panel beside the graph (below it under 1024px) with the content of the bead page and an "Open page" link as REQ-UI-045 describes.

#### Scenario: Project scope
- GIVEN the Graph view of the project in a window 1280px wide
- WHEN it is shown
- THEN no node is selected, there is no details panel and the graph takes the full width

#### Scenario: Selected at first
- GIVEN the Graph view with the scope `e-1` and `b` a child of `e-1`, and the URL has `select=b`
- WHEN it is shown
- THEN `b` is selected, its chain is highlighted and the panel shows `b`

#### Scenario: Epic
- GIVEN the Graph view with the scope `e-1` and no `select`
- WHEN it is shown
- THEN `e-1` is selected and the panel shows `e-1`

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
- GIVEN the Graph view with the scope `e-1` and `e-1` selected
- WHEN the user chooses "Close details"
- THEN the URL has `select=none`, the panel is gone, the graph takes the full width, and a reload keeps it so

### REQ-UI-052: Graph keyboard
<!-- base: 07be03aa75df9dc01aa96bee56a6f09796ffe586e52d82e55c7987188e5ce053 -->
WHILE a node has focus, the Graph view (REQ-UI-106) SHALL move focus along the arrows with ArrowDown to a blocked bead and ArrowUp to a blocker, and to the previous or next node of the same layer with ArrowLeft and ArrowRight, SHALL select the scope bead again on Escape while another node is selected, and select nothing (closing the panel as REQ-UI-051 describes) on Escape while the scope bead or, when the scope is not a bead, any node is selected, and SHALL keep a single node in the tab order.

#### Scenario: Follow an arrow
- GIVEN `a`→`b` and focus on `a`
- WHEN the user presses ArrowDown
- THEN focus moves to `b`

#### Scenario: Escape
- GIVEN the Graph view with the scope `e-1` and a node other than `e-1` is selected
- WHEN the user presses Escape
- THEN `e-1` is selected again

#### Scenario: Second Escape
- GIVEN the Graph view with the scope `e-1` and `e-1` selected
- WHEN the user presses Escape
- THEN nothing is selected, the URL has `select=none` and the panel is gone

### REQ-UI-053: View in graph button
<!-- base: 133f27aaf4c7d657fe3eb3b2f018b2df89438751a5e7d4a9b111b34b1b3b7298 -->
WHEN a bead page or a details panel shows a bead that is not an epic and has at least one child, a blocker, or a bead it blocks, it SHALL offer the primary button "View in graph" that goes, inside the console, to the Graph view of the Beads page at `/beads?project=<project>&view=graph&scope=<id>` when the bead has children, else at `/beads?project=<project>&view=graph&scope=<parent>&select=<id>` (without `scope` when the bead has no parent), and SHALL not offer it otherwise; the page of an epic SHALL offer its Graph tab (REQ-UI-119) instead of the button.

#### Scenario: Task with children
- GIVEN the bead page of task `t-1`, not an epic, with a child, in project `p`
- WHEN the page loads
- THEN "View in graph" links to `/beads?project=p&view=graph&scope=t-1`

#### Scenario: Task with a blocker
- GIVEN task `t-2` of epic `e-1` with one blocker, in project `p`
- WHEN its page loads
- THEN "View in graph" links to `/beads?project=p&view=graph&scope=e-1&select=t-2`

#### Scenario: Task with a blocker and no parent
- GIVEN task `t-3` without a parent and with one blocker, in project `p`
- WHEN its page loads
- THEN "View in graph" links to `/beads?project=p&view=graph&select=t-3`

#### Scenario: Epic
- GIVEN the bead page of epic `e-1` with children
- WHEN the page loads
- THEN there is no "View in graph" and the Graph tab is offered

#### Scenario: Nothing to draw
- GIVEN a task without blockers that blocks nothing and has no child
- WHEN its page loads
- THEN there is no "View in graph"

#### Scenario: Details panel
- GIVEN a task with a blocker shown in the details panel of the List view
- WHEN the panel is shown
- THEN it offers "View in graph"

### REQ-UI-054: Graph accessibility
<!-- base: b81492b7eb94ded63b99425fa235130512faac8d8b4a611a7138bccc8f8f7f24 -->
The Graph view (REQ-UI-106) SHALL expose the graph to assistive technology with a visually hidden list stating, for every arrow, "<blocked id> is blocked by <blocker id>", followed for an arrow made of relations under the nodes by those relations in the same form, SHALL never convey a state by colour alone, SHALL give every colour a contrast of at least 4.5:1 against the node background in light and dark themes, and SHALL not animate when the user prefers reduced motion.

#### Scenario: Text alternative
- GIVEN `b` blocked by `a`
- WHEN the Graph view of the epic is drawn
- THEN the hidden list contains "b is blocked by a"

#### Scenario: Arrow made of relations
- GIVEN task `y` of `e-2` blocked by task `x` of `e-1`
- WHEN the Graph view of the project is drawn
- THEN the hidden list contains "e-2 is blocked by e-1" followed by "y is blocked by x"

#### Scenario: Reduced motion
- GIVEN the user prefers reduced motion
- WHEN a node is selected
- THEN the highlight changes without a transition

### REQ-UI-072: Breadcrumb
<!-- base: 950311bffa2f3c6e207a87b5f86155b2d496937e84933b51036c42ebdd9d4433 -->
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of the link "Beads", or the milestone id when the remembered place is the Beads tab of a milestone page, followed by the name of the view of the remembered place (REQ-UI-073) and, when a search, a status, priority, label, type, assignee or sprint filter or "Show closed" is active, "· N filters" where N counts them, all as one link to the remembered place, then the parent of the bead as a link to its page when it has one, then the id of the bead marked `aria-current="page"`, and under 640px SHALL show only the first link.

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

### REQ-UI-075: Old Dependencies links
<!-- base: 59cf5290a1c69a99d6ea02572337081b65434061b37252ee5965552d8d28581e -->
WHEN the frontend opens an old Dependencies link, it SHALL replace it in the browser history, without adding an entry, and show: for `/beads/<project>/graph`, `/beads?project=<project>&view=graph`; for `/beads/<project>/<id>/graph` where the bead is an epic, the page of the epic with `tab=graph` (REQ-UI-119); where the bead is not an epic and has at least one child, `/beads?project=<project>&view=graph&scope=<id>`; and where the bead has no child, the Graph view (REQ-UI-106) of its parent, or of the project when it has none, with `select=<id>`; and it SHALL keep a `select` of the old URL; IF the bead is not among the project's beads, THEN it SHALL show "Bead not found" with a link to the Beads page.

#### Scenario: Project
- GIVEN the old link `/beads/p/graph`
- WHEN it is opened
- THEN `/beads?project=p&view=graph` is shown

#### Scenario: Epic
- GIVEN epic `e-1` in project `p` and the old link `/beads/p/e-1/graph`
- WHEN it is opened
- THEN the page of `e-1` is shown with `tab=graph`

#### Scenario: Bead with children
- GIVEN task `t-1`, not an epic, with a child, and the old link `/beads/p/t-1/graph`
- WHEN it is opened
- THEN `/beads?project=p&view=graph&scope=t-1` is shown

#### Scenario: Bead without children
- GIVEN task `b` of epic `e-1`, without children, and the old link `/beads/p/b/graph`
- WHEN it is opened
- THEN `/beads?project=p&view=graph&scope=e-1&select=b` is shown

#### Scenario: Bead without children or parent
- GIVEN task `z` without a parent and without children, and the old link `/beads/p/z/graph`
- WHEN it is opened
- THEN `/beads?project=p&view=graph&select=z` is shown

#### Scenario: Selection kept
- GIVEN the old link `/beads/p/e-1/graph?select=b`
- WHEN it is opened
- THEN the page of `e-1` is shown with `tab=graph` and `select=b`

#### Scenario: Unknown bead
- GIVEN no bead `nope` in project `p` and the old link `/beads/p/nope/graph`
- WHEN it is opened
- THEN "Bead not found" is shown with a link to the Beads page

#### Scenario: No extra history entry
- GIVEN the user came from the page `/beads/p/e-1` and opened the old link `/beads/p/graph`
- WHEN the user presses the browser's back button
- THEN `/beads/p/e-1` is shown, not the old link

### REQ-UI-077: Zoom
<!-- base: fa902e47e0623f004fe68edd6da35fd8af4583e94fc8cb3d08722a898ffa3f64 -->
The Graph view (REQ-UI-106) SHALL offer the buttons "Zoom in" and "Zoom out" that change the scale by 10% between 40% and 200%, the button "Fit to view" that scales the graph to fit the canvas without going above 100%, and the current scale as a percentage, SHALL start fitted, SHALL zoom with the wheel while `Ctrl` or `⌘` is held, SHALL let the user pan with the scroll bars of the canvas and the usual scrolling gestures, and SHALL not remember the scale.

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
- WHEN the Graph view opens or the user presses "Fit to view"
- THEN the whole graph is visible and the percentage is below 100%

#### Scenario: Wheel
- GIVEN the pointer is over the canvas
- WHEN the user turns the wheel with `Ctrl` held
- THEN the scale changes, and without `Ctrl` the page scrolls as usual

### REQ-UI-078: Side panels scroll on their own
<!-- base: 4d8d612c2921998eca3fc5c6849a448fbb6683643c70dfefb0b1cf1051a69150 -->
WHILE the window is 1024px wide or more, the details panel of the List view, the details panel of the Graph view and the discussion column of a bead page SHALL stay in view while the page scrolls, SHALL be no taller than the window less 3rem, SHALL scroll inside themselves when their content is taller, SHALL not pass the scroll on to the page when they reach their end, and SHALL be reachable with the keyboard with a name that says what they hold.

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
<!-- base: bc9934b5c470f6b8931a872e1646286f4033e145239f02e0323167d4abbb15ff -->
WHERE the scope of the Graph view (REQ-UI-106) has children, for every `blocked_by` relation between two beads that lie under the scope (each one a node or a descendant of a node at any depth), the view SHALL draw an arrow from the node that holds the blocker to the node that holds the blocked bead, SHALL draw no arrow when both lie under the same node, SHALL draw a single arrow for a pair of nodes with the label "n links" when n relations above one make it, and SHALL leave out a relation that has the scope bead itself as one end.

#### Scenario: Direct relation
- GIVEN epics `r-1` and `r-2` without a parent and `r-2` blocked by `r-1`
- WHEN the Graph view of the project is shown
- THEN an arrow goes from `r-1` to `r-2` without a label

#### Scenario: Through tasks
- GIVEN task `x` of epic `e-1` blocking tasks `y` and `z` of epic `e-2`, both epics without a parent
- WHEN the Graph view of the project is shown
- THEN one arrow goes from `e-1` to `e-2` with the label "2 links"

#### Scenario: Deeper
- GIVEN a task under epic `e-1` under `r-1` blocking a task under `r-2`
- WHEN the Graph view of the project is shown
- THEN an arrow goes from `r-1` to `r-2`

#### Scenario: Inside one node
- GIVEN tasks `a` and `b` of epic `e-1`, `b` blocked by `a`
- WHEN the Graph view of the project is shown
- THEN there is no arrow for them, and the Graph view with the scope `e-1` draws `a`→`b`

#### Scenario: Cycle between nodes
- GIVEN a task of `e-1` blocking a task of `e-2` and another task of `e-2` blocking a task of `e-1`
- WHEN the Graph view of the project is shown
- THEN both nodes are drawn and the warning "Dependency cycle between e-1, e-2" is shown

### REQ-UI-081: Only linked
<!-- base: abf925c9944b87f9f0ae0f5e49a2c80b7187e0441523d904d908ef18fe76114c -->
The Beads page SHALL NOT offer a link "Dependencies" next to the project picker, its Graph view (REQ-UI-106) taking its place, and the Graph view of a scope with children SHALL offer a switch "Only linked", on at first when the scope is the project and off at first when it is a bead or a milestone, not remembered, that leaves out the nodes without an arrow and shows "n without dependencies".

#### Scenario: No separate entry
- GIVEN the Beads page of project `p`
- WHEN it is shown
- THEN there is no link "Dependencies" next to the project picker and the views offer Graph

#### Scenario: Only linked on the project scope
- GIVEN `r-1`→`r-2` and 5 other beads without a parent and without arrows
- WHEN the Graph view of the project is shown
- THEN `r-1` and `r-2` are drawn and "5 without dependencies" is shown

#### Scenario: Off inside a bead
- GIVEN an epic with an unlinked task
- WHEN the Graph view with the scope of the epic is shown
- THEN the unlinked task is drawn and "Only linked" is off

### REQ-UI-106: Graph view
<!-- base: 3747fc19b8c89d6b0c626fd1ccb2c80c38b10e93791306bcfdd73e9ae83086fa -->
The Beads views SHALL offer the view Graph (`view=graph`), which SHALL draw, with the nodes, arrows, outside beads and cycle warning of REQ-UI-048 to REQ-UI-050 and REQ-UI-079, the direct children of its scope: the bead named by `scope` in the URL when it exists and has children, else the selected milestone, else the project (REQ-MILESTONE-UI-006) when "All" or "No milestone" is selected. The Graph view SHALL also serve the Graph tab of an epic page (REQ-UI-119), with the epic as its scope. It SHALL draw a node only when the node's bead or one of its descendants matches the search, the filters and "Show closed", and only the arrows between drawn nodes. It SHALL offer the switch "Only linked" of REQ-UI-081, on at first when the scope is the project and off otherwise. WHEN a node is selected, the view SHALL keep it as `select` and show its details panel as the List view does, SHALL select the scope bead when `select` is absent and the scope is a bead, and SHALL show and close the panel as REQ-UI-051 and REQ-UI-052 describe. WHEN a node with children is opened, the view SHALL set `scope` to its id and show a breadcrumb from the milestone or project down to the scope, each item a link that sets `scope` to it. WHEN a node without children is opened, the frontend SHALL open its bead page. WHILE nothing matches, the view SHALL say "No beads match these filters".

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

#### Scenario: Graph tab of an epic
- GIVEN the page of epic `e-1` at `/beads/p/e-1?tab=graph`
- WHEN it is shown
- THEN the Graph view is drawn with `e-1` as its scope, the tasks of `e-1` are the nodes, and `e-1` is selected

#### Scenario: Nothing matches
- GIVEN a search that matches no bead
- WHEN the Graph view is shown
- THEN it says "No beads match these filters"

#### Scenario: No panel on the project scope
- GIVEN milestone "All" is selected and the URL has no `select`, in a window 1280px wide
- WHEN the Graph view is shown
- THEN there is no details panel and the graph takes the full width

## REMOVED

### REQ-UI-076: Closed beads and Hide done
<!-- base: 38a45ad62b64e920697edda0b2e33e4b6541d98a2b7eac7be6769b5a04508c6e -->
Reason: The Dependencies page is retired. The Graph view follows "Show closed" (REQ-UI-030) and has no switch "Hide done".

### REQ-UI-080: Going down and up
<!-- base: 4e034e70dad4740fb3b58c7bf212bcb7b5003a25234cb1048073fbeaa54f6d37 -->
Reason: The Dependencies page is retired. In the Graph view, opening a node with children sets it as the scope, with a breadcrumb back up (REQ-UI-106), and a node without children opens its bead page.
