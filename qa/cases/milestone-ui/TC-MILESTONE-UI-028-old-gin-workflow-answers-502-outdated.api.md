# TC-MILESTONE-UI-028: Old gin-workflow answers 502 outdated and is not cached
REQ: REQ-MILESTONE-UI-008@6a188a65
Priority: high
Result: passed
Run: qa/evidence/2026-11-06T04-03-21-api

Preconditions:
- project P whose `gin-workflow milestone` exits 2 with `invalid choice: 'milestone'`

Steps:
1. Request `GET /api/milestones?project=P`
2. Request it again within 5 seconds

Expected:
- Both responses are 502 with `error` and `cause: "outdated"`
- The command ran for each request
