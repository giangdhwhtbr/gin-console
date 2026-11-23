# TC-MILESTONE-UI-063: Epic without children has no expand button
REQ: REQ-MILESTONE-UI-015@b1f5871c
Priority: medium
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: 30e6efae

Preconditions:
- epic A with no bead whose `parent` is A

Steps:
1. Open /milestones/P/M1

Expected:
- A has no expand button and no strand
