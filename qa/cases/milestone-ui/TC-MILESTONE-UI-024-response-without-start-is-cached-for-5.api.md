# TC-MILESTONE-UI-024: Response without start is cached for 5 seconds
REQ: REQ-MILESTONE-UI-008@6a188a65
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-03-21-api

Preconditions:
- project P whose `milestone list --all --json` prints schema 1

Steps:
1. Request `GET /api/milestones?project=P`
2. Request it again within 5 seconds
3. Request it again after 5 seconds

Expected:
- The command ran once for the first two requests
- The command ran again for the third request
