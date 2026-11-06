# TC-MILESTONE-UI-009: External blocker warning names the epic and its milestone
REQ: REQ-MILESTONE-UI-003@68d4a64d
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- epic A in M1 with warning `external_blocker` and `external_depends_on` `[{"id": "E9", "milestone": "M2"}]`

Steps:
1. Open /milestones/P/M1

Expected:
- A shows an external blocker warning naming E9 and M2
