# TC-MILESTONE-UI-003: Unassigned epics count not shown
REQ: REQ-MILESTONE-UI-001@6e63a57f
Priority: medium
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: 78b88a38

Preconditions:
- project P whose `milestone list` reports `unassigned_epics: 4`

Steps:
1. Open /milestones?project=P

Expected:
- No sentence counting roadmap epics outside milestones is shown
