# TC-UI-101: Project scope

- **REQ:** REQ-UI-106@aef48e9b
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 0ac2e743

**Preconditions:**
- Project `p` with beads without a parent, among them epics under a milestone

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph`

**Expected:**
- The beads of the project without a parent are drawn, epics under a milestone included
- "Only linked" is on
