# TC-MILESTONE-UI-005: Graph tab shows epics and their dependency edge
REQ: REQ-MILESTONE-UI-002@d40b9a33
Priority: high

Preconditions:
- milestone M1 of project P with epics A and B, B depending on A

Steps:
1. Open /milestones/P/M1
2. Click the "Graph" tab

Expected:
- The URL has `tab=graph`
- A and B are shown as nodes
- An edge runs from A to B
