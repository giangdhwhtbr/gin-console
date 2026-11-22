# TC-UI-150: Size at every width

- **REQ:** REQ-UI-109@e17fecbe
- **Priority:** medium

**Preconditions:**
- Project `alpha` has epic `e-3` with complexity `medium` and `points: 5`

**Steps:**
1. Set the window width to 390 px
2. Open `/beads?project=alpha&milestone=all&view=list`
3. Set the window width to 1440 px
4. Open `/beads?project=alpha&milestone=all&view=list`

**Expected:**
- After step 2, the List row of `e-3` shows "medium" and the size "5 pt" as text
- After step 4, the List row of `e-3` shows "medium" and the size "5 pt" as text
