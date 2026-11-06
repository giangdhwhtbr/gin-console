# TC-MILESTONE-UI-018: Unknown schema is reported and nothing is listed
REQ: REQ-MILESTONE-UI-005@3ee8a9e1
Priority: medium

Preconditions:
- project P whose `milestone list` reports `schema: 2` (API responds 502 with `cause: "schema"`)

Steps:
1. Open /milestones?project=P

Expected:
- An error says schema 2 is not supported
- No milestone is listed
