# TC-UI-101: Project scope

- **REQ:** REQ-UI-106@19fab77c
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `p` with beads without a parent, among them epics under a milestone

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph`

**Expected:**
- The beads of the project without a parent are drawn, epics under a milestone included
- "Only linked" is on
