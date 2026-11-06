# TC-MILESTONE-UI-032: List view hides the milestone and roots its epics
REQ: REQ-MILESTONE-UI-009@b69e4614
Priority: high
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- project P with milestone M1 and child epics A and B

Steps:
1. Open /beads?project=P
2. Choose the "List" view

Expected:
- M1 is not listed
- A and B are shown as roots
