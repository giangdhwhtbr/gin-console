# TC-UI-077: Prep task in the scope

- **REQ:** REQ-UI-049@6d58db62
- **Priority:** high

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `t-1` (closed) and `t-2` (open) and prep task `p-1` (open) labelled `prep` and `prep:mockup`

**Steps:**
1. Open `/beads/alpha/e-1?tab=graph&closed=1`

**Expected:**
- `t-1`, `t-2` and `p-1` are nodes
- The node `p-1` shows a "Prep" chip
- The nodes `t-1` and `t-2` show no "Prep" chip
