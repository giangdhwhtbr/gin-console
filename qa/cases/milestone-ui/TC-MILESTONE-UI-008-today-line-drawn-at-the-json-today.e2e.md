# TC-MILESTONE-UI-008: Today line drawn at the JSON today
REQ: REQ-MILESTONE-UI-003@eea05295
Priority: high
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- milestone M1 whose `show` output has `today: 2026-11-04`
- the browser clock set to 2026-11-20

Steps:
1. Open /milestones/P/M1

Expected:
- The today line is drawn at 2026-11-04
