# TC-UI-057: Expand all and collapse all

- **REQ:** REQ-UI-044@fa72c885
- **Priority:** medium

**Preconditions:**
- Project `alpha` has epic `e-1` with child epic `e-2`, which has task `t-1`
- Both epics are collapsed

**Steps:**
1. Open `/beads?project=alpha&milestone=all`
2. Click "Expand all"
3. Click "Collapse all"

**Expected:**
- After step 2 `e-1` and `e-2` are open and `t-1` is shown
- After step 3 only the root `e-1` is shown
