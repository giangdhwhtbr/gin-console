# TC-UI-129: Second Escape closes the panel

- **REQ:** REQ-UI-052@07be03aa
- **Priority:** medium

**Preconditions:**
- Project `alpha` with epic `e-1`

**Steps:**
1. Open `/beads/alpha/e-1/graph` so that `e-1` is selected
2. Press Escape

**Expected:**
- Nothing is selected, the URL has `select=none` and the panel is gone
