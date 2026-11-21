# TC-UI-216: Long bead in a panel

- **REQ:** REQ-UI-078@ea323dfb
- **Priority:** medium

**Preconditions:**
- Project `p` has bead `p-1` whose content is taller than the window
- The window is 1440x900

**Steps:**
1. Open `/beads?project=p&view=list`
2. Select `p-1`
3. Turn the wheel down over the details panel

**Expected:**
- The details panel scrolls
- The page does not scroll
