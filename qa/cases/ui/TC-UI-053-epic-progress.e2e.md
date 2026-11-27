# TC-UI-053: Epic progress

- **REQ:** REQ-UI-028@b6db5034
- **Priority:** medium

**Preconditions:**
- Epic `e-1` in project `alpha` has 4 tracks `t-1` to `t-4`, of which `t-1`, `t-2` and `t-3` are closed

**Steps:**
1. Open `/beads/alpha/e-1`

**Expected:**
- The children list shows `t-1`, `t-2`, `t-3` and `t-4`
- The strand shows 4 beads, with the text "3/4" after it,; the strand is an image named "3 done, … of 4 tracks"
