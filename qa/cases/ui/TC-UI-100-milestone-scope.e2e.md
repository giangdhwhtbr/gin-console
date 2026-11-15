# TC-UI-100: Milestone scope

- **REQ:** REQ-UI-106@0ef18c76
- **Priority:** high

**Preconditions:**
- Project `p` with milestone `m2` that has epics `e1` and `e2`, and `e2` blocked by `x` under milestone `m3`

**Steps:**
1. Open `/beads?project=p&milestone=m2&view=graph`

**Expected:**
- `e1` and `e2` are drawn
- `x` is drawn as an outside bead with an arrow to `e2`
