# TC-MILESTONE-UI-063: Epic without children has no expand button
REQ: REQ-MILESTONE-UI-015@665bc3ff
Priority: medium
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- epic A with no bead whose `parent` is A

Steps:
1. Open /milestones/P/M1

Expected:
- A has no expand button and no closed count
