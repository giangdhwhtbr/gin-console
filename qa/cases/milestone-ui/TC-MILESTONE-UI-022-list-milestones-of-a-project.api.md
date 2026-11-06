# TC-MILESTONE-UI-022: List milestones of a project
REQ: REQ-MILESTONE-UI-008@6a188a65
Priority: high
Result: passed
Run: qa/evidence/2026-11-06T04-03-21-api

Preconditions:
- project P whose `milestone list --all --json` prints schema 1 with M1

Steps:
1. Request `GET /api/milestones?project=P`

Expected:
- The response is 200
- The body has M1, `unassigned_epics`, and `today`
- The command ran in P's directory
