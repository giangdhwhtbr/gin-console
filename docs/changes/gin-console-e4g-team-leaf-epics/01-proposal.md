# Team tab counts epics not yet split into tasks

Epic: gin-console-e4g
Date: 2026-11-13

## Why

The Team tab counts only beads that are not epics (REQ-REPORTS-009). An epic assigned to a member before it is split into tasks, which happens until `/gin:orchestrate` runs, is therefore missing from that member's KPIs. On 2026-11-13 a member whose Board showed 4 assigned beads (3 open epics and 1 closed task) appeared in the Team KPI table with 1 assigned and 1 closed. Counting every epic would count an epic and its tasks twice.

## What Changes

- The scope of a milestone also holds every epic under it that has no child bead. An epic with children still counts only through its children.
- Everything built from the scope follows: the bead rows, the team and member KPIs, the closed-per-day chart, the status bar and the Team KPI table.

## User Stories

### US-1: Planned work of a member shows before it is split into tasks
As a team lead, I want an epic assigned to a member to count in that member's KPIs until it is split into tasks, so that the Team tab shows all the work a member holds in the milestone.
REQ: REQ-REPORTS-009

Acceptance criteria:
- A member with 3 open epics without children and 1 closed task shows 4 assigned, 1 closed and 3 open.
- An epic with child beads is not counted; its children are.
- The bead list shows such an epic with type `epic` and itself as its epic.

## Capabilities Affected

- `reports`: MODIFIED REQ-REPORTS-009.
- Assets: none. The diagram `docs/specs/reports/diagrams/team-tab-activity.md` describes the scope in one step and stays correct after a one-line edit, made in this change.

## Non-goals

- Counting an epic and its tasks both.
- Changing the Beads page or the KPI definitions of REQ-REPORTS-010.

## Assumptions

- "No child bead" means no bead, of any type and status, has the epic as its parent. An epic whose children are all closed still counts only through them.
- An epic without children that is nested under another epic of the milestone also counts.
- A non-epic bead with children (a task with subtasks) still counts, as today.

## Success Criteria

- Every scenario of REQ-REPORTS-009 has a test naming it.
- `uv run --directory backend pytest`, `ruff check .` and `mypy` pass; the frontend is unchanged.
- On the Tailscale deploy, the member of the 2026-11-13 report shows 4 assigned in the Team KPI table (TC-1).
