# TC-MILESTONE-UI-029: Markdown tracking answers 502 tracking
REQ: REQ-MILESTONE-UI-008@4b68a946
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T03-32-23-api
Checked: 2aa45c65

Preconditions:
- project P whose `milestone list` exits 1 with `milestone error: milestones need providers.task_tracking: beads`

Steps:
1. Request `GET /api/milestones?project=P`

Expected:
- The response is 502 with `cause: "tracking"`
