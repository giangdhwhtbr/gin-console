# TC-MILESTONE-UI-057: Arrow from the end of the dependency to the start of the dependent
REQ: REQ-MILESTONE-UI-014@d417b46f
Priority: high

Preconditions:
- epic B in M1 with `depends_on: ["A"]`, A planned 2026-11-02 and B planned 2026-11-03

Steps:
1. Open /milestones/P/M1

Expected:
- An arrow runs from the end of A's bar on 2026-11-02 to the start of B's bar on 2026-11-03
- The arrow is not in the blocked color
