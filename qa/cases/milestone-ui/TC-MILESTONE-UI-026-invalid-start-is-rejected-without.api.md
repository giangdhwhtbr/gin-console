# TC-MILESTONE-UI-026: Invalid start is rejected without running a command
REQ: REQ-MILESTONE-UI-008@6a188a65
Priority: high
Result: passed
Run: qa/evidence/2026-11-06T04-03-21-api

Preconditions:
- project P

Steps:
1. Request `GET /api/milestones/P/M1?start=next-monday`

Expected:
- The response is 422
- No command runs
