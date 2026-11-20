# TC-MILESTONE-UI-066: Beads unavailable still draws the Gantt
REQ: REQ-MILESTONE-UI-015@0df09dc6
Priority: medium
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- milestone M1 whose `GET /api/beads` for the project fails

Steps:
1. Open /milestones/P/M1

Expected:
- The epics, bars and arrows are drawn
- No epic has an expand button or a closed count
