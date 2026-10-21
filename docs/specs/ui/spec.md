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

### REQ-UI-005: Scotty deep links
WHERE a project has a `scotty_url`, the Projects page SHALL link the project name to it in a new tab with `rel="noopener noreferrer"` and SHALL render no link for a project without one, and SHALL link each active epic to the console's own bead page `/beads/<project>/<id>` whether or not the project has a `scotty_url`.

#### Scenario: Project link present
- GIVEN a project with `scotty_url` `https://h/p/scotty`
- WHEN the Projects page loads
- THEN the project name links to `https://h/p/scotty` in a new tab

#### Scenario: No Scotty id
- GIVEN a project with `scotty_url` null
- WHEN the Projects page loads
- THEN the name is plain text

#### Scenario: Epics open the console's bead page
- GIVEN a project named `scotty` with active epic `scotty-1`, with or without a `scotty_url`
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
The sidebar SHALL contain a "Sessions" link, and the frontend SHALL show the Projects page at `/`, the session list at `/sessions` and the session log at `/sessions/<project>/<id>`, changing page without a full reload and following the browser back and forward buttons.

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
The sidebar SHALL contain a "Quota" link and the frontend SHALL show the quota page at `/quota` without a full reload, following the browser back and forward buttons.

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
The sidebar SHALL contain a "Beads" link, and the frontend SHALL show the bead list at `/beads` and a bead at `/beads/<project>/<id>` without a full reload, following the browser back and forward buttons, and a route segment that cannot be decoded SHALL show the Projects page.

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
- GIVEN the URL has `view=graph`
- WHEN the page loads
- THEN the List view is shown

### REQ-UI-031: Board columns
The Board view SHALL show the columns Backlog (status `deferred`), Ready (`ready`), In Progress (status `in_progress` or `hooked`), Blocked (`blocked`) and Done (status `closed`), each with its number of beads, SHALL put a bead in the first of those columns that fits, SHALL leave out of the Board any bead that fits none, SHALL order a column by priority and then by last update, newest first, and SHALL show a card with the id, a title linking to the bead, the type, `P<n>`, the assignee, and the dependency and comment counts.

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
- THEN its card shows the id, title, type, `P1` and alice, and the title links to `/beads/<project>/<id>`

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
WHEN a bead has comments (`comment_count` above 0), the bead page SHALL load them after the bead is shown and list them under "Comments (N)" oldest first, each with its author, its time and its text as plain text with line breaks, SHALL say "Loading comments…" while they load, SHALL say "Comment truncated" under a truncated comment, and SHALL not request comments and not show the section when `comment_count` is 0.

#### Scenario: Comments listed
- GIVEN a bead with `comment_count` 2
- WHEN the bead page is shown
- THEN "Loading comments…" is shown, then "Comments (2)" with both comments, author, time and text, oldest first

#### Scenario: No comments
- GIVEN a bead with `comment_count` 0
- WHEN the bead page is shown
- THEN no comments request is made and there is no Comments section

#### Scenario: Plain text
- GIVEN a comment containing `<script>x</script>`
- WHEN the comments are shown
- THEN it appears as text and no `script` element exists

#### Scenario: Truncated comment
- GIVEN a comment marked `truncated`
- WHEN the comments are shown
- THEN "Comment truncated" appears under it

### REQ-UI-040: Comments failure and navigation
IF the comments request fails or its answer has an unexpected shape, THEN the Comments section SHALL show the error with its own Retry button that repeats only that request while the rest of the bead page stays shown, and a late comments answer for a bead that is no longer shown SHALL NOT replace the comments of the bead now shown.

#### Scenario: Failure and retry
- GIVEN the comments request answers 502 with `bd comments failed`
- WHEN the bead page is shown
- THEN the bead fields stay shown, the Comments section shows `bd comments failed` and Retry, and Retry loads the comments

#### Scenario: Unexpected shape
- GIVEN the comments answer is `{"x": 1}`
- WHEN the bead page is shown
- THEN the Comments section shows an error and Retry instead of failing

#### Scenario: Late answer
- GIVEN the comments of bead `a-5` are still loading and the user opens bead `a-6`
- WHEN the answer for `a-5` arrives
- THEN `a-6` keeps its own comments
