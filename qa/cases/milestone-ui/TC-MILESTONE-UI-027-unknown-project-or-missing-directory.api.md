# TC-MILESTONE-UI-027: Unknown project or missing directory answers 404
REQ: REQ-MILESTONE-UI-008@6a188a65
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-03-21-api

Preconditions:
- no project named Q is configured
- project R is configured but its directory does not exist

Steps:
1. Request `GET /api/milestones?project=Q`
2. Request `GET /api/milestones/R/M1`

Expected:
- Both responses are 404
