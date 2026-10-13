# Dashboard

Epic: gin-console-rm-projects-dashboard
Date: 2026-10-13

## Why
The console lists projects but shows nothing about them. The goal is one screen that shows every configured project's gin-workflow state and Beads summary, so the user can monitor all projects without opening each one.

## What Changes
- Backend collects `gin-workflow state` and `bd` summaries per project (read-only, cached 5 s) and adds them to `GET /api/projects`.
- Config gains optional `server.scotty_base_url`; each project gets a `scotty_url`.
- The Projects page becomes cards with stage, gate chips, Beads counts, active epics and Scotty links, refreshed every 10 s.

## User Stories
### US-1: See workflow state of every project
As the console owner, I want each project's stage and gates on one screen, so that I know where every project is in the workflow.
REQ: REQ-SERVER-005, REQ-UI-003

Acceptance criteria:
- Each existing project shows its stage and one chip per gate with its state.

### US-2: See the Beads summary
As the console owner, I want open, in-progress, blocked and ready counts and the active epics, so that I see what is moving and what is waiting.
REQ: REQ-SERVER-006, REQ-UI-004

Acceptance criteria:
- Each project shows the four counts and its active epics, or a "no active epics" note.

### US-3: Jump to Scotty
As the console owner, I want links from a project and its epics to Scotty, so that I can read the beads in detail there.
REQ: REQ-CONFIG-004, REQ-SERVER-003, REQ-UI-005

Acceptance criteria:
- With `scotty_base_url` and `scotty_id` set, the project name and each epic link to Scotty in a new tab.
- Without them, no link is rendered.

### US-4: Fresh data without hammering the host
As the console owner, I want the page to refresh itself, so that I always see current state without the console running commands needlessly.
REQ: REQ-SERVER-008, REQ-UI-006

Acceptance criteria:
- The page refreshes every 10 s while visible and not while hidden.
- Commands for one project run at most once per 5 s, even with several tabs open.

### US-5: A broken project does not break the page
As the console owner, I want a failing project or command to show its own error, so that the rest of the dashboard stays usable.
REQ: REQ-SERVER-007, REQ-UI-007

Acceptance criteria:
- A failed `bd` or `gin-workflow` shows its error in that block only.
- A missing path runs no command and shows only the "missing" badge.

## Capabilities Affected
- `config`: ADDED REQ-CONFIG-004.
- `server`: ADDED REQ-SERVER-005..008, MODIFIED REQ-SERVER-003.
- `ui`: ADDED REQ-UI-003..007; REQ-UI-001 and REQ-UI-002 unchanged.

## Non-goals
Bead search or filter UI, any write, a project detail page, a background worker.

## Success Criteria
All scenarios have tests; the dashboard on `https://instance-20260515-2304.tail5ca54e.ts.net:8443` shows the three configured projects with live state.
