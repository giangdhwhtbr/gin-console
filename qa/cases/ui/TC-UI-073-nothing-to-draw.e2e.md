# TC-UI-073: Nothing to draw

- **REQ:** REQ-UI-075@59cf5290
- **Priority:** low

**Preconditions:**
- Project `alpha` has task `t-1` without children, without blockers and blocking nothing

**Steps:**
1. Open `/beads/alpha/t-1/graph`

**Expected:**
- The page says "No dependencies"
- The page links to the bead `t-1`
