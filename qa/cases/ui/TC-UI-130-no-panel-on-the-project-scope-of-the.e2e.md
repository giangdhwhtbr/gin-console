# TC-UI-130: No panel on the project scope of the Graph view

- **REQ:** REQ-UI-106@aef48e9b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `alpha` with epic `e1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads?project=alpha&milestone=all&view=graph`

**Expected:**
- The URL has no `select`
- There is no details panel and the graph takes the full width
