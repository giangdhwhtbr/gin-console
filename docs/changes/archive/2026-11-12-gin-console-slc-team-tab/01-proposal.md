# Team tab

Epic: gin-console-slc
Date: 2026-11-12

## Why

The Reports page opens on Delivery, which measures beads closed in the last 7, 30 or 90 days. Its only bead list is the 5 oldest in-progress beads, next to a count of in-progress beads per member. It does not show what the team has open, in progress and closed in a milestone, who holds which beads, or whether the milestone will finish on time. A lead has to read the Beads page bead by bead and count by hand to judge each member's and the team's performance in a milestone.

## What Changes

- A new `GET /api/reports/team?project=<name>&milestone=<id>` returns, for one milestone of one project, its beads with their status bucket, member, epic and times, the team's and each member's KPIs, and the beads closed per working day per member. It reads the same `bd export` snapshot as `GET /api/reports` and starts no process.
- The Reports page gets a Team tab, first and selected by default. It has a Milestone choice and a Member choice instead of the period and sprint. It shows:
  - the milestone line;
  - a KPI strip;
  - a bar of the scope by status;
  - a column chart of beads closed per working day, stacked by member;
  - a table of KPIs per member;
  - the bead list with Open, In progress, Closed and All.
- The Delivery tab drops "Oldest in progress", "In progress by member" and the "In progress now" figure, and `GET /api/reports` drops the matching `delivery.wip` and `delivery.oldest`. Work in progress is now shown in the Team tab, per milestone and member.

## User Stories

### US-1: See what each member has open, in progress and closed in a milestone
As a team lead, I want to pick a milestone and a member and see that member's beads by status, so that I know who holds what without reading every bead.
REQ: REQ-REPORTS-008, REQ-REPORTS-009, REQ-REPORTS-012, REQ-REPORTS-016, REQ-REPORTS-017, REQ-UI-095

Acceptance criteria:
- The Reports page opens on the Team tab with the active milestone of the selected project.
- Picking a member shows only that member's beads, and Open, In progress, Closed and All show that member's counts.
- A bead without an assignee is listed under Unassigned.
- Milestone, member and status stay in the URL, so a shared link shows the same view.

### US-2: Judge the team's progress in a milestone
As a team lead, I want the team's KPIs for a milestone, so that I can tell whether it will finish by its end date and where it is slipping.
REQ: REQ-REPORTS-010, REQ-REPORTS-011, REQ-REPORTS-013, REQ-REPORTS-014

Acceptance criteria:
- The figures show done of scope, in progress with the oldest age, open with blocked and unclaimed, pace against the pace needed to end on time, median cycle time, the on-time share and the rework rate.
- When the pace needed is above the current pace, both are shown in the warning color and the tab headline says "behind pace".
- The chart shows the beads closed on each working day, stacked by member, with a Today marker.

### US-3: Compare members within a milestone
As a team lead, I want one row of KPIs per member, so that I can see each member's load, throughput, cycle time, on-time share and rework side by side.
REQ: REQ-REPORTS-010, REQ-REPORTS-015

Acceptance criteria:
- Each member has one row with assigned, closed, in progress, open, done, per week, median cycle, oldest in progress, on time and rework.
- Pressing a row filters the whole tab by that member; pressing it again clears the filter.

### US-4: Delivery without the duplicate work-in-progress view
As a console user, I want the Delivery tab to keep only the period-based flow, so that work in progress is read in one place.
REQ: REQ-REPORTS-004, REQ-UI-088, REQ-UI-090

Acceptance criteria:
- The Delivery tab no longer shows "Oldest in progress", "In progress by member" or the "In progress now" figure.
- The period and sprint choice is shown on Delivery, AI usage, Quality and Data coverage, and not on Team.

## Capabilities Affected

- `reports`: ADDED REQ-REPORTS-008 to REQ-REPORTS-017; MODIFIED REQ-REPORTS-004.
  - Assets: `docs/specs/reports/assets/2026-11-12/mockup/index.html`, `docs/specs/reports/assets/2026-11-12/team-active.png`, `docs/specs/reports/assets/2026-11-12/team-member.png`, `docs/specs/reports/assets/2026-11-12/team-closed.png` (description in `docs/specs/reports/assets/2026-11-12/description.md`, confirmed 2026-11-12).
  - Diagram: `docs/specs/reports/diagrams/team-tab-activity.md`.
  - Use case: `docs/specs/reports/use-cases/review-team-in-milestone.md`.
- `ui`: MODIFIED REQ-UI-088, REQ-UI-090, REQ-UI-095.

## Non-goals

- A burndown, a projected finish date or a comparison of milestones (the Milestones page has the forecast).
- The Team tab for "All projects": milestones belong to one project.
- Counting reopens live with `bd history`: reopens and bugs come from `ai_usage`, written by `gin usage collect` (see Assumptions).
- Holidays or days off in working days: Monday to Friday, as gin-workflow counts them without `away`.
- Editing beads, assigning members, or any write to Beads.

## Assumptions

- Reopens and bugs found later come from each bead's own share of `metadata.ai_usage.quality` (REQ-REPORTS-002), which gin-workflow writes at `gin usage collect` time from `bd history` and `discovered-from` dependencies. A bead reopened after its last collection is not counted until it is collected again, and a bead never collected shows "—" for rework. The Data coverage tab already lists beads that were not collected.
- "Blocked" is the bead status `blocked`. A bead whose status is `open` but that waits on an open dependency is not counted as blocked.
- An in-progress bead older than 3 days, counted from `started_at`, is shown in the warning color. The threshold is fixed, not a setting.
- A milestone bead without a valid `start` and `end` in its metadata is not listed. The tab shows how many were left out.
- The Team tab is the default tab even with "All projects", where it asks the user to pick a project.
- A member is the bead's `assignee` string as written. The same person under two strings (for example a name and an email) shows as two members.

## Success Criteria

- Every scenario of the ADDED and MODIFIED REQs has a test naming its REQ.
- `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- On the Tailscale deploy, the Team tab for `qwikfone` and its milestone matches the mockup's layout, and opening it starts no `gin` or `bd` process (TC-1).
