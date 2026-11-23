# TC-UI-125: Escape closes the panel in the List view

- **REQ:** REQ-UI-045@790904b3
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 550b3b11

**Preconditions:**
- Project `alpha` with bead `t-1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads?project=alpha&milestone=all&view=list&select=t-1`
3. Move focus to the row of `t-1`
4. Press Escape

**Expected:**
- The selection is cleared and the URL has no `select`
- The panel is gone
