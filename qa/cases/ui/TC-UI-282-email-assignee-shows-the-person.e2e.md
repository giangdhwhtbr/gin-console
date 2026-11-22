# TC-UI-282: Email assignee shows the person

- **REQ:** REQ-UI-135@6cf0a413
- **Priority:** medium

**Preconditions:**
- Project `alpha` has bead `t-1` assigned to `ann@example.com`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list`
2. Rest the pointer on the assignee of `t-1`

**Expected:**
- After step 1 the row of `t-1` shows `ann`
- After step 2 a tooltip reads `ann@example.com`
