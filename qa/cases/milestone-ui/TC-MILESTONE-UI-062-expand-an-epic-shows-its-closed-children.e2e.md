# TC-MILESTONE-UI-062: Expand an epic shows its closed children
REQ: REQ-MILESTONE-UI-015@b1f5871c
Priority: high
Result: passed
Run: qa/evidence/2026-11-22T16-37-01
Checked: 9661a2ff

Preconditions:
- epic `gin-workflow-rm-cost-control` with four closed children `.1` to `.4`, closed on 2026-11-01

Steps:
1. Open /milestones/P/M1
2. Click "Show 4 child beads of gin-workflow-rm-cost-control"

Expected:
- Before expanding, no child rows are shown and the epic row shows the strand with "4/4"
- Four rows `.1` to `.4` are shown under the epic, ordered by id, each with "closed 1 Nov"
- The child rows shade the epic's period and draw no bars
