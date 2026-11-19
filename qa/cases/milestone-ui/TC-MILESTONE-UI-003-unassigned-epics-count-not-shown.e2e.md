# TC-MILESTONE-UI-003: Unassigned epics count not shown
REQ: REQ-MILESTONE-UI-001@ecd0d02b
Priority: medium
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- project P whose `milestone list` reports `unassigned_epics: 4`

Steps:
1. Open /milestones?project=P

Expected:
- No sentence counting roadmap epics outside milestones is shown
