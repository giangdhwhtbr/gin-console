# Ui

## Purpose

## Requirements

### REQ-UI-001: Projects page
WHEN the Projects page loads, the frontend SHALL list every project from `/api/projects` with its name and path, and SHALL mark each project whose `exists` is false with a "missing" badge.

#### Scenario: List with a missing project
- GIVEN `/api/projects` returns one existing and one missing project
- WHEN the Projects page loads
- THEN both rows show name and path, and only the missing one shows a "missing" badge

#### Scenario: No projects
- GIVEN `/api/projects` returns an empty list
- WHEN the Projects page loads
- THEN the page says no projects are configured and names the config file

### REQ-UI-002: API error with retry
IF the request to `/api/projects` fails, THEN the Projects page SHALL show an error message and a retry button that repeats the request.

#### Scenario: Failure then retry
- GIVEN the first request to `/api/projects` fails and the second succeeds
- WHEN the user clicks retry
- THEN the error disappears and the project list is shown

### REQ-UI-003: Workflow state display
The Projects page SHALL show, for each project with `workflow` data, the `stage` and one chip per gate whose text names the gate and its state.

#### Scenario: Stage and gates
- GIVEN a project with stage `plan` and gate `requirement_confirmed` satisfied
- WHEN the Projects page loads
- THEN the project's card shows `plan` and a chip naming `requirement_confirmed` as satisfied

### REQ-UI-004: Beads summary display
The Projects page SHALL show, for each project with `beads` data, the counts open, in progress, blocked and ready, and the active epics as `id` and `title`, or a "no active epics" note when the list is empty.

#### Scenario: Counts and epics
- GIVEN a project with the counts 3, 1, 0, 2 and one active epic
- WHEN the Projects page loads
- THEN the card shows all four counts and the epic id and title

### REQ-UI-005: Project links
The Projects page SHALL link each project name to that project's Beads page `/beads?project=<name>` inside the console, in the same tab and without an external address, and SHALL link each active epic to the bead page `/beads/<project>/<id>`.

#### Scenario: Project name opens its beads
- GIVEN a project named `qwikfone`
- WHEN the Projects page loads
- THEN the name links to `/beads?project=qwikfone`, without `target` and without an external address

#### Scenario: Name needing encoding
- GIVEN a project named `a b`
- WHEN the Projects page loads
- THEN the name links to `/beads?project=a%20b`

#### Scenario: Epics open the console's bead page
- GIVEN a project named `scotty` with active epic `scotty-1`
- WHEN the Projects page loads
- THEN the epic links to `/beads/scotty/scotty-1` inside the console

### REQ-UI-006: Automatic refresh
WHILE the page is visible, the Projects page SHALL reload `/api/projects` every 10 seconds without replacing the list by a loading state, and WHILE the page is hidden it SHALL not poll and SHALL reload when it becomes visible; IF a refresh fails, THEN it SHALL keep the last data and show the error with a retry button.

#### Scenario: Silent refresh
- GIVEN the list is shown and 10 seconds pass
- WHEN the page reloads the data
- THEN the list stays on screen and shows the new values

#### Scenario: Hidden tab
- GIVEN the tab becomes hidden
- WHEN 10 seconds pass
- THEN no request is made, and one request is made when the tab becomes visible

#### Scenario: Refresh failure
- GIVEN the list is shown and the next refresh fails
- WHEN the failure is received
- THEN the old list stays visible with an error message and a retry button

### REQ-UI-007: Per-block error display
IF a project's `workflow` or `beads` is an object with `error`, THEN the Projects page SHALL show that message in place of that block and SHALL still show the other block.

#### Scenario: Beads error
- GIVEN a project whose `beads` is `{"error": "bd not found"}` and whose `workflow` has data
- WHEN the Projects page loads
- THEN the card shows `bd not found` and the workflow stage

### REQ-UI-008: Sessions navigation
The "Main" navigation SHALL contain a "Sessions" link, and the frontend SHALL show the Projects page at `/`, the session list at `/sessions` and the session log at `/sessions/<project>/<id>`, changing page without a full reload and following the browser back and forward buttons.

#### Scenario: Open the list
- GIVEN the Projects page is shown
- WHEN the user clicks "Sessions"
- THEN the URL is `/sessions` and the session list is shown without a reload

#### Scenario: Back button
- GIVEN the user opened a session log from the list
- WHEN the user presses back
- THEN the session list is shown

### REQ-UI-009: Session list display
The session list SHALL show for each session its title, project, cwd, last-modified time, size and a "live" badge with the status and kind when live, SHALL offer a project filter kept in the `?project=` query, and WHEN the list is empty SHALL say that no sessions were found.

#### Scenario: Row content
- GIVEN a live session and an ended session
- WHEN the list loads
- THEN both rows show title, project and cwd, and only the live one shows the "live" badge with its status

#### Scenario: Filter
- GIVEN sessions of two projects
- WHEN the user selects one project
- THEN only its sessions are shown and the URL contains `?project=<name>`

### REQ-UI-010: Session list refresh
WHILE the page is visible, the session list SHALL reload every 10 seconds without replacing the list by a loading state, WHILE the page is hidden it SHALL not poll and SHALL reload when it becomes visible, and IF a refresh fails, THEN it SHALL keep the last data and show the error with a retry button.

#### Scenario: Silent refresh
- GIVEN the list is shown and 10 seconds pass
- WHEN the list reloads
- THEN the list stays on screen and shows the new values

#### Scenario: Refresh failure
- GIVEN the list is shown and the next refresh fails
- WHEN the failure is received
- THEN the old list stays visible with an error message and a retry button

### REQ-UI-011: Copy resume command
WHEN the user clicks "Copy resume" on a session, the frontend SHALL copy its `resume_command` to the clipboard and show "Copied", and IF the clipboard is unavailable or refuses, THEN it SHALL show the command in a selectable field.

#### Scenario: Copy
- GIVEN the clipboard is available
- WHEN the user clicks "Copy resume"
- THEN the command is written to the clipboard and "Copied" is shown

#### Scenario: Clipboard refused
- GIVEN the clipboard write is rejected
- WHEN the user clicks "Copy resume"
- THEN the command is shown in a selectable field

### REQ-UI-012: Session log view
The session log page SHALL show the session title, cwd and a copy-resume button, and the messages in order with their role, where `text` blocks are plain text with line breaks and `thinking`, `tool_use` and `tool_result` blocks are collapsed `<details>` elements that show the tool name or kind on their summary line, and a block marked `truncated` SHALL say so.

#### Scenario: Collapsed tool call
- GIVEN an assistant message with a text block and a tool_use block
- WHEN the log loads
- THEN the text is visible and the tool_use is a closed details element naming the tool

#### Scenario: Text is not interpreted
- GIVEN a message whose text contains `<script>` and Markdown
- WHEN the log loads
- THEN the characters are shown as typed and no element is created from them

### REQ-UI-013: Load more and refresh
WHEN the server returns a non-null `next_offset`, the log page SHALL show a "Load more" button that appends the next page, and WHEN the session is live the page SHALL show a "Refresh" button that appends the records written after the last offset read.

#### Scenario: Load more
- GIVEN the first page returned a `next_offset`
- WHEN the user clicks "Load more"
- THEN the next page is appended and the button disappears when `next_offset` is null

#### Scenario: Refresh a live session
- GIVEN a live session whose transcript grew
- WHEN the user clicks "Refresh"
- THEN the new messages are appended

### REQ-UI-014: Session errors
IF the session list or a log page request fails, THEN the page SHALL show an error and a retry button that repeats the request, and IF the server answers 404 for a log, THEN the page SHALL say "Session not found" with a link back to the list.

#### Scenario: List error
- GIVEN the first list request fails and the second succeeds
- WHEN the user clicks retry
- THEN the error disappears and the list is shown

#### Scenario: Unknown session
- GIVEN the server answers 404 for a session
- WHEN the log page loads
- THEN it says "Session not found" and links back to the list

### REQ-UI-015: Quota navigation
The "Main" navigation SHALL contain a "Quota" link and the frontend SHALL show the quota page at `/quota` without a full reload, following the browser back and forward buttons.

#### Scenario: Open the page
- GIVEN the Projects page is shown
- WHEN the user clicks "Quota"
- THEN the URL is `/quota` and the quota page is shown without a reload

### REQ-UI-016: Quota strip on the Projects page
The Projects page SHALL show above its list a strip with one status badge for Claude and one for Codex, each a text status of ok, near the limit, limited, no data, or error, with the highest percentage used when known, linking to `/quota`, and a failure to load the quota SHALL NOT remove or break the project list.

#### Scenario: Strip content
- GIVEN the quota loads with Claude at 41 and 25 percent and Codex at 16 percent
- WHEN the Projects page is shown
- THEN the strip shows Claude "ok 41%" and Codex "ok 16%", both linking to `/quota`

#### Scenario: Quota fails
- GIVEN the quota request fails
- WHEN the Projects page is shown
- THEN the strip shows an error note and the project list is still shown

### REQ-UI-017: Quota status rules
The frontend SHALL derive a harness status from its highest `used_percent`: limited at 100 or more, near the limit at 80 or more, ok below 80; limited also when Codex reports `ordinary_usage_allowed` false; no data when it has no window; and error when its side is an error object.

#### Scenario: Thresholds
- GIVEN highest percentages of 79, 80 and 100
- WHEN the status is shown
- THEN they read ok, near the limit and limited

#### Scenario: Codex blocked
- GIVEN Codex has `ordinary_usage_allowed` false and a window at 60 percent
- WHEN the status is shown
- THEN it reads limited

#### Scenario: No window
- GIVEN Codex has no window
- WHEN the status is shown
- THEN it reads no data

#### Scenario: Error side
- GIVEN `claude` is an error object
- WHEN the status is shown
- THEN it reads error

### REQ-UI-018: Claude quota card
The quota page SHALL show a Claude card with, for each window, its label, a progress bar with its percentage used, and its reset time in local time and in UTC, together with how long ago the usage was fetched and a "Refresh" button that requests a forced refresh and is disabled while a request is pending, and for an error that carries `raw` text SHALL show that text in a collapsed section.

#### Scenario: Windows
- GIVEN windows "session" at 41 percent and "week (all models)" at 25 percent
- WHEN the page is shown
- THEN each shows its progress bar, percentage, and reset time in local time and UTC

#### Scenario: Fetched age
- GIVEN `fetched_at` is 3 minutes ago
- WHEN the page is shown
- THEN the card says it was updated 3 minutes ago

#### Scenario: Forced refresh
- GIVEN the page is shown
- WHEN the user clicks "Refresh"
- THEN a request with `refresh=1` is sent and the button is disabled until it completes

#### Scenario: Not understood
- GIVEN `claude` is an error with `raw` text
- WHEN the page is shown
- THEN the error message is shown and the raw text is in a closed details element

### REQ-UI-019: Codex quota card
The quota page SHALL show a Codex card with the plan, for each window its length in hours or days, its percentage used with a progress bar and its reset time in local time and UTC, the number of available reset credits, a message when a limit has been reached, and how long ago the data was fetched.

#### Scenario: One window
- GIVEN plan "free" with a 43 200-minute window at 0 percent and two reset credits
- WHEN the page is shown
- THEN the card shows "free", a 30-day window at 0 percent with its reset time, and "2 reset credits available"

#### Scenario: Two windows
- GIVEN a 300-minute window at 16 percent and a 10 080-minute window at 40 percent
- WHEN the page is shown
- THEN they read "5 hours" at 16 percent and "7 days" at 40 percent

#### Scenario: Limit reached
- GIVEN `ordinary_usage_allowed` is false and `rate_limit_reached_type` is "rate_limit_reached"
- WHEN the page is shown
- THEN the card says the limit has been reached

#### Scenario: No window
- GIVEN Codex reported no window
- WHEN the page is shown
- THEN the card says there is no rate-limit window

### REQ-UI-020: Quota refresh
WHILE the page is visible, the quota SHALL reload every 60 seconds without replacing what is shown by a loading state, WHILE the page is hidden it SHALL not poll and SHALL reload when visible again, the strip and the quota page SHALL share one request, and IF a refresh fails, THEN the last data SHALL stay with the error and a retry button.

#### Scenario: Silent refresh
- GIVEN the quota is shown and 60 seconds pass
- WHEN it reloads
- THEN the page stays on screen and shows the new values

#### Scenario: Hidden tab
- GIVEN the tab becomes hidden
- WHEN 60 seconds pass
- THEN no request is made, and one request is made when the tab becomes visible

#### Scenario: Refresh failure
- GIVEN the quota is shown and the next refresh fails
- WHEN the failure is received
- THEN the old values stay visible with an error message and a retry button

### REQ-UI-021: Quota errors
IF a side of the quota is an `{error}` object, THEN the page SHALL show its message in that side's card and still show the other card, and IF the request fails or the response has an unexpected shape, THEN the page SHALL show an error and a retry button that repeats the request.

#### Scenario: One side errors
- GIVEN `codex` is `{"error": "codex not found"}` and `claude` has windows
- WHEN the page is shown
- THEN the Codex card shows "codex not found" and the Claude card shows its windows

#### Scenario: Unexpected response
- GIVEN the response is not the expected shape
- WHEN the page loads
- THEN an error and a retry button are shown, not a blank page

### REQ-UI-022: Beads navigation
The "Main" navigation SHALL contain a "Beads" link, and the frontend SHALL show the bead list at `/beads` and a bead at `/beads/<project>/<id>` without a full reload, following the browser back and forward buttons, and a route segment that cannot be decoded SHALL show the Projects page.

#### Scenario: Open the list
- GIVEN the Projects page is shown
- WHEN the user clicks "Beads"
- THEN the URL is `/beads` and the bead list is shown without a reload

#### Scenario: Back button
- GIVEN the user opened a bead from the list
- WHEN the user presses back
- THEN the list is shown with the same filters

### REQ-UI-023: Project choice
The bead list SHALL offer the configured projects whose directory exists in a select kept in the `?project=` query, SHALL default to the first of them, and WHEN no project exists SHALL say that no projects are configured.

#### Scenario: Default and choice
- GIVEN two projects
- WHEN the list opens without `?project=`
- THEN the first project is selected and its beads are shown, and choosing the other changes the URL and the list

#### Scenario: No projects
- GIVEN `/api/projects` returns an empty list
- WHEN the list opens
- THEN it says no projects are configured

### REQ-UI-024: Bead list
The bead list SHALL show for each bead its id, a title linking to the bead, its type, status, priority written as `P<n>`, labels, assignee or owner, and last update, ordered by priority and then by last update, newest first, and SHALL show how many of the loaded beads match the current search and filters.

#### Scenario: Row content and order
- GIVEN a P2 bead updated yesterday and a P1 bead updated last week
- WHEN the list loads
- THEN the P1 bead is first, and both show id, title, type, status, `P<n>`, labels and update time

#### Scenario: Count
- GIVEN 83 loaded beads of which 5 match the filters
- WHEN the list is shown
- THEN it says 5 of 83

#### Scenario: Empty
- GIVEN no bead matches
- WHEN the list is shown
- THEN it says no beads match

### REQ-UI-025: Search and filters
The bead list SHALL offer a search box that matches the id, title and labels case-insensitively, and filters for status, priority, label and type, SHALL combine them with AND, and SHALL keep them in the URL query (`q`, `status`, `priority`, `label`, `type`) so that a reload or a shared link restores them.

#### Scenario: Search
- GIVEN beads titled "Fix login" and "Add search"
- WHEN the user types "LOGIN"
- THEN only "Fix login" remains

#### Scenario: Combined filters
- GIVEN open P1 beads and in-progress P1 beads
- WHEN the user filters status "open" and priority "P1"
- THEN only open P1 beads remain and the URL holds both filters

#### Scenario: Restored from the URL
- GIVEN the URL has `?project=a&status=open&q=fix`
- WHEN the page loads
- THEN the filters are applied and shown in their controls

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
The bead page SHALL show the bead's id, title, status, priority, type, labels, owner, assignee, creation and update times and comment count, its description as plain text with line breaks, its dependencies and the beads it blocks (each with id, title and status, linking to that bead in the same project), and for an epic its children with a progress bar of closed children over all children.

#### Scenario: Fields and description
- GIVEN a bead with a description containing `<script>` and Markdown
- WHEN the page loads
- THEN the characters are shown as typed and no element is created from them

#### Scenario: Relations link inside the console
- GIVEN a bead with one dependency
- WHEN the page loads
- THEN the dependency shows its id, title and status and links to `/beads/<project>/<its id>`

#### Scenario: Epic progress
- GIVEN an epic with 4 children of which 3 are closed
- WHEN the page loads
- THEN the children are listed and a progress bar reads 3 of 4

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

### REQ-UI-031: Board columns
The Board view SHALL show the columns Backlog (status `deferred`), Ready (`ready`), In Progress (status `in_progress` or `hooked`), Blocked (`blocked`) and Done (status `closed`), each with its number of beads, SHALL put a bead in the first of those columns that fits, SHALL leave out of the Board any bead that fits none, SHALL order a column by priority and then by last update, newest first, and SHALL show each bead as a card as REQ-UI-065 describes.

#### Scenario: Placement
- GIVEN a deferred bead, a ready bead, an in-progress bead, a blocked bead and a closed bead
- WHEN the Board is shown with closed beads
- THEN each is in its own column and each column says 1

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
The Focus view SHALL show the columns In flight (status `in_progress` or `hooked`), Blocked (`blocked`) and Next up (`ready` with priority P0 or P1), each with its count, SHALL put a bead in the first of those columns that fits, SHALL not cap In flight or Blocked, and SHALL order each by priority and then by last update, newest first.

#### Scenario: Columns
- GIVEN an in-progress bead, a blocked bead, a ready P1 bead and a ready P3 bead
- WHEN the Focus view is shown
- THEN In flight, Blocked and Next up each hold one bead and the P3 bead is in no column

#### Scenario: In progress and blocked
- GIVEN an in-progress bead that `bd blocked` also lists
- WHEN the Focus view is shown
- THEN it is in In flight only

### REQ-UI-034: Group by assignee
WHERE the user chooses Group by "Assignee" (kept in the URL as `group=assignee`), the Focus view SHALL show one row per assignee that has a bead in the three columns, with those columns inside it, ordered by assignee name, SHALL put beads without an assignee in a last row "No assignee" (shown only when it has beads), and SHALL show the original columns again for "None".

#### Scenario: Rows
- GIVEN beads assigned to bob, to alice and to nobody
- WHEN the user groups by assignee
- THEN the rows are alice, bob and "No assignee"

#### Scenario: Back to none
- GIVEN the Focus view is grouped
- WHEN the user chooses "None"
- THEN the ungrouped columns return and the URL has no `group`

### REQ-UI-035: Recently finished
WHERE the user turns on "Recently finished" (kept in the URL as `finished=1`), the Focus view SHALL add a column with the 7 most recently closed beads that match the current search, filters and lane, newest first, SHALL say how many are shown out of how many match, and SHALL offer "Show all N completed" and "Show latest 7".

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

### REQ-UI-036: Lane
The Board and Focus views SHALL offer a "Lane" select listing every label of the loaded beads and "All", kept in the URL as `lane`, and SHALL show only the beads that carry the chosen label, applied together with search and filters.

#### Scenario: Lane
- GIVEN beads labelled "frontend" and "backend"
- WHEN the user chooses the lane "frontend"
- THEN only the "frontend" beads remain on the Board and in Focus, and the URL has `lane=frontend`

#### Scenario: Unknown lane
- GIVEN the URL has `lane=gone` and no bead has that label
- WHEN the page loads
- THEN the views are empty and the lane select still shows "gone" so that the user can clear it

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
The bead page SHALL show "Created by" with the `created_by` name, and SHALL show the sections Acceptance criteria, Design, Notes and Close reason in that order, each only when it has content, as plain text with line breaks.

#### Scenario: Sections with content
- GIVEN a bead with acceptance criteria, notes and a close reason but no design
- WHEN the bead page is shown
- THEN it shows "Created by", Acceptance criteria, Notes and Close reason in that order and no Design section

#### Scenario: Plain text
- GIVEN a design containing `<script>x</script>` and `**bold**`
- WHEN the bead page is shown
- THEN both appear as text and no `script` or `strong` element exists

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

### REQ-UI-055: Main navigation
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Projects (`/`), Beads (`/beads`), Sessions (`/sessions`) and Quota (`/quota`).

#### Scenario: Four links
- GIVEN any page is shown
- WHEN the page loads
- THEN the "Main" navigation holds the links Projects, Beads, Sessions and Quota, one each

### REQ-UI-056: Responsive navigation
The "Main" navigation SHALL be a tab bar fixed to the bottom of the screen with an icon and a label per link while the window is narrower than 768px, an icon rail with a label under each icon from 768px up to 1023px, and a sidebar with an icon and a label per link from 1024px, and SHALL be the same element in every case.

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN any page is shown
- THEN the navigation is a bar at the bottom of the screen and the page content is not hidden behind it

#### Scenario: Tablet
- GIVEN a window 820px wide
- WHEN any page is shown
- THEN the navigation is a narrow column at the left with the label under each icon

#### Scenario: Laptop
- GIVEN a window 1280px wide
- WHEN any page is shown
- THEN the navigation is a sidebar at the left with the label beside each icon

### REQ-UI-057: Current destination
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight, treating `/beads`, `/beads/<project>/<id>` as Beads and `/sessions`, `/sessions/<project>/<id>` as Sessions, and SHALL mark no other link.

#### Scenario: Bead page
- GIVEN the URL is `/beads/alpha/a-1`
- WHEN the page loads
- THEN only the Beads link has `aria-current="page"`

#### Scenario: Change page
- GIVEN the Projects page is shown
- WHEN the user clicks "Quota"
- THEN only the Quota link has `aria-current="page"`

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
The frontend SHALL use a neutral cool palette whose only hues are the five status colours Ready, In progress, Blocked, Done and Deferred and the three type colours of REQ-UI-067 (epic, bug, feature), defined for light and dark, SHALL show text, status colours and type colours with a contrast of at least 4.5:1 against every surface (background, card and muted) they are drawn on, SHALL draw the outline of inputs, selects and other controls with at least 3:1 against their surface (separators and card borders are decoration and are not held to this), and SHALL show priority with weight and the danger colour for P0 only, never with a further hue.

#### Scenario: Status colours exist in both themes
- GIVEN the light theme and then the dark theme
- WHEN a page uses a status colour
- THEN the colour is the one defined for that theme

#### Scenario: Type colours exist in both themes
- GIVEN the light theme and then the dark theme
- WHEN a page shows the badge of an epic, a bug or a feature
- THEN the colour is the one defined for that theme

#### Scenario: Contrast
- GIVEN the palette of a theme
- WHEN text, status colours, type colours and control outlines are measured against the surfaces they sit on
- THEN text, status colours and type colours are at least 4.5:1 and control outlines at least 3:1

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

#### Scenario: Long path
- GIVEN a project with a long directory name on the Projects page
- WHEN the page is shown at 360px
- THEN the name wraps or is cut and the page does not scroll sideways

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
The frontend SHALL set the document title to `gin-console`.

#### Scenario: Title
- GIVEN any page is shown
- WHEN the page loads
- THEN the document title is `gin-console`

### REQ-UI-064: State mark
Every bead card of the Board and Focus views SHALL show the state of the bead as an icon with its name (Ready, In progress, Blocked, Done or Deferred, by the rules of REQ-UI-049) and SHALL draw a 4px edge on the left of the card in the colour of that state, the bead list and the Tree view SHALL show the same icon and name for the state, and the graph node SHALL use the same icon, name and colour.

#### Scenario: Blocked card
- GIVEN a blocked bead
- WHEN the Board is shown
- THEN its card shows "Blocked" with its icon and the left edge in the Blocked colour

#### Scenario: Same state, same mark
- GIVEN an in-progress bead shown on the Board, in the list, in the Tree and in the graph
- WHEN each view is shown
- THEN each shows "In progress" with the same icon and the same colour

#### Scenario: Edge only on cards
- GIVEN the list is shown
- WHEN a row is drawn
- THEN the row shows the state icon and name and has no coloured left edge

### REQ-UI-065: Card anatomy
A bead card of the Board and Focus views SHALL show on its first line the id in the monospace face and `P<n>`, below it the title as a link to `/beads/<project>/<id>`, and on its last line the state mark of REQ-UI-064, the type badge of REQ-UI-067, the indicators of REQ-UI-066 and the assignee when there is one.

#### Scenario: Full card
- GIVEN a ready P1 task assigned to alice with 2 comments and 1 dependency
- WHEN its card is shown
- THEN it shows the id and `P1`, the title link, "Ready", the type "task", a comment indicator 2, a dependency indicator 1 and alice

#### Scenario: Bare card
- GIVEN a bead with no assignee, no comments and no dependencies
- WHEN its card is shown
- THEN the last line shows only the state and the type

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

### REQ-UI-067: Type badge
The frontend SHALL show the type of a bead as a pill that always contains the type's name, in purple for `epic`, red for `bug` and pink for `feature` with a tint of the same colour behind the text and neutral for every other type, on the Board and Focus cards, the list rows, the Tree rows and the header of the bead page.

#### Scenario: Colours by type
- GIVEN an epic, a bug, a feature and a task
- WHEN their cards are shown
- THEN the pills read "epic", "bug", "feature" and "task" and the first three are coloured and the task one is neutral

#### Scenario: Never colour alone
- GIVEN any bead
- WHEN its type badge is shown
- THEN the type's name is in the badge as text

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
