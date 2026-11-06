# TC-MILESTONE-UI-011: Kick-start preview redraws the Gantt from the picked date
REQ: REQ-MILESTONE-UI-004@ed8c64e1
Priority: high
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- planned milestone M1 of project P

Steps:
1. Open /milestones/P/M1
2. Set "Kick-start date" to 2026-11-16

Expected:
- The URL has `start=2026-11-16`
- The Gantt is drawn from 2026-11-16 and labelled as a preview
- The command `gin-workflow milestone kickstart M1 --date 2026-11-16` is shown
