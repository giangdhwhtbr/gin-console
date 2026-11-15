# TC-MILESTONE-UI-053: Long title cut with an ellipsis, id and period wrap on a phone
REQ: REQ-MILESTONE-UI-013@ad4d4b1f
Priority: medium
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- epic `gin-workflow-rm-process-hygiene` titled "Process hygiene: consistent skills, rules that bind where it matters"
- a phone-sized viewport (390 × 844)

Steps:
1. Open /milestones/P/M1
2. Hover the epic's title

Expected:
- The title takes one line, cut short with an ellipsis
- The full title is shown on hover
- The id, the period and the closed tracks wrap onto the following lines, none of them cut to less than its first word
- The id links to its bead page
