# TC-UI-041: Closed milestone

- **REQ:** REQ-UI-104@3cd94953
- **Priority:** medium

**Preconditions:**
- Project `alpha` with closed milestone `m1` whose beads are all closed, active milestone `m2`, and `Show closed` off

**Steps:**
1. Open `/beads?project=alpha`
2. Choose `m1` in the Milestone select

**Expected:**
- The beads are requested with `closed=1`
- The closed beads of `m1` are shown
