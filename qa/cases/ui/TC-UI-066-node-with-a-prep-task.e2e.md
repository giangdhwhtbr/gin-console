# TC-UI-066: Node with a prep task

- **REQ:** REQ-UI-049@6d58db62
- **Priority:** high

**Preconditions:**
- Epic `e-1` in project `alpha` has no parent, track `t-1` (closed), track `t-2` (open) and prep task `p-1` (open) labelled `prep` and `prep:mockup`, and epic `e-2` blocked by `e-1`, so Only linked draws `e-1`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&closed=1`
2. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1&closed=1`

**Expected:**
- After step 1 the node `e-1` reads "1 of 2 done" with the open icon
- After step 2 the node `p-1` shows a "Prep" chip
- After step 2 the nodes `t-1` and `t-2` show no "Prep" chip
