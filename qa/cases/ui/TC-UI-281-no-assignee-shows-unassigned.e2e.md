# TC-UI-281: No assignee shows Unassigned

- **REQ:** REQ-UI-135@6cf0a413
- **Priority:** high

**Preconditions:**
- Project `alpha` has bead `t-1` with owner `lead@example.com` and no assignee

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list`
2. Open `/beads?project=alpha&milestone=all&view=board`
3. Open `/beads/alpha/t-1`

**Expected:**
- After step 1 the row of `t-1` shows "Unassigned"
- After step 2 the card of `t-1` shows "Unassigned"
- After step 3 the page of `t-1` shows "Unassigned" as its assignee
- `lead@example.com` is not shown as the assignee in any of the three
