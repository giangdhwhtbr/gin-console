# TC-MILESTONE-UI-050: Later disabled at the end of the plan
REQ: REQ-MILESTONE-UI-012@a4f22671
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- milestone M1 whose plan spans 2026-11-02 to 2026-11-13, zoomed to `1 week`

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Click "Later" (›)

Expected:
- The last day of the plan is in view
- "Later" (›) is disabled
