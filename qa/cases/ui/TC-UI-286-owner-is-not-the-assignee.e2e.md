# TC-UI-286: Owner is not the assignee

- **REQ:** REQ-UI-044@e5b25447
- **Priority:** high

**Preconditions:**
- Project `alpha` has bead `t-1` with owner `lead@example.com` and no assignee
- The browser window is 1024px wide

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list`

**Expected:**
- The row of `t-1` shows "Unassigned"
- The row of `t-1` does not show `lead@example.com`
