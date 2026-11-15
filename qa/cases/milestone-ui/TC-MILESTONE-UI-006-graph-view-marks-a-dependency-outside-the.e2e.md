# TC-MILESTONE-UI-006: Graph view marks a dependency outside the milestone as external
REQ: REQ-MILESTONE-UI-002@3618dd3c
Priority: medium
Result: passed
Run: qa/evidence/2026-11-15-8i7-tc1-run2

Preconditions:
- epic A in M1 depending on epic X in M2

Steps:
1. Open /milestones/P/M1?tab=beads&view=graph

Expected:
- X is shown as an external node
- An edge runs from X to A
