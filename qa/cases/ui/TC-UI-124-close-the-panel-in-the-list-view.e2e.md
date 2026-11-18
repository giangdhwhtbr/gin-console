# TC-UI-124: Close the panel in the List view

- **REQ:** REQ-UI-045@790904b3
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `alpha` with bead `t-1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads?project=alpha&milestone=all&view=list&select=t-1`
3. Choose "Close details" in the panel

**Expected:**
- The URL has no `select`
- The panel is gone and the list takes the full width
- The row of `t-1` has focus
