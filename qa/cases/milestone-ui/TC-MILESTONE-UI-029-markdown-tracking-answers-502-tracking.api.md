# TC-MILESTONE-UI-029: Markdown tracking answers 502 tracking
REQ: REQ-MILESTONE-UI-008@6a188a65
Priority: high
Result: passed
Run: qa/evidence/2026-11-06T04-03-21-api

Preconditions:
- project P whose `milestone list` exits 1 with `milestone error: milestones need providers.task_tracking: beads`

Steps:
1. Request `GET /api/milestones?project=P`

Expected:
- The response is 502 with `cause: "tracking"`
