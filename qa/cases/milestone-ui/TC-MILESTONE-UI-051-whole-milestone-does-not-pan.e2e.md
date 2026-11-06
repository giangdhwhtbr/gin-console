# TC-MILESTONE-UI-051: Whole milestone does not pan
REQ: REQ-MILESTONE-UI-012@a4f22671
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- milestone M1 on a screen wide enough for the plan

Steps:
1. Open /milestones/P/M1
2. Drag the chart to the left by 100 px

Expected:
- ‹, › and the label of days in view are not shown
- The chart does not move
