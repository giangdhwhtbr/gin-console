# TC-MILESTONE-UI-061: Dependent starting too early draws a blocked arrow
REQ: REQ-MILESTONE-UI-014@d417b46f
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- epic B in M1 depending on A, with A planned to end 2026-11-05 and B planned to start 2026-11-05

Steps:
1. Open /milestones/P/M1

Expected:
- The arrow from A to B is drawn in the blocked color
