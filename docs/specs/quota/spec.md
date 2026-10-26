# Quota

## Purpose

## Requirements

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

### REQ-QUOTA-008: Windows quota process handling
WHERE the server runs on Windows, the server SHALL read Codex app-server responses using non-blocking pipe reading without calling socket-only `select.select()`, and SHALL terminate child process trees using Windows process termination rather than `os.killpg()`.

#### Scenario: Codex JSON-RPC reader on Windows
- GIVEN `sys.platform` is `"win32"`
- WHEN `_codex_conversation` reads responses from the Codex app-server subprocess
- THEN it does not call `select.select()` on the stdout pipe and returns valid responses before deadline

#### Scenario: Codex process termination on Windows
- GIVEN `sys.platform` is `"win32"` and a Codex subprocess is active
- WHEN `_end(process)` is called
- THEN it terminates the process tree without calling `os.killpg()`
