# TC-UI-129: Escape selects nothing

- **REQ:** REQ-UI-052@a3e5921d
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 177e8394

**Preconditions:**
- Project `alpha` with epic `e-1` that has task `t-1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`
3. Click the node of task `t-1`
4. Press Escape

**Expected:**
- After step 2 no node is selected and no details panel is shown
- After step 4 the URL has `select=none` and no details panel is shown
