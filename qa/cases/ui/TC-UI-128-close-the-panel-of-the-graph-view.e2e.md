# TC-UI-128: Close the panel of the Graph view

- **REQ:** REQ-UI-051@6fa41797
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 46696197

**Preconditions:**
- Project `alpha` with epic `e-1` that has task `t-1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`
3. Click the node of task `t-1`
4. Choose "Close details" in the panel
5. Reload the page

**Expected:**
- After step 3 the URL has `select=t-1` and the details panel shows `t-1`
- After step 4 the node `t-1` has focus, the URL has `select=none`, no details panel is shown and the graph takes the full width
- After step 5 (reload) there is still no details panel
