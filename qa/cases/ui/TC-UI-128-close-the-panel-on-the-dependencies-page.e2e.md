# TC-UI-128: Close the panel on the Dependencies page

- **REQ:** REQ-UI-051@704f443a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `alpha` with epic `e-1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads/alpha/e-1/graph`
3. Choose "Close details" in the panel
4. Reload the page

**Expected:**
- After step 3: the heading bar of `e-1` has focus, the URL has `select=none`, no details panel is shown and the graph takes the full width
- After step 4 (reload): still no details panel
