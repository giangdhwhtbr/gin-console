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
The frontend SHALL show the Projects page at `/`, the session list at `/sessions` and the session log at `/sessions/<project>/<id>`, changing page without a full reload and following the browser back and forward buttons, while the "Main" navigation holds no Sessions link.

#### Scenario: Open the list by URL
- GIVEN the Projects page is shown
- WHEN the user opens `/sessions`
- THEN the session list is shown and the "Main" navigation has no "Sessions" link

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
The bead list SHALL offer a search box that matches the id, title and labels case-insensitively, and filters for status, priority, label, type, assignee and sprint, SHALL combine distinct filter categories with AND, SHALL serialize multi-select filters (`status`, `priority`, `label`, `assignee`) as comma-separated values in the URL query (`q`, `status`, `priority`, `label`, `label_mode`, `type`, `assignee`, `sprint`), and SHALL restore them on page load.

#### Scenario: Search
- GIVEN beads titled "Fix login" and "Add search"
- WHEN the user types "LOGIN"
- THEN only "Fix login" remains

#### Scenario: Multi-select combined filters
- GIVEN open P1 beads, in-progress P1 beads, and closed P2 beads
- WHEN the user filters status "open,in_progress" and priority "1"
- THEN only open and in-progress P1 beads remain and the URL query contains `status=open,in_progress&priority=1`

#### Scenario: Restored from the URL
- GIVEN the URL query has `?status=open,in_progress&priority=0,1&assignee=alice%40example.com&sprint=sprint-1`
- WHEN the page loads
- THEN the multi-select filters are restored and applied to the view

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
WHEN a search or a filter is active, the List view SHALL show only the beads that match them together with their ancestors in the hierarchy, with every branch that leads to a match open, and SHALL leave out closed beads unless "Show closed" is on or a sprint filter is active.

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

### REQ-UI-044: List rows
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

### REQ-UI-050: Outside beads and cycles
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

### REQ-UI-051: Selection and path
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

### REQ-UI-054: Graph accessibility
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

### REQ-UI-055: Main navigation
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Projects (`/`), Beads (`/beads`), Milestones (`/milestones`), Reports (`/reports`) and Quota (`/quota`), in that order.

#### Scenario: Five links
- GIVEN any page is shown
- WHEN the page loads
- THEN the "Main" navigation holds the links Projects, Beads, Milestones, Reports and Quota, one each, and no Sessions link

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
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight, treating `/beads`, `/beads/<project>/<id>` as Beads, `/milestones`, `/milestones/<project>/<id>` as Milestones and `/reports` as Reports, SHALL mark no link on `/sessions` and `/sessions/<project>/<id>`, and SHALL mark no other link.

#### Scenario: Bead page
- GIVEN the URL is `/beads/alpha/a-1`
- WHEN the page loads
- THEN only the Beads link has `aria-current="page"`

#### Scenario: Milestone page
- GIVEN the URL is `/milestones/alpha/m-1`
- WHEN the page loads
- THEN only the Milestones link has `aria-current="page"`

#### Scenario: Reports page
- GIVEN the URL is `/reports?project=alpha`
- WHEN the page loads
- THEN only the Reports link has `aria-current="page"`

#### Scenario: Session page
- GIVEN the URL is `/sessions/alpha/s-1`
- WHEN the page loads
- THEN no link has `aria-current="page"`

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

### REQ-UI-072: Breadcrumb
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of the link "Beads" followed by the name of the view of the remembered place (REQ-UI-073) and, when a search, a status, priority, label, type, assignee or sprint filter or "Show closed" is active, "· N filters" where N counts them, all as one link to the remembered place, then the parent of the bead as a link to its page when it has one, then the id of the bead marked `aria-current="page"`, or, on a Dependencies page, after the link to the remembered place, "Dependencies" as a link to the project page, then every ancestor of the scope bead from the top as a link to its Dependencies page, then the id of the scope bead, with the last item marked `aria-current="page"`, and under 640px SHALL show only the first link.

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
The Dependencies page SHALL draw closed beads whatever "Show closed" of the Beads page says, SHALL offer a switch "Hide done", off at first, that leaves out the closed beads and the arrows to them, and SHALL drop a lifted arrow between two open nodes when the underlying relation has a closed end.

#### Scenario: Closed epic
- GIVEN a closed epic whose tasks are all closed and "Show closed" off on the Beads page
- WHEN its Dependencies page is shown
- THEN all its tasks are drawn as Done

#### Scenario: Hide done
- GIVEN an epic with a closed task `a` and an open task `b` blocked by `a`
- WHEN the user turns on "Hide done"
- THEN `a` and the arrow from it are not drawn, and `b` is

#### Scenario: Lifted arrow with closed end
- GIVEN open epics `e-1` and `e-2`, where task `b` under `e-2` is blocked by closed task `a` under `e-1`
- WHEN the user turns on "Hide done"
- THEN `e-1` and `e-2` are drawn, but the lifted arrow between them is not drawn

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

### REQ-UI-082: Assignee filter
The bead filter bar SHALL offer an "Assignee" multi-select filter listing "Unassigned" (when any loaded bead has no assignee) and every unique assignee of the loaded beads sorted alphabetically, kept in the URL query as comma-separated `assignee`, and SHALL show only beads whose assignee matches at least one selected assignee (or beads without an assignee when "Unassigned" is selected); when no assignee is selected, beads of all assignees SHALL be displayed.

#### Scenario: Filter by multiple assignees
- GIVEN beads assigned to "alice@example.com", "bob@example.com", and "carol@example.com"
- WHEN the user selects assignees "alice@example.com" and "bob@example.com"
- THEN only beads assigned to Alice or Bob remain visible and the URL query contains `assignee=alice%40example.com,bob%40example.com`

#### Scenario: Filter unassigned beads
- GIVEN beads assigned to "alice@example.com" and beads without an assignee
- WHEN the user selects assignee "Unassigned"
- THEN only beads without an assignee remain visible and the URL query contains `assignee=unassigned`

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

### REQ-UI-086: Bugs and reopens on the bead page
The bead page and the List detail panel SHALL list under "Bugs found" the `bugs` of the bead (each with id, title and status, linking to that bead in the same project) and show nothing when there are none, SHALL request the reopens of REQ-BEADS-011 after the bead is shown and, when the count is above 0, add "Reopened 1 time" or "Reopened N times" to the line with the creation and update times, SHALL show nothing about reopens while they load or when the count is 0, IF the reopens request fails or its answer has an unexpected shape, THEN SHALL show "Reopens unavailable" with the error and a Retry button that repeats only that request while the rest of the page stays shown, and a late reopens answer for a bead that is no longer shown SHALL NOT be shown for the bead now shown.

#### Scenario: bugs found
- GIVEN a bead with an open bug and a closed bug that each have a `discovered-from` dependency on it
- WHEN the bead page is shown
- THEN "Bugs found" lists both with their id, title and status, each linking to `/beads/<project>/<its id>`

#### Scenario: no bugs
- GIVEN a bead whose `bugs` is empty
- WHEN the bead page is shown
- THEN there is no "Bugs found" section

#### Scenario: reopened
- GIVEN a bead whose reopens answer is `{"reopens": 2}`
- WHEN the bead page is shown
- THEN the line with the creation and update times includes "Reopened 2 times"

#### Scenario: not reopened or still loading
- GIVEN a bead whose reopens answer is `{"reopens": 0}`, or has not arrived yet
- WHEN the bead page is shown
- THEN the page shows no text about reopens and no 0

#### Scenario: reopens fail
- GIVEN the reopens request answers 502 with `bd history failed`
- WHEN the bead page is shown
- THEN the bead fields stay shown, "Reopens unavailable" shows `bd history failed` and Retry, and Retry requests the reopens again

#### Scenario: late answer
- GIVEN the reopens of bead `a-5` are still loading and the user opens bead `a-6`
- WHEN the answer for `a-5` arrives
- THEN the page of `a-6` does not show it

### REQ-UI-087: Quality signals in the bug color
The "Reopened 1 time" or "Reopened N times" text of REQ-UI-086 and the "Bugs found" heading SHALL be shown in the bug color (the `type-bug` theme token used by the bug type badge), in light and dark, while the " · " separator, the bug rows and the "Reopens unavailable" error keep the default text color.

#### Scenario: highlighted signals
- GIVEN a bead with one bug found whose reopens answer is `{"reopens": 1}`
- WHEN the bead page is shown
- THEN "Reopened 1 time" and the "Bugs found" heading use the `type-bug` color and the separator and bug rows do not

### REQ-UI-088: Reports page
The frontend SHALL show the Reports page at `/reports`, loaded as its own chunk. The page header SHALL hold the project choice: each configured project and "All projects", with the first project as the default. The panel of each tab of REQ-UI-095 SHALL hold a period choice (7, 30 or 90 days, default 30) and a sprint field, which apply to every tab. The page SHALL keep the choices in the URL query, so that a reload, the back button and a shared link show the same report. Each tab SHALL open with its own row of figures (REQ-UI-089 to REQ-UI-091). The page SHALL label every cost "estimated" and SHALL show "no price" where a cost is absent.

#### Scenario: shared link
- GIVEN the URL `/reports?project=all&days=7`
- WHEN the page loads
- THEN "All projects" and 7 days are selected and the report for them is requested

#### Scenario: change period
- GIVEN the Reports page for `alpha` and 30 days
- WHEN the user picks 90 days
- THEN the URL becomes `/reports?project=alpha&days=90&tab=delivery` without a reload and the report is requested again

#### Scenario: period kept across tabs
- GIVEN the Reports page for `alpha` with 7 days picked on the Delivery tab
- WHEN the user picks the Quality tab
- THEN 7 days is selected in the Quality panel

### REQ-UI-089: AI usage view
The AI usage tab SHALL show, in this order:
- A row of figures: tokens, estimated cost, tokens per closed bead, and cache reads (`totals.cache_ratio` as a percentage).
- A horizontal bar chart of tokens per member, stacked by stage, with each member's total at the end of the bar. Each bar SHALL show, on hover and on focus, the member's closed beads, tokens, cost, tokens per bead and cache ratio.
- A 100% bar of tokens per stage, with each stage's share written as text.
- A table of the top epics. Each row SHALL link to the epic's bead page and show its tokens, its closed and total children, and one of three budget states:
  - with a budget and a cost: a meter of `budget.cost` against `budget.budget_usd`, with the percentage, in the warning color above 100%;
  - with a budget but no cost: "no price";
  - without a budget: "No budget".
- A table of the top beads.
- A table of tokens and cost per model and role.

#### Scenario: member bar
- GIVEN a report with members `ann` and `Unassigned`
- WHEN the page is shown and the user focuses `ann`'s bar
- THEN the chart has one bar per member, stacked by stage, and `ann`'s beads, tokens, cost, tokens per bead and cache ratio are shown

#### Scenario: budget meter
- GIVEN top epics `a-1` with budget 10 and cost 11.7, and `a-2` without a budget
- WHEN the AI usage tab is shown
- THEN `a-1` shows a meter at 117% in the warning color and `a-2` shows "No budget"

### REQ-UI-090: Delivery flow view
The Delivery tab SHALL show, in this order:
- A row of figures: beads closed (`totals.closed`), median cycle time and median lead time (from `delivery.overall`, "—" when absent), and beads in progress now (the sum of the in-progress counts per member).
- Beads closed per ISO week, as a column chart stacked by type with a legend.
- Cycle time and lead time as two range charts side by side, each with a dot at the median and a tick at the 85th percentile. A switch SHALL choose between By type (the default) and By member. Each range SHALL show, on hover and on focus, its type or member, the number of beads, the median and the 85th percentile.
- The 5 oldest in-progress beads, with their age in days and a link to each bead page, next to a bar chart of in-progress beads per member.
- The estimate table of REQ-REPORTS-004, when it has rows. Each row SHALL hold a chip with the actual minus the estimated working days, rounded to one decimal:
  - "+<n> d" in the warning color when the difference is above 0;
  - "on estimate" when it is 0;
  - "−<n> d" when it is below 0.

#### Scenario: no estimates
- GIVEN a report without estimated epics
- WHEN the page is shown
- THEN no estimate table is shown

#### Scenario: by member
- GIVEN a report whose `by_member` holds `ann` with median cycle time 1.5 days
- WHEN the user picks By member
- THEN both range charts show one range per member and `ann`'s cycle range has its dot at 1.5 days

#### Scenario: estimate chip
- GIVEN epics estimated at 5 working days that took 7, 3 and 4.5
- WHEN the Delivery tab is shown
- THEN their chips read "+2 d" in the warning color, "−2 d" and "−0.5 d"

### REQ-UI-091: Quality view
The Quality tab SHALL show, in this order:
- A row of figures:
  - the rework rate (`totals.rework_rate`);
  - reopens, summed over the member rows of REQ-REPORTS-005;
  - bugs found later, summed over the member rows;
  - review cycles per bead: the sum of the member rows' review cycles divided by the sum of their beads, or "—" when there are no beads.
- The points of REQ-REPORTS-005 as a scatter plot of tokens against rework. Points with rework above 0 SHALL be drawn in a second color, and a legend SHALL name both colors. Each point SHALL name its bead on hover and on focus, and SHALL open the bead's page on click.
- A table of the member rows, with reopens, bugs, review cycles per bead, rejections and rework rate.
- The review findings per severity (critical, important, minor, suggestion) and the waivers, summed over the member rows.

#### Scenario: open a point
- GIVEN a point for bead `a-3` of project `alpha`
- WHEN the user clicks it
- THEN the page `/beads/alpha/a-3` is shown

#### Scenario: figures
- GIVEN member rows `ann` (4 beads, 1 reopen, 5 review cycles) and `bao` (1 bead, 1 bug, 1 review cycle)
- WHEN the Quality tab is shown
- THEN the figures show 1 reopen, 1 bug found later and 1.2 review cycles per bead

### REQ-UI-092: Data coverage view
The Data coverage tab SHALL show the data coverage of REQ-REPORTS-006 as five blocks, in this order, each headed by its name and its count:
1. Not collected: each bead, linking to its bead page, with a button that copies its `gin-workflow usage collect` command.
2. Unreadable usage: each bead with its problem.
3. Models without a price: each model.
4. Incomplete logs: each bead with its sources that are not `ok` and its skipped lines.
5. Projects that failed: each project with its error.

A block whose count is 0 SHALL show one sentence saying that nothing is missing, instead of an empty list. After the blocks, the tab SHALL show the share of tokens under Unassigned when it is above 0, and the fixed note "Estimates from local Claude Code and Codex logs on the machine that collected them. Antigravity and OpenCode are not measured."

#### Scenario: copy command
- GIVEN coverage lists `a-9` as not collected
- WHEN the user presses its copy button
- THEN the clipboard holds `gin-workflow usage collect --bead a-9`

#### Scenario: empty block
- GIVEN a report where no project failed
- WHEN the Data coverage tab is shown
- THEN the "Projects that failed" block shows count 0 and a sentence, and no list

### REQ-UI-093: Report states
The Reports page SHALL show a loading state while the report loads, SHALL show "No data in this period" in a section that has no rows instead of an empty chart, IF the report request fails, THEN SHALL show the error with a Retry button, SHALL show a warning naming each project under `errors` while showing the rest, and SHALL NOT show a late answer for filters that are no longer selected.

#### Scenario: partial failure
- GIVEN the answer for "All projects" has `errors` holding `beta`
- WHEN the page is shown
- THEN a warning names `beta` and its error and the sections show the other projects

#### Scenario: late answer
- GIVEN the report for 30 days is loading and the user picks 7 days
- WHEN the answer for 30 days arrives
- THEN the page does not show it

### REQ-UI-094: Collapsible sidebar
From 1024px the frontend SHALL show, at the top of the "Main" navigation's sidebar next to the theme control, a control that collapses the sidebar and expands it again, with an accessible name saying which it does ("Collapse sidebar" or "Expand sidebar") and `aria-expanded` telling whether the sidebar is expanded, and SHALL NOT show the control below 1024px. From 768px the frontend SHALL show the theme control and the collapse control as icons at the top of the navigation column, on one row with the brand mark while the sidebar is expanded and under the brand mark on the icon rail, so that both are visible without scrolling the page. WHILE the sidebar is collapsed, the frontend SHALL draw it as the icon rail of REQ-UI-056 with the brand mark without its word. The frontend SHALL start with the sidebar expanded, SHALL keep the choice in the browser and use it on the next visit, and IF the browser refuses to store the choice, THEN SHALL still collapse and expand the sidebar for the current visit without an error.

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
The Reports page SHALL show the tabs Delivery, AI usage, Quality and Data coverage, in that order, as a WAI-ARIA tab list in which Left and Right move between tabs. Under each tab name it SHALL show a headline from the loaded report:
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- AI usage: "<tokens> tokens, <cost>", with "no price" in place of `<cost>` when `totals.cost` is absent.
- Quality: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.
- Data coverage: "<n> gaps" ("1 gap" when `<n>` is 1), with a warning icon when `<n>` is above 0. `<n>` is the sum of five counts: beads not collected, beads with unreadable usage, models without a price, beads with incomplete logs (`coverage.sources`), and projects under `errors`.

The page SHALL show no headline while the report loads or after it failed to load. It SHALL keep the selected tab in the URL query `tab` (`delivery`, `usage`, `quality` or `coverage`), SHALL select Delivery when `tab` is missing or holds another value, and SHALL keep the project, period and sprint when the tab changes. WHILE the window is narrower than the tab list, the tab list SHALL scroll sideways instead of widening the page.

#### Scenario: shared link
- GIVEN the URL `/reports?project=alpha&days=7&tab=quality`
- WHEN the page loads
- THEN the Quality tab is selected and its panel shows the report for `alpha` and 7 days

#### Scenario: unknown tab
- GIVEN the URL `/reports?project=alpha&tab=nope`
- WHEN the page loads
- THEN the Delivery tab is selected

#### Scenario: change tab
- GIVEN the Reports page for `alpha`, 90 days and the Delivery tab
- WHEN the user picks the AI usage tab
- THEN the URL becomes `/reports?project=alpha&days=90&tab=usage` without a reload and no new report is requested

#### Scenario: headlines
- GIVEN a report with 41 closed beads, 12,400,000 tokens, cost 38.2, rework rate 0.09, 3 beads not collected, 1 unreadable bead and 1 unpriced model
- WHEN the page is shown
- THEN the headlines read "41 beads closed", "12.4M tokens, $38.20", "9% rework" and "5 gaps", and the Data coverage headline has a warning icon

#### Scenario: no gaps
- GIVEN a report with no coverage gaps and no failed project
- WHEN the page is shown
- THEN the Data coverage headline reads "0 gaps" without a warning icon

#### Scenario: keyboard
- GIVEN the Delivery tab is selected and has focus
- WHEN the user presses Right
- THEN the AI usage tab is selected and has focus

## Diagrams
- [Bead text as Markdown](diagrams/bead-text-markdown-activity.md)
