# TC-MILESTONE-UI-016: Old gin-workflow names the install fix
REQ: REQ-MILESTONE-UI-005@70130792
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: 690a0a5f

Preconditions:
- project P whose gin-workflow has no `milestone` command (API responds 502 with `cause: "outdated"`)

Steps:
1. Open /milestones?project=P

Expected:
- An error says milestones need a newer gin
- The error tells to run `gin-workflow/install.sh`
