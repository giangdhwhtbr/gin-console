# TC-MILESTONE-UI-064: Open child shows its status instead of a date
REQ: REQ-MILESTONE-UI-015@f33e3903
Priority: medium

Preconditions:
- epic B with child `B.2` in status `in_progress`

Steps:
1. Open /milestones/P/M1
2. Expand B

Expected:
- The row of `B.2` reads "In progress"
- The row of `B.2` has no closing date
