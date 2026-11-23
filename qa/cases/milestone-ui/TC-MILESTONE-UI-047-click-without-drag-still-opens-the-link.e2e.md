# TC-MILESTONE-UI-047: Click without drag still opens the link
REQ: REQ-MILESTONE-UI-012@a4f22671
Priority: medium
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: a19e228a

Preconditions:
- milestone M1 zoomed to `1 week` with epic A

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Click A's id without moving the mouse

Expected:
- The bead page /beads/P/A opens
