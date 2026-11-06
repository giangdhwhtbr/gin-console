# TC-MILESTONE-UI-003: Unassigned epics count not shown
REQ: REQ-MILESTONE-UI-001@b8f53ca9
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- project P whose `milestone list` reports `unassigned_epics: 4`

Steps:
1. Open /milestones?project=P

Expected:
- No sentence counting roadmap epics outside milestones is shown
