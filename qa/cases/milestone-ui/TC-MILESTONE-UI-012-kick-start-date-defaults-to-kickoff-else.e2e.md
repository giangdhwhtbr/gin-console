# TC-MILESTONE-UI-012: Kick-start date defaults to kickoff, else start
REQ: REQ-MILESTONE-UI-004@ed8c64e1
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- planned milestone M1 with `kickoff: 2026-11-16` and `start: 2026-11-09`
- scheduled milestone M2 without kickoff and with `start: 2026-11-23`

Steps:
1. Open /milestones/P/M1
2. Open /milestones/P/M2

Expected:
- On M1, "Kick-start date" shows 2026-11-16
- On M2, "Kick-start date" shows 2026-11-23
