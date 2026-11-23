# TC-MILESTONE-UI-066: Beads unavailable still draws the Gantt
REQ: REQ-MILESTONE-UI-015@b1f5871c
Priority: medium
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: be36bfc6

Preconditions:
- milestone M1 whose `GET /api/beads` for the project fails

Steps:
1. Open /milestones/P/M1

Expected:
- The epics, bars and arrows are drawn
- No epic has an expand button or a strand
