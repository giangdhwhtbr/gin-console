# TC-UI-063: Node with children

- **REQ:** REQ-UI-049@4f311f64
- **Priority:** medium

**Preconditions:**
- Project `alpha` has epic `e-1` without a parent, with 3 tasks `t-1`, `t-2` and `t-3`, of which `t-1` is closed

**Steps:**
1. Open `/beads/alpha/graph`

**Expected:**
- The node `e-1` reads "1 of 3 done" with the open icon
