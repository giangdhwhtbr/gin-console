# Design: Team tab counts epics not yet split into tasks

Epic: gin-console-e4g

## Architecture

Backend only, in `backend/src/gin_console/reports/team.py`. `_scope` keeps its walk up the parent chain, which uses `tree.epics_of(bead)`, and changes in two ways:
- It admits an epic when `tree.children` holds no bead for it.
- The nearest epic of an admitted epic is the epic itself, the first entry of `tree.epics_of(bead)`, because that list starts with the bead when it is an epic.

`_Tree.children` already maps each bead to its children. Nothing else changes: KPIs, days and members are computed from the scope rows.

## Data Flow

See `docs/specs/reports/diagrams/team-tab-activity.md`. Its scope step now reads "non-milestone beads under the milestone's epics, except epics that have child beads".

## Error Handling

Unchanged. A parent cycle still stops the walk (`_Tree._lineage`), and a bead in a cycle stays out of scope unless an epic under the milestone is reached first.

## Testing

`backend/tests/test_reports_team.py` gains one test per new scenario of REQ-REPORTS-009 ("epic not yet split into tasks", "nested epic without children"). The existing "nested beads" test keeps passing, because `e1` has children. Manual TC-1 on the Tailscale deploy.

## Open Technical Questions
