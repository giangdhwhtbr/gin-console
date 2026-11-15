# TC-UI-111: No relations

- **REQ:** REQ-UI-048@bf494d4b
- **Priority:** high

**Preconditions:**
- Epic `e-1` in project `alpha` has 7 tasks that block none of each other

**Steps:**
1. Open `/beads/alpha/e-1/graph`

**Expected:**
- The 7 nodes are placed in rows of 3, 3 and 1 under "7 without dependencies"
- The note "No blocking relations between these tasks" is shown
