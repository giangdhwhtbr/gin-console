# TC-MILESTONE-UI-046: Drag over a link does not open it
REQ: REQ-MILESTONE-UI-012@a4f22671
Priority: high
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- milestone M1 zoomed to `1 week`

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Press on an epic id, drag 40 px and release

Expected:
- The days in view move
- The bead page is not opened
