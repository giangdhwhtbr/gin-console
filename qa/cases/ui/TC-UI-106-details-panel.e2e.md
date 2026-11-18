# TC-UI-106: Details panel

- **REQ:** REQ-UI-106@3747fc19
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `p` with epic `e1`

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph`
2. Select `e1`

**Expected:**
- The URL has `select=e1`
- The details panel shows `e1`
