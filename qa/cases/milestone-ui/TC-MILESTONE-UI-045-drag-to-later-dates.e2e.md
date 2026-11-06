# TC-MILESTONE-UI-045: Drag to later dates
REQ: REQ-MILESTONE-UI-012@a4f22671
Priority: high

Preconditions:
- milestone M1 zoomed to `1 week` with 2026-11-02 to 2026-11-08 in view

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Drag the chart to the left by the width of one week

Expected:
- 2026-11-09 to 2026-11-15 are in view
- The label reads "9 Nov – 15 Nov"
