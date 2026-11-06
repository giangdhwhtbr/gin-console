# TC-MILESTONE-UI-048: Step by a period
REQ: REQ-MILESTONE-UI-012@a4f22671
Priority: high
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- milestone M1 zoomed to `2 weeks` with 2026-11-02 to 2026-11-15 in view

Steps:
1. Open /milestones/P/M1?zoom=2w
2. Click "Later" (›)

Expected:
- 2026-11-16 to 2026-11-29 are in view
- The label shows the new first and last day
