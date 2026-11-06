# TC-MILESTONE-UI-052: Days in view kept when the plan refreshes
REQ: REQ-MILESTONE-UI-012@a4f22671
Priority: low
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- milestone M1 zoomed to `1 week`

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Click "Later" (›)
3. Wait for the plan to refresh

Expected:
- The days in view after the refresh are the same as before it
