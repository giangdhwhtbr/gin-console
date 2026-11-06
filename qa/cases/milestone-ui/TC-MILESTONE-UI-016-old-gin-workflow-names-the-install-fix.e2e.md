# TC-MILESTONE-UI-016: Old gin-workflow names the install fix
REQ: REQ-MILESTONE-UI-005@3ee8a9e1
Priority: high
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- project P whose gin-workflow has no `milestone` command (API responds 502 with `cause: "outdated"`)

Steps:
1. Open /milestones?project=P

Expected:
- An error says milestones need a newer gin-workflow
- The error tells to run `gin-workflow/install.sh`
