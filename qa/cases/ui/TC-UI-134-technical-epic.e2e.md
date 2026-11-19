# TC-UI-134: Technical epic

- **REQ:** REQ-UI-109@c2b6a5c4
- **Priority:** medium

**Preconditions:**
- Project `alpha` has technical epic `e-1` with capabilities `beads` and `ui`, complexity `medium` and `estimate_minutes: 1440`

**Steps:**
1. Set the window width to 1280 px
2. Open `/beads?project=alpha&milestone=all&view=list`
3. Open the bead page `/beads/alpha/e-1`

**Expected:**
- The List row of `e-1` shows "Technical" and "medium · 3d"
- The bead page shows "Technical", the chips `beads` and `ui`, and "Estimate 3d"
