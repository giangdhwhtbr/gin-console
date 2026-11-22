# TC-BEADS-073: Blocked epic on the Gantt

- **REQ:** REQ-BEADS-021@6fc8f7d7
- **Priority:** medium

**Preconditions:**
- Project `alpha` has milestone `m1` shown on the Gantt, with epic `e` of status `open` blocked by the open bead `a`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/alpha/m1`
3. Select the Gantt tab

**Expected:**
- The row of `e` shows the state Blocked
- The row of `e` does not show the state Open or Ready
