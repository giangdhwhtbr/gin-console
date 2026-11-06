# TC-MILESTONE-UI-007: Gantt shows an overflow warning past the end line
REQ: REQ-MILESTONE-UI-003@68d4a64d
Priority: high

Preconditions:
- milestone M1 whose `show` output gives epic A warning `overflow` of 2 days

Steps:
1. Open /milestones/P/M1

Expected:
- The Gantt tab is selected
- A's bar extends past the end line
- A shows an overflow warning of 2 days
