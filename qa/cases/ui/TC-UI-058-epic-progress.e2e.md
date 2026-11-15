# TC-UI-058: Epic progress

- **REQ:** REQ-UI-044@eb99ab67
- **Priority:** medium

**Preconditions:**
- Project `alpha` has epic `e-1` with 5 tracks, of which 3 are closed

**Steps:**
1. Open `/beads?project=alpha&milestone=all`
2. Turn on "Show closed"

**Expected:**
- The row of `e-1` says "3/5 closed" with a progress bar
