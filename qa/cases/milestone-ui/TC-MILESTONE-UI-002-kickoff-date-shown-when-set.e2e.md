# TC-MILESTONE-UI-002: Kickoff date shown when set
REQ: REQ-MILESTONE-UI-001@6e63a57f
Priority: low
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: 306487b5

Preconditions:
- project P whose `milestone list` reports planned M2 with `kickoff: 2026-11-16`

Steps:
1. Open /milestones?project=P

Expected:
- M2 shows its kickoff date "16 Nov" next to its period
