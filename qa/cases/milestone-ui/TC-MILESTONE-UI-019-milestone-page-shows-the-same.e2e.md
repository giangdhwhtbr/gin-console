# TC-MILESTONE-UI-019: Milestone page shows the same unavailable error
REQ: REQ-MILESTONE-UI-005@3ee8a9e1
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- project P whose gin-workflow has no `milestone` command

Steps:
1. Open /milestones/P/M1

Expected:
- An error says milestones need a newer gin-workflow and to run `gin-workflow/install.sh`
