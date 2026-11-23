# TC-MILESTONE-UI-019: Milestone page shows the same unavailable error
REQ: REQ-MILESTONE-UI-005@70130792
Priority: medium
Result: passed
Run: qa/evidence/2026-11-23T03-27-52
Checked: 0727ff70

Preconditions:
- project P whose gin-workflow has no `milestone` command

Steps:
1. Open /milestones/P/M1

Expected:
- An error says milestones need a newer gin and to run `gin-workflow/install.sh`
