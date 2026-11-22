# TC-MILESTONE-UI-009: External blocker warning names the epic and its milestone
REQ: REQ-MILESTONE-UI-003@8d87bf55
Priority: medium
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- epic A in M1 with warning `external_blocker` and `external_depends_on` `[{"id": "E9", "milestone": "M2"}]`

Steps:
1. Open /milestones/P/M1

Expected:
- A's verdict names E9 and M2 after the Blocked glyph drawn in the warning colour
