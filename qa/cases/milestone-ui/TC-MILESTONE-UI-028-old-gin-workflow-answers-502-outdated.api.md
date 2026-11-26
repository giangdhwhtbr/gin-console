# TC-MILESTONE-UI-028: Old gin-workflow answers 502 outdated and is not cached
REQ: REQ-MILESTONE-UI-008@4b68a946
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T03-32-23-api
Checked: a45f562d

Preconditions:
- project P whose `gin-workflow milestone` exits 2 with `invalid choice: 'milestone'`

Steps:
1. Request `GET /api/milestones?project=P`
2. Request it again within 5 seconds

Expected:
- Both responses are 502 with `error` and `cause: "outdated"`
- The command ran for each request
