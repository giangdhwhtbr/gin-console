# TC-UI-207: Bead with children

- **REQ:** REQ-UI-075@b0eb7f1a
- **Priority:** medium

**Preconditions:**
- Project `p` has task `t-1`, not an epic, with a child

**Steps:**
1. Open `/beads/p/t-1/graph`

**Expected:**
- `/beads?project=p&view=graph&scope=t-1` is shown
