# TC-UI-064: State label

- **REQ:** REQ-UI-049@4f311f64
- **Priority:** medium

**Preconditions:**
- Epic `e-1` in project `alpha` has a ready task `t-1` and a blocked task `t-2`

**Steps:**
1. Open `/beads/alpha/e-1/graph`

**Expected:**
- The node `t-1` reads "Ready" with its icon
- The node `t-2` reads "Blocked" with its icon
