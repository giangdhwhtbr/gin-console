# TC-UI-143: Pointed epic

- **REQ:** REQ-UI-109@89f8d56b
- **Priority:** medium

**Preconditions:**
- Project `alpha` has epic `e-3` with complexity `medium`, `points: 5` and `points_reason: "new endpoint and UI"`
- Project `alpha` has epic `e-4` with `points: 3` and no complexity

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/beads?project=alpha&milestone=all&view=list`
3. Open the bead page `/beads/alpha/e-3`

**Expected:**
- After step 2, the List row of `e-3` shows "medium" and the size badge "5 pt"
- After step 2, the List row of `e-4` shows the size badge "3 pt"
- After step 3, the bead page of `e-3` shows the size badge "5 pt" and "new endpoint and UI"
