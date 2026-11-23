# TC-MILESTONE-UI-022: List milestones of a project
REQ: REQ-MILESTONE-UI-008@3fdbaeb8
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T03-32-23-api
Checked: e1ba808b

Preconditions:
- project P whose `milestone list --all --json` prints schema 1 with M1

Steps:
1. Request `GET /api/milestones?project=P`

Expected:
- The response is 200
- The body has M1, `unassigned_epics`, and `today`
- The command ran in P's directory
