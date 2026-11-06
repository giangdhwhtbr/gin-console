# TC-MILESTONE-UI-034: Focus view hides the milestone
REQ: REQ-MILESTONE-UI-009@b69e4614
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- project P with open milestone M1 and open epic A, child of M1

Steps:
1. Open /beads?project=P
2. Choose the "Focus" view

Expected:
- M1 is not shown
- A is shown without a parent
