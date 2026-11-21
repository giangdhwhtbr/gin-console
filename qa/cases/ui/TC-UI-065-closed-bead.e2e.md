# TC-UI-065: Closed bead

- **REQ:** REQ-UI-049@6d58db62
- **Priority:** medium

**Preconditions:**
- Epic `e-1` in project `alpha` has a closed task `t-1`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1&closed=1`

**Expected:**
- "Show closed" is on
- The node `t-1` is drawn as "Done"
