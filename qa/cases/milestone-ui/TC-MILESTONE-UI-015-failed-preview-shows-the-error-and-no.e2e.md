# TC-MILESTONE-UI-015: Failed preview shows the error and no bars
REQ: REQ-MILESTONE-UI-004@ed8c64e1
Priority: high
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- planned milestone M1 whose `show --start 2026-11-16` exits 1

Steps:
1. Open /milestones/P/M1
2. Set "Kick-start date" to 2026-11-16

Expected:
- The Gantt tab shows the error
- No bars are drawn, neither the current plan nor an earlier preview
