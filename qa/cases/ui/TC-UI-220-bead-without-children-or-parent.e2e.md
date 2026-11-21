# TC-UI-220: Bead without children or parent

- **REQ:** REQ-UI-075@b0eb7f1a
- **Priority:** medium

**Preconditions:**
- Project `p` has task `z` without a parent and without children

**Steps:**
1. Open `/beads/p/z/graph`

**Expected:**
- `/beads?project=p&view=graph&select=z` is shown
