# TC-MILESTONE-UI-017: Markdown tracking names the Beads fix
REQ: REQ-MILESTONE-UI-005@3ee8a9e1
Priority: high

Preconditions:
- project P with `providers.task_tracking: markdown` (API responds 502 with `cause: "tracking"`)

Steps:
1. Open /milestones?project=P

Expected:
- An error says milestones need `providers.task_tracking: beads`
