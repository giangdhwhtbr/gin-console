# TC-MILESTONE-UI-053: Long title and id cut with an ellipsis on a phone
REQ: REQ-MILESTONE-UI-013@707f050a
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- epic `gin-workflow-rm-process-hygiene` titled "Process hygiene: consistent skills, rules that bind where it matters"
- a phone-sized viewport (390 × 844)

Steps:
1. Open /milestones/P/M1
2. Hover the epic's title

Expected:
- The title and the id each take one line, cut short with an ellipsis
- The full title is shown on hover
- The id links to its bead page
