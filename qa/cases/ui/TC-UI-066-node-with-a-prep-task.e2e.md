# TC-UI-066: Node with a prep task

- **REQ:** REQ-UI-049@24a50bbd
- **Priority:** high

**Preconditions:**
- Epic `e-1` in project `alpha` has no parent, track `t-1` (closed), track `t-2` (open) and prep task `p-1` (open) labelled `prep` and `prep:mockup`

**Steps:**
1. Open `/beads/alpha/graph`
2. Open `/beads/alpha/e-1/graph`

**Expected:**
- After step 1 the node `e-1` reads "1 of 2 done" with the open icon
- After step 2 the node `p-1` shows a "Prep" chip
- After step 2 the nodes `t-1` and `t-2` show no "Prep" chip
