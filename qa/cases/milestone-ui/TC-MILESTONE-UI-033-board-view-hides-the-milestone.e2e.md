# TC-MILESTONE-UI-033: Board view hides the milestone
REQ: REQ-MILESTONE-UI-009@b69e4614
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T03-27-52
Checked: 1cbe6d5f

Preconditions:
- project P with open milestone M1 and open epic A

Steps:
1. Open /beads?project=P
2. Choose the "Board" view

Expected:
- A is on the board
- M1 is in no column
