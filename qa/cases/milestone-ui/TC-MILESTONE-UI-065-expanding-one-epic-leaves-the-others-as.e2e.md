# TC-MILESTONE-UI-065: Expanding one epic leaves the others as they are
REQ: REQ-MILESTONE-UI-015@f33e3903
Priority: low

Preconditions:
- epics A and B in M1, each with child beads

Steps:
1. Open /milestones/P/M1
2. Expand A
3. Expand B
4. Collapse A

Expected:
- A's children are hidden
- B's children are still shown
