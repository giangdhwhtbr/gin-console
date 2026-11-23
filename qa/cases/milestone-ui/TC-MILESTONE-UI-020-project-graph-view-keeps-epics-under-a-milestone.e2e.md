# TC-MILESTONE-UI-020: Project Graph view keeps epics under a milestone
REQ: REQ-MILESTONE-UI-006@3025db15
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T03-27-52
Checked: be24f8ea

Preconditions:
- epics A and B of project P, B depending on A, both children of milestone M1

Steps:
1. Open /beads?project=P&milestone=all&view=graph

Expected:
- A and B are shown as nodes
- An edge runs from A to B
- M1 is not shown and does not group or hide A and B
