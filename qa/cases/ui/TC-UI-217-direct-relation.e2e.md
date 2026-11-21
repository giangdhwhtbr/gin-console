# TC-UI-217: Direct relation

- **REQ:** REQ-UI-079@258f0ac6
- **Priority:** medium

**Preconditions:**
- Project `alpha` has epics `r-1` and `r-2` without a parent, `r-2` blocked by `r-1`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph`

**Expected:**
- An arrow goes from `r-1` to `r-2`
- The arrow has no label
