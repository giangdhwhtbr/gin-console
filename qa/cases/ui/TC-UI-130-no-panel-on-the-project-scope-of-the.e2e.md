# TC-UI-130: No panel on the project scope of the Graph view

- **REQ:** REQ-UI-106@3747fc19
- **Priority:** medium

**Preconditions:**
- Project `alpha` with epic `e1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads?project=alpha&milestone=all&view=graph`

**Expected:**
- The URL has no `select`
- There is no details panel and the graph takes the full width
