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
WHERE a project has a `scotty_url`, the Projects page SHALL link the project name to it and each active epic to `<scotty_url>?bead=<id>`, in a new tab with `rel="noopener noreferrer"`, and SHALL render no link for a project without one.

#### Scenario: Link present
- GIVEN a project with `scotty_url` `https://h/p/scotty` and epic `scotty-1`
- WHEN the Projects page loads
- THEN the epic links to `https://h/p/scotty?bead=scotty-1`

#### Scenario: No Scotty id
- GIVEN a project with `scotty_url` null
- WHEN the Projects page loads
- THEN the name and epics are plain text

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
