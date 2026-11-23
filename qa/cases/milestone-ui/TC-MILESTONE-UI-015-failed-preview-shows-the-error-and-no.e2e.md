# TC-MILESTONE-UI-015: Failed preview shows the error and no bars
REQ: REQ-MILESTONE-UI-004@7f8bfee8
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: 91215ee1

Preconditions:
- planned milestone M1 whose `show --start 2026-11-16` exits 1

Steps:
1. Open /milestones/P/M1
2. Set "Kick-start date" to 2026-11-16

Expected:
- The Gantt tab shows the error
- No bars are drawn, neither the current plan nor an earlier preview
