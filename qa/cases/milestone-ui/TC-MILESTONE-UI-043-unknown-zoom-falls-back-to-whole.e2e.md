# TC-MILESTONE-UI-043: Unknown zoom falls back to whole milestone
REQ: REQ-MILESTONE-UI-011@83b54b5c
Priority: low
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: d1792d6f

Preconditions:
- milestone M1

Steps:
1. Open /milestones/P/M1?zoom=3w

Expected:
- "Whole milestone" is selected
