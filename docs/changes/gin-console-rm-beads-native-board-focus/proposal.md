# Board focus

Epic: gin-console-rm-beads-native
Date: 2026-10-21

## Why
Change A gave the console a bead list and a bead page, but Scotty is still needed to see work as a board and to see what is in flight, blocked and next. The epic's goal is to retire Scotty, so the two views people actually use, Board and Focus, must exist in the console, read-only. This is change B of three under the same epic (A browse is done, C Scotty parity and retirement follows).

## What Changes
- The bead list endpoint also says, for each bead, whether it is ready or blocked (from `bd ready` and `bd blocked`) and when it was closed.
- The Beads page gets a List · Board · Focus switch kept in the URL. The three views share the project, search, filters, "Show closed" and the 10-second refresh.
- Board: five columns (Backlog, Ready, In Progress, Blocked, Done) with bead cards that link to the bead page; Done shows the 20 most recently closed unless expanded.
- Focus: In flight, Blocked and Next up columns, an optional grouping by assignee, an optional "Recently finished" column of the latest 7 closed beads, and a label lane filter shared with Board.
- Keyboard: `/` search, `Esc` leave search, arrows between cards, `Enter` opens.

## User Stories
### US-1: See the work as a board
As the console owner, I want the beads of a project in Backlog, Ready, In Progress, Blocked and Done columns, so that I can see the state of the work at a glance without Scotty.
REQ: REQ-BEADS-007, REQ-UI-030, REQ-UI-031, REQ-UI-032

Acceptance criteria:
- Each bead is in exactly one column derived from its status and readiness, cards link to the bead page, and Done is short by default.

### US-2: See what to do next
As the console owner, I want a Focus view of what is in flight, blocked and next, grouped by who owns it, so that I can decide what to pick up or unblock.
REQ: REQ-UI-033, REQ-UI-034, REQ-UI-035

Acceptance criteria:
- In flight, Blocked and Next up columns; grouping by assignee with a row for unassigned work; the latest finished work on request.

### US-3: Narrow and move quickly
As the console owner, I want to narrow the views to a label lane and move around with the keyboard, so that I can use them quickly on a big project.
REQ: REQ-UI-036, REQ-UI-037

Acceptance criteria:
- A lane limits Board and Focus to one label; `/`, `Esc`, arrow keys and `Enter` work.

## Capabilities Affected
- `beads`: ADDED REQ-BEADS-007.
- `ui`: ADDED REQ-UI-030..037.

## Non-goals
Drag and drop, creating or editing beads, archive and delete, comments, origin (human or agent) badges, dependency graph, several projects in one board, Scotty parity sign-off and retirement (change C).

## Success Criteria
All scenarios have tests; on the live host `/beads?project=qwikfone&view=board` shows the unfinished beads in the right columns, `view=focus` shows In flight, Blocked and Next up, grouping by assignee, "Recently finished" and the lane filter work, and a reload or a shared link restores the view.
