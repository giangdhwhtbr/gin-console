# TC-UI-127: No panel on the project scope of the Graph view at first

- **REQ:** REQ-UI-051@7122e048
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `alpha` with beads that have dependencies

**Steps:**
1. Set the window width to 1280px
2. Open `/beads?project=alpha&milestone=all&view=graph`

**Expected:**
- No node is selected
- There is no details panel and the graph takes the full width
