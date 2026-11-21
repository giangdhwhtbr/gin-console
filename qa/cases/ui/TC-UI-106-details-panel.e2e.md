# TC-UI-106: Details panel

- **REQ:** REQ-UI-106@aef48e9b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `p` with epic `e1`

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph`
2. Look at the page without selecting a node
3. Select `e1`

**Expected:**
- After step 2 the URL has no `select` and no details panel is shown
- After step 3 the URL has `select=e1`
- The details panel shows `e1`
