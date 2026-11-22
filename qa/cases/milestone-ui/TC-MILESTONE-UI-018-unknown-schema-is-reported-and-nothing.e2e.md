# TC-MILESTONE-UI-018: Unknown schema is reported and nothing is listed
REQ: REQ-MILESTONE-UI-005@70130792
Priority: medium
Result: passed
Run: qa/evidence/2026-11-22T16-37-01
Checked: 0d3878d7

Preconditions:
- project P whose `milestone list` reports `schema: 2` (API responds 502 with `cause: "schema"`)

Steps:
1. Open /milestones?project=P

Expected:
- An error says schema 2 is not supported
- No milestone is listed
