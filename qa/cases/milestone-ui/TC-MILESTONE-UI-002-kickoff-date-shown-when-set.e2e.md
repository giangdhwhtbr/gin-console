# TC-MILESTONE-UI-002: Kickoff date shown when set
REQ: REQ-MILESTONE-UI-001@ecd0d02b
Priority: low
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- project P whose `milestone list` reports planned M2 with `kickoff: 2026-11-16`

Steps:
1. Open /milestones?project=P

Expected:
- M2 shows its kickoff date 2026-11-16 next to its period
