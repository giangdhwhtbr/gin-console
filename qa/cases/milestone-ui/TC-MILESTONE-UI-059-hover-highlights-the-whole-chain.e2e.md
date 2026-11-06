# TC-MILESTONE-UI-059: Hover highlights the whole chain
REQ: REQ-MILESTONE-UI-014@d417b46f
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- epics A, B, C, D in M1 where B depends on A, C depends on B, and D has no dependency

Steps:
1. Open /milestones/P/M1
2. Hover B's row

Expected:
- A, B, C and the arrows A→B and B→C are highlighted
- D is faded
