# TC-MILESTONE-UI-017: Markdown tracking names the Beads fix
REQ: REQ-MILESTONE-UI-005@70130792
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: d44f30b2

Preconditions:
- project P with `providers.task_tracking: markdown` (API responds 502 with `cause: "tracking"`)

Steps:
1. Open /milestones?project=P

Expected:
- An error says milestones need `providers.task_tracking: beads`
