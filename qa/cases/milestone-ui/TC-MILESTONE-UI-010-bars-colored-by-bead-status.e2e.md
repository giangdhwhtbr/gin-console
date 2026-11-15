# TC-MILESTONE-UI-010: Bars colored by bead status
REQ: REQ-MILESTONE-UI-003@eea05295
Priority: low
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- milestone M1 with epic A closed, epic B in progress, and epic C open

Steps:
1. Open /milestones/P/M1

Expected:
- A, B and C each have one bar from `planned_start` to `planned_end`
- Each bar has the color of its status shown in the legend
