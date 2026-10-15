# Spec Delta: Quota

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin-workflow specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin-workflow specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...". -->

## ADDED

### REQ-QUOTA-001: Quota endpoint
WHEN a client requests `GET /api/quota`, the server SHALL return an object with `claude` and `codex`, each either its data or an object with an `error` message (and, for Claude output it could not understand, the `raw` text), so that a failure on one side leaves the other unaffected.

#### Scenario: Both sides
- GIVEN the Claude and Codex commands both work
- WHEN a client requests `GET /api/quota`
- THEN the response has data under `claude` and under `codex`

#### Scenario: One side fails
- GIVEN the Codex command fails
- WHEN a client requests `GET /api/quota`
- THEN `codex` is `{"error": "<message>"}` and `claude` has data

### REQ-QUOTA-002: Claude usage from the usage command
The server SHALL obtain Claude's usage by running `claude -p /usage --no-session-persistence` in a neutral directory with no standard input, and SHALL report a `windows` list with one entry per output line of the form `Current <label>: <N>% used · resets <date> (UTC)`, each with `label` (the text after "Current "), `used_percent` and `resets_at` (ISO 8601 UTC, the first occurrence of that date and time not earlier than 12 hours before now), together with `fetched_at`.

#### Scenario: Session and week
- GIVEN the command prints "Current session: 41% used · resets Oct 15, 8am (UTC)" and "Current week (all models): 25% used · resets Oct 20, 12pm (UTC)"
- WHEN the quota is requested at 2026-10-15T03:00Z
- THEN `windows` holds "session" at 41.0 resetting 2026-10-15T08:00Z and "week (all models)" at 25.0 resetting 2026-10-20T12:00Z

#### Scenario: Minutes in the time
- GIVEN a line says "resets Oct 15, 7:59am (UTC)"
- WHEN the quota is requested
- THEN `resets_at` is 07:59 UTC

#### Scenario: Year rollover
- GIVEN the line says "resets Jan 2, 8am (UTC)" and the time is 2026-12-30
- WHEN the quota is requested
- THEN `resets_at` is 2027-01-02T08:00Z

#### Scenario: Other limit lines
- GIVEN the output also has "Current week (Sonnet only): 3% used · resets Oct 20, 12pm (UTC)"
- WHEN the quota is requested
- THEN `windows` also holds "week (Sonnet only)" at 3.0

### REQ-QUOTA-003: Claude usage unavailable
IF the Claude command is not found, times out after 30 seconds, exits with a non-zero status, or prints no line of the expected form, THEN the server SHALL report `claude` as an `error` that says which happened and, for output it could not understand, the `raw` text cut to 4 000 characters, and SHALL locate the command through the `PATH` and otherwise at `~/.local/bin/claude`.

#### Scenario: Not installed
- GIVEN no `claude` command can be found
- WHEN the quota is requested
- THEN `claude` is an error saying the command was not found

#### Scenario: Timeout
- GIVEN the command runs longer than 30 seconds
- WHEN the quota is requested
- THEN `claude` is an error saying it timed out

#### Scenario: Not understood
- GIVEN the command prints text without any "Current ...% used" line, as with an API-key login
- WHEN the quota is requested
- THEN `claude` is an error saying the output was not understood, with the `raw` text

#### Scenario: Fallback location
- GIVEN `claude` is not on the `PATH` but exists at `~/.local/bin/claude`
- WHEN the quota is requested
- THEN that command is run

### REQ-QUOTA-004: Codex rate limits from the app server
The server SHALL obtain Codex's rate limits by starting `codex app-server` on standard input and output, sending `initialize`, the `initialized` notification and `account/rateLimits/read`, and SHALL report `plan_type`, `ordinary_usage_allowed`, `rate_limit_reached_type`, `reset_credits_available` (the number of available reset credits) and the `primary` and `secondary` windows that are present, each with `used_percent`, `window_minutes` and `resets_at` (ISO 8601 UTC), together with `fetched_at`.

#### Scenario: One window
- GIVEN the app server answers with a `primary` window of 0 percent over 43 200 minutes resetting at epoch 1793947812, a null `secondary`, plan `free` and two available reset credits
- WHEN the quota is requested
- THEN `codex` has plan "free", one window with `used_percent` 0, `window_minutes` 43200 and `resets_at` 2026-11-06T06:50:12Z, and `reset_credits_available` 2

#### Scenario: Two windows
- GIVEN the app server answers with `primary` 300 minutes at 16 percent and `secondary` 10 080 minutes at 40 percent
- WHEN the quota is requested
- THEN both windows are reported in that order

#### Scenario: Limit reached
- GIVEN the answer has `rateLimitReachedType` "rate_limit_reached" and `ordinaryUsageAllowed` false
- WHEN the quota is requested
- THEN `rate_limit_reached_type` is "rate_limit_reached" and `ordinary_usage_allowed` is false

### REQ-QUOTA-005: Codex rate limits unavailable
IF the Codex command is not found, does not answer within 30 seconds, answers with an error, or sends a response that is not the expected shape, THEN the server SHALL report `codex` as an `error` saying which happened, and SHALL always end the app-server process it started.

#### Scenario: Not installed
- GIVEN no `codex` command can be found
- WHEN the quota is requested
- THEN `codex` is an error saying the command was not found

#### Scenario: No answer
- GIVEN the app server never answers
- WHEN 30 seconds pass
- THEN `codex` is an error saying it timed out and the process has been ended

#### Scenario: Error answer
- GIVEN the app server answers `account/rateLimits/read` with an error object
- WHEN the quota is requested
- THEN `codex` is an error carrying that message

#### Scenario: Unexpected shape
- GIVEN the answer is not an object with `rateLimits`
- WHEN the quota is requested
- THEN `codex` is an error saying the response was not understood

### REQ-QUOTA-006: Reuse and refresh
The server SHALL reuse a successful result of each side for 5 minutes, SHALL run each command at most once at a time, and WHEN a request has `refresh=1`, SHALL run both commands again unless a side ran less than 30 seconds earlier, and SHALL NOT keep an error result.

#### Scenario: Reused within 5 minutes
- GIVEN both sides were fetched 2 minutes ago
- WHEN the quota is requested
- THEN no command is run and each `fetched_at` is unchanged

#### Scenario: Expired
- GIVEN both sides were fetched 6 minutes ago
- WHEN the quota is requested
- THEN both commands run again

#### Scenario: Forced refresh
- GIVEN both sides were fetched 1 minute ago
- WHEN a client requests `GET /api/quota?refresh=1`
- THEN both commands run again

#### Scenario: Refresh too soon
- GIVEN a side was fetched 10 seconds ago
- WHEN a client requests `GET /api/quota?refresh=1`
- THEN that side's command is not run again

#### Scenario: Overlapping requests
- GIVEN two requests arrive while a command is running
- WHEN both complete
- THEN that command ran once

#### Scenario: Errors are not kept
- GIVEN the last run of a side failed
- WHEN the quota is requested again
- THEN that side's command runs again

### REQ-QUOTA-007: Fixed commands and safe output
The server SHALL run only the fixed commands of REQ-QUOTA-002 and REQ-QUOTA-004 with no part of any request in their arguments, in a neutral directory, SHALL replace lone surrogate characters in every string it returns, and SHALL never write to or delete any Claude or Codex file itself.

#### Scenario: Request cannot change the command
- GIVEN a request with unusual query parameters such as `refresh=../x`
- WHEN the quota is requested
- THEN the commands run with their fixed arguments and the parameter is not passed on

#### Scenario: Lone surrogate in command output
- GIVEN the Claude command prints a lone surrogate escape in text that reaches `raw`
- WHEN the quota is requested
- THEN the response is 200 with the character replaced

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

## MODIFIED

## REMOVED
