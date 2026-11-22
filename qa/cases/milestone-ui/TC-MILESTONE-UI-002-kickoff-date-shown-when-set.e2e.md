# TC-MILESTONE-UI-002: Kickoff date shown when set
REQ: REQ-MILESTONE-UI-001@ec0ce005
Priority: low
Result: passed
Run: qa/evidence/2026-11-22T04-57-11
Checked: 685b2dc0

Preconditions:
- project P whose `milestone list` reports planned M2 with `kickoff: 2026-11-16`

Steps:
1. Open /milestones?project=P

Expected:
- M2 shows its kickoff date "16 Nov" next to its period
