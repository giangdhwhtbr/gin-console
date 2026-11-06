# TC-MILESTONE-UI-060: Keyboard focus highlights the chain
REQ: REQ-MILESTONE-UI-014@d417b46f
Priority: low

Preconditions:
- epics A, B, C, D in M1 where B depends on A, C depends on B, and D has no dependency

Steps:
1. Open /milestones/P/M1
2. Press Tab until B's id link has focus

Expected:
- A, B, C and the arrows A→B and B→C are highlighted
- D is faded
