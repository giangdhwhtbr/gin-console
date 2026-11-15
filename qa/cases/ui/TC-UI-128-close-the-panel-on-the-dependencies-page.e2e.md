# TC-UI-128: Close the panel on the Dependencies page

- **REQ:** REQ-UI-051@704f443a
- **Priority:** medium

**Preconditions:**
- Project `alpha` with epic `e-1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads/alpha/e-1/graph`
3. Choose "Close details" in the panel
4. Reload the page

**Expected:**
- The URL has `select=none`
- The panel is gone and the graph takes the full width
- After the reload the panel is still closed
- The node of `e-1` had focus after closing
