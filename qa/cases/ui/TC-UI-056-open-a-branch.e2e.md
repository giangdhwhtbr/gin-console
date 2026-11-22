# TC-UI-056: Open a branch

- **REQ:** REQ-UI-044@e5b25447
- **Priority:** medium

**Preconditions:**
- Project `alpha` has epic `e-1` with children `t-1` and `t-2`, and `e-1` is collapsed

**Steps:**
1. Open `/beads?project=alpha&milestone=all`
2. Click the open control of `e-1`
3. Click the close control of `e-1`

**Expected:**
- After step 2 the rows `t-1` and `t-2` are shown under `e-1`
- After step 3 the rows `t-1` and `t-2` are hidden
