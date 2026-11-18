# TC-UI-129: Second Escape closes the panel

- **REQ:** REQ-UI-052@07be03aa
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T16-24-46

**Preconditions:**
- Project `alpha` with epic `e-1` that has task `t-1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads/alpha/e-1/graph`
3. Click the node of task `t-1`
4. Press Escape
5. Press Escape again

**Expected:**
- After step 4: `e-1` is selected again
- After step 5: the URL has `select=none` and no details panel is shown
