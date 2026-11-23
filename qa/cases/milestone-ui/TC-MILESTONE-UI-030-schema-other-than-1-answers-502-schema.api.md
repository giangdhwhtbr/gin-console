# TC-MILESTONE-UI-030: Schema other than 1 answers 502 schema
REQ: REQ-MILESTONE-UI-008@3fdbaeb8
Priority: medium
Result: passed
Run: qa/evidence/2026-11-23T03-32-23-api
Checked: 1a969366

Preconditions:
- project P whose `milestone list --all --json` prints `schema: 2`

Steps:
1. Request `GET /api/milestones?project=P`

Expected:
- The response is 502 with `cause: "schema"`
