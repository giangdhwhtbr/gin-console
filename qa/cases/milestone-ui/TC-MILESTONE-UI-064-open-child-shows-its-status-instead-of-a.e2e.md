# TC-MILESTONE-UI-064: Open child shows its status instead of a date
REQ: REQ-MILESTONE-UI-015@b1f5871c
Priority: medium
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: f988d464

Preconditions:
- epic B with child `B.2` in status `in_progress`

Steps:
1. Open /milestones/P/M1
2. Expand B

Expected:
- The row of `B.2` reads "In progress"
- The row of `B.2` has no closing date
