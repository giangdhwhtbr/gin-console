# TC-MILESTONE-UI-010: Bars colored by bead status
REQ: REQ-MILESTONE-UI-003@8d87bf55
Priority: low
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- milestone M1 with epic A closed, epic B in progress, and epic C open

Steps:
1. Open /milestones/P/M1

Expected:
- A, B and C each have one continuous bar from `planned_start` to `planned_end`, not one pill per working day
- A's bar is filled in the Done colour, B's in the In progress colour and C's is an outline in the Ready colour
