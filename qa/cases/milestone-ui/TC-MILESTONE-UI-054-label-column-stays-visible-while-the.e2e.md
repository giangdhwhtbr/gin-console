# TC-MILESTONE-UI-054: Label column stays visible while the chart scrolls
REQ: REQ-MILESTONE-UI-013@707f050a
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- milestone M1 zoomed to `1 week` with epic A

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Click "Later" (›)

Expected:
- A's status icon, title, id, period and estimate stay visible
