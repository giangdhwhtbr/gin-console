# TC-UI-063: Node with children

- **REQ:** REQ-UI-049@73f03f4c
- **Priority:** medium

**Preconditions:**
- Project `alpha` has epic `e-1` without a parent, with 3 tasks `t-1`, `t-2` and `t-3`, of which `t-1` is closed, and epic `e-2` blocked by `e-1`, so Only linked draws `e-1`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&closed=1`

**Expected:**
- The node `e-1` shows the strand of 3 beads followed by "1/3", and the open icon
