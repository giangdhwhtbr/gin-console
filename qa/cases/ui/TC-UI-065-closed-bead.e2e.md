# TC-UI-065: Closed bead

- **REQ:** REQ-UI-049@24a50bbd
- **Priority:** medium

**Preconditions:**
- Epic `e-1` in project `alpha` has a closed task `t-1`
- "Show closed" is off on the Beads page

**Steps:**
1. Open `/beads/alpha/e-1/graph`

**Expected:**
- The node `t-1` is drawn as "Done"
