# TC-MILESTONE-UI-038: Every epic in a milestone
REQ: REQ-MILESTONE-UI-010@870a452a
Priority: medium
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: f711c7db

Preconditions:
- project P whose open epics all have a milestone parent

Steps:
1. Open /milestones?project=P

Expected:
- The section heading shows 0
- The section says every epic is in a milestone
