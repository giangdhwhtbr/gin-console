# TC-UI-214: Nothing to draw

- **REQ:** REQ-UI-053@54371a3e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 7317b5d8

**Preconditions:**
- Project `p` has task `t-9` without blockers that blocks nothing and has no child

**Steps:**
1. Open `/beads/p/t-9`

**Expected:**
- There is no button "View in graph"
