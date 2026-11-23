# TC-BEADS-073: Blocked epic on the Gantt

- **REQ:** REQ-BEADS-021@23b392e1
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 797747f2

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
