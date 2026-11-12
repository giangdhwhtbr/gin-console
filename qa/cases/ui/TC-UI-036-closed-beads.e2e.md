# TC-UI-036: Closed beads

- **REQ:** REQ-UI-043@fcf777e0
- **Priority:** medium

**Preconditions:**
- Project `alpha` with an open epic that has one closed child titled `Old task`, and `Show closed` off

**Steps:**
1. Open `/beads?project=alpha&milestone=all`
2. Turn on `Show closed`

**Expected:**
- Before step 2 the `Old task` child is not shown
- After step 2 the `Old task` child is shown
