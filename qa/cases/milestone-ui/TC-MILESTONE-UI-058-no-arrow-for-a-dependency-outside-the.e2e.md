# TC-MILESTONE-UI-058: No arrow for a dependency outside the milestone
REQ: REQ-MILESTONE-UI-014@d417b46f
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- epic B in M1 with `depends_on: ["X"]` where X is not an epic of M1

Steps:
1. Open /milestones/P/M1

Expected:
- No arrow is drawn for X
