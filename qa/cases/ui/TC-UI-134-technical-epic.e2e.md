# TC-UI-134: Technical epic

- **REQ:** REQ-UI-109@e17fecbe
- **Priority:** medium

**Preconditions:**
- Project `alpha` has technical epic `e-1` with capabilities `beads` and `ui`, complexity `medium` and `estimate_minutes: 1440`

**Steps:**
1. Set the window width to 1280 px
2. Open `/beads?project=alpha&milestone=all&view=list`
3. Open the bead page `/beads/alpha/e-1`

**Expected:**
- The List row of `e-1` shows the word "Technical", "medium" and the size "3d" as text
- The bead page shows "Technical", the capabilities "beads, ui" as text joined by a comma, and the size "3d"
