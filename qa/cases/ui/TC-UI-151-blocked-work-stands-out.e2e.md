# TC-UI-151: Blocked work stands out

- **REQ:** REQ-UI-004@7ccf6049
- **Priority:** medium

**Preconditions:**
- Project `alpha` has 19 blocked beads
- Project `beta` has no blocked beads

**Steps:**
1. Open `/`

**Expected:**
- The card of `alpha` shows "blocked 19" in the warning color with a warning icon
- The card of `beta` shows "blocked 0" in the normal color without a warning icon
