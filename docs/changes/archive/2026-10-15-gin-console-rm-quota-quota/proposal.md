# Quota

Epic: gin-console-rm-quota
Date: 2026-10-15

## Why
The user runs Claude and Codex on one account each and needs to know at a glance whether either still has quota or has hit its limit, and when it resets, without opening each tool.

## What Changes
- A new backend context `quota/` serves `GET /api/quota`. Both sides use the interface each CLI already provides, nothing is recomputed: Claude from `claude -p /usage` (a local command: no model call, no quota spent) and Codex from `codex app-server` (`account/rateLimits/read`, live from the server, including reset credits).
- Each result is reused for 5 minutes and a "Refresh" button forces a new run; nothing runs in the background.
- A Quota page (sidebar link) and a status strip on the Projects page show both harnesses.

## User Stories
### US-1: See at a glance whether I have quota
As the console owner, I want a status for Claude and Codex at the top of the dashboard, so that I know before starting work whether either is limited.
REQ: REQ-UI-015, REQ-UI-016, REQ-UI-017

Acceptance criteria:
- A strip with a text status and the highest percentage for each harness (ok, near the limit, limited, no data, error) links to the Quota page.
- A quota failure never breaks the project list.

### US-2: See Claude's real usage and resets
As the console owner, I want the same numbers Claude itself reports for the current session and week, so that I can trust them even after I reset a limit.
REQ: REQ-QUOTA-002, REQ-QUOTA-003, REQ-UI-018

Acceptance criteria:
- The page shows each window's percentage used and its reset time (local and UTC) as reported by `claude /usage`, and how old the figures are.
- If the command is missing, slow, or its output is not understood, the card says so and shows the raw text instead of guessing.

### US-3: Refresh on demand without spending quota
As the console owner, I want a Refresh button and sensible caching, so that I get fresh figures when I need them and nothing runs when nobody looks.
REQ: REQ-QUOTA-006, REQ-UI-018, REQ-UI-020

Acceptance criteria:
- Each side is reused for 5 minutes; "Refresh" forces a run (at most one per side per 30 seconds); runs never overlap.

### US-4: See Codex limits, resets and reset credits
As the console owner, I want Codex's live plan, window usage, reset times and available reset credits, so that I know whether I can use Codex and when it renews.
REQ: REQ-QUOTA-004, REQ-QUOTA-005, REQ-UI-017, REQ-UI-019

Acceptance criteria:
- The card shows the plan, each window's percent used and reset time, the number of available reset credits, and a message when a limit has been reached.
- If the Codex command is missing, slow or fails, the card says so.

### US-5: A dependable page
As the console owner, I want the page to survive bad files and a failing tool, so that it can stay open.
REQ: REQ-QUOTA-001, REQ-QUOTA-007, REQ-UI-015, REQ-UI-020, REQ-UI-021

Acceptance criteria:
- One side failing never causes a 500 and leaves the other visible; the commands are fixed and take nothing from the request.
- The page refreshes every 60 seconds while visible and keeps the last data when a refresh fails.

## Capabilities Affected
- `quota` (new): ADDED REQ-QUOTA-001..007.
- `ui`: ADDED REQ-UI-015..021.

## Non-goals
Antigravity, multiple accounts, unofficial usage endpoints, charts or history, push notifications, estimating usage from token counts, reading Codex session files, a background worker, a config for limits, and claiming a Codex reset credit (shown, never used).

## Success Criteria
All scenarios have tests; on the live host the Quota page shows the same session and week percentages that `claude /usage` prints and the same plan, window and reset credits that Codex reports, and the strip appears on the Projects page.
