# TC-UI-071: Task

- **REQ:** REQ-UI-075@b0eb7f1a
- **Priority:** medium

**Preconditions:**
- Project `alpha` has epic `e-1` with task `b` that has no children
- `b` is blocked by task `a` of `e-1`

**Steps:**
1. Open `/beads/alpha/b/graph`

**Expected:**
- `/beads?project=alpha&view=graph&scope=e-1&select=b` is shown
- The details panel shows `b`
