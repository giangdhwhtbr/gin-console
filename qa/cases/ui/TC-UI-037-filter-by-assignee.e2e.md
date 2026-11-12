# TC-UI-037: Filter by assignee

- **REQ:** REQ-UI-043@fcf777e0
- **Priority:** medium

**Preconditions:**
- Project `alpha` with an open epic that has two open children, one assigned to `alice` and one assigned to `bob`

**Steps:**
1. Open `/beads?project=alpha&milestone=all`
2. Choose `alice` in the Assignee filter

**Expected:**
- The epic and the child assigned to `alice` are shown
- The child assigned to `bob` is not shown
