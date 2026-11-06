# TC-MILESTONE-UI-030: Schema other than 1 answers 502 schema
REQ: REQ-MILESTONE-UI-008@6a188a65
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-03-21-api

Preconditions:
- project P whose `milestone list --all --json` prints `schema: 2`

Steps:
1. Request `GET /api/milestones?project=P`

Expected:
- The response is 502 with `cause: "schema"`
