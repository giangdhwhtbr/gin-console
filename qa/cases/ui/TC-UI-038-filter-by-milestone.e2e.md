# TC-UI-038: Filter by milestone

- **REQ:** REQ-UI-043@fcf777e0
- **Priority:** medium

**Preconditions:**
- Project `alpha` with active milestone `m2`, an open epic and its open child task under `m2`, and another open epic under no milestone

**Steps:**
1. Open `/beads?project=alpha&milestone=all`
2. Choose `m2` in the Milestone select

**Expected:**
- The epic under `m2` and its child task are shown
- The epic under no milestone is not shown
- No milestone bead is shown
