# TC-UI-214: Nothing to draw

- **REQ:** REQ-UI-053@b16b5ec1
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** d147fd67

**Preconditions:**
- Project `p` has task `t-9` without blockers that blocks nothing and has no child

**Steps:**
1. Open `/beads/p/t-9`

**Expected:**
- There is no button "View in graph"
