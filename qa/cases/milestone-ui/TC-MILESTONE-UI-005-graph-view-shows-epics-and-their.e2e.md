# TC-MILESTONE-UI-005: Graph view shows epics and their dependency edge
REQ: REQ-MILESTONE-UI-002@3618dd3c
Priority: high
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- milestone M1 of project P with epics A and B, B depending on A

Steps:
1. Open /milestones/P/M1
2. Click the "Beads" tab
3. Choose "Graph" in the views

Expected:
- The URL has `tab=beads` and `view=graph`
- A and B are shown as nodes
- An edge runs from A to B
