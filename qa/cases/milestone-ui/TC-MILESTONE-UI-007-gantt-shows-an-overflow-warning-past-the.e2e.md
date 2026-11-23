# TC-MILESTONE-UI-007: Gantt shows an overflow warning past the end line
REQ: REQ-MILESTONE-UI-003@8d87bf55
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: d6ce6b4f

Preconditions:
- milestone M1 whose `show` output gives epic A warning `overflow` of 2 days

Steps:
1. Open /milestones/P/M1

Expected:
- The Gantt tab is selected
- A's bar extends past the end line, the part past it hatched in the warning colour
- A's verdict reads "2 working days past the end" after a dashed ring
