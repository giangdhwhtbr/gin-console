# TC-UI-216: Long bead in a panel

- **REQ:** REQ-UI-078@aea03286
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 635d7774

**Preconditions:**
- Project `p` has bead `p-1` whose content is taller than the window, among 40 other beads so that the page scrolls
- The window is 1440x900

**Steps:**
1. Open `/beads?project=p&view=list`
2. Click the row of `p-1` outside its title
3. Turn the wheel down over the details panel

**Expected:**
- The details panel scrolls
- The page does not scroll
