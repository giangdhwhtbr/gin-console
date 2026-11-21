# TC-UI-218: Through tasks

- **REQ:** REQ-UI-079@258f0ac6
- **Priority:** medium

**Preconditions:**
- Epics `e-1` and `e-2` in project `alpha` have no parent
- Task `x` of `e-1` blocks tasks `y` and `z` of `e-2`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph`

**Expected:**
- One arrow goes from `e-1` to `e-2`
- The arrow has the label "2 links"
