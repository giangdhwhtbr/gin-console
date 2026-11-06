# TC-MILESTONE-UI-036: Rows ordered by priority then id
REQ: REQ-MILESTONE-UI-010@870a452a
Priority: low

Preconditions:
- project P with parentless open epics `p-b` (P1), `p-a` (P1), and `p-c` (P0)

Steps:
1. Open /milestones?project=P

Expected:
- The section lists `p-c`, `p-a`, `p-b` in that order
