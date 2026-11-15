# TC-UI-125: Escape closes the panel in the List view

- **REQ:** REQ-UI-045@790904b3
- **Priority:** medium

**Preconditions:**
- Project `alpha` with bead `t-1`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list&select=t-1`
2. Move focus to the row of `t-1`
3. Press Escape

**Expected:**
- The selection is cleared and the URL has no `select`
- The panel is gone
