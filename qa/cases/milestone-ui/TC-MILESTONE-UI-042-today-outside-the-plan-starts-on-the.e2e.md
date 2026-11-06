# TC-MILESTONE-UI-042: Today outside the plan starts on the plan's first Monday
REQ: REQ-MILESTONE-UI-011@83b54b5c
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- milestone M1 whose plan starts on Wednesday 2026-11-04 and `today: 2026-10-29`

Steps:
1. Open /milestones/P/M1?zoom=1w

Expected:
- "1 week" is selected
- The days in view are 2026-11-02 to 2026-11-08
