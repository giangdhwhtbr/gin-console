# TC-MILESTONE-UI-006: Graph tab marks a dependency outside the milestone as external
REQ: REQ-MILESTONE-UI-002@d40b9a33
Priority: medium

Preconditions:
- epic A in M1 depending on epic X in M2

Steps:
1. Open /milestones/P/M1?tab=graph

Expected:
- X is shown as an external node
- An edge runs from X to A
