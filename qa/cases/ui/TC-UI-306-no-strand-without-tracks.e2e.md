# TC-UI-306: No strand without tracks

- **REQ:** REQ-UI-138@b0819958
- **Priority:** medium

**Preconditions:**
- Project `P` reports epic `e-3` without children

**Steps:**
1. Open `/beads?project=P&view=list`
2. Find the row of `e-3`

**Expected:**
- The row shows no strand (no element with `role="img"` named "... tracks")
- The row shows no count such as "0/0"
