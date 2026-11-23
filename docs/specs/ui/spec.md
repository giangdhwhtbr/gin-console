# Ui

## Purpose

## Requirements

### REQ-UI-022: Beads navigation
The "Main" navigation SHALL contain a "Beads" link, and the frontend SHALL show the bead list at `/beads` and a bead at `/beads/<project>/<id>` without a full reload, following the browser back and forward buttons, and a route segment that cannot be decoded SHALL show the page of REQ-UI-125.

#### Scenario: Open the list
- GIVEN the My Tasks page is shown
- WHEN the user clicks "Beads"
- THEN the URL is `/beads` and the bead list is shown without a reload

#### Scenario: Back button
- GIVEN the user opened a bead from the list
- WHEN the user presses back
- THEN the list is shown with the same filters

#### Scenario: Undecodable segment
- GIVEN the URL `/beads/%E0%A4%A/a-1`
- WHEN the page loads
- THEN the page shows "Page not found"

### REQ-UI-023: Project choice
The bead list SHALL show the beads of the current project (REQ-UI-124), kept in the `?project=` query, SHALL NOT show a project select of its own (the switcher of REQ-UI-123 changes the project), and WHEN no project exists SHALL say that no projects are configured.

#### Scenario: Current project
- GIVEN two projects and the current project is the second
- WHEN the list opens without `?project=`
- THEN the second project's beads are shown and the URL gets `?project=<second>`

#### Scenario: No projects
- GIVEN `/api/projects/beads` returns an empty list
- WHEN the list opens
- THEN it says no projects are configured

#### Scenario: Not the full projects list
- GIVEN two projects
- WHEN the list opens
- THEN no request goes to `/api/projects`

### REQ-UI-024: Bead list
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

### REQ-UI-025: Search and filters
The bead list SHALL offer a search box that matches the id, title and labels case-insensitively, and filters for status, priority, label, type, assignee, sprint and milestone (REQ-UI-104), SHALL combine distinct filter categories with AND, SHALL serialize multi-select filters (`status`, `priority`, `label`, `assignee`) as comma-separated values in the URL query (`q`, `status`, `priority`, `label`, `label_mode`, `type`, `assignee`, `sprint`, `milestone`), and SHALL restore them on page load.

#### Scenario: Search
- GIVEN beads titled "Fix login" and "Add search"
- WHEN the user types "LOGIN"
- THEN only "Fix login" remains

#### Scenario: Multi-select combined filters
- GIVEN open P1 beads, in-progress P1 beads, and closed P2 beads
- WHEN the user filters status "open,in_progress" and priority "1"
- THEN only open and in-progress P1 beads remain and the URL query contains `status=open,in_progress&priority=1`

#### Scenario: Restored from the URL
- GIVEN the URL query has `?status=open,in_progress&priority=0,1&assignee=alice%40example.com&sprint=sprint-1&milestone=m2`
- WHEN the page loads
- THEN the filters are restored and applied to the view

### REQ-UI-026: Closed beads
The bead list SHALL leave closed beads out by default, SHALL offer a "Show closed" control kept in the URL as `closed=1` that requests the list with `closed=1`, and SHALL apply search and filters to the closed beads too.

#### Scenario: Show closed
- GIVEN the list shows 4 beads
- WHEN the user turns on "Show closed"
- THEN the list is requested with `closed=1` and shows all 8, and the URL has `closed=1`

### REQ-UI-027: Bead list refresh
WHILE the page is visible, the bead list SHALL reload every 10 seconds without replacing the list by a loading state, WHILE the page is hidden it SHALL not poll and SHALL reload when visible again, and IF a refresh fails, THEN it SHALL keep the last data and show the error with a retry button.

#### Scenario: Silent refresh
- GIVEN the list is shown and 10 seconds pass
- WHEN it reloads
- THEN the list stays on screen and shows the new values

#### Scenario: Hidden tab
- GIVEN the tab becomes hidden
- WHEN 10 seconds pass
- THEN no request is made, and one request is made when the tab becomes visible

#### Scenario: Refresh failure
- GIVEN the list is shown and the next refresh fails
- WHEN the failure is received
- THEN the old list stays visible with an error message and a retry button

### REQ-UI-028: Bead detail
The bead page SHALL show the bead's id, title and type, a line of facts with its state as REQ-UI-064 describes (for example "In progress", never the raw `in_progress`; for a milestone, its milestone status as REQ-MILESTONE-UI-022 describes), its priority as `P<n>` (REQ-UI-110) and its size as REQ-UI-110 describes, the reason of its points (`points_reason`) on its own line under that line, its labels, and its assignee (REQ-UI-135), creator (the person of `created_by`, else of `owner`, REQ-BEADS-023), creation and update times and comment count as label/value pairs (REQ-UI-110), each time written as REQ-UI-131 describes, its description rendered as GitHub-flavored Markdown (headings, emphasis, lists, task lists, inline code, code blocks, tables, block quotes and links), its dependencies and the beads it blocks (each with id, title and status, linking to that bead in the same project), and for an epic its children with the strand of its tracks (REQ-UI-138), from its `child_counts` (REQ-UI-130), when it has a track. WHEN an epic has prep tasks (REQ-BEADS-002), the bead page SHALL show "Prep x/y" next to the strand, where x is its closed prep tasks and y all its prep tasks, and SHALL mark each prep task in the children list with the word "Prep" (REQ-UI-140). Raw HTML in the description SHALL be shown as text and SHALL NOT create elements, a link SHALL open in a new tab with `rel="noreferrer"`, and a link whose URL is not `http`, `https` or `mailto` SHALL be shown as text.
Source: `assets/2026-11-08/mockup/index.html#bead-detail`

#### Scenario: Markdown description
- GIVEN a bead whose description is `## Change` followed by `1. Format **dates**` and a fenced code block
- WHEN the page loads
- THEN the description shows a heading "Change", a numbered list item with "dates" in bold, and a code block

#### Scenario: Raw HTML stays text
- GIVEN a bead with a description containing `<script>x</script>` and `<img src=x onerror=alert(1)>`
- WHEN the page loads
- THEN both appear as text and no `script` or `img` element exists in the description

#### Scenario: Unsafe link
- GIVEN a bead with a description containing `[run](javascript:alert(1))` and `[docs](https://example.com)`
- WHEN the page loads
- THEN "run" is not a link, and "docs" links to `https://example.com` in a new tab

#### Scenario: Relations link inside the console
- GIVEN a bead with one dependency
- WHEN the page loads
- THEN the dependency shows its id, title and status and links to `/beads/<project>/<its id>`

#### Scenario: Epic progress
- GIVEN an epic with 4 children of which 3 are closed
- WHEN the page loads
- THEN the children are listed and the strand shows 4 beads and "3/4"

#### Scenario: Epic with a prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the closed prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN the page of `e-1` loads
- THEN the strand reads "1/2", "Prep 1/1" is shown next to it, and the children list shows `t-1`, `t-2` and `p-1`, with the word "Prep" on `p-1` only

#### Scenario: Fact line and facts
- GIVEN in-progress P1 epic `e-3` with `points: 5`, `points_reason: "new endpoint and UI"`, owner `lead@example.com`, assignee `bao`, created by `lead`, created and updated at 2026-05-11 16:00:00 and 0 comments, shown in 2026
- WHEN its page loads
- THEN the fact line shows "In progress", "P1" and "5 pt" as text, none of them in a pill, the line under it reads "new endpoint and UI", and the facts read Assignee "bao", Created by "lead", Created "11 May, 16:00", Updated "11 May, 16:00" and Comments "0", with no Owner fact, each label in the muted color and each value in the text color

#### Scenario: No assignee
- GIVEN a task with owner `lead@example.com` and no assignee
- WHEN its page loads
- THEN the facts read Assignee "Unassigned" and Created by "lead"

### REQ-UI-029: Bead errors
IF a request for the list or a bead fails, THEN the page SHALL show the error and a retry button that repeats the request, IF the server answers 404 for a bead, THEN the page SHALL say "Bead not found" with a link back to the list, and IF a response has an unexpected shape, THEN the page SHALL show an error instead of failing.

#### Scenario: List error and retry
- GIVEN the first list request fails and the second succeeds
- WHEN the user clicks retry
- THEN the error disappears and the list is shown

#### Scenario: Unknown bead
- GIVEN the server answers 404 for a bead
- WHEN the bead page loads
- THEN it says "Bead not found" and links back to the list

#### Scenario: Unexpected response
- GIVEN the response is not the expected shape
- WHEN the page loads
- THEN an error and a retry button are shown, not a blank page

### REQ-UI-030: Views
The Beads page, and the Beads tab of a milestone page (REQ-MILESTONE-UI-018), SHALL offer the views List, Board, Focus and Graph (REQ-UI-106), and Lanes (REQ-UI-111) while the scope has lanes, kept in the URL as `view` (`list` when absent or unknown), SHALL load the beads once for all the views with the project, search, filters and "Show closed" of the list applying to each of them, except that the Lanes view loads closed beads whatever "Show closed" says, and SHALL refresh them as in REQ-UI-027 without reloading the data when the view changes, other than to load the closed beads when the Lanes view opens while "Show closed" is off.

#### Scenario: Switch keeps filters
- GIVEN the List view with the filter status "open" and the search "fix"
- WHEN the user chooses Board
- THEN the URL has `view=board`, the filters are unchanged and no new request is made

#### Scenario: Restored from the URL
- GIVEN the URL has `?project=a&view=focus`
- WHEN the page loads
- THEN the Focus view is shown for project `a`

#### Scenario: Lanes tab
- GIVEN the Graph view with `scope=ex-e12`, an epic whose tracks have lanes, and "Show closed" off
- WHEN the user chooses Lanes
- THEN the URL has `view=lanes`, the filters are unchanged and the closed beads are loaded

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

### REQ-UI-031: Board columns
The Board view SHALL show the columns Backlog (status `deferred`), Ready (`ready`), In Progress (status `in_progress` or `hooked`), Blocked (`blocked`) and Done (status `closed`), SHALL put a bead in Done when it is closed, else in Blocked when it is blocked (REQ-BEADS-021), else in the first of Backlog, Ready and In Progress that fits, SHALL leave out of the Board any bead that fits none, SHALL show in each column header its number of beads that are not prep tasks, followed by "+ <n> prep" when it holds <n> prep tasks (REQ-BEADS-002), SHALL order a column by priority and then by last update, newest first, and SHALL show each bead as a card as REQ-UI-065 describes.

#### Scenario: Placement
- GIVEN a deferred bead, a ready bead, an in-progress bead, a blocked bead and a closed bead
- WHEN the Board is shown with closed beads
- THEN each is in its own column and each column says 1

#### Scenario: Blocked first
- GIVEN an in-progress bead with an open blocker and a deferred bead with an open blocker
- WHEN the Board is shown
- THEN both are in Blocked, and In Progress and Backlog do not hold them

#### Scenario: Prep tasks counted apart
- GIVEN two blocked tracks and one blocked prep task
- WHEN the Board is shown
- THEN Blocked holds three cards and its header says "2 + 1 prep"

#### Scenario: Pinned bead
- GIVEN a pinned bead that is not ready, blocked or closed
- WHEN the Board is shown
- THEN it is in no column and the List still shows it

#### Scenario: Card and link
- GIVEN a ready P1 bead assigned to alice
- WHEN the Board is shown
- THEN its card shows the id, title, type, `P1`, the state "Ready" and alice, and the title links to `/beads/<project>/<id>`

#### Scenario: Empty column
- GIVEN no bead is blocked
- WHEN the Board is shown
- THEN the Blocked column says "No beads"

### REQ-UI-032: Done column
The Done column SHALL show closed beads only while "Show closed" is on, ordered by closing time (`updated_at` when `closed_at` is absent) newest first, SHALL show the 20 most recent with the total, and SHALL offer "Show all N" to show every one and "Show latest 20" to go back.

#### Scenario: Short by default
- GIVEN 45 closed beads and "Show closed" on
- WHEN the Board is shown
- THEN Done lists 20 and says "20 of 45"

#### Scenario: Show all
- GIVEN the same board
- WHEN the user chooses "Show all 45"
- THEN Done lists 45 and offers "Show latest 20"

#### Scenario: Closed hidden
- GIVEN "Show closed" is off
- WHEN the Board is shown
- THEN Done is empty and tells how to show closed beads

### REQ-UI-033: Focus columns
The Focus view SHALL show the columns In flight (status `in_progress` or `hooked`), Blocked (`blocked`) and Next up (`ready` with priority P0 or P1), each with its count as REQ-UI-031 counts a column, SHALL put a bead in Blocked when it is blocked (REQ-BEADS-021), else in the first of In flight and Next up that fits, SHALL not cap In flight or Blocked, and SHALL order each by priority and then by last update, newest first.

#### Scenario: Columns
- GIVEN an in-progress bead, a blocked bead, a ready P1 bead and a ready P3 bead
- WHEN the Focus view is shown
- THEN In flight, Blocked and Next up each hold one bead and the P3 bead is in no column

#### Scenario: In progress and blocked
- GIVEN an in-progress bead that is also blocked
- WHEN the Focus view is shown
- THEN it is in Blocked only

### REQ-UI-034: Group by assignee
WHERE the user chooses Group by "Assignee" (kept in the URL as `group=assignee`), the Focus view SHALL show one row per person (REQ-BEADS-023) assigned a bead in the three columns, with those columns inside it, ordered by name, SHALL put beads without an assignee in a last row "Unassigned" (shown only when it has beads), SHALL never group by `owner`, and SHALL show the original columns again for "None".

#### Scenario: Rows
- GIVEN beads assigned to bob, to alice and to nobody
- WHEN the user groups by assignee
- THEN the rows are alice, bob and "Unassigned"

#### Scenario: One row per person
- GIVEN beads assigned to `ann` and to `ann@example.com`
- WHEN the user groups by assignee
- THEN one row `ann` holds both

#### Scenario: Back to none
- GIVEN the Focus view is grouped
- WHEN the user chooses "None"
- THEN the ungrouped columns return and the URL has no `group`

### REQ-UI-035: Recently finished
WHERE the user turns on "Recently finished" (kept in the URL as `finished=1`), the Focus view SHALL add a column with the 7 most recently closed beads that match the current search and filters, newest first, SHALL say how many are shown out of how many match, and SHALL offer "Show all N completed" and "Show latest 7".

#### Scenario: Latest seven
- GIVEN 12 closed beads match and "Show closed" is on
- WHEN "Recently finished" is on
- THEN 7 are listed and the column says "7 of 12"

#### Scenario: Show all completed
- GIVEN the same view
- WHEN the user chooses "Show all 12 completed"
- THEN 12 are listed and "Show latest 7" is offered

#### Scenario: Needs closed beads
- GIVEN "Show closed" is off
- WHEN the user turns on "Recently finished"
- THEN the page turns "Show closed" on so that the column has data

### REQ-UI-037: Keyboard
WHILE the Board or Focus view is shown and no text field has focus, `/` SHALL move focus to the search box, the arrow keys SHALL move focus between the cards, and `Enter` SHALL open the focused card; WHILE the search box has focus, `Esc` SHALL clear it when it has text and otherwise leave it.

#### Scenario: Search shortcut
- GIVEN the Board is shown and no field has focus
- WHEN the user presses `/`
- THEN the search box has focus and the key is not typed into it

#### Scenario: Move and open
- GIVEN the Board has several cards
- WHEN the user presses the arrow keys and then `Enter`
- THEN focus moves between cards and the focused bead opens

#### Scenario: Escape
- GIVEN the search box has focus and text
- WHEN the user presses `Esc`
- THEN the text is cleared, and a second `Esc` leaves the box

### REQ-UI-038: Created by and text sections
The bead page SHALL show "Created by" with the `created_by` name, and SHALL show the sections Acceptance criteria, Design, Notes and Close reason in that order, each only when it has content, rendered as Markdown under the rules of REQ-UI-028.
Source: `assets/2026-11-08/mockup/index.html#bead-detail`

#### Scenario: Sections with content
- GIVEN a bead with acceptance criteria, notes and a close reason but no design
- WHEN the bead page is shown
- THEN it shows "Created by", Acceptance criteria, Notes and Close reason in that order and no Design section

#### Scenario: Markdown sections
- GIVEN acceptance criteria `- [ ] Local time` and a design containing `<script>x</script>` and `**bold**`
- WHEN the bead page is shown
- THEN the acceptance criteria show an unchecked, disabled checkbox before "Local time", "bold" is in a `strong` element, and `<script>x</script>` appears as text with no `script` element

#### Scenario: No author
- GIVEN a bead whose `created_by` is null
- WHEN the bead page is shown
- THEN "Created by" is not shown

### REQ-UI-039: Comments section
WHEN a bead has comments (`comment_count` above 0), the bead page SHALL load them after the bead is shown and list them under "Discussion (N)" oldest first, each with its author, its time and its text as plain text with line breaks, SHALL say "Loading comments…" while they load, SHALL say "Comment truncated" under a truncated comment, and SHALL not request comments and not show the discussion when `comment_count` is 0.

#### Scenario: Comments listed
- GIVEN a bead with `comment_count` 2
- WHEN the bead page is shown
- THEN "Loading comments…" is shown, then "Discussion (2)" with both comments, author, time and text, oldest first

#### Scenario: No comments
- GIVEN a bead with `comment_count` 0
- WHEN the bead page is shown
- THEN no comments request is made and there is no discussion

#### Scenario: Plain text
- GIVEN a comment containing `<script>x</script>`
- WHEN the comments are shown
- THEN it appears as text and no `script` element exists

#### Scenario: Truncated comment
- GIVEN a comment marked `truncated`
- WHEN the comments are shown
- THEN "Comment truncated" appears under it

### REQ-UI-040: Comments failure and navigation
IF the comments request fails or its answer has an unexpected shape, THEN the discussion SHALL show the error with its own Retry button that repeats only that request while the rest of the bead page stays shown, and a late comments answer for a bead that is no longer shown SHALL NOT replace the comments of the bead now shown.

#### Scenario: Failure and retry
- GIVEN the comments request answers 502 with `bd comments failed`
- WHEN the bead page is shown
- THEN the bead fields stay shown, the discussion shows `bd comments failed` and Retry, and Retry loads the comments

#### Scenario: Unexpected shape
- GIVEN the comments answer is `{"x": 1}`
- WHEN the bead page is shown
- THEN the discussion shows an error and Retry instead of failing

#### Scenario: Late answer
- GIVEN the comments of bead `a-5` are still loading and the user opens bead `a-6`
- WHEN the answer for `a-5` arrives
- THEN `a-6` keeps its own comments

### REQ-UI-041: List hierarchy
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
WHEN a search or a filter is active, the List view SHALL show only the beads that match them together with their ancestors in the hierarchy, with every branch that leads to a match open, and SHALL leave out closed beads unless "Show closed" is on, a sprint filter is active, or a closed milestone is selected (REQ-UI-104).

#### Scenario: Match with ancestors
- GIVEN an epic with a child titled "Fix login" and another titled "Add search"
- WHEN the user searches "login"
- THEN the epic and the "Fix login" child are shown, open, and "Add search" is not

#### Scenario: Closed beads
- GIVEN a closed child and "Show closed" off
- WHEN the List view is shown
- THEN the closed child is not shown, and it is shown after "Show closed" is turned on

#### Scenario: Filter by assignee
- GIVEN an epic with children assigned to "alice" and "bob"
- WHEN the user filters by assignee "alice"
- THEN the epic and the child assigned to "alice" are shown, and the child assigned to "bob" is not

#### Scenario: Filter by milestone
- GIVEN milestone `m2` with an epic and its child task, and an epic under no milestone
- WHEN the user selects milestone `m2`
- THEN the epic under `m2` and its child task are shown, the other epic is not, and no milestone bead is shown (REQ-MILESTONE-UI-009)

### REQ-UI-044: List rows
The List view SHALL show for each row an open/close control when it has children, its id in the monospace face shortened as REQ-UI-107 describes, its title as a link to `/beads/<project>/<id>` cut short with the full title as `title` and never narrower than 8rem while the row is at least 360px wide, its state as REQ-UI-064 describes, its type as REQ-UI-067 describes, `P<n>`, the indicators of REQ-UI-066, its assignee as REQ-UI-135 describes, up to three labels from 768px, and its last update as REQ-UI-131 describes, SHALL show for an epic with a track the strand of its tracks (REQ-UI-138, REQ-UI-130), SHALL show for an epic with prep tasks (REQ-BEADS-002) "Prep x/y", where x is its closed prep tasks and y all its prep tasks, SHALL show the word "Prep" (REQ-UI-140) on the row of a prep task, SHALL open only the root level at first unless branches were remembered (REQ-UI-074), SHALL open and close a branch when its control is used, SHALL offer "Expand all" and "Collapse all", SHALL show at most 2000 rows and say how many more are not shown, and SHALL draw a row on two lines under 768px.

#### Scenario: Row content
- GIVEN a blocked P1 bug assigned to alice with 2 comments
- WHEN the List view is shown
- THEN its row shows the id, the title link, "Blocked", the word "bug" in the bug colour, `P1`, a comment indicator 2 and alice

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
- THEN the epic shows a strand of 5 beads and "3/5"

#### Scenario: Epic with a prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the open prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN the List view is shown with "Show closed" on and `e-1` open
- THEN `e-1` shows a strand of 2 beads, "1/2" and "Prep 0/1", and the row of `p-1` shows the word "Prep" while the rows of `t-1` and `t-2` do not

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

#### Scenario: Long id keeps the title
- GIVEN the epic `ex-payments-provider-migration-and-reconciliation-2026` with an open task and the title "Migrate every checkout payment to the new provider"
- WHEN the List view is shown at 1440px and at 390px with the epic open
- THEN each of the two rows shows its open/close control when it has children, its shortened id and at least the start of its title

#### Scenario: Owner is not the assignee
- GIVEN a bead with owner `lead@example.com` and no assignee
- WHEN the List view is shown at 1440px
- THEN its row shows "Unassigned" and not `lead@example.com`

### REQ-UI-045: Selection and detail panel
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

### REQ-UI-046: List keyboard and roles
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

### REQ-UI-048: Dependency layers
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
The Graph view (REQ-UI-106) SHALL show on each node the content of a card: the bead id in the monospace face shortened as REQ-UI-107 describes and `P<n>` on the first line, its title on one line with the full title as `title`, and its state as REQ-UI-064 describes on one line, the state label cut short before the strand is, and on a node with children an icon that says it can be opened, with the strand of REQ-UI-138 over its tracks (REQ-BEADS-002) when it has a track. The node of a prep task SHALL show the word "Prep" (REQ-UI-140).

#### Scenario: Node with children
- GIVEN epic `e-1` without a parent with 3 tasks, 1 of them closed, and "Show closed" on
- WHEN the Graph view of the project is shown
- THEN the node `e-1` shows the strand with "1/3" and the open icon

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
- THEN the node `e-1` shows the strand with "1/2" and the open icon, and with the scope `e-1` the node `p-1` shows the word "Prep" while `t-1` and `t-2` do not

#### Scenario: Long state line
- GIVEN an in-progress epic with 2 of 5 tracks done and a title of 80 characters
- WHEN its node is drawn
- THEN its id, title and state each take one line inside the node, and the strand with "2/5" is shown in full

### REQ-UI-050: Outside beads and cycles
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
WHEN the Graph view (REQ-UI-106) opens with no `select` in the URL, it SHALL select nothing, whatever its scope, SHALL show the panel only while a bead is selected, the graph then taking the full width, SHALL offer in the panel a button "Close details" that selects nothing, kept in the URL as `select=none` so that a reload keeps the panel closed, and after closing SHALL move focus to the node that was selected, and WHEN the user clicks a node or presses Enter on it, it SHALL select that bead, keep its id in the URL as `select` without adding a history entry, highlight the node, all its direct and indirect blockers, all beads it blocks directly or indirectly and the arrows between them, dim every other node and arrow, and show the bead in a panel beside the graph (below it under 1024px) with the content of the bead page and an "Open page" link as REQ-UI-045 describes.

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
- THEN no node is selected, there is no details panel and the graph takes the full width

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
- GIVEN the Graph view with the scope `e-1` and its child `b` selected
- WHEN the user chooses "Close details"
- THEN the URL has `select=none`, the panel is gone, the graph takes the full width, and a reload keeps it so

### REQ-UI-052: Graph keyboard
WHILE a node has focus, the Graph view (REQ-UI-106) SHALL move focus along the arrows with ArrowDown to a blocked bead and ArrowUp to a blocker, and to the previous or next node of the same layer with ArrowLeft and ArrowRight, SHALL select nothing (closing the panel as REQ-UI-051 describes) on Escape while a node is selected, and SHALL keep a single node in the tab order.

#### Scenario: Follow an arrow
- GIVEN `a`→`b` and focus on `a`
- WHEN the user presses ArrowDown
- THEN focus moves to `b`

#### Scenario: Escape
- GIVEN the Graph view with the scope `e-1` and its child `b` selected
- WHEN the user presses Escape
- THEN nothing is selected, the URL has `select=none` and the panel is gone

### REQ-UI-053: View in graph button
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

### REQ-UI-055: Main navigation
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Beads, My Tasks, Milestones and Reports, in that order, going to `/beads`, `/my-tasks`, `/milestones` and `/reports` with `?project=<current project>` (REQ-UI-124), and no link to `/`.

#### Scenario: Four links
- GIVEN any page is shown and the current project is `a`
- WHEN the page loads
- THEN the "Main" navigation holds the links Beads, My Tasks, Milestones and Reports, one each, going to `/beads?project=a`, `/my-tasks?project=a`, `/milestones?project=a` and `/reports?project=a`, and no link goes to `/`

### REQ-UI-056: Responsive navigation
The "Main" navigation SHALL be a tab bar fixed to the bottom of the screen with an icon and a label per link while the window is narrower than 768px, an icon rail with a label under each icon from 768px up to 1023px, and from 1024px a sidebar with an icon and a label per link, or the icon rail while the sidebar is collapsed (REQ-UI-094), and SHALL be the same element in every case.

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN any page is shown
- THEN the navigation is a bar at the bottom of the screen and the page content is not hidden behind it

#### Scenario: Tablet
- GIVEN a window 820px wide
- WHEN any page is shown
- THEN the navigation is a narrow column at the left with the label under each icon

#### Scenario: Laptop
- GIVEN a window 1280px wide and the sidebar expanded
- WHEN any page is shown
- THEN the navigation is a sidebar at the left with the label beside each icon

#### Scenario: Laptop, collapsed
- GIVEN a window 1280px wide and the sidebar collapsed
- WHEN any page is shown
- THEN the navigation is a narrow column at the left with the label under each icon

### REQ-UI-057: Current destination
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight: Beads on `/beads`, My Tasks on `/my-tasks`, Milestones on `/milestones` and `/milestones/<project>/<id>`, Reports on `/reports`. On a bead page it SHALL mark the link of the page the user opened the bead from in this browser tab (REQ-UI-073: My Tasks, Milestones or Reports), and Beads when the bead was opened from the Beads page, another bead page, or by its address. It SHALL mark no link on the page of REQ-UI-125 and SHALL mark no other link.

#### Scenario: Bead page by address
- GIVEN the URL `/beads/alpha/a-1` opened in a new tab
- WHEN the page loads
- THEN only the Beads link has `aria-current="page"`

#### Scenario: Bead page from My Tasks
- GIVEN the user opened `a-1` from the My Tasks page
- WHEN the bead page is shown
- THEN only the My Tasks link has `aria-current="page"`

#### Scenario: Milestone page
- GIVEN the URL `/milestones/alpha/m-1`
- WHEN the page loads
- THEN only the Milestones link has `aria-current="page"`

#### Scenario: Reports page
- GIVEN the URL `/reports?project=alpha`
- WHEN the page loads
- THEN only the Reports link has `aria-current="page"`

#### Scenario: Address of a retired page
- GIVEN the URL `/sessions/alpha/s-1`
- WHEN the page loads
- THEN the page of REQ-UI-125 is shown and no link has `aria-current="page"`

#### Scenario: Change page
- GIVEN the My Tasks page is shown
- WHEN the user clicks "Reports"
- THEN only the Reports link has `aria-current="page"`

### REQ-UI-058: Theme
The frontend SHALL start in the theme the system prefers, SHALL offer a control that switches between light and dark with an accessible name saying which theme it switches to, SHALL keep the choice in the browser and use it on the next visit, SHALL set the theme before the first paint so that the wrong theme is not shown, and IF the browser refuses to store the choice, THEN SHALL still switch for the current visit without an error.

#### Scenario: System default
- GIVEN no choice is stored and the system prefers dark
- WHEN the page loads
- THEN the dark theme is used

#### Scenario: Switch and remember
- GIVEN the light theme is shown
- WHEN the user switches the theme and reloads the page
- THEN the dark theme is used

#### Scenario: Storage refused
- GIVEN the browser throws when the choice is stored
- WHEN the user switches the theme
- THEN the theme changes and no error is shown

### REQ-UI-059: Colour tokens
The frontend SHALL use the Strung palette, defined for light and dark: cool neutrals for the page (porcelain), surfaces (paper), wells and hover (sunk), borders (rule), text (graphite) and secondary text (slate); one identity colour, amethyst, used as REQ-UI-141 describes; the state colours jade for Ready and Done, lapis for In progress, amber for Blocked and for warnings (late, at risk), and hematite for Deferred, used only to say a state or a warning and never to decorate; carnelian for bugs and errors only; and the categorical lane colours of REQ-UI-118 and chart series colours, which name a lane, a person or a series and never a state. A chart, bar or strand that shows states SHALL use the state colours, Done always in jade. The frontend SHALL show text, the state colours, the identity colour and carnelian with a contrast of at least 4.5:1 against every surface (page, paper and sunk) they are drawn on, SHALL draw the strokes of the state glyphs (REQ-UI-064) and the outline of inputs, selects and other controls with at least 3:1 against their surface (separators and card borders are decoration and are not held to this), and SHALL show priority with weight, never with a hue (REQ-UI-140).
Source: `assets/2026-11-22/index.html#tokens`, `assets/2026-11-22/tokens-light.png`, `assets/2026-11-22/tokens-dark.png`

#### Scenario: Light values
- GIVEN the light theme
- WHEN the palette is read
- THEN page is #F4F5F8, paper #FFFFFF, sunk #ECEEF3, rule #DDE0E7, graphite #1B1D26, slate #596072, amethyst #6A3DB8, jade #0E7A5C, lapis #2557D6, amber #AE500A, hematite #646A78 and carnelian #B42318

#### Scenario: Dark values
- GIVEN the dark theme
- WHEN the palette is read
- THEN page is #12131A, paper #1B1C25, sunk #242632, rule #2E303D, graphite #E8E9F0, slate #A0A5B5, amethyst #B89EF6, jade #45CF9F, lapis #93B1FF, amber #F2A54C, hematite #9298A6 and carnelian #FF8A7A

#### Scenario: Done is jade everywhere
- GIVEN a closed bead in the List, a closed epic on the Gantt and the closed part of the Team scope
- WHEN each is shown in the light theme and then the dark theme
- THEN each is drawn in the jade of that theme

#### Scenario: Contrast
- GIVEN the palette of a theme
- WHEN text, the state colours, the identity colour, carnelian, glyph strokes and control outlines are measured against the surfaces they sit on
- THEN text and the colours are at least 4.5:1, and glyph strokes and control outlines at least 3:1

### REQ-UI-060: Typography
The frontend SHALL set the interface in Geist and ids, paths and code in Geist Mono, SHALL use a text size of at least 16px in text inputs on screens narrower than 768px, and SHALL load both faces from the application itself, not from another site.

#### Scenario: Ids in monospace
- GIVEN a bead id is shown
- WHEN the page renders
- THEN the id uses the monospace face

#### Scenario: Input size on a phone
- GIVEN a window 390px wide
- WHEN a text input is shown
- THEN its text size is at least 16px

### REQ-UI-061: No sideways page scroll
WHILE the window is 360px wide or wider, no page of the frontend SHALL scroll horizontally, and content wider than the window, such as a table, the Board, the Tree or a code block, SHALL scroll inside its own box.

#### Scenario: Wide table
- GIVEN a window 360px wide and the bead list in table form
- WHEN the page is shown
- THEN the page itself does not scroll sideways and the table scrolls inside its box

#### Scenario: Long project name
- GIVEN a project with a name of 60 characters
- WHEN any page is shown at 360px
- THEN the project switcher cuts the name short and the page does not scroll sideways

### REQ-UI-062: Touch, focus and motion
On screens narrower than 768px the links and buttons of the navigation and the theme control SHALL be at least 44px high and wide, every interactive element SHALL show a visible focus indicator when reached by keyboard, and the frontend SHALL not run non-essential animation or transitions while the user prefers reduced motion.

#### Scenario: Touch target
- GIVEN a window 390px wide
- WHEN the tab bar is shown
- THEN each link is at least 44px high

#### Scenario: Keyboard focus
- GIVEN the user presses Tab on any page
- WHEN a link or button receives focus
- THEN a focus indicator is visible

### REQ-UI-063: Page title
The frontend SHALL set the document title to the name of what the page shows, then the project when the page shows one project, then `gin-console`, joined by ` · `: `Beads · <project> · gin-console`, `My Tasks · <project> · gin-console`, `Milestones · <project> · gin-console`, `<milestone title> · <project> · gin-console` on a milestone page, `Reports · <section> · <project> · gin-console`, `<bead title> · <project> · gin-console` on a bead page, and `Page not found · gin-console` (REQ-UI-125). WHILE a name is loading, and on the login page, the title SHALL be `gin-console`.

#### Scenario: Bead page
- GIVEN the bead `a-1` titled "Team checkout" in project `example`
- WHEN its page has loaded
- THEN the document title is `Team checkout · example · gin-console`

#### Scenario: Reports section
- GIVEN `/reports?project=example&tab=quality`
- WHEN the page loads
- THEN the document title is `Reports · Quality · example · gin-console`

#### Scenario: My Tasks
- GIVEN `/my-tasks?project=example`
- WHEN the page loads
- THEN the document title is `My Tasks · example · gin-console`

#### Scenario: Loading
- GIVEN a milestone page whose milestone is still loading
- WHEN the page is shown
- THEN the document title is `gin-console`

### REQ-UI-064: State mark
The frontend SHALL draw the state of a bead (Ready, In progress, Blocked, Done or Deferred, by the rules of REQ-UI-049) as a glyph whose fill says how far the bead has come, followed by the state's name wherever the state is named: Ready as a hollow ring in the Ready colour, In progress as a ring in the In progress colour with its right half filled, Done as a full bead in the Done colour, Blocked as a full bead in the Blocked colour crossed by a short bar in the surface colour (a knot), and Deferred as a dashed ring in the Deferred colour. The Board and Focus cards, the List and Tree rows, the Graph nodes, the bead page, My Tasks and the Gantt SHALL use the same glyph and name, and no card, row or node SHALL carry a coloured edge for its state. A milestone status (REQ-MILESTONE-UI-022) SHALL use the glyph of Deferred for Planned, of Ready for Scheduled, of In progress for Active and of Done for Closed.
Source: `assets/2026-11-22/index.html#tokens`, `assets/2026-11-22/tokens-light.png`

#### Scenario: Blocked card
- GIVEN a blocked bead
- WHEN the Board is shown
- THEN its card shows "Blocked" after the knot glyph, and the card has no coloured left edge

#### Scenario: Same state, same mark
- GIVEN an in-progress bead shown on the Board, in the list, in the Tree and in the graph
- WHEN each view is shown
- THEN each shows "In progress" after the half-filled glyph in the same colour

#### Scenario: Shapes without colour
- GIVEN a ready, an in-progress, a done, a blocked and a deferred bead
- WHEN their List rows are shown in grayscale
- THEN their glyphs differ by shape: hollow, half, full, knot and dashed

#### Scenario: Milestone status
- GIVEN an active milestone and a planned milestone
- WHEN the Milestones list is shown
- THEN the first reads "Active" after the half-filled glyph and the second "Planned" after the dashed ring

### REQ-UI-065: Card anatomy
A bead card of the Board and Focus views SHALL show on its first line the id in the monospace face shortened as REQ-UI-107 describes and `P<n>`, below it the title as a link to `/beads/<project>/<id>`, and on its last line the state mark of REQ-UI-064, the type of REQ-UI-067 for a bug, the size of REQ-UI-110 when the bead has `points` or `estimate_minutes`, the indicators of REQ-UI-066 and the assignee as REQ-UI-135 describes, each as text (REQ-UI-140), the title and the assignee wrapping inside the card (REQ-UI-107).

#### Scenario: Full card
- GIVEN a ready P1 task assigned to alice with 2 comments and 1 dependency
- WHEN its card is shown
- THEN it shows the id and `P1`, the title link, "Ready", a comment indicator 2, a dependency indicator 1 and alice

#### Scenario: Bare card
- GIVEN a bead with an owner, no assignee, no comments and no dependencies
- WHEN its card is shown
- THEN the last line shows only the state and "Unassigned" in the muted color

#### Scenario: Card with points
- GIVEN an in-progress epic with `points: 8`
- WHEN its Board card is shown
- THEN its last line shows the state, the size "8 pt" as text and the assignee or "Unassigned"

### REQ-UI-066: Count indicators
WHERE a bead has comments or dependencies, a bead card, a list row and a Tree row SHALL show a comment indicator, an icon with the count of comments, and a dependency indicator, an icon with the count of dependencies, each with an accessible label such as "3 comments" or "2 dependencies", SHALL show the comment indicator in a stronger style than the dependency one using no colour outside the palette, and SHALL show neither indicator, nor the text "0 comments" or "0 deps", when the count is 0.

#### Scenario: Comments
- GIVEN a bead with `comment_count` 3
- WHEN its card is shown
- THEN a comment indicator with the label "3 comments" and the number 3 is shown

#### Scenario: Nothing to show
- GIVEN a bead with `comment_count` 0 and `dependency_count` 0
- WHEN its card, list row and Tree row are shown
- THEN no indicator and no "0 comments" or "0 deps" text appears

### REQ-UI-067: Type
The frontend SHALL show the type of a bead as its name in plain text, never as a pill: on the List and Tree rows, the Board and Focus cards and the Graph nodes only for a bug, as the word "bug" in the bug colour (carnelian) without a border or a tint, and on the bead page for every type, among its facts (REQ-UI-028).

#### Scenario: Only bugs on rows
- GIVEN an epic, a bug, a feature and a task
- WHEN their List rows are shown
- THEN only the row of the bug shows a type, the word "bug" in the bug colour, and no row shows a pill

#### Scenario: Every type on the bead page
- GIVEN a feature
- WHEN its bead page loads
- THEN its facts read Type "feature" as text

### REQ-UI-068: Discussion column
WHILE the window is 1024px wide or more and the bead page is shown as a page, not as the details panel of another view, and the bead has comments, the bead page SHALL show the details on the left and the discussion in a column on the right with the heading "Discussion (N)", SHALL keep that column in view while the page scrolls, and SHALL let the column scroll on its own when it is taller than the window.

#### Scenario: Two columns
- GIVEN a bead with comments and a window 1280px wide
- WHEN the bead page is shown
- THEN the details are on the left and "Discussion (N)" is in a column on the right

#### Scenario: Long thread
- GIVEN a bead with a thread taller than the window
- WHEN the page is scrolled
- THEN the column stays in view and scrolls on its own

### REQ-UI-069: Discussion tabs
WHILE the window is narrower than 1024px, or the bead is shown in the details panel of another view, and the bead has comments, the bead page SHALL show the tabs "Details" and "Discussion (N)", where N is `comment_count`, as a tab list with `aria-selected` on the open tab, SHALL open "Details" first and again when another bead is shown, SHALL change tab with the Left and Right arrow keys, and SHALL show only the open tab's content.

#### Scenario: Tabs on a phone
- GIVEN a bead with `comment_count` 3 and a window 390px wide
- WHEN the bead page is shown
- THEN the tabs "Details" and "Discussion (3)" are shown and "Details" is selected

#### Scenario: Switch
- GIVEN the tab "Details" is selected
- WHEN the user selects "Discussion (3)"
- THEN the discussion is shown instead of the details and "Discussion (3)" has `aria-selected`

#### Scenario: Panel of another view
- GIVEN a bead with comments in the details panel of the Tree view
- WHEN the panel is shown
- THEN it has the same tabs

#### Scenario: No comments
- GIVEN a bead with `comment_count` 0
- WHEN the bead page is shown at any width
- THEN there are no tabs and no discussion

### REQ-UI-070: Hide and show the discussion
WHERE the discussion column of REQ-UI-068 is shown, the bead page SHALL offer the button "Hide discussion", SHALL then show the details across the whole width with the button "Show discussion (N)" at the top, SHALL keep the choice for every bead and for the next visit, and IF the browser refuses to store the choice, THEN SHALL still apply it for the current visit without an error.

#### Scenario: Hide and show
- GIVEN the discussion column is shown
- WHEN the user presses "Hide discussion"
- THEN the column is gone, the details fill the width and "Show discussion (N)" is shown

#### Scenario: Remembered
- GIVEN the user hid the discussion
- WHEN another bead with comments is opened, or the page is reloaded
- THEN the discussion is still hidden

#### Scenario: Storage refused
- GIVEN the browser throws when the choice is stored
- WHEN the user presses "Hide discussion"
- THEN the column is hidden and no error is shown

### REQ-UI-071: Comment blocks
The discussion SHALL show each comment as a block of its own with a border, with the author in bold, the time in the muted colour and the text in the normal text colour as plain text with line breaks, SHALL wrap long text, and SHALL keep the text of a comment out of the muted colour.

#### Scenario: One block each
- GIVEN a bead with 2 comments
- WHEN the discussion is shown
- THEN two blocks are shown, each with author, time and text

#### Scenario: Long unbroken text
- GIVEN a comment with a very long word
- WHEN the discussion is shown
- THEN the text wraps inside its block and the page does not scroll sideways

### REQ-UI-072: Breadcrumb
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of: one link to the remembered place (REQ-UI-073) named for it, which is "Beads" followed by the name of its view and, when a search, a status, priority, label, type, assignee or sprint filter or "Show closed" is active, ", N filters" where N counts them, the title of the milestone with the same view and filter count for the Beads tab of a milestone page, the title of the milestone for its other tabs, or "My Tasks" or "Reports"; then the title of the bead's parent as a link to its page when it has one; then the title of the bead marked `aria-current="page"`. Each title SHALL be cut short to one line with the full title and the id as its `title`. Under 640px the breadcrumb SHALL show only the first link.

#### Scenario: Place and filters
- GIVEN the Beads page was last at `?project=a&view=board&status=open&q=fix`
- WHEN the bead page of `a-1` titled "Fix login" is shown
- THEN the breadcrumb reads "Beads › Board, 2 filters" then "Fix login", and the first link goes to `/beads?project=a&view=board&status=open&q=fix`

#### Scenario: Parent
- GIVEN the bead `a-2` has the parent `a-1` titled "Checkout"
- WHEN the bead page of `a-2` is shown
- THEN the breadcrumb has a link "Checkout" to `/beads/a/a-1` before the title of `a-2`

#### Scenario: No remembered place
- GIVEN no page was remembered in this tab
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads" then the title of `a-1`, and "Beads" goes to `/beads?project=a`

#### Scenario: Details panel
- GIVEN a bead shown in the details panel of the List view
- WHEN the panel is shown
- THEN it has no breadcrumb and keeps its "Open page" link

#### Scenario: From a milestone page
- GIVEN the Beads tab of milestone `m2` titled "Checkout v2" of project `a` was last at `?tab=beads&view=board&status=open`
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Checkout v2 › Board, 1 filter" then the title of `a-1`, and the first link goes to `/milestones/a/m2?tab=beads&view=board&status=open`

#### Scenario: From My Tasks
- GIVEN the My Tasks page was last at `/my-tasks?project=a`
- WHEN the user opens `a-1` from it
- THEN the breadcrumb reads "My Tasks" then the title of `a-1`, and "My Tasks" goes to `/my-tasks?project=a`

### REQ-UI-073: Remembered place
The Beads page, the My Tasks page, the Reports page and the milestone page (any tab) SHALL remember their path and URL query for the current browser tab, the one shown last replacing the others, SHALL use it for the first link of the breadcrumb (REQ-UI-072) and the marked navigation link (REQ-UI-057) when it is of the bead's project and `/beads?project=<project>` otherwise, SHALL NOT change it when the user goes from bead to bead, and IF the browser refuses to store it, THEN SHALL keep it for the visit without an error.

#### Scenario: Back to the Board with its filters
- GIVEN the Board with the filter status "open" is shown
- WHEN the user opens a card and then uses the first link of the breadcrumb
- THEN the Board is shown with the filter status "open"

#### Scenario: From bead to bead
- GIVEN the user came from the Board with filters and opens a related bead from the bead page
- WHEN the related bead is shown and the first link of the breadcrumb is used
- THEN the Board with the same filters is shown

#### Scenario: Other project
- GIVEN the remembered place is the Beads page of project `a`
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

#### Scenario: My Tasks of another project
- GIVEN My Tasks was last at `/my-tasks?project=a`
- WHEN the bead page of a bead of project `b` is opened by its address
- THEN the first link reads "Beads" and goes to `/beads?project=b`

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

### REQ-UI-075: Old Dependencies links
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
The Graph view (REQ-UI-106) SHALL offer the buttons "Zoom in" and "Zoom out" that change the scale by 10% between 40% and 200%, the button "Fit to view" that scales the graph to the width of the canvas without going above 100%, and the current scale as a percentage, SHALL start fitted, SHALL zoom with the wheel while `Ctrl` or `⌘` is held, SHALL let the user pan sideways with the scroll bar of the canvas and the usual sideways gestures and up and down by scrolling the page (REQ-UI-122), and SHALL not remember the scale.

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
- THEN the whole width of the graph is visible and the percentage is below 100%

#### Scenario: Fit a tall graph
- GIVEN a graph narrower than the canvas and taller than the window
- WHEN the user presses "Fit to view"
- THEN the percentage reads 100% and the page scrolls to show the rest of the graph

#### Scenario: Wheel
- GIVEN the pointer is over the canvas
- WHEN the user turns the wheel with `Ctrl` held
- THEN the scale changes, and without `Ctrl` the page scrolls as usual

### REQ-UI-078: Side panels scroll on their own
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

### REQ-UI-082: Assignee filter
The bead filter bar SHALL offer an "Assignee" multi-select filter listing "Me" (REQ-BEADS-024), then "Unassigned" (when any loaded bead has no assignee, whatever its owner), then every person (REQ-BEADS-023) assigned a loaded bead, sorted alphabetically, kept in the URL query as comma-separated `assignee` (`me`, `unassigned` or a person's name), and SHALL show only beads whose assignee is one of the selected people (or beads without an assignee when "Unassigned" is selected), never matching a bead by its `owner`; when no assignee is selected, beads of all assignees SHALL be displayed.

#### Scenario: Filter by multiple assignees
- GIVEN beads assigned to "alice@example.com", "bob@example.com", and "carol@example.com"
- WHEN the user selects the assignees `alice` and `bob`
- THEN only beads assigned to Alice or Bob remain visible and the URL query contains `assignee=alice,bob`

#### Scenario: Filter unassigned beads
- GIVEN beads assigned to "alice@example.com" and beads without an assignee, one of them with owner "lead@example.com"
- WHEN the user selects assignee "Unassigned"
- THEN only beads without an assignee remain visible, the one with an owner included, and the URL query contains `assignee=unassigned`

#### Scenario: Old link with an email
- GIVEN the URL query `assignee=alice%40example.com` and beads assigned to `alice` and to `alice@example.com`
- WHEN the Beads page loads
- THEN both beads remain visible and `alice` is selected

### REQ-UI-083: Sprint filter and past sprint visibility
WHERE loaded beads or parent epics contain at least one `sprint:<name>` label, the bead filter bar SHALL offer a "Sprint" single-select control listing "All", "No sprint" (kept in the URL query as `sprint=none`), and every unique sprint name extracted from `sprint:<name>` labels sorted in descending alphanumeric order, kept in the URL query as `sprint`; IF no loaded beads or parent epics contain a `sprint:<name>` label, THEN the Sprint control SHALL be hidden; WHILE a named sprint is selected, closed beads SHALL be fetched and displayed for that sprint without requiring "Show closed" to be checked; and WHEN "No sprint" is selected, only beads lacking any direct or parent `sprint:<name>` label SHALL be displayed.

#### Scenario: Filter by sprint with direct and parent inheritance
- GIVEN an epic with label "sprint:sprint-1" and a child task without direct sprint label, and another epic with label "sprint:sprint-2"
- WHEN the user selects sprint "sprint-1"
- THEN the "sprint-1" epic and its child task remain visible, while the "sprint-2" epic is hidden, and the URL query contains `sprint=sprint-1`

#### Scenario: Filter by No sprint
- GIVEN an epic with label "sprint:sprint-1" and an independent bead without any sprint label
- WHEN the user selects sprint "No sprint"
- THEN only the bead without a sprint label remains visible and the URL query contains `sprint=none`

#### Scenario: Past sprint closed beads visibility
- GIVEN a previous sprint "sprint-0" where all beads are closed, and "Show closed" is off
- WHEN the user selects sprint "sprint-0"
- THEN the closed beads for "sprint-0" are fetched and displayed on the board

### REQ-UI-084: Responsive filter popovers and mobile sheet
The bead filter bar SHALL render filter controls as individual button triggers with popovers on viewport widths at or above 768px, displaying an active count badge on buttons that have active selections, and SHALL collapse filter controls into a single "Filters" button on viewport widths below 768px that opens a bottom sheet drawer containing all filter controls and a Clear button.

#### Scenario: Desktop popover view
- GIVEN a viewport width of 1024px and status filter containing "open" and "in_progress"
- WHEN the filter bar renders
- THEN the status filter button displays "Status 2" and clicking it toggles the popover panel

#### Scenario: Mobile sheet view
- GIVEN a viewport width of 500px and two active filters
- WHEN the filter bar renders
- THEN individual filter buttons are hidden, a "Filters 2" button is displayed, and clicking it opens the bottom sheet drawer

### REQ-UI-085: Multi-select labels filter with Any/All matching
The bead filter bar SHALL offer a "Labels" multi-select popover listing every unique label from loaded beads excluding `sprint:*` labels, with an Any/All match mode switch persisting in the URL query as `label_mode=all` when All is selected (omitted for default Any), and SHALL show beads having at least one selected label when Any is selected, or beads having all selected labels when All is selected.

#### Scenario: Any matching mode
- GIVEN a bead with label "ui" and another bead with label "backend"
- WHEN the user selects labels "ui" and "backend" with match mode "Any"
- THEN both beads remain visible and the URL query contains `label=ui,backend`

#### Scenario: All matching mode
- GIVEN a bead with labels ["ui", "backend"] and a bead with label ["ui"]
- WHEN the user selects labels "ui" and "backend" with match mode "All"
- THEN only the bead with both labels remains visible and the URL query contains `label=ui,backend&label_mode=all`

### REQ-UI-086: Bugs on the bead page
The bead page and the List detail panel SHALL list under "Bugs found" the `bugs` of the bead (each with id, title and status, linking to that bead in the same project), SHALL show nothing when there are none, and SHALL NOT request or show a reopen count.

#### Scenario: bugs found
- GIVEN a bead with an open bug and a closed bug that each have a `discovered-from` dependency on it
- WHEN the bead page is shown
- THEN "Bugs found" lists both with their id, title and status, each linking to `/beads/<project>/<its id>`

#### Scenario: no bugs
- GIVEN a bead whose `bugs` is empty
- WHEN the bead page is shown
- THEN there is no "Bugs found" section

#### Scenario: no reopens
- GIVEN any bead
- WHEN the bead page is shown
- THEN no request goes to `/reopens` and the page shows no "Reopened" text and no "Reopens unavailable"

### REQ-UI-087: Bugs found in the bug color
The "Bugs found" heading of REQ-UI-086 SHALL be shown in the bug color (the `type-bug` theme token used by the bug type badge), in light and dark, while the bug rows keep the default text color.

#### Scenario: highlighted heading
- GIVEN a bead with one bug found
- WHEN the bead page is shown
- THEN the "Bugs found" heading uses the `type-bug` color and the bug rows do not

### REQ-UI-088: Reports page
The frontend SHALL show the Reports page at `/reports`, loaded as its own chunk. The page SHALL show the report of the current project (REQ-UI-124), SHALL hold no project choice of its own (the switcher of REQ-UI-123 changes the project), and WHEN the URL has `project=all` (the retired choice "All projects"), SHALL replace it with the current project without adding a history entry. The panels of the Delivery and Quality tabs (REQ-UI-095) SHALL hold a period choice (7, 30 or 90 days, default 30) and a sprint field, which apply to those two tabs. The Team tab has its own choices (REQ-REPORTS-012). The page SHALL keep the choices in the URL query, so that a reload, the back button and a shared link show the same report. Each tab SHALL open with its own row of figures (REQ-UI-090, REQ-UI-091, REQ-REPORTS-013, REQ-REPORTS-018). The page SHALL show no tokens, cost, budget or `gin usage` command.

#### Scenario: shared link
- GIVEN the URL `/reports?project=alpha&days=7&tab=delivery`
- WHEN the page loads
- THEN 7 days is selected and the report for `alpha` and 7 days is requested

#### Scenario: Old link for all projects
- GIVEN the current project is `alpha` and the URL `/reports?project=all&days=7&tab=delivery`
- WHEN the page loads
- THEN the URL becomes `/reports?project=alpha&days=7&tab=delivery`, 7 days is selected, and only the report for `alpha` is requested

#### Scenario: change period
- GIVEN the Reports page for `alpha`, 30 days and the Delivery tab
- WHEN the user picks 90 days
- THEN the URL becomes `/reports?project=alpha&days=90&tab=delivery` without a reload and the report is requested again

#### Scenario: period kept across tabs
- GIVEN the Reports page for `alpha` with 7 days picked on the Delivery tab
- WHEN the user picks the Team tab and then the Quality tab
- THEN 7 days is selected in the Quality panel

### REQ-UI-090: Delivery flow view
The Delivery tab SHALL show, in this order:
- A row of figures: beads closed (`totals.closed`), and the median cycle time and median lead time from `delivery.overall` ("—" when absent).
- Beads closed per ISO week, as a column chart stacked by type with a legend.
- Cycle time and lead time as two range charts side by side, each with a dot at the median and a tick at the 85th percentile. A switch SHALL choose between By type (the default) and By member. Each range SHALL show, on hover and on focus, its type or member, the number of beads, the median and the 85th percentile.
- The estimate table of REQ-REPORTS-004, when it has rows. Each row SHALL show its estimate as "<n>d", or "<p> pt" when it has `points`, and its actual working days. A row with an estimate in days SHALL show as text (REQ-UI-140), not as a chip, the actual minus the estimated working days, rounded to one decimal:
  - "+<n> d" in the warning color when the difference is above 0;
  - "on estimate" when it is 0;
  - "−<n> d" when it is below 0.

  A row with points and no estimate in days SHALL show "<x> d/pt" from its `days_per_point` in place of that difference.

The Delivery tab SHALL NOT show beads in progress; the Team tab shows them (REQ-REPORTS-013 to REQ-REPORTS-016).
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: no estimates
- GIVEN a report without estimated epics
- WHEN the page is shown
- THEN no estimate table is shown

#### Scenario: by member
- GIVEN a report whose `by_member` holds `ann` with median cycle time 1.5 days
- WHEN the user picks By member
- THEN both range charts show one range per member and `ann`'s cycle range has its dot at 1.5 days

#### Scenario: estimate difference
- GIVEN epics estimated at 5 working days that took 7, 3 and 4.5
- WHEN the Delivery tab is shown
- THEN their differences read, as text, "+2 d" in the warning color, "−2 d" and "−0.5 d"

#### Scenario: points row
- GIVEN an estimate row with `estimate_days: null`, `points: 5`, `actual_days: 7` and `days_per_point: 1.4`
- WHEN the Delivery tab is shown
- THEN the row reads "5 pt", "7" and "1.4 d/pt", with no difference

#### Scenario: no work in progress
- GIVEN the Delivery tab is shown
- WHEN the figures and sections are read
- THEN there is no "In progress now" figure, no "Oldest in progress" table and no "In progress by member" chart

### REQ-UI-091: Quality view
The Quality tab SHALL show, in this order:
- A row of figures, each with a tooltip (REQ-UI-132) naming its source:
  - the rework rate (`totals.rework_rate`), or "—" when it is `null`;
  - reopens, summed over the member rows of REQ-REPORTS-005;
  - bugs found later, summed over the member rows.
- A table of the member rows, with closed beads, reopens, bugs and rework rate.
- A table of the epic rows, with the epic (its title linking to its bead page), closed beads, reopens, bugs and rework rate.
The tab SHALL show no tokens, review cycles, rejections, findings or waivers.

#### Scenario: figures
- GIVEN member rows `ann` (4 closed, 1 reopen) and `bao` (1 closed, 1 bug) and `totals.rework_rate` 0.4
- WHEN the Quality tab is shown
- THEN the figures read "40%", 1 reopen and 1 bug found later

#### Scenario: open an epic
- GIVEN an epic row for `e-1` of project `alpha`
- WHEN the user clicks its title
- THEN the page `/beads/alpha/e-1` is shown

#### Scenario: nothing closed
- GIVEN a report with no selected closed bead
- WHEN the Quality tab is shown
- THEN the rework rate reads "—" and each table says "No data in this period"

### REQ-UI-093: Report states
The Reports page SHALL show a loading state while the report loads, SHALL show "No data in this period" in a section that has no rows instead of an empty chart, IF the report request fails, THEN SHALL show the error with a Retry button, and SHALL NOT show a late answer for filters that are no longer selected.

#### Scenario: late answer
- GIVEN the report for 30 days is loading and the user picks 7 days
- WHEN the answer for 30 days arrives
- THEN the page does not show it

#### Scenario: failure
- GIVEN the report request answers 502 with an `error`
- WHEN the page is shown
- THEN the page shows the error with a Retry button

### REQ-UI-094: Collapsible sidebar
From 1024px the frontend SHALL show, at the top of the "Main" navigation's sidebar next to the theme control, a control that collapses the sidebar and expands it again, with an accessible name saying which it does ("Collapse sidebar" or "Expand sidebar") and `aria-expanded` telling whether the sidebar is expanded, and SHALL NOT show the control below 1024px. From 768px the frontend SHALL show the refresh control (REQ-UI-096), the theme control and the collapse control as icons at the top of the navigation column, on one row with the brand mark while the sidebar is expanded and under the brand mark on the icon rail, so that both are visible without scrolling the page. WHILE the sidebar is collapsed, the frontend SHALL draw it as the icon rail of REQ-UI-056 with the brand mark without its word. The frontend SHALL start with the sidebar expanded, SHALL keep the choice in the browser and use it on the next visit, and IF the browser refuses to store the choice, THEN SHALL still collapse and expand the sidebar for the current visit without an error.

#### Scenario: Collapse
- GIVEN a window 1280px wide with the sidebar expanded
- WHEN the user presses "Collapse sidebar"
- THEN the navigation is the icon rail with the label under each icon, and the control is named "Expand sidebar" with `aria-expanded="false"`

#### Scenario: Expand
- GIVEN a window 1280px wide with the sidebar collapsed
- WHEN the user presses "Expand sidebar"
- THEN the navigation is the sidebar with the label beside each icon, and the control is named "Collapse sidebar" with `aria-expanded="true"`

#### Scenario: Remember
- GIVEN the user collapsed the sidebar
- WHEN the page is reloaded
- THEN the sidebar is collapsed

#### Scenario: Default
- GIVEN no choice is stored
- WHEN the page loads in a window 1280px wide
- THEN the sidebar is expanded

#### Scenario: Storage refused
- GIVEN the browser refuses to store data
- WHEN the user presses "Collapse sidebar"
- THEN the sidebar collapses and no error is shown

#### Scenario: Controls at the top
- GIVEN a window 1280px wide and a page taller than the window
- WHEN the page loads
- THEN the theme and collapse controls are shown on the brand mark's row, above the links, without scrolling

#### Scenario: Narrow window
- GIVEN a window 820px wide
- WHEN any page is shown
- THEN no collapse control is shown and the theme control is under the brand mark, above the links

### REQ-UI-095: Report tabs
WHILE the report sections are not listed in the sidebar (REQ-UI-129), the Reports page SHALL show the tabs Team, Delivery, Velocity and Quality, in that order, as a WAI-ARIA tab list in which Left and Right move between tabs. Under each tab name it SHALL show a headline:
- Team, from the team report of the selected milestone:
  - "Finished on time", or "Finished <n> d late" with a warning icon, for a closed milestone;
  - "Starts <start>" before its start;
  - "<closed> of <scope> done, late" with a warning icon when the milestone is late (REQ-MILESTONE-UI-023);
  - otherwise "<closed> of <scope> done, on pace", or ", behind pace" with a warning icon when `pace_needed` is above `pace`;
  - "No milestones" when the project has none.
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- Velocity: "<x> days per point" from the selected project's `days_per_point` (REQ-REPORTS-018), with "assumed" when it is assumed, once the Milestones list has loaded; no headline when `days_per_point` is `null`.
- Quality: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.

The page SHALL request the team report and the Milestones list (REQ-MILESTONE-UI-008, for the forecast `finish` of REQ-MILESTONE-UI-023 and for the Velocity tab) whatever the tab, and SHALL request the Milestones list at most once per project and refresh. WHILE the Milestones list is loading or after it failed, the Team headline SHALL apply REQ-MILESTONE-UI-023 without the forecast. It SHALL show no headline for a tab while its report loads or after it failed to load. It SHALL keep the selected tab in the URL query `tab` (`team`, `delivery`, `velocity` or `quality`), SHALL select Team when `tab` is missing or holds another value, including the retired `usage` and `coverage`, and SHALL keep the project, period, sprint, milestone and member when the tab changes. WHILE the window is narrower than the tab list, the tab list SHALL scroll sideways instead of widening the page and SHALL fade its edge on each side that has hidden tabs.
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: shared link
- GIVEN the URL `/reports?project=alpha&days=7&tab=quality`
- WHEN the page loads
- THEN the Quality tab is selected and its panel shows the report for `alpha` and 7 days

#### Scenario: unknown tab
- GIVEN the URL `/reports?project=alpha&tab=nope`
- WHEN the page loads
- THEN the Team tab is selected

#### Scenario: change tab
- GIVEN the Reports page for `alpha`, 90 days and the Delivery tab
- WHEN the user picks the Quality tab
- THEN the URL becomes `/reports?project=alpha&days=90&tab=quality` without a reload and no new report is requested

#### Scenario: velocity tab
- GIVEN the Reports page for `alpha` on the Delivery tab, whose milestones list has `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`
- WHEN the user picks the Velocity tab
- THEN the URL has `tab=velocity`, `GET /api/milestones?project=alpha` has been requested once, and the Velocity headline reads "1.4 days per point"

#### Scenario: headlines
- GIVEN a report with 41 closed beads and rework rate 0.09
- WHEN the page is shown
- THEN the headlines read "41 beads closed" and "9% rework", and no tab is named AI usage or Data coverage

#### Scenario: retired tab in a link
- GIVEN the URL `/reports?project=alpha&tab=coverage`
- WHEN the page loads
- THEN the Team tab is selected

#### Scenario: team headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed, `pace` 3.6 and `pace_needed` 3.4, whose forecast `finish` is before its `end`
- WHEN the page is shown on the Delivery tab
- THEN the Team headline reads "27 of 64 done, on pace" without a warning icon

#### Scenario: late milestone headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed whose forecast `finish` is after its `end`
- WHEN the page is shown
- THEN the Team headline reads "27 of 64 done, late" with a warning icon

#### Scenario: keyboard
- GIVEN the Delivery tab is selected and has focus
- WHEN the user presses Right
- THEN the Velocity tab is selected and has focus

#### Scenario: Hidden tabs are hinted
- GIVEN the Reports page at a window 360px wide where Quality does not fit
- WHEN the page is shown
- THEN the right edge of the tab list fades, and scrolling it to the end removes the right fade and shows a left one

### REQ-UI-096: Refresh
The frontend SHALL show on every page a "Refresh data" control, in the top bar below 768px and with the theme control at the top of the navigation column from 768px, and WHEN the user activates it, SHALL send `POST /api/refresh` (REQ-BEADS-012) and then load the current page's data again without a full reload and without changing the URL, showing the control as busy and disabled until the request ends; IF the request fails, THEN the page SHALL still load its data again and show its own error.

#### Scenario: Refresh the page
- GIVEN the Beads page is shown
- WHEN the user activates "Refresh data"
- THEN `POST /api/refresh` is sent, then the beads are requested again, and the URL is unchanged

#### Scenario: Placement
- GIVEN a window 1280px wide
- WHEN any page is shown
- THEN "Refresh data" is at the top of the navigation column, above the navigation links, next to the theme control

## Diagrams
- [Bead text as Markdown](diagrams/bead-text-markdown-activity.md)
- [Login](diagrams/login-activity.md)
- [My Tasks](diagrams/my-tasks-activity.md)
- [Graph view](diagrams/graph-view-activity.md)
- [Graph layout](diagrams/graph-layout-activity.md)
- [Details panel](diagrams/details-panel-activity.md)
- [Readability check](diagrams/readability-check-activity.md)
- [Lanes view](diagrams/lanes-view-activity.md)
- [Lane state](diagrams/lane-state.md)
- [Progress strand](diagrams/strand-activity.md)
- [Lane clusters](diagrams/lane-clusters-activity.md)
- [Epic page](diagrams/epic-page-activity.md)
- [Legend and tooltips](diagrams/legend-tooltip-activity.md)

### REQ-UI-097: Email login
WHILE the browser holds no email for the console, the frontend SHALL show, at every URL, a login screen with one email field and a "Continue" control instead of the navigation and the page; WHEN the user submits a value that, trimmed, has text before and after one `@` and no whitespace, the frontend SHALL keep it lower-cased in localStorage under `gin-console.email` and show the page of the current URL without a full reload; IF the value is not such an email, THEN the frontend SHALL keep the login screen and say the email is not valid; IF the browser refuses to store the email, THEN the frontend SHALL keep it for the current visit without an error. The email SHALL NOT be sent to the server.

#### Scenario: First visit
- GIVEN localStorage has no `gin-console.email`
- WHEN the user opens `/beads?project=gin-console`
- THEN the login screen is shown and no navigation is shown

#### Scenario: Sign in
- GIVEN the login screen is shown at `/beads?project=gin-console`
- WHEN the user submits " Giangdhwhtbr@Gmail.com "
- THEN localStorage holds `giangdhwhtbr@gmail.com`, the URL is unchanged and the Beads page is shown

#### Scenario: Invalid email
- GIVEN the login screen is shown
- WHEN the user submits "giang"
- THEN the login screen stays and says the email is not valid, and nothing is stored

#### Scenario: Remembered
- GIVEN localStorage holds `giangdhwhtbr@gmail.com`
- WHEN the user reloads any page
- THEN the page is shown without the login screen

#### Scenario: Storage refused
- GIVEN writing localStorage throws
- WHEN the user submits a valid email
- THEN the page is shown for this visit and no error is shown

### REQ-UI-098: Log out
WHILE an email is held, the frontend SHALL show it in the "Main" navigation's sidebar (its first letter only on the icon rail, the full email as the control's accessible name) with a "Log out" control, and WHEN the user activates "Log out", SHALL remove `gin-console.email` from localStorage and show the login screen without changing the URL.

#### Scenario: Email shown
- GIVEN the user signed in as `giangdhwhtbr@gmail.com`
- WHEN any page is shown at 1280px with the sidebar expanded
- THEN the sidebar shows `giangdhwhtbr@gmail.com` and a "Log out" control

#### Scenario: Log out
- GIVEN the user is signed in on `/my-tasks`
- WHEN the user activates "Log out"
- THEN localStorage has no `gin-console.email`, the URL is `/my-tasks` and the login screen is shown

### REQ-UI-099: My Tasks navigation
The "Main" navigation SHALL contain a "My Tasks" link after "Beads", and the frontend SHALL show the My Tasks page at `/my-tasks` without a full reload, marking the link as current there, and SHALL replace the address `/` with `/my-tasks?project=<current project>` (REQ-UI-124), or with `/my-tasks` while no project is configured, without adding a history entry.

#### Scenario: Open My Tasks
- GIVEN the Beads page of project `a` is shown
- WHEN the user clicks "My Tasks"
- THEN the URL is `/my-tasks?project=a`, the My Tasks page is shown without a reload and "My Tasks" is the current link

#### Scenario: Home address
- GIVEN the current project is `a`
- WHEN the user opens `/`
- THEN the URL becomes `/my-tasks?project=a`, the My Tasks page of `a` is shown, and the browser Back button does not return to `/`

#### Scenario: Home address without projects
- GIVEN no project is configured
- WHEN the user opens `/`
- THEN the URL becomes `/my-tasks` and the page says no projects are configured

### REQ-UI-100: My Tasks list
WHEN the My Tasks page opens, the frontend SHALL request `GET /api/projects/beads`, then `GET /api/beads?project=<name>` for the current project (REQ-UI-124) only, and SHALL list in one table the beads of that project whose `assignee` is the same person (REQ-BEADS-023) as the signed-in email, leaving out beads matched only by `owner`. Each row SHALL show the id, the title, the state, the type, `P<n>` and the updated time, and SHALL link to `/beads/<project>/<id>`. Rows SHALL be ordered by priority ascending, then by `updated_at` newest first, then by id. The page SHALL show how many beads it lists, and WHEN none matches, SHALL say "No tasks assigned to <email>" and offer a link "Open the Beads page" to `/beads?project=<current project>`, and WHEN no project exists, SHALL say that no projects are configured. The Refresh control (REQ-UI-096) SHALL load the list again.

#### Scenario: Match by email or name
- GIVEN the signed-in email `giangdhwhtbr@gmail.com`, project A with open beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `alice`, and one unassigned open bead owned by `giangdhwhtbr@gmail.com`
- WHEN My Tasks opens
- THEN only the beads assigned to `giangdhwhtbr` and `GiangDHWHTBR@gmail.com` are listed, and the count is 2

#### Scenario: Same handle at another domain
- GIVEN the signed-in email `giangdhwhtbr@gmail.com` and an open bead assigned to `giangdhwhtbr@other.example`
- WHEN My Tasks opens
- THEN that bead is listed

#### Scenario: Order
- GIVEN the current project is A, which has a P2 bead assigned to me updated today and a P1 bead assigned to me updated last week
- WHEN My Tasks opens
- THEN the P1 bead is first, no row has a project column, and clicking the P2 bead opens `/beads/A/<id>`

#### Scenario: Other projects left out
- GIVEN projects A and B, the current project is A, and a bead assigned to me in each
- WHEN My Tasks opens
- THEN only the bead of A is listed and no beads request goes to B

#### Scenario: Nothing assigned
- GIVEN the current project is `a` and none of its beads is assigned to `giangdhwhtbr@gmail.com` or `giangdhwhtbr`
- WHEN My Tasks opens
- THEN the page says "No tasks assigned to giangdhwhtbr@gmail.com" and a link "Open the Beads page" goes to `/beads?project=a`

#### Scenario: Missing project directory
- GIVEN project C is configured but its directory does not exist
- WHEN My Tasks opens
- THEN no beads request is sent for C

#### Scenario: No projects
- GIVEN `GET /api/projects/beads` returns an empty list
- WHEN My Tasks opens
- THEN the page says no projects are configured

#### Scenario: Not the full projects list
- GIVEN two projects
- WHEN My Tasks opens
- THEN no request goes to `/api/projects`

### REQ-UI-101: My Tasks closed beads
The My Tasks page SHALL leave closed beads out by default, and SHALL offer a "Show closed" control kept in the URL as `closed=1` that requests the beads with `closed=1` and lists the matching closed beads too.

#### Scenario: Closed hidden
- GIVEN 3 open and 2 closed beads assigned to me
- WHEN My Tasks opens at `/my-tasks`
- THEN 3 beads are listed and every beads request lacks `closed=1`

#### Scenario: Show closed
- GIVEN the same beads in project A
- WHEN the user turns on "Show closed"
- THEN the URL is `/my-tasks?project=A&closed=1`, the beads are requested with `closed=1` and 5 beads are listed

### REQ-UI-102: My Tasks failures
IF `GET /api/projects/beads` fails, THEN the My Tasks page SHALL show that the projects could not be loaded; IF the beads request of the project fails, THEN the page SHALL show an error naming that project and its message; WHILE requests are pending, the page SHALL say it is loading.

#### Scenario: Beads request fails
- GIVEN the current project is A and its beads request responds 500
- WHEN My Tasks opens
- THEN an error names A and its message

#### Scenario: Projects fail
- GIVEN `GET /api/projects/beads` responds 500
- WHEN My Tasks opens
- THEN the page says the projects could not be loaded and lists nothing

### REQ-UI-103: Stale beads note
WHERE the `beads` object of a project in `GET /api/projects/beads` has `stale: true`, the Beads page and the My Tasks page SHALL show, above their list and while that project is the current project (REQ-UI-124), the note "Beads of <project> may be out of date. Run `bd export -o .beads/issues.jsonl` in <project>." once, and SHALL show no note for another project or for a project whose `stale` is `false` or missing.

#### Scenario: Beads page
- GIVEN project A has `beads.stale: true`
- WHEN the Beads page opens with A selected
- THEN the note names A and the command, and the list is shown below it

#### Scenario: My Tasks
- GIVEN projects A and B with `beads.stale: true` and A is the current project
- WHEN My Tasks opens
- THEN one note names A, none names B, and the tasks of A are listed

#### Scenario: Not stale
- GIVEN project A whose `beads` has no `stale` key, or `stale: false`
- WHEN the Beads page opens with A selected
- THEN no note is shown

### REQ-UI-104: Beads milestone filter
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

### REQ-UI-105: My Tasks milestone filter
The My Tasks page SHALL list only the beads of the current project (REQ-UI-124), kept in the URL as `project`, SHALL NOT show a project select of its own (the switcher of REQ-UI-123 changes the project), and SHALL offer a "Milestone" select, always enabled, kept in the URL as `milestone`. The page SHALL request `GET /api/beads/milestones?project=<name>` and SHALL offer the choices of REQ-UI-104, selecting `current` (or "All" when `current` is `null`) WHILE the URL has no `milestone`; the milestone choice SHALL filter the beads as in REQ-UI-104, and a closed milestone SHALL list its closed beads without "Show closed". A change of project SHALL clear `milestone`.

#### Scenario: Current project
- GIVEN the current project is A
- WHEN My Tasks opens at `/my-tasks`
- THEN the URL becomes `/my-tasks?project=A`, there is no Project select, and the Milestone select is enabled

#### Scenario: Project with a current milestone
- GIVEN project A whose current milestone is `m2`, with my tasks under `m2` and `m3`
- WHEN My Tasks opens at `/my-tasks?project=A`
- THEN the Milestone select shows `m2`, and only my tasks under `m2` are listed

#### Scenario: Change project clears the milestone
- GIVEN My Tasks at `/my-tasks?project=A&milestone=m3`
- WHEN the user chooses project B in the switcher
- THEN the URL is `/my-tasks?project=B` and B's current milestone is selected

## Use Cases
- [Filter beads by milestone](use-cases/filter-by-milestone.md)
- [Browse a milestone's beads](use-cases/browse-milestone-beads.md)
- [Follow an epic's lanes](use-cases/follow-epic-lanes.md)
- [Read a definition](use-cases/read-a-definition.md)

### REQ-UI-106: Graph view
The Beads views SHALL offer the view Graph (`view=graph`), which SHALL draw, with the nodes, arrows, outside beads and cycle warning of REQ-UI-048 to REQ-UI-050 and REQ-UI-079, the direct children of its scope: the bead named by `scope` in the URL when it exists and has children, else the selected milestone, else the project (REQ-MILESTONE-UI-006) when "All" or "No milestone" is selected. The Graph view SHALL also serve the Graph tab of an epic page (REQ-UI-119), with the epic as its scope. It SHALL draw a node only when the node's bead or one of its descendants matches the search, the filters and "Show closed", and only the arrows between drawn nodes. It SHALL offer the switch "Only linked" of REQ-UI-081, on at first when the scope is the project and off otherwise. WHEN a node is selected, the view SHALL keep it as `select` and show its details panel as the List view does, SHALL select nothing and show no details panel while `select` is absent, whatever the scope, so that the panel opens only when the user selects a node, and SHALL show and close the panel as REQ-UI-051 and REQ-UI-052 describe. WHEN a node with children is opened, the view SHALL set `scope` to its id and show a breadcrumb from the milestone or project down to the scope, each item a link that sets `scope` to it. WHEN a node without children is opened, the frontend SHALL open its bead page. WHILE nothing matches, the view SHALL say "No beads match these filters".

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
- THEN the Graph view is drawn with `e-1` as its scope, the tasks of `e-1` are the nodes, no node is selected and no details panel is shown

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

### REQ-UI-107: Long text
The frontend SHALL break a word that does not fit its box at any character in bead titles, ids on a page, assignees, owners and comments; SHALL show an id longer than 24 characters, wherever it is cut to fit a row, a card, a node or a Gantt label, as its first 14 characters, "…" and its last 9 characters, with the full id as `title`; SHALL give every text it cuts short with an ellipsis the full text as `title`; and SHALL keep every page from scrolling sideways at 360px and wider, a table or code block scrolling inside its own box.

#### Scenario: Long id
- GIVEN the bead `ex-payments-provider-migration-and-reconciliation-2026.2.1`
- WHEN its row, card or node is shown
- THEN its id reads `ex-payments-pr…-2026.2.1` with the full id as `title`

#### Scenario: Short id
- GIVEN the bead `ex-e4.1`
- WHEN its row is shown
- THEN its id reads `ex-e4.1` in full

#### Scenario: Unbroken title on a card
- GIVEN a bead titled "Handle PaymentReconciliationServiceTimeoutExceptionHandlerFactoryProviderBean in the worker"
- WHEN its Board card is shown at 1440px
- THEN the title wraps inside the card and the page does not scroll sideways

#### Scenario: Unbroken title on a phone
- GIVEN the same bead
- WHEN its bead page is shown at 390px
- THEN the heading wraps inside the window and the page does not scroll sideways

#### Scenario: Wide table on a phone
- GIVEN a bead whose description holds a table with five wide columns and a long code line
- WHEN its bead page is shown at 390px
- THEN the table and the code block scroll inside their own boxes and the page does not scroll sideways

#### Scenario: Cut text has a tooltip
- GIVEN a milestone titled with 120 characters
- WHEN the Milestones list cuts it short
- THEN the full title is its `title`

### REQ-UI-108: Kind and capability filters
The bead filter bar and its mobile sheet SHALL offer a "Kind" select (All, Capability, Technical, Parity) kept in the URL as `kind`, and a multi-select "Capability" listing every capability of the loaded beads, kept in the URL as `capability` and hidden while there is none. A bead SHALL match the Kind filter when it or its nearest epic ancestor has that kind, and the Capability filter when its capabilities or those of its nearest epic ancestor hold any chosen capability. The filters SHALL apply to the List, Board, Focus and Graph views on the Beads page and on a milestone's Beads tab, and SHALL count in the breadcrumb's filter count (REQ-UI-072).

#### Scenario: Kind filter keeps the tracks
- GIVEN technical epic `e-1` with task `t-1`, and capability epic `e-2` with task `t-2`
- WHEN the user chooses Kind "Technical"
- THEN the URL has `kind=technical` and `e-1` and `t-1` are shown while `e-2` and `t-2` are not

#### Scenario: Capability filter
- GIVEN track `t-1` with capability `milestone-ui` and track `t-3` with capability `beads`
- WHEN the user chooses the capability `milestone-ui`
- THEN the URL has `capability=milestone-ui` and `t-1` is shown while `t-3` is not

#### Scenario: No capabilities
- GIVEN a project whose beads have no capability
- WHEN the Beads page is shown
- THEN there is no "Capability" filter

### REQ-UI-109: Kind, capabilities and estimate in the Beads views
The frontend SHALL show the word "Technical" or "Parity" (REQ-UI-140) for an epic of that kind, and no kind for a capability epic, on its List row, its Board and Focus card, its bead page and its Gantt label; SHALL show the bead's capabilities as text, joined by commas, on its bead page; SHALL show on the bead page the size of REQ-UI-110 (REQ-UI-028), "<n>d" counting 480 minutes of `estimate_minutes` as one working day and rounding to one decimal, or "<p> pt" with its `points_reason` on the line under it; and SHALL show on an epic's List row, at every width, its complexity (REQ-UI-028) as text and its size as REQ-UI-110 describes ("<p> pt" when it has `points`, else "<n>d"), among the items that give way before the title (REQ-UI-044).

#### Scenario: Technical epic
- GIVEN technical epic `e-1` with capabilities `beads` and `ui`, complexity `medium` and `estimate_minutes: 1440`
- WHEN its List row and its bead page are shown
- THEN the row shows "Technical", "medium" and the size "3d", and the bead page shows "Technical", the capabilities "beads, ui", and the size "3d"

#### Scenario: Capability epic
- GIVEN capability epic `e-2` without an estimate
- WHEN its List row is shown
- THEN it shows no kind and no estimate

#### Scenario: Partial day
- GIVEN a task with `estimate_minutes: 240`
- WHEN its bead page is shown
- THEN it shows the size "0.5d"

#### Scenario: Pointed epic
- GIVEN epic `e-3` with complexity `medium`, `points: 5` and `points_reason: "new endpoint and UI"`, and epic `e-4` with `points: 3` and no complexity
- WHEN their List rows and the bead page of `e-3` are shown
- THEN `e-3`'s row shows "medium" and the size "5 pt", `e-4`'s shows the size "3 pt", and the bead page of `e-3` shows the size "5 pt" and "new endpoint and UI"

#### Scenario: Size at every width
- GIVEN epic `e-3` with complexity `medium` and `points: 5`
- WHEN its List row is shown at 390px and at 1440px
- THEN both rows show "medium" and the size "5 pt"

### REQ-UI-110: Readable text and facts
On every page, at every window width from 360px and in the light and the dark theme, the frontend SHALL NOT draw the text of one element over the text of another, or over a chart bar, line or arrow that the text does not belong to; SHALL end every text it cuts short with an ellipsis and give the full text as `title` (REQ-UI-107); SHALL give text a contrast with its background of at least 4.5:1, or 3:1 for text of at least 18.66px bold or 24px; SHALL show a set of facts about one thing (such as owner, assignee, dates and counts) as label/value pairs, each label in the muted color and each value in the text color and a heavier weight, never as one run of text of one style; SHALL show a priority as the text `P<n>`, bold in the text color for P0 and P1 and in the muted color otherwise (REQ-UI-140); and SHALL show a size as text that reads "<p> pt" for a bead with `points`, else "<n>d" from `estimate_minutes`.

#### Scenario: No overlapping text
- GIVEN the example project
- WHEN the Beads (List, Board, Focus, Graph, and Lanes of the epic `ex-e12`), bead, My Tasks, Milestones, milestone (Gantt at each zoom, Beads, Retro) and Reports (each tab) pages are shown at 390, 1024, 1440 and 1920px in both themes
- THEN no text overlaps other text or a bar, line or arrow it does not belong to, and no text spills out of its box without an ellipsis

#### Scenario: Facts as label and value
- GIVEN the bead page of an epic, the velocity line of a kicked-off milestone and the header of a lane
- WHEN they are shown
- THEN each fact shows its label in the muted color and its value in the text color with a heavier weight

#### Scenario: Priority
- GIVEN beads at P0, P1 and P2
- WHEN their List rows are shown
- THEN `P0` and `P1` are bold in the text color, `P2` is in the muted color, and none of them is a pill

#### Scenario: Contrast
- GIVEN the Reports Team and Velocity tabs in the light and the dark theme
- WHEN they are shown
- THEN every milestone id and label has a contrast of at least 4.5:1 with its background

### REQ-UI-111: Lanes view
The Beads views SHALL offer the view Lanes (`view=lanes`) WHILE the scope, resolved as for the Graph view (REQ-UI-106), is a bead with at least one loaded child that is not a merge gate and whose `lane` is not `null` (REQ-BEADS-019); closed children count only while closed beads are loaded ("Show closed", a sprint or a closed milestone, or the Lanes view itself). The view SHALL draw one row per lane of the scope's children that are not merge gates, then a row "No lane" for those children without a `lane` when there is any, the lane rows ordered by the column of their first card, then by name. Each row SHALL show its header (REQ-UI-112) in a column that stays visible while the cards scroll sideways, 168px wide under 1024px windows and 240px from 1024px, and its beads as cards with the content of a Graph node (REQ-UI-049) on columns shared by every row: a card's column SHALL be after the columns of the cards it depends on (its blockers among the drawn cards and, through a merge gate, the card of the track that gate waits for) and after the column of the previous card of its row, the cards of a row ordered by their dependency order, then by track number, then by id. The view SHALL load closed beads whatever "Show closed" says, SHALL draw a card only when its bead matches the search and the filters, SHALL leave out a row with no card, and SHALL say "No beads match these filters" when it draws no card. WHEN a card is selected or opened, the view SHALL behave as the Graph view does with a node (REQ-UI-106). IF `view=lanes` while the scope has no child with a lane, THEN the view SHALL say "Lanes show for an epic whose tracks have lanes" with a link to the Graph view.

#### Scenario: Offered for an epic with lanes
- GIVEN the example project with epic `ex-e12`, whose tracks have lanes, and epic `ex-e3`, whose tracks have none
- WHEN the user opens the Beads views with `scope=ex-e12`, then with `scope=ex-e3`, then without a scope
- THEN the Lanes tab is offered for `ex-e12` only

#### Scenario: Rows and columns
- GIVEN epic `ex-e12` with lanes `be` (tracks 1 and 2, track 2 blocked by track 1), `fe` (track 3), `qa` (track 4, blocked by merge gates waiting for tracks 2 and 3), `infra` (tracks 5 and 6) and two children without a lane
- WHEN the user opens its Lanes view
- THEN the rows are `be`, `fe`, `infra`, `qa` and "No lane", track 2 is in a later column than track 1, and track 4 is in a later column than tracks 2 and 3

#### Scenario: Closed tracks without Show closed
- GIVEN "Show closed" is off and track 1 of `ex-e12` is closed
- WHEN the user opens the Lanes view of `ex-e12`
- THEN the card of track 1 is drawn

#### Scenario: Filters
- GIVEN the assignee filter selects `bao`, who holds only lane `fe`
- WHEN the user opens the Lanes view of `ex-e12`
- THEN only the row `fe` is drawn, with its header

#### Scenario: Scope without lanes
- GIVEN the URL has `view=lanes&scope=ex-e3`
- WHEN the page loads
- THEN the view says "Lanes show for an epic whose tracks have lanes" with a link to the Graph view

### REQ-UI-112: Lane header and state
Each lane row's header SHALL show the lane name in a heavier weight, then as label/value facts (REQ-UI-110):
- State: the lane's state as an icon and its words;
- Held by: the distinct assignees of the lane's tracks that are not closed, or "Unclaimed" when none has one; left out when every track is closed;
- Lease: "until <date>" from the latest `claim.expires_at` among the lane's tracks that are not closed when it is later than now, "expired <date>" when it is not, left out when none of them has a `claim`;
- Tracks: the strand of REQ-UI-138 over all the lane's tracks whatever the search and filters.
The state SHALL be the first of these that holds:
1. "All tracks closed": every track is closed;
2. "Running": a track is `in_progress`, or a track that is not closed has a `claim` whose `expires_at` is later than now;
3. "Waiting for <lanes>": the lane's first card that is not closed is blocked by merge gates that are not closed, `<lanes>` being their `waits_for.lane` values, joined by ", ", or "another lane" for a gate whose `waits_for.lane` is `null`;
4. "Blocked": that card is blocked (REQ-BEADS-007);
5. "Not started": no track is closed;
6. "Idle": otherwise.
The header of the row "No lane" SHALL show its name and Tracks only.

#### Scenario: Running lane with a lease
- GIVEN lane `be` with track 1 closed and track 2 `in_progress`, both assigned to `ann`, track 2 with a `claim` expiring tomorrow at 16:00
- WHEN the Lanes view is shown
- THEN the `be` header shows State "Running", Held by `ann`, Lease "until <tomorrow> 16:00" and Tracks "1/2"

#### Scenario: Waiting for another lane
- GIVEN lane `qa` whose only track, open and unassigned, is blocked by an open merge gate waiting for track 2 of lane `be` and a closed merge gate waiting for track 3 of lane `fe`
- WHEN the Lanes view is shown
- THEN the `qa` header shows State "Waiting for be", Held by "Unclaimed" and Tracks "0/1"

#### Scenario: Idle lane with an expired lease
- GIVEN lane `infra` with track 5 closed and track 6 open, assigned to `chi` with a `claim` that expired yesterday
- WHEN the Lanes view is shown
- THEN the `infra` header shows State "Idle", Held by `chi` and Lease "expired <yesterday date and time>"

#### Scenario: All tracks closed
- GIVEN lane `fe` whose only track is closed
- WHEN the Lanes view is shown
- THEN the `fe` header shows State "All tracks closed" and Tracks "1/1", and no Held by or Lease

#### Scenario: Not started and blocked
- GIVEN lane `x` with two open unassigned tracks without blockers, and lane `y` whose first open track is blocked by an open bead that is not a merge gate
- WHEN the Lanes view is shown
- THEN `x` shows State "Not started" and `y` shows State "Blocked"

### REQ-UI-113: Arrows and merge markers between cards
The Lanes view SHALL draw an arrow from each drawn card to each drawn card it blocks, and from the card of the track a merge gate waits for to each drawn card that gate blocks, as a line of horizontal and vertical segments that runs only in the gaps between columns and between rows and never across a card or a header. On each arrow through a merge gate it SHALL draw, in a gap between rows, a marker with an icon and the word "Waiting" while the gate is not closed or "Merged" when it is closed, markers in one gap moved apart so that none overlaps another or an arrow's turn. IF the track a merge gate waits for is not drawn, THEN the view SHALL draw no arrow for it and SHALL draw the marker in the gap between rows above the waiting card, from its left edge, with the words "Waiting for track <N>" or "Merged track <N>".

#### Scenario: Waiting and merged
- GIVEN epic `ex-e12`, where track 4 of lane `qa` is blocked by an open merge gate waiting for track 2 and a closed one waiting for track 3
- WHEN the Lanes view is shown
- THEN an arrow runs from track 2 to track 4 with the marker "Waiting", an arrow runs from track 3 to track 4 with the marker "Merged", and no arrow segment or marker crosses a card or a header

#### Scenario: Arrow inside a lane
- GIVEN track 2 of lane `be` blocked by track 1
- WHEN the Lanes view is shown
- THEN an arrow runs from track 1 to track 2 without a marker

#### Scenario: Track not drawn
- GIVEN a merge gate titled `external: .planning/plans/other.md#7` that blocks track 4 and matches no child of the scope
- WHEN the Lanes view is shown
- THEN no arrow is drawn for it and the marker "Waiting for track 7" is drawn above the card of track 4

### REQ-UI-114: Lanes keyboard and screen readers
In the Lanes view, WHEN a card has focus, the keys Arrow Left and Arrow Right SHALL move the focus and the selection to the previous or next card of its row, and Arrow Up and Arrow Down to the card of the row above or below whose column is nearest, the earlier column on a tie, and SHALL do nothing at an edge; Escape, Enter and double-click SHALL behave as in the Graph view (REQ-UI-052, REQ-UI-106). The view SHALL hold a list that only screen readers read, naming each lane with its state, holder, lease and tracks, then each arrow through a merge gate as "<lane> #<N> waits for <lane> #<M>: merge pending" or "…: merged".

#### Scenario: Moving between rows
- GIVEN the focus on track 2 of lane `be`
- WHEN the user presses Arrow Down
- THEN the focus and the selection move to track 3, the only card of lane `fe`, the row below, and the details panel shows it

#### Scenario: Screen reader list
- GIVEN the Lanes view of `ex-e12`
- WHEN a screen reader reads the view
- THEN it reads "be: Running, held by ann, lease until …, 1/2 closed" and "qa #4 waits for be #2: merge pending"

### REQ-UI-115: Lane on a bead
WHERE a bead's `lane` is not `null` (REQ-BEADS-019), its List row, its Board and Focus cards, its Graph node, its Gantt child row (REQ-MILESTONE-UI-015), its bead page and its details panel SHALL show its lane as text (REQ-UI-140): a dot and the lane name, the dot in the lane colour of REQ-UI-118 where the lanes of its scope are drawn (the Tracks table of REQ-UI-121) and in the muted colour elsewhere, cut with an ellipsis and with the title "Lane <name>"; the cards of the Lanes view and the cards inside the lane boxes of the Graph view (REQ-UI-117), whose row or box names the lane, SHALL NOT. The labels of a bead SHALL NOT show its `lane:<name>` label when it has a `lane`, nor its `track:<N>` label when it has a `track`. The facts of a bead page (REQ-UI-110) SHALL add Lane (the name), Track ("#<N>", followed by the plan's file name when `track.plan` is known) and Lease ("until <date>" or "expired <date>" as in REQ-UI-112) when the bead has them.

#### Scenario: Chip in every view
- GIVEN track 2 of `ex-e12` in lane `be`, labelled `lane:be` and `track:2`
- WHEN its List row, Board card, Gantt child row and bead page are shown
- THEN each shows the lane "be" with the title "Lane be", and no label reads `lane:be` or `track:2`

#### Scenario: No lane inside a lane box
- GIVEN the Graph view with `scope=ex-e12`, whose tracks have lanes
- WHEN it is shown
- THEN the card of track 2 sits in the box headed "be" and shows no lane

#### Scenario: Facts
- GIVEN track 2 with `track` `{"plan": ".planning/plans/2026-11-20-shop.md", "number": 2}` and a `claim` expiring tomorrow at 16:00
- WHEN its bead page is shown
- THEN the facts include Lane "be", Track "#2 2026-11-20-shop.md" and Lease "until <tomorrow> 16:00"

#### Scenario: Bead without a lane
- GIVEN a bead whose `lane` is `null`
- WHEN its List row is shown
- THEN it shows no lane

### REQ-UI-116: Merge gates in the views
The List, Board, Focus and My Tasks views SHALL NOT show merge gates (REQ-BEADS-019), and no count of children or tracks that the frontend shows ("n of m done" of a Graph node, the child counts of a List row and of a bead page) SHALL count them. WHILE the Graph view draws no lane boxes (REQ-UI-117), it SHALL draw a merge gate as a node with a dashed border and a merge icon that reads, in place of its title, "Waits for <lane> #<N> to merge" (`<lane>` its `waits_for.lane`, else "track" without the `#`) and, in place of its state, "Waiting" while it is not closed or "Merged" when it is closed; WHILE it draws lane boxes, a merge gate SHALL be a label on an arrow as in REQ-UI-117. The bead page of a merge gate SHALL show the same words as its title and state, keep its own title as a fact "Placeholder", and add the fact "Waits for" with the plan path and the track number. In the Dependencies of a bead page (REQ-UI-028), a merge gate SHALL read "Waits for <lane> #<N>, merge pending" or "Waits for <lane> #<N>, merged", with `<lane> #<N>` written as on its Graph node.

#### Scenario: Not on the Board
- GIVEN an open merge gate without blockers and an open task without blockers
- WHEN the user opens the Board, List and Focus views
- THEN the task is shown and the merge gate is not

#### Scenario: Not counted as a child
- GIVEN epic `ex-e12` with 8 tracks and a merge gate whose parent is `ex-e12`
- WHEN its Graph node is shown in the project scope
- THEN it reads "n of 8 done"

#### Scenario: Merge gate node
- GIVEN the closed merge gate `ex-g3` without a parent, waiting for track 3 of lane `fe`, and "Show closed" on
- WHEN the Graph view of the project is shown
- THEN the gate is a dashed node with a merge icon reading "Waits for fe #3 to merge" and "Merged"

#### Scenario: Merge gate label in lane boxes
- GIVEN an open merge gate waiting for track 2 of lane `be`, in the Graph view of `ex-e12`
- WHEN the view is shown
- THEN no node reads "Waits for be #2 to merge" and the arrow from track 2 to the qa box carries "Waiting for be #2"

#### Scenario: Dependencies of a track
- GIVEN track 4 blocked by an open merge gate waiting for track 2 of lane `be` and a closed one waiting for track 3 of lane `fe`
- WHEN the bead page of track 4 is shown
- THEN its Dependencies read "Waits for be #2, merge pending" and "Waits for fe #3, merged"

### REQ-UI-117: Lane clusters in the Graph view
WHILE the scope of the Graph view (REQ-UI-106) has a loaded child that is not a merge gate and whose `lane` is not `null` (REQ-BEADS-019, the condition of the Lanes tab in REQ-UI-111), the Graph view SHALL draw, instead of the layers of REQ-UI-048:
- one box per lane of the scope's children that are not merge gates, holding the cards of its drawn tracks, and one dashed "No lane" box for the drawn children without a lane;
- the boxes in tiers from left to right: a box, the "No lane" box included, is in the tier to the right of every box whose tracks its tracks wait for, directly or through a merge gate (REQ-UI-111); the boxes of one tier stand one under another in the row order of the Lanes view; the "No lane" box comes last in its tier, and in the last tier when none of its tracks depends on or blocks a track of a lane; lanes that wait for each other in a loop share one tier;
- the cards inside a box from left to right by their dependency layer within the lane, the cards of one layer one under another;
- an arrow between two cards of one box for each dependency between them, and an arrow from the right edge of a card to the left edge of the box of another lane, level with the waiting card, for each dependency of that lane's tracks on it, directly or through a merge gate, so that no dependency between drawn cards goes without an arrow; an arrow to a box that is not in a later tier (lanes in a loop) runs in a channel below every box;
- no node for a merge gate, but a label on its arrow in the gap between two tiers, on the surface colour and without a border: "Waiting for <lane> #<N>" on a dashed arrow while the gate is not closed, "Merged <lane> #<N>" when it is closed (`<lane>` and `<N>` from its `waits_for`); and, for a gate whose track is not drawn, the label "Waiting for track <N>" or "Merged track <N>" on the top edge of the waiting box.

The view SHALL leave out a box with no drawn card, SHALL NOT offer the switch "Only linked" (REQ-UI-081) and SHALL keep the selection, details panel, Escape, opening and screen-reader list of REQ-UI-051, REQ-UI-052, REQ-UI-054 and REQ-UI-106. WHEN a card has focus, Arrow Left and Arrow Right SHALL move to the previous or next card of its box and, from the first or last card of a box, to the card that an arrow of the focused card comes from in the tier on the left or leads to in the tier on the right, the nearest by y when there are several, else to the card of that tier nearest by y; Arrow Up and Arrow Down SHALL move to the card nearest by x in the box above or below in the same tier. No arrow, label or box SHALL be drawn over a card or over the text of a header.

#### Scenario: Boxes in tiers
- GIVEN epic `ex-e12` with lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6), qa (track 4, waiting for tracks 2 and 3 through merge gates) and two tracks without a lane, with "Show closed" on
- WHEN the user opens the Graph view with `scope=ex-e12`
- THEN boxes be, fe and infra stand one under another in the first tier on the left, qa and then "No lane" stand in the second tier to their right, and no node reads "Waits for"

#### Scenario: Tracks left to right
- GIVEN track 2 of lane be blocked by track 1
- WHEN the Graph of `ex-e12` is shown
- THEN the card of track 2 is right of the card of track 1 inside the be box, with an arrow from track 1 to track 2

#### Scenario: Gate labels
- GIVEN track 4 of lane qa blocked by an open merge gate waiting for track 2 of lane be and a closed one waiting for track 3 of lane fe
- WHEN the Graph of `ex-e12` is shown
- THEN a dashed arrow from the right edge of track 2 to the left edge of the qa box carries "Waiting for be #2", and an arrow from track 3 to the qa box carries "Merged fe #3", both labels in the gap between the two tiers

#### Scenario: Track not drawn
- GIVEN a merge gate titled `external: .planning/plans/other.md#7` that blocks track 4 and whose track is not a child of `ex-e12`
- WHEN the Graph of `ex-e12` is shown
- THEN the label "Waiting for track 7" is on the top edge of the qa box and no arrow is drawn for it

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

### REQ-UI-118: Lane box header and colours
Each lane box of REQ-UI-117 SHALL show a header with a colour swatch, the lane name in a heavier weight and the lane's state as an icon and words (REQ-UI-112) on its first line, and the holder and the lease, joined by a comma, and the strand of the lane's tracks (REQ-UI-112, REQ-UI-138) in the muted colour on its second line, cut with an ellipsis and with the full text as `title`. The box SHALL have a background tint and a border in the lane's colour: lane colour `k` of eight categorical colours with a light and a dark step each, `k` being the position of the lane name among the names of the scope's lanes sorted, counted again from 1 after 8, so that a filter never changes a lane's colour. Text in a box SHALL keep the text colours, never the lane colour, at a contrast of at least 4.5:1 (REQ-UI-110). The "No lane" box SHALL have a dashed neutral border, no swatch and no state.
Source: `assets/2026-11-20/mockup/index.html`, `assets/2026-11-20/shots/b-dark.png`

#### Scenario: Header
- GIVEN lane be with track 1 closed and track 2 in progress held by ann with a lease until tomorrow 16:00
- WHEN the Graph of `ex-e12` is shown
- THEN the be box header reads "be" and "Running" on its first line and "ann, lease until <tomorrow> 16:00" and the strand with "1/2" on its second line

#### Scenario: Colours follow the lane name
- GIVEN lanes be, fe, infra and qa, and the assignee filter showing only bao (lane fe)
- WHEN the Graph of `ex-e12` is shown with and without the filter
- THEN the fe box has lane colour 2 in both cases, and be, infra and qa have colours 1, 3 and 4 when shown

#### Scenario: No lane box
- GIVEN two tracks of `ex-e12` without a lane
- WHEN the Graph is shown
- THEN they sit in a dashed box "No lane" with the strand "1/2" and no swatch or state

### REQ-UI-122: Canvas scrolling
Type: non-functional
Category: usability
The canvas of the Graph view (REQ-UI-106), with its nodes or lane boxes (REQ-UI-117), and the canvas of the Lanes view (REQ-UI-111), on the Beads page and on the Graph and Lanes tabs of an epic page (REQ-UI-119), SHALL each be as tall as its content at the current scale. They SHALL scroll only sideways, with no vertical scroll bar of their own, and SHALL leave the page as the one vertical scroller. A wheel turn or a vertical swipe over a canvas without `Ctrl` or `⌘` SHALL scroll the page. A sideways swipe SHALL move the canvas and SHALL NOT pass on to the browser's history at the canvas's edge. The details panel and the discussion column keep their own scroll (REQ-UI-078).

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

### REQ-UI-119: Epic page tabs
WHEN a bead of type `epic` is shown as a page (not as the details panel of another view), the bead page SHALL keep its title, badges and facts (REQ-UI-028, REQ-UI-110) above a tab list "Overview", "Graph", "Lanes" and "Discussion (N)", SHALL show "Lanes" only while the epic has a loaded child that is not a merge gate and whose `lane` is not `null` (REQ-UI-111), SHALL keep the open tab in the URL as `tab` (`overview` when absent or unknown, or when it names "lanes" for an epic without lanes), SHALL change tab with the Left and Right arrow keys with `aria-selected` on the open tab, and SHALL show in each tab:
- Overview: the cards and sections of REQ-UI-120 and REQ-UI-121, then the description and the text sections of REQ-UI-038;
- Graph: the Graph view of REQ-UI-106 with the epic as the scope, with the search and filters of the Beads views and the lane boxes of REQ-UI-117;
- Lanes: the Lanes view of REQ-UI-111 to REQ-UI-114 with the epic as the scope;
- Discussion: the comments of REQ-UI-039, or "No comments" when `comment_count` is 0.
The epic page SHALL NOT show the discussion column of REQ-UI-068 or the tabs of REQ-UI-069, and the details panel of an epic SHALL keep its compact form with "Open page".
Source: `assets/2026-11-21/epic-page/mockup/index.html`, `assets/2026-11-21/epic-page/shots/overview-light.png`

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
- Progress: the large strand of REQ-UI-138 and its sentence, from the epic's `child_counts` (REQ-UI-130), over its children that are neither prep tasks (REQ-BEADS-002) nor merge gates (REQ-BEADS-019) whatever "Show closed" says, then as label/value facts "Points" ("<done> of <total> pt done" over the tracks with `points`, or "No points"), "Bugs" (the open beads of the epic's `bugs`, "0 open" when none) and "Prep" ("<closed>/<total>" of its prep tasks, or "none");
- Workflow: the stages discuss, plan, orchestrate, execute and ship with the epic's current stage marked and the earlier ones ticked, then "Gates" ("<satisfied> of <n> satisfied"), "Warnings" and "Waivers" (each a count with the items on hover and focus, or "none"), from `GET /api/beads/{project}/{id}/workflow` (REQ-BEADS-020); "No workflow" when the answer has no stage, and the error when it fails, the rest of the page unaffected;
- Milestone: the epic's milestone id and title linking to the milestone page, its status (REQ-MILESTONE-UI-022), its window "<start> – <end>" (REQ-UI-131), the working days (Monday to Friday) from today to `end`, both counted, while it is active, and its forecast finish with a warning mark when the milestone is late (REQ-MILESTONE-UI-023) (from `GET /api/milestones?project=`, REQ-MILESTONE-UI-008); "No milestone" when the epic's `milestone` is `null`.
Source: `assets/2026-11-21/epic-page/mockup/index.html`

#### Scenario: Progress by state
- GIVEN epic `ex-e12` with 8 tracks (4 closed, 1 in progress, 2 ready, 1 blocked) and a merge gate child
- WHEN its Overview is shown
- THEN Progress shows a strand of 8 beads and reads "4 done, 1 in progress, 1 blocked, 2 ready"

#### Scenario: Progress with closed beads hidden
- GIVEN the same epic and "Show closed" off on the Beads page it was opened from
- WHEN its Overview is shown
- THEN Progress still reads "4 done, 1 in progress, 1 blocked, 2 ready"

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
- THEN the Milestone card shows "ex-m2 Checkout v2", "10 Nov – 1 Dec", "8 working days" left and the finish "16 Feb 2027" with a warning mark

### REQ-UI-121: Epic lanes summary and tracks table
Under the cards, the Overview tab SHALL show, while the epic has lanes (REQ-UI-111), a section "Lanes" with one row per lane in the row order of the Lanes view: the lane colour of REQ-UI-118 as a swatch and pale background, the lane name, its state (REQ-UI-112) as an icon and words, the holder and lease, what it waits for ("waits for <lane> #<N> (merge pending)" or "(merged)" for each merge gate of its first open track), and the strand of REQ-UI-138, with a link "Open the Lanes tab". It SHALL then show a section "Tracks" with a table of the epic's children that are not merge gates, with the columns Id (linking to the bead page), Title (cut with an ellipsis and `title`), State (REQ-UI-064), Lane (the lane of REQ-UI-115 with its colour dot, or "No lane"), Assignee (REQ-UI-135, "Unassigned" when none), Points ("–" when none) and Blocked by (the open blockers' ids, a merge gate written "<lane> #<N>, merge pending"), first ordered by Id; WHEN the user activates a column header other than Blocked by, the table SHALL sort by that column, ascending then descending, with `aria-sort` on that header. Below 1024px the table SHALL keep Id, Title and State and let the rest scroll sideways within the table.
Source: `assets/2026-11-21/epic-page/mockup/index.html`

#### Scenario: Lanes summary
- GIVEN epic `ex-e12` with lanes be, fe, infra and qa
- WHEN its Overview is shown
- THEN the Lanes section lists be, fe, infra and qa with their states, and qa reads "waits for be #2 (merge pending), fe #3 (merged)" and the strand "0/1"

#### Scenario: No lanes section
- GIVEN epic `ex-e3` without lanes
- WHEN its Overview is shown
- THEN there is no Lanes section and the Tracks table has no colour dot

#### Scenario: Tracks table
- GIVEN epic `ex-e12` with 8 tracks and a merge gate child
- WHEN its Overview is shown
- THEN the Tracks table has 8 rows ordered by id, no row reads "Waits for", and the row of `ex-e12.4` reads Blocked, "qa", "Unassigned" and "be #2, merge pending"

#### Scenario: Sort by a column
- GIVEN the Tracks table of `ex-e12`
- WHEN the user activates the State header twice
- THEN the rows are ordered by state ascending and then descending, and the header has `aria-sort` "descending"

### REQ-UI-123: Project switcher
The frontend SHALL show a project switcher labelled "Project" that names the current project (REQ-UI-124): at the top of the sidebar from 1024px while the sidebar is expanded, as a button holding the first letter of the project in the icon rail (from 768px up to 1023px, or while the sidebar is collapsed), and in the top bar below 768px. Opening it SHALL list every configured project whose directory exists, from `GET /api/projects/beads`, with the favorite first, each with a star button labelled "Make <name> the favorite" or, on the favorite, "Remove <name> as favorite", marked with `aria-pressed`. WHEN the user chooses a project, the frontend SHALL make it the current project and SHALL then:
- on the Beads, My Tasks, Milestones or Reports page, stay on that page with `project` replaced, keeping `view`, `closed`, `tab`, `days` and `q`, and dropping `milestone`, `select`, `scope`, `member`, `status`, `sprint` and the other filters;
- on a bead page, open the Beads page of the chosen project; on a milestone page, open the Milestones page of the chosen project.

#### Scenario: Choose on the Beads page
- GIVEN the Beads page at `/beads?project=a&view=board&milestone=m1&status=open`
- WHEN the user chooses project `b` in the switcher
- THEN the URL becomes `/beads?project=b&view=board` and the Board of `b` is shown

#### Scenario: Choose on My Tasks
- GIVEN the My Tasks page at `/my-tasks?project=a&closed=1&milestone=m1`
- WHEN the user chooses project `b` in the switcher
- THEN the URL becomes `/my-tasks?project=b&closed=1` and the tasks of `b` are shown

#### Scenario: Choose on a bead page
- GIVEN the bead page `/beads/a/a-1`
- WHEN the user chooses project `b`
- THEN the Beads page of `b` is shown

#### Scenario: Favorite first
- GIVEN projects `a`, `b` and `c`, and `c` is the favorite
- WHEN the user opens the switcher
- THEN `c` is listed first with its star pressed, then `a` and `b`

#### Scenario: Icon rail
- GIVEN a window 820px wide and the current project `qwikfone`
- WHEN any page is shown
- THEN the rail holds a button "Project: qwikfone" showing "q"

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN any page is shown
- THEN the switcher is in the top bar

### REQ-UI-124: Current project
The frontend SHALL take the current project, in this order: from the `project` query of the URL when it names a configured project whose directory exists; else the project last chosen in this browser tab; else the favorite project; else the first configured project. It SHALL remember as last chosen, for the browser tab, the project the Beads, My Tasks, Milestones, Reports, bead or milestone page shows and a project chosen in the switcher, and SHALL remember the favorite across tabs and visits. The Main navigation links Beads, My Tasks, Milestones and Reports SHALL carry `?project=<current project>`. WHEN the Beads, My Tasks, Milestones or Reports page opens without `project`, it SHALL show the current project and write it into the URL without adding a history entry. A remembered or favorite project that is no longer configured SHALL be skipped. IF the browser refuses to store a choice, THEN the choice SHALL last for the visit without an error.

#### Scenario: Links carry the project
- GIVEN the current project is `b`
- WHEN any page is shown
- THEN the Beads link goes to `/beads?project=b`, Milestones to `/milestones?project=b`, My Tasks to `/my-tasks?project=b`, and Reports to `/reports?project=b`

#### Scenario: Last chosen beats the favorite
- GIVEN the favorite is `a` and the user chose `b` earlier in this tab
- WHEN the user opens `/milestones`
- THEN the Milestones page of `b` is shown and the URL becomes `/milestones?project=b`

#### Scenario: Favorite in a new tab
- GIVEN the favorite is `c`
- WHEN the user opens `/beads` in a new browser tab
- THEN the Beads page of `c` is shown

#### Scenario: Removed project
- GIVEN the favorite `old` is no longer configured and nothing was chosen in this tab
- WHEN the user opens `/beads`
- THEN the first configured project is shown

#### Scenario: My Tasks of the current project
- GIVEN the current project is `b`
- WHEN the user opens `/my-tasks`
- THEN the My Tasks page of `b` is shown and the URL becomes `/my-tasks?project=b`

#### Scenario: Storage refused
- GIVEN the browser throws when a choice is stored
- WHEN the user chooses project `b` and opens Milestones
- THEN the Milestones page of `b` is shown and no error is shown

### REQ-UI-125: Page not found
WHEN the path matches no page of the console, including the retired `/sessions`, `/sessions/<project>/<id>` and `/quota`, the frontend SHALL show the heading "Page not found", the path, and links to the Beads page of the current project and to My Tasks, SHALL set the document title to `Page not found · gin-console`, and SHALL mark no link of the Main navigation.

#### Scenario: Unknown path
- GIVEN the current project is `a`
- WHEN the user opens `/nope`
- THEN the page shows "Page not found", `/nope`, a link to `/beads?project=a` and a link to `/my-tasks?project=a`

#### Scenario: Retired address
- GIVEN any configured projects
- WHEN the user opens `/sessions/alpha/s-1`
- THEN the page shows "Page not found" and no navigation link has `aria-current="page"`

### REQ-UI-126: Unknown project
WHEN the URL names a project that is not configured, in the `project` query of the Beads, My Tasks, Milestones or Reports page or in the path of a bead or milestone page, the frontend SHALL show "No project <name> is configured" with one link per configured project to the same page for that project, instead of another project's data, and SHALL NOT remember the name as the current project. The Reports value `all` is not a project name.

#### Scenario: Beads query
- GIVEN projects `a` and `b`
- WHEN the user opens `/beads?project=zzz`
- THEN the page says "No project zzz is configured" with links to `/beads?project=a` and `/beads?project=b`, and shows no beads

#### Scenario: My Tasks query
- GIVEN projects `a` and `b`
- WHEN the user opens `/my-tasks?project=zzz`
- THEN the page says "No project zzz is configured" with links to `/my-tasks?project=a` and `/my-tasks?project=b`, and lists no tasks

#### Scenario: Bead path
- GIVEN projects `a` and `b`
- WHEN the user opens `/beads/zzz/z-1`
- THEN the page says "No project zzz is configured" and the current project is unchanged

### REQ-UI-127: Back to your place
WHEN the user comes back with the browser Back or Forward button to the Beads, My Tasks, Milestones, milestone or Reports page, the frontend SHALL scroll the page to where it was when the user left it, once the page shows its data, and WHEN the user left it by opening a bead, SHALL move the keyboard focus to that bead's row, card or node and mark it as last opened for 2 seconds, without motion WHILE the user asks for reduced motion. A page opened by a link or by its address SHALL start at the top. IF the browser refuses to store the position, THEN the page SHALL start at the top without an error.

#### Scenario: Back to a long list
- GIVEN the List view of the Beads page scrolled 1,200px down
- WHEN the user opens a bead from it and then uses the browser Back button
- THEN the List view shows at 1,200px down

#### Scenario: Last opened card
- GIVEN the Board of the Beads page
- WHEN the user opens the card `a-7` and comes back with the browser Back button
- THEN the card `a-7` has the keyboard focus and is marked as last opened

#### Scenario: Link starts at the top
- GIVEN the Beads page was left scrolled down
- WHEN the user opens it again from the navigation
- THEN it starts at the top

#### Scenario: Storage refused
- GIVEN the browser throws when the position is stored
- WHEN the user comes back with the browser Back button
- THEN the page starts at the top and no error is shown

### REQ-UI-128: Skip link
Every page SHALL start with a link "Skip to content" that is the first element to take the keyboard focus, is visible only while it has the focus, and moves the focus to the main content.

#### Scenario: Skip the navigation
- GIVEN any page has just loaded
- WHEN the user presses Tab and then Enter
- THEN the focus is on the main content and the navigation was skipped

### REQ-UI-129: Report sections in the sidebar
WHILE a Reports page is shown in a window 1024px wide or more with the sidebar expanded, the Main navigation SHALL list the report sections of REQ-UI-095 under the Reports link, each as a link with the section name and its headline, SHALL mark the selected section with `aria-current="page"`, and each link SHALL go to the same URL with `tab` set to its section. WHILE the window is narrower or the sidebar is collapsed, the sidebar SHALL list no sections and the page SHALL show the tab list of REQ-UI-095. The section links SHALL NOT show on other pages.

#### Scenario: Sections in the sidebar
- GIVEN a window 1440px wide, the sidebar expanded and `/reports?project=a&tab=delivery`
- WHEN the page is shown
- THEN the sidebar lists Team, Delivery, Velocity and Quality under Reports with their headlines, Delivery is marked current, and the page shows no tab list

#### Scenario: Change section
- GIVEN the Reports page at `/reports?project=a&days=7&tab=delivery` with sections in the sidebar
- WHEN the user clicks Quality in the sidebar
- THEN the URL becomes `/reports?project=a&days=7&tab=quality` and the Quality panel is shown

#### Scenario: Narrow window
- GIVEN a window 900px wide
- WHEN the Reports page is shown
- THEN the sidebar lists no sections and the page shows its tab list

### REQ-UI-130: Progress whatever the filters
Wherever the frontend shows how many of a bead's children are done (the List row, REQ-UI-044; the Graph node, REQ-UI-049; the bead page, REQ-UI-028; the epic Progress card, REQ-UI-120; the Gantt row, REQ-MILESTONE-UI-013), it SHALL take the numbers from the bead's `child_counts` (REQ-BEADS-022), so that "Show closed" and the other filters SHALL NOT change them.

#### Scenario: Show closed off
- GIVEN epic `e-1` with 5 tracks, 3 of them closed, and "Show closed" off
- WHEN the List view and then the Graph view of the project are shown
- THEN the row of `e-1` and its node each show the strand with "3/5"

#### Scenario: Gantt row
- GIVEN the same epic in a milestone
- WHEN its Gantt row is shown
- THEN its second line shows the strand with "3/5"

### REQ-UI-131: One date format
Type: non-functional
Category: usability
The frontend SHALL write every date as "<d> <Mon>" when it falls in the current year and "<d> <Mon> <yyyy>" otherwise, and every date with a time as "<d> <Mon>, <HH:mm>" or "<d> <Mon> <yyyy>, <HH:mm>", with English month abbreviations and a 24-hour clock in the browser's time zone, never in the browser's locale format; SHALL show a calendar day without a time (such as a milestone's `start` or `end`) as that day in every time zone; SHALL write a range as "<start> – <end>" with the year written once, after the end, when both ends fall in the same year other than the current one, and after each end when their years differ; and SHALL use a time relative to now (such as "3 h ago") only to say how fresh the data is, with the full date and time as its tooltip (REQ-UI-132).

#### Scenario: Current and other years
- GIVEN today is 21 Nov 2026
- WHEN the dates 2026-11-05, 2025-12-01 and the time 2026-05-11T16:00 are shown
- THEN they read "5 Nov", "1 Dec 2025" and "11 May, 16:00"

#### Scenario: Ranges
- GIVEN today is 21 Nov 2026
- WHEN the ranges 2026-11-10 to 2026-12-01, 2025-11-03 to 2025-11-28 and 2026-12-14 to 2027-01-08 are shown
- THEN they read "10 Nov – 1 Dec", "3 Nov – 28 Nov 2025" and "14 Dec 2026 – 8 Jan 2027"

#### Scenario: Calendar day across time zones
- GIVEN a milestone with `end` 2026-12-01 and a browser in the time zone America/Los_Angeles
- WHEN its period is shown
- THEN its end reads "1 Dec"

### REQ-UI-132: Tooltips for marks and counts
WHEN the pointer rests on a state mark (REQ-UI-064), a size or points value, the word Prep or a Prep count, a lane or lane count, a strand (REQ-UI-138), a Gantt verdict (REQ-MILESTONE-UI-024), a comment or dependency indicator (REQ-UI-066), or a count of blocked, done or in-progress beads, and WHEN keyboard focus reaches one of them that takes focus, the frontend SHALL show within 500 ms a tooltip with one sentence that says what it means, and for a count the rule it counts by and the scope it counts in, SHALL tie the tooltip to the element with `aria-describedby`, and SHALL close it on Escape, on blur and when the pointer leaves; the native `title` SHALL remain only for text cut short (REQ-UI-107).

#### Scenario: Blocked count
- GIVEN the Board of `example` whose Blocked column holds 4 beads
- WHEN the pointer rests on the count of that column
- THEN a tooltip reads "Blocked: status blocked, or waiting on an open blocker of its own or of a parent. Prep tasks are counted apart. Counted in this column." and Escape closes it

#### Scenario: Dependency indicator
- GIVEN a bead card with the dependency indicator 2
- WHEN the pointer rests on the indicator
- THEN a tooltip says what the 2 dependencies are, and the indicator has no `title`

### REQ-UI-133: Legend
The Beads page, the milestone page and the Reports page SHALL offer a "Legend" control in their header that, on a click, a tap, Enter or Space, opens a panel listing, each with its look and one sentence, the state glyphs (REQ-UI-064), the strand (REQ-UI-138), the size and points, Prep, lanes, the comment and dependency indicators, on the milestone page the two verdict marks of the Gantt (REQ-MILESTONE-UI-024), and what blocked, done and progress mean; the panel SHALL close on Escape, on a click outside it and on the control, SHALL return focus to the control, and SHALL fit inside a window 360px wide.

#### Scenario: Open and close
- GIVEN the Beads page
- WHEN the user activates "Legend" and then presses Escape
- THEN the panel lists the five state glyphs, the strand and the meaning of blocked, done and progress, and then closes with the focus back on "Legend"

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN the user taps "Legend" on the milestone page
- THEN the panel opens inside the window and the page does not scroll sideways

### REQ-UI-134: Plain labels in PM views
Type: non-functional
Category: usability
The Milestones list, the milestone page and the Reports page SHALL use these words: "Commitment met" for say/do, "Parallel lanes" for the number of lanes, "Not estimated" for unestimated, "days per point" for d/pt, the strand of REQ-UI-138 for the tracks of an epic, "Prep <n>/<m>" for its prep tasks, "Spec approved" and "Spec not approved yet" for the spec of an epic, "unassigned" for beads without an assignee, and "late" only as REQ-MILESTONE-UI-023 defines it; each of these SHALL carry a tooltip (REQ-UI-132) that says what it counts.

#### Scenario: Milestones list
- GIVEN milestone M1 with `velocity.say_do: 0.62` and `lanes: 2`
- WHEN the Milestones list is shown
- THEN its row reads "Commitment met 62%" under the column "Commitment met", and its lanes under the column "Parallel lanes"

#### Scenario: Gantt row
- GIVEN epic `ex-e3` with 5 of 11 tracks closed, 1 of 3 prep tasks closed and a confirmed spec
- WHEN its Gantt row is shown
- THEN its second line shows the strand with "5/11", "Prep 1/3" and "Spec approved"

### REQ-UI-135: The assignee, never the owner
Type: business-rule
Wherever the frontend shows whom a bead is assigned to (the List row, REQ-UI-044; the Board and Focus card, REQ-UI-065; the details panel and the bead page, REQ-UI-028; the Tracks table, REQ-UI-121; the Team bead list, REQ-REPORTS-016), it SHALL show the person (REQ-BEADS-023) of the bead's `assignee`, with the full `assignee` as its tooltip, or "Unassigned" in the muted color when the bead has none, and SHALL never show, group or filter by the `owner` in its place.

#### Scenario: No assignee
- GIVEN a bead with `owner` `lead@example.com` and no `assignee`
- WHEN its List row, Board card and bead page are shown
- THEN each shows "Unassigned" and none shows `lead@example.com` as its assignee

#### Scenario: Email assignee
- GIVEN a bead assigned to `ann@example.com`
- WHEN its List row is shown
- THEN it shows `ann` with the tooltip `ann@example.com`

### REQ-UI-136: Typeface
Type: non-functional
Category: usability
The frontend SHALL set all its text in Recursive, served by the console itself from the font file with the weight and Mono axes only, SHALL draw ids, commands and code in the Mono voice of Recursive (`MONO` 1) and every other text in its Sans voice (`MONO` 0), and SHALL NOT load Geist or Geist Mono.
Source: `assets/2026-11-22/index.html#tokens`, `assets/2026-11-22/tokens-light.png`

#### Scenario: One family, two voices
- GIVEN the built console
- WHEN the Beads page of the `example` project loads
- THEN the body text is set in Recursive with `MONO` 0, every bead id in Recursive with `MONO` 1, and no Geist font file is requested

#### Scenario: Served by the console
- GIVEN a browser with no access to any host but the console
- WHEN a page loads
- THEN its text is drawn in Recursive

### REQ-UI-137: Type scale
Type: non-functional
Category: usability
The frontend SHALL draw text only at 12, 13, 14, 16, 20, 28 and 40px, using 12px for dates, meta lines and secondary facts, 13px for controls, filter labels and ids, 14px for body text and the titles of rows and cards (the base size), 16px for a page's lead sentence and for inputs on a phone, 20px for section and card headings, 28px for page titles and 40px for a headline number, and SHALL draw every number in tabular figures.
Source: `assets/2026-11-22/index.html#tokens`, `assets/2026-11-22/tokens-light.png`

#### Scenario: Sizes on a page
- GIVEN the Beads page of the `example` project
- WHEN it is shown at 1440px
- THEN its page title is 28px, a row title 14px, a row's date 12px and the filter labels 13px

#### Scenario: Numbers line up
- GIVEN the Milestones list with the forecasts "Finishes 1 Dec" and "Finishes 11 Nov"
- WHEN it is shown
- THEN every number on the page uses tabular figures (`font-variant-numeric: tabular-nums`)

#### Scenario: No size outside the scale
- GIVEN the frontend sources
- WHEN the guard test reads them
- THEN no class or style sets a font size outside 12, 13, 14, 16, 20, 28 and 40px

### REQ-UI-138: Progress strand
Wherever the frontend shows how many of a bead's tracks or of a milestone's epics are done (the List row, REQ-UI-044; the Graph node, REQ-UI-049; the bead page, REQ-UI-028; the epic Progress card, REQ-UI-120; the lane header, REQ-UI-112 and REQ-UI-118; the Lanes section, REQ-UI-121; the Milestones list, REQ-MILESTONE-UI-001; the Gantt row, REQ-MILESTONE-UI-013 and REQ-MILESTONE-UI-015; the Team scope, REQ-REPORTS-013), it SHALL draw a strand: a thin thread in the border colour carrying one bead per item, ordered Done, In progress, Blocked, Ready, Deferred, each drawn as the glyph of its state (REQ-UI-064) without the word, and, WHEN there are more than 16 items, one segment per state in place of the beads, its length in proportion to its count and drawn in the look of that state's glyph; and, where the room is narrower than the beads need (the Graph node, the lane box, the lane header and the large strand), it SHALL draw the segmented thread in the room it has; it SHALL follow the strand with "<done>/<total>" in tabular figures, SHALL give it `role="img"` and the accessible name "<done> done, <n> in progress, <n> blocked, <n> ready, <n> deferred of <total> <tracks, epics or beads>" without the states counted 0, SHALL show the same sentence in its tooltip (REQ-UI-132) with what progress means, SHALL take the counts from the bead's `child_counts` (REQ-BEADS-022) or the milestone's `epics` (REQ-MILESTONE-UI-025), SHALL draw nothing WHEN the total is 0, and SHALL show the prep tasks of an epic apart, after the strand, as the text "Prep <closed>/<total>". The strand of the epic Progress card SHALL use beads twice the size and SHALL be followed by "<done> done, <n> in progress, <n> blocked, <n> ready, <n> deferred" without the states counted 0, in place of "<done>/<total>".
Source: `assets/2026-11-22/index.html#tokens`, `assets/2026-11-22/beads-light.png`, `assets/2026-11-22/epic-light.png`

#### Scenario: Epic with seven tracks
- GIVEN epic `e-1` with 7 tracks: 2 closed, 1 in progress, 1 blocked and 3 ready
- WHEN its List row is shown
- THEN the row shows a strand of 7 beads, in order 2 full, 1 half, 1 knot and 3 hollow, followed by "2/7", named "2 done, 1 in progress, 1 blocked, 3 ready of 7 tracks"

#### Scenario: More than 16 tracks
- GIVEN epic `e-2` with 19 tracks: 11 closed, 1 in progress, 6 ready and 1 deferred
- WHEN its List row is shown
- THEN the strand is 4 segments whose lengths are in the ratio 11, 1, 6 and 1, followed by "11/19"

#### Scenario: No track
- GIVEN epic `e-3` without children
- WHEN its List row is shown
- THEN the row shows no strand and no count

#### Scenario: Prep apart
- GIVEN epic `e-4` with tracks `t-1` (closed) and `t-2` (open), and the open prep task `p-1` labelled `prep`
- WHEN its List row is shown
- THEN the row shows a strand of 2 beads, "1/2" and "Prep 0/1"

#### Scenario: Large strand on the epic page
- GIVEN epic `ex-e12` with 8 tracks: 4 closed, 1 in progress, 1 blocked and 2 ready
- WHEN its Overview is shown
- THEN the Progress card shows a strand of 8 large beads followed by "4 done, 1 in progress, 1 blocked, 2 ready"

#### Scenario: Narrow node
- GIVEN epic `e-5` with 12 tracks, 3 closed
- WHEN its Graph node is drawn
- THEN the node shows the segmented thread and "3/12" in full

### REQ-UI-139: Plain text style
The frontend SHALL NOT set a label, heading or value in capitals by style (`text-transform: uppercase`), an initial in an avatar being written in capitals by the code; SHALL NOT join facts in the text of a page with a middle dot " · ", but SHALL use a comma, separate elements with space between them, or words, the document title of REQ-UI-063 being the only exception; SHALL NOT underline a link that names a place or a thing (a sidebar item, a breadcrumb item, a tab, the title or id of a row, card, node or table cell), at rest or on hover, and SHALL mark it on hover with the identity colour (REQ-UI-141); and SHALL underline a link inside a sentence (Markdown text, a notice, an empty state) with a thin line in the identity colour at half strength.
Source: `assets/2026-11-22/beads-light.png`, `assets/2026-11-22/index.html#beads`

#### Scenario: No capitals by style
- GIVEN the filter sheet of the Beads page at 390px
- WHEN it is opened
- THEN its section labels read "Status", "Priority" and "Labels", each in sentence case

#### Scenario: No middle dots
- GIVEN the Beads, bead, My Tasks, Milestones, milestone and Reports pages of the `example` project
- WHEN they are shown
- THEN no text on them contains " · ", and the browser tab of the Beads page still reads "Beads · example · gin-console"

#### Scenario: Navigation links
- GIVEN the bead page of `ex-e12` opened from the Beads List
- WHEN the pointer rests on the breadcrumb link "Beads"
- THEN the link is not underlined and its text takes the identity colour

#### Scenario: Link in a sentence
- GIVEN a bead whose description contains `[docs](https://example.com)`
- WHEN its page loads
- THEN "docs" is underlined with a thin line in the identity colour

### REQ-UI-140: Data as text
Pills and chips SHALL be used only for controls (a filter chip, a toggle, a segmented control); on a List or Tree row, a Board or Focus card, a Graph node, a Gantt row, a table row and the line of facts of the bead page, the frontend SHALL show data as text without a border or a tint: the priority as `P<n>`, bold in the text colour for P0 and P1 and in the muted colour otherwise; the type as REQ-UI-067 describes; the kind, size, labels, capabilities and Prep, and a status or an "On time" figure, as plain words in the muted colour, or in the warning colour where a requirement gives them that colour; the comment and dependency indicators as an icon and a number; and a lane as a dot followed by its name (REQ-UI-115).
Source: `assets/2026-11-22/beads-light.png`, `assets/2026-11-22/index.html#beads`

#### Scenario: List row without chips
- GIVEN a blocked P1 bug `b-1` assigned to alice with the labels `area:backend` and `ui`, the lane `be` and 2 comments
- WHEN the List view is shown at 1440px
- THEN the row shows "bug" in the bug colour, "P1" bold, "area:backend", "ui", a muted dot and "be", and a comment icon with 2, and none of them has a border or a background

#### Scenario: Board card without chips
- GIVEN an in-progress P2 epic with `points: 8` and the kind `technical`
- WHEN its Board card is shown
- THEN it shows "P2" in the muted colour, "Technical" and "8 pt" as text, and no pill

#### Scenario: Table row
- GIVEN a blocked bead assigned to me
- WHEN the My Tasks page is shown
- THEN its row shows its state "Blocked" as text, without a border or a tint

#### Scenario: Controls keep their pills
- GIVEN the Beads page with the status filter "Open"
- WHEN it is shown
- THEN the Status filter control shows its count "1" in a tinted pill

### REQ-UI-141: Identity colour in the shell
The frontend SHALL use the identity colour (REQ-UI-059) for where the user is and what the user can do, and for nothing else: the current sidebar item (a 3px bar on its left edge and its icon), the underline of the selected tab, the selected row, card or node (a pale identity wash with a 3px bar inside its left edge), an active filter chip, the primary button, the focus ring and the today line of a chart; and SHALL show before the name "gin-console" in the sidebar a mark of three beads (Done, In progress and Ready) on a thread in the identity colour.
Source: `assets/2026-11-22/beads-light.png`, `assets/2026-11-22/index.html#beads`

#### Scenario: Current place
- GIVEN the Beads page of the `example` project with bead `ex-e3` selected in the List
- WHEN it is shown at 1440px
- THEN the Beads sidebar item has a bar on its left edge and its icon in the identity colour, and the row of `ex-e3` has the identity wash and a bar inside its left edge

#### Scenario: Focus
- GIVEN any page
- WHEN the keyboard focus reaches a link
- THEN its focus ring is drawn in the identity colour

#### Scenario: Brand mark
- GIVEN any page at 1440px with the sidebar expanded
- WHEN it is shown
- THEN the sidebar header shows three beads on a thread before "gin-console"
